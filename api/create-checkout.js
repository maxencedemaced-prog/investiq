// api/create-checkout.js — SÉCURISÉ
// L'utilisateur est identifié par son token Supabase (jamais par le body),
// et le tarif est défini côté serveur (jamais envoyé par le client).
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const ALLOWED_ORIGINS = [
  'https://kapitaro.fr',
  'https://www.kapitaro.fr',
  'https://investiq-kappa.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

const APP_URL = process.env.APP_URL || 'https://kapitaro.fr';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // ── 1. AUTHENTIFICATION : l'identité vient du token, pas du body ──
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Connecte-toi pour t\'abonner.' });

    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData?.user?.id) {
      return res.status(401).json({ error: 'Session expirée. Reconnecte-toi.' });
    }
    const user = userData.user;

    // ── 2. TARIF CÔTÉ SERVEUR (le client choisit la formule, jamais le prix) ──
    const plan = req.body?.plan === 'annual' ? 'annual' : 'monthly';
    const priceId = plan === 'annual' ? process.env.STRIPE_PRICE_ID_ANNUAL : process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      console.error(`[create-checkout] ${plan === 'annual' ? 'STRIPE_PRICE_ID_ANNUAL' : 'STRIPE_PRICE_ID'} manquant dans les variables Vercel`);
      return res.status(500).json({ error: 'Configuration serveur incomplète.' });
    }

    // ── 3. RÉUTILISER LE CLIENT STRIPE EXISTANT (évite les doublons) ──
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, is_premium, subscription_status, premium_until, stripe_subscription_id')
      .eq('id', user.id)
      .maybeSingle();

    const giftUntil = profile?.subscription_status === 'gift' && profile?.premium_until ? new Date(profile.premium_until).getTime() : 0;
    if (profile?.is_premium && !(giftUntil > Date.now())) {
      return res.status(400).json({ error: 'Tu es déjà abonné à Premium.' });
    }

    let customerId = profile?.stripe_customer_id || null;
    // Identifiant créé en mode test (ou client supprimé) : inconnu en production, on en recrée un
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if (existing.deleted) customerId = null;
      } catch (e) {
        if (e.code === 'resource_missing') customerId = null; else throw e;
      }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin.from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // ── 4. PARRAINAGE ──
    // Filleul jamais abonné, formule mensuelle : −50 % sur la 1re facture (coupon créé une fois pour toutes)
    let discounts = null;
    if (plan === 'monthly' && !profile?.stripe_subscription_id) {
      const { data: ref } = await supabaseAdmin.from('referrals').select('id').eq('referee_id', user.id).is('paid_at', null).maybeSingle();
      if (ref) {
        try { await stripe.coupons.retrieve('PARRAINAGE50'); }
        catch (e) { if (e.code === 'resource_missing') await stripe.coupons.create({ id: 'PARRAINAGE50', percent_off: 50, duration: 'once', name: 'Parrainage : −50 % le 1er mois' }); else throw e; }
        discounts = [{ coupon: 'PARRAINAGE50' }];
      }
    }
    // Parrain qui a des mois offerts en cours : l'abonnement ne commence à être facturé qu'à leur fin
    const trialEnd = giftUntil > Date.now() + 2 * 86400000 ? Math.floor(giftUntil / 1000) : null;

    // ── 5. SESSION DE PAIEMENT ──
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan }, ...(trialEnd ? { trial_end: trialEnd } : {}) },
      ...(discounts ? { discounts } : { allow_promotion_codes: true }),
      locale: 'fr',
      success_url: `${APP_URL}?premium=success`,
      cancel_url: `${APP_URL}?premium=cancel`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout]', err.message);
    return res.status(500).json({ error: 'Impossible de démarrer le paiement : ' + err.message });
  }
}
