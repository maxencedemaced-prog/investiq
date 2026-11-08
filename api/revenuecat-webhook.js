// api/revenuecat-webhook.js — abonnements App Store (via RevenueCat) → statut Premium dans profiles.
// Seul ce serveur écrit le statut : l'appli ne peut pas s'accorder Premium elle-même.
// À configurer le moment venu : variable Vercel REVENUECAT_WEBHOOK_SECRET, et la même valeur dans
// RevenueCat > Integrations > Webhooks > Authorization header.
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const PLANS = { kapitaro_premium_monthly: 'monthly', kapitaro_premium_annual: 'annual' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function authorized(req) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  const got = String(req.headers.authorization || '');
  if (!secret || !got) return false;
  const a = crypto.createHash('sha256').update(got).digest();
  const b = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

async function logEvent(userId, type, meta) {
  try {
    const { error } = await supabase.from('events').insert({ user_id: userId, type, meta: meta || null });
    if (error) console.warn('[revenuecat] event', type, error.message);
  } catch (e) { console.warn('[revenuecat] event', type, e.message); }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!authorized(req)) return res.status(401).json({ error: 'Non autorisé' });

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; } catch {}
  const ev = body.event;
  if (!ev || !ev.type) return res.status(400).json({ error: 'Événement invalide' });
  if (ev.type === 'TEST') return res.status(200).json({ ok: true });

  const userId = [ev.app_user_id, ev.original_app_user_id, ...(Array.isArray(ev.aliases) ? ev.aliases : [])].find(id => UUID.test(String(id || '')));
  if (!userId) { console.warn('[revenuecat] utilisateur inconnu', ev.type); return res.status(200).json({ ok: true, ignored: 'user' }); }

  const { data: profile, error: readError } = await supabase.from('profiles')
    .select('id, stripe_subscription_id, subscription_status, premium_until').eq('id', userId).maybeSingle();
  if (readError) return res.status(500).json({ error: readError.message });   // RevenueCat réessaiera
  if (!profile) return res.status(200).json({ ok: true, ignored: 'profile' });

  // Abonné Stripe encore en cours : c'est Stripe qui décide, l'App Store ne doit pas lui couper son accès
  const stripeLive = profile.stripe_subscription_id
    && ['active', 'trialing', 'past_due', 'cancel_at_period_end'].includes(profile.subscription_status)
    && profile.premium_until && new Date(profile.premium_until).getTime() > Date.now();
  if (stripeLive) { await logEvent(userId, 'store_event_ignored', { type: ev.type, store: ev.store || null }); return res.status(200).json({ ok: true, ignored: 'stripe' }); }

  const until = ev.expiration_at_ms ? new Date(Number(ev.expiration_at_ms)).toISOString() : null;
  const plan = PLANS[ev.product_id] || null;
  const meta = { store: ev.store || null, environment: ev.environment || null, plan, event_id: ev.id || null };
  let payload = null, logType = null;

  switch (ev.type) {
    case 'INITIAL_PURCHASE':
    case 'NON_RENEWING_PURCHASE':
      payload = { is_premium: true, premium_until: until, subscription_status: 'active' };
      logType = 'premium_activated';
      break;
    case 'RENEWAL':
      payload = { is_premium: true, premium_until: until, subscription_status: 'active' };
      logType = 'subscription_renewed';
      break;
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
      payload = { is_premium: true, premium_until: until, subscription_status: 'active' };
      if (ev.type === 'UNCANCELLATION') logType = 'cancel_reverted';
      break;
    case 'CANCELLATION':
      // Remboursement par Apple : fin immédiate. Résiliation normale : accès conservé jusqu'à la fin de la période.
      if (ev.cancel_reason === 'CUSTOMER_SUPPORT') payload = { is_premium: false, premium_until: new Date().toISOString(), subscription_status: 'canceled' };
      else { payload = { is_premium: true, premium_until: until, subscription_status: 'cancel_at_period_end' }; logType = 'cancel_scheduled'; }
      break;
    case 'BILLING_ISSUE':
      payload = { subscription_status: 'past_due' };
      if (until) payload.premium_until = until;
      logType = 'payment_failed';
      break;
    case 'EXPIRATION':
      // Événement en retard après un renouvellement : on l'ignore
      if (profile.premium_until && ev.expiration_at_ms && new Date(profile.premium_until).getTime() > Number(ev.expiration_at_ms) + 60000) return res.status(200).json({ ok: true, ignored: 'stale' });
      payload = { is_premium: false, premium_until: until, subscription_status: 'canceled' };
      break;
    default:
      return res.status(200).json({ ok: true, ignored: ev.type });
  }

  if (plan && payload) payload.subscription_plan = plan;
  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
  if (error) return res.status(500).json({ error: error.message });   // RevenueCat réessaiera
  if (logType) await logEvent(userId, logType, meta);
  return res.status(200).json({ ok: true });
};
