// api/stripe-webhook.js — CYCLE DE VIE COMPLET DE L'ABONNEMENT
// Gère : souscription, renouvellement, échec de paiement, résiliation.
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { renderEmail, sendEmail } from './_email.js';

// Vercel doit fournir le corps brut pour valider la signature Stripe
export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // service_role : contourne RLS
);

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Fin de la période payée.
// Depuis les versions récentes de l'API, current_period_end est porté par les
// lignes de l'abonnement et non plus par l'abonnement lui-même.
function periodEndISO(sub) {
  const ts = sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

// Identifie la formule (mensuel/annuel) depuis le Price Stripe réellement utilisé —
// pour que la carte Paramètres affiche le bon tarif, peu importe lequel a été choisi.
function planFromSub(sub) {
  const priceId = sub?.items?.data?.[0]?.price?.id;
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_ANNUAL) return 'annual';
  if (priceId === process.env.STRIPE_PRICE_ID) return 'monthly';
  return null; // prix inconnu (changé manuellement dans Stripe, etc.) : on ne devine pas
}

// Abonnement lié à une facture. Les versions récentes de l'API Stripe (2025+) ne renvoient plus
// invoice.subscription : l'information est dans invoice.parent.subscription_details.
function invoiceSubscriptionId(invoice) {
  const s = invoice?.subscription
    || invoice?.parent?.subscription_details?.subscription
    || invoice?.lines?.data?.[0]?.parent?.subscription_item_details?.subscription
    || invoice?.lines?.data?.[0]?.subscription;
  return typeof s === 'string' ? s : s?.id || null;
}

// Retrouve l'utilisateur : d'abord par metadata, sinon par customer Stripe
async function findUserId(subscriptionOrSession) {
  const meta = subscriptionOrSession.metadata?.user_id
            || subscriptionOrSession.client_reference_id;
  if (meta) return meta;

  const customerId = subscriptionOrSession.customer;
  if (!customerId) return null;
  const { data } = await supabase
    .from('profiles').select('id').eq('stripe_customer_id', customerId).maybeSingle();
  return data?.id || null;
}

// Statistiques du tableau de bord (table events) : jamais bloquant pour le traitement du paiement
async function logEvent(userId, type, meta) {
  try {
    const { error } = await supabase.from('events').insert({ user_id: userId, type, meta: meta || null });
    if (error) console.warn('[webhook] event', type, error.message);
  } catch (e) { console.warn('[webhook] event', type, e.message); }
}

// Met à jour le statut premium d'un utilisateur
async function setPremium(userId, { active, until, customerId, subscriptionId, status, plan }) {
  const payload = {
    is_premium: active,
    premium_until: until || null,
    subscription_status: status || null,
  };
  if (customerId) payload.stripe_customer_id = customerId;
  if (subscriptionId) payload.stripe_subscription_id = subscriptionId;
  if (plan) payload.subscription_plan = plan;

  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
  if (error) console.error('[webhook] Supabase:', error.message);
  else console.log(`[webhook] ${userId} → premium=${active} (${status})`);
  return !error;
}

// Parrainage : au 1er paiement réel du filleul, le parrain gagne 1 mois (avoir Stripe s'il est abonné, sinon 30 jours de Premium offerts)
const REFERRAL_CREDIT_CENTS = 999, MAX_REWARDS_PER_YEAR = 12;
async function rewardReferrer(refereeId, invoice) {
  if (!invoice || !(invoice.amount_paid > 0)) return;
  const { data: ref } = await supabase.from('referrals').select('id, referrer_id, paid_at').eq('referee_id', refereeId).is('rewarded_at', null).maybeSingle();
  if (!ref) return;
  // Verrou : une seule récompense même si Stripe renvoie l'événement plusieurs fois
  const { data: locked } = await supabase.from('referrals').update({ rewarded_at: new Date().toISOString(), paid_at: ref.paid_at || new Date().toISOString(), reward: 'en_cours' })
    .eq('id', ref.id).is('rewarded_at', null).select().maybeSingle();
  if (!locked) return;
  const { count } = await supabase.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', ref.referrer_id)
    .in('reward', ['credit', 'gift']).gte('rewarded_at', new Date(Date.now() - 365 * 86400000).toISOString());
  if ((count || 0) >= MAX_REWARDS_PER_YEAR) { await supabase.from('referrals').update({ reward: 'plafond' }).eq('id', ref.id); return; }
  const { data: p } = await supabase.from('profiles').select('stripe_customer_id, subscription_status, premium_until, email').eq('id', ref.referrer_id).maybeSingle();
  let reward;
  if (p?.stripe_customer_id && ['active', 'past_due', 'cancel_at_period_end', 'trialing'].includes(p.subscription_status)) {
    await stripe.customers.createBalanceTransaction(p.stripe_customer_id, { amount: -REFERRAL_CREDIT_CENTS, currency: 'eur', description: 'Parrainage : 1 mois offert' });
    reward = 'credit';
  } else {
    const base = Math.max(Date.now(), p?.premium_until ? new Date(p.premium_until).getTime() : 0);
    await supabase.from('profiles').update({ is_premium: true, premium_until: new Date(base + 30 * 86400000).toISOString(), subscription_status: 'gift' }).eq('id', ref.referrer_id);
    reward = 'gift';
  }
  await supabase.from('referrals').update({ reward }).eq('id', ref.id);
  await logEvent(ref.referrer_id, 'referral_reward', { reward, referee: refereeId });
  // Petit e-mail au parrain (jamais bloquant)
  try {
    const { data: au } = await supabase.auth.admin.getUserById(ref.referrer_id);
    const to = au?.user?.email;
    if (to) {
      const e = renderEmail({ title: 'Merci : 1 mois offert 🎁', userId: ref.referrer_id,
        paragraphs: ['Un ami que tu as invité vient de s\'abonner à Kapitaro Premium.', reward === 'credit' ? 'Pour te remercier, **9,99 € seront déduits de ta prochaine facture**, automatiquement.' : 'Pour te remercier, **tu as 1 mois de Premium offert**, déjà actif sur ton compte.', 'Continue de partager ton lien depuis Paramètres → Parrainage : chaque ami qui s\'abonne te fait gagner un mois.'],
        cta: { label: 'Ouvrir Kapitaro', url: 'https://kapitaro.fr' } });
      await sendEmail({ to, subject: 'Tu as gagné 1 mois Kapitaro Premium 🎁', html: e.html, text: e.text, unsub: e.unsub });
    }
  } catch (e) { console.warn('[webhook] e-mail parrain :', e.message); }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[webhook] Signature invalide:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log('[webhook] Événement:', event.type);

  try {
    switch (event.type) {

      // ── Souscription initiale confirmée ──
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription') break;
        const userId = await findUserId(session);
        if (!userId) { console.error('[webhook] Utilisateur introuvable'); break; }

        // Récupère la période payée depuis l'abonnement
        let until = null, subId = session.subscription || null, status = 'active', plan = null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          until = periodEndISO(sub);
          status = sub.status;
          plan = planFromSub(sub);
        }
        await setPremium(userId, {
          active: true, until, status, plan,
          customerId: session.customer, subscriptionId: subId,
        });
        await logEvent(userId, 'premium_activated', { plan, amount: (session.amount_total || 0) / 100, stripe_event: event.id });
        break;
      }

      // ── Renouvellement mensuel réussi : on prolonge la période ──
      case 'invoice.payment_succeeded': {
        const subId = invoiceSubscriptionId(event.data.object);
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = await findUserId(sub);
        if (!userId) break;
        await setPremium(userId, {
          active: true,
          until: periodEndISO(sub),
          status: sub.status, plan: planFromSub(sub),
          customerId: sub.customer, subscriptionId: sub.id,
        });
        // Parrainage : récompense au 1er paiement réel du filleul (jamais bloquant pour l'abonnement)
        try { await rewardReferrer(userId, event.data.object); } catch (e) { console.error('[webhook] parrainage :', e.message); }
        // La 1re facture est déjà comptée par premium_activated : seuls les vrais renouvellements sont suivis ici
        if (event.data.object.billing_reason === 'subscription_cycle') {
          await logEvent(userId, 'subscription_renewed', { plan: planFromSub(sub), amount: (event.data.object.amount_paid || 0) / 100, stripe_event: event.id });
        }
        break;
      }

      // ── Échec de paiement : on garde l'accès jusqu'à la fin de période payée ──
      // (Stripe relance automatiquement ; la résiliation viendra si l'échec persiste)
      case 'invoice.payment_failed': {
        const subId = invoiceSubscriptionId(event.data.object);
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = await findUserId(sub);
        if (!userId) break;
        await setPremium(userId, {
          active: true, // accès maintenu jusqu'à expiration de la période
          until: periodEndISO(sub),
          status: 'past_due', plan: planFromSub(sub),
          customerId: sub.customer, subscriptionId: sub.id,
        });
        console.warn('[webhook] Paiement échoué pour', userId);
        await logEvent(userId, 'payment_failed', { plan: planFromSub(sub), stripe_event: event.id });
        break;
      }

      // ── Changement d'état (résiliation programmée, réactivation, impayé) ──
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = await findUserId(sub);
        if (!userId) break;
        // active / trialing / past_due → accès maintenu ; canceled / unpaid → coupé
        const stillActive = ['active', 'trialing', 'past_due'].includes(sub.status);
        await setPremium(userId, {
          active: stillActive,
          until: periodEndISO(sub),
          status: sub.cancel_at_period_end ? 'cancel_at_period_end' : sub.status,
          plan: planFromSub(sub),
          customerId: sub.customer, subscriptionId: sub.id,
        });
        const prev = event.data.previous_attributes || {};
        if (prev.cancel_at_period_end === false && sub.cancel_at_period_end) {
          await logEvent(userId, 'cancel_scheduled', { plan: planFromSub(sub), stripe_event: event.id });
        } else if (prev.cancel_at_period_end === true && !sub.cancel_at_period_end) {
          await logEvent(userId, 'cancel_reverted', { plan: planFromSub(sub), stripe_event: event.id });
        }
        break;
      }

      // ── Abonnement définitivement terminé ──
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = await findUserId(sub);
        if (!userId) break;
        await setPremium(userId, {
          active: false, until: null, status: 'canceled',
          customerId: sub.customer, subscriptionId: sub.id,
        });
        await logEvent(userId, 'subscription_ended', { stripe_event: event.id });
        break;
      }

      default:
        // Les autres événements sont ignorés volontairement
        break;
    }
  } catch (err) {
    console.error('[webhook] Traitement:', err.message);
    // On renvoie 200 : Stripe ne doit pas rejouer indéfiniment une erreur applicative
    return res.status(200).json({ received: true, warning: err.message });
  }

  return res.status(200).json({ received: true });
}
