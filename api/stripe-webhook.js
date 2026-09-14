// api/stripe-webhook.js — CYCLE DE VIE COMPLET DE L'ABONNEMENT
// Gère : souscription, renouvellement, échec de paiement, résiliation.
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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
        break;
      }

      // ── Renouvellement mensuel réussi : on prolonge la période ──
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        const userId = await findUserId(sub);
        if (!userId) break;
        await setPremium(userId, {
          active: true,
          until: periodEndISO(sub),
          status: sub.status, plan: planFromSub(sub),
          customerId: sub.customer, subscriptionId: sub.id,
        });
        break;
      }

      // ── Échec de paiement : on garde l'accès jusqu'à la fin de période payée ──
      // (Stripe relance automatiquement ; la résiliation viendra si l'échec persiste)
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        const userId = await findUserId(sub);
        if (!userId) break;
        await setPremium(userId, {
          active: true, // accès maintenu jusqu'à expiration de la période
          until: periodEndISO(sub),
          status: 'past_due', plan: planFromSub(sub),
          customerId: sub.customer, subscriptionId: sub.id,
        });
        console.warn('[webhook] Paiement échoué pour', userId);
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
