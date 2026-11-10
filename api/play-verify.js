// api/play-verify.js — abonnements Google Play (appli Android) → statut Premium dans profiles.
// Deux usages, un seul point d'API :
//   POST /api/play-verify                    (appli, jeton Supabase « Bearer ») : { purchaseToken, productId }
//        → vérifie l'achat auprès de Google, l'accuse réception (sinon Google le rembourse au bout de 3 jours)
//          et active Premium sur le compte connecté. Sert aussi à la restauration (achats retrouvés par l'appli).
//   POST /api/play-verify?rtdn=<secret>      (Google Pub/Sub, notifications en temps réel « RTDN »)
//        → renouvellement, résiliation, échec de paiement, expiration, remboursement : relit l'abonnement chez Google
//          et met le profil à jour.
// Seul ce serveur écrit le statut : l'appli ne peut pas s'accorder Premium elle-même (voir SUPABASE_PLAY_BILLING.sql).
// Variables Vercel : GOOGLE_PLAY_SERVICE_ACCOUNT (fichier JSON de la clé du compte de service, tel quel ou en base64),
//                    PLAY_RTDN_SECRET (texte aléatoire, le même que dans l'adresse d'envoi Pub/Sub),
//                    PLAY_PACKAGE_NAME (facultatif, fr.kapitaro.app par défaut).
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const PACKAGE = process.env.PLAY_PACKAGE_NAME || 'fr.kapitaro.app';
const PLANS = { kapitaro_premium_monthly: 'monthly', kapitaro_premium_annual: 'annual' };
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + encodeURIComponent(PACKAGE) + '/purchases';

// ── Accès à l'API Google Play Developer avec le compte de service (jeton OAuth signé localement, gardé ~55 min) ──
let cachedToken = null;
function serviceAccount() {
  const raw = String(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT || '').trim();
  if (!raw) throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT manquant');
  const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const sa = JSON.parse(json);
  if (!sa.client_email || !sa.private_key) throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT incomplet');
  return sa;
}
async function googleToken() {
  if (cachedToken && cachedToken.exp > Date.now() + 60000) return cachedToken.value;
  const sa = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  });
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + signature }),
    signal: AbortSignal.timeout(15000),
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok || !out.access_token) throw new Error('Connexion Google refusée (' + r.status + ')');
  cachedToken = { value: out.access_token, exp: Date.now() + (Number(out.expires_in) || 3600) * 1000 };
  return cachedToken.value;
}
async function google(method, url, body) {
  const r = await fetch(url, {
    method,
    headers: { Authorization: 'Bearer ' + await googleToken(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const text = await r.text();
  if (!r.ok) { const e = new Error('Google Play HTTP ' + r.status); e.status = r.status; e.detail = text.slice(0, 300); throw e; }
  return text ? JSON.parse(text) : {};
}
const getSubscription = token => google('GET', API + '/subscriptionsv2/tokens/' + encodeURIComponent(token));
const acknowledge = (productId, token) => google('POST', API + '/subscriptions/' + encodeURIComponent(productId) + '/tokens/' + encodeURIComponent(token) + ':acknowledge', {});

// ── Abonnement Google → colonnes du profil ──
function lineItem(sub) {
  const items = (sub.lineItems || []).filter(li => PLANS[li.productId]);
  items.sort((a, b) => new Date(b.expiryTime || 0) - new Date(a.expiryTime || 0));
  return items[0] || null;
}
function profilePayload(sub, token) {
  const li = lineItem(sub);
  if (!li) return null;
  const until = li.expiryTime ? new Date(li.expiryTime).toISOString() : null;
  const live = until && new Date(until).getTime() > Date.now();
  const base = { premium_until: until, subscription_plan: PLANS[li.productId], premium_source: 'play', play_purchase_token: token };
  switch (sub.subscriptionState) {
    case 'SUBSCRIPTION_STATE_ACTIVE': {
      const renews = !li.autoRenewingPlan || li.autoRenewingPlan.autoRenewEnabled !== false;
      return { ...base, is_premium: !!live, subscription_status: renews ? 'active' : 'cancel_at_period_end' };
    }
    case 'SUBSCRIPTION_STATE_CANCELED':          // résilié : accès gardé jusqu'à la fin de la période payée
      return { ...base, is_premium: !!live, subscription_status: live ? 'cancel_at_period_end' : 'canceled' };
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':   // paiement refusé, Google réessaie : accès gardé
      return { ...base, is_premium: true, subscription_status: 'past_due' };
    case 'SUBSCRIPTION_STATE_ON_HOLD':           // paiement toujours refusé : accès suspendu
    case 'SUBSCRIPTION_STATE_PAUSED':
      return { ...base, is_premium: false, subscription_status: 'unpaid' };
    case 'SUBSCRIPTION_STATE_EXPIRED':
      return { ...base, is_premium: false, subscription_status: 'canceled', premium_until: until && live ? new Date().toISOString() : until };
    default:                                     // en attente de paiement (PENDING…) : rien à activer pour l'instant
      return null;
  }
}

// Abonné Stripe encore en cours : c'est Stripe qui décide, Google ne doit pas lui couper son accès
function stripeLive(p) {
  return !!(p && p.stripe_subscription_id
    && ['active', 'trialing', 'past_due', 'cancel_at_period_end'].includes(p.subscription_status)
    && p.premium_until && new Date(p.premium_until).getTime() > Date.now());
}
const PROFILE_COLS = 'id, stripe_subscription_id, subscription_status, premium_until, premium_source, play_purchase_token';

async function logEvent(userId, type, meta) {
  try {
    const { error } = await supabase.from('events').insert({ user_id: userId, type, meta: meta || null });
    if (error) console.warn('[play] event', type, error.message);
  } catch (e) { console.warn('[play] event', type, e.message); }
}

function sameSecret(a, b) {
  if (!a || !b) return false;
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

// ── 1. Achat ou restauration depuis l'appli ──
async function verifyFromApp(req, res) {
  const jwt = String(req.headers.authorization || '').replace(/^Bearer /, '');
  if (!jwt) return res.status(401).json({ error: 'Connexion requise' });
  const { data: auth, error: authError } = await supabase.auth.getUser(jwt);
  const user = auth && auth.user;
  if (authError || !user) return res.status(401).json({ error: 'Session expirée. Reconnecte-toi.' });

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; } catch {}
  const token = String(body.purchaseToken || '').trim();
  if (!token || token.length > 4096) return res.status(400).json({ error: 'Achat invalide' });

  let sub;
  try { sub = await getSubscription(token); }
  catch (e) {
    console.warn('[play] lecture', e.message, e.detail || '');
    if (e.status === 400 || e.status === 404 || e.status === 410) return res.status(400).json({ error: 'Achat introuvable chez Google Play' });
    return res.status(502).json({ error: 'Google Play ne répond pas, réessaie dans un instant' });
  }
  const li = lineItem(sub);
  if (!li) return res.status(400).json({ error: 'Produit inconnu' });
  const payload = profilePayload(sub, token);
  if (!payload) return res.status(202).json({ ok: true, premium: false, pending: true });

  // Un abonnement Google Play ne débloque qu'un seul compte Kapitaro
  const tokens = [token, sub.linkedPurchaseToken].filter(Boolean);
  const { data: owners, error: ownErr } = await supabase.from('profiles').select('id').in('play_purchase_token', tokens).neq('id', user.id);
  if (ownErr) return res.status(500).json({ error: 'Erreur serveur, réessaie' });
  if (owners && owners.length && payload.is_premium) {
    return res.status(409).json({ error: 'Cet abonnement Google Play est déjà lié à un autre compte Kapitaro. Connecte-toi avec ce compte.' });
  }

  // Accusé de réception obligatoire (sinon remboursement automatique par Google au bout de 3 jours)
  if (sub.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING') {
    try { await acknowledge(li.productId, token); }
    catch (e) { console.warn('[play] accusé de réception', e.message, e.detail || ''); return res.status(502).json({ error: 'Google Play ne répond pas, réessaie dans un instant' }); }
  }

  const { data: profile, error: readError } = await supabase.from('profiles').select(PROFILE_COLS).eq('id', user.id).maybeSingle();
  if (readError || !profile) return res.status(500).json({ error: 'Profil introuvable' });
  if (stripeLive(profile)) {
    await logEvent(user.id, 'store_event_ignored', { store: 'play', reason: 'stripe' });
    return res.status(200).json({ ok: true, premium: true, ignored: 'stripe' });
  }
  const wasPremium = profile.premium_source === 'play' && profile.play_purchase_token === token && profile.subscription_status === 'active';
  const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
  if (error) return res.status(500).json({ error: 'Erreur serveur, réessaie' });
  if (payload.is_premium && !wasPremium) await logEvent(user.id, 'premium_activated', { store: 'play', plan: payload.subscription_plan, test: !!sub.testPurchase, restore: !!body.restore });
  return res.status(200).json({
    ok: true, premium: payload.is_premium, premium_until: payload.premium_until,
    subscription_status: payload.subscription_status, subscription_plan: payload.subscription_plan,
  });
}

// ── 2. Notification Google (Pub/Sub push) ──
const RTDN_LOG = { 2: 'subscription_renewed', 3: 'cancel_scheduled', 5: 'payment_failed', 6: 'payment_failed', 7: 'cancel_reverted', 12: 'premium_revoked', 13: 'premium_expired' };
async function notification(req, res) {
  if (!sameSecret(req.query.rtdn, process.env.PLAY_RTDN_SECRET)) return res.status(401).json({ error: 'Non autorisé' });
  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; } catch {}
  let note = {};
  try { note = JSON.parse(Buffer.from(String(body.message && body.message.data || ''), 'base64').toString('utf8')); } catch {}
  if (note.testNotification) return res.status(200).json({ ok: true, test: true });
  const sn = note.subscriptionNotification;
  if (!sn || !sn.purchaseToken) return res.status(200).json({ ok: true, ignored: 'type' });
  if (note.packageName && note.packageName !== PACKAGE) return res.status(200).json({ ok: true, ignored: 'package' });

  let sub;
  try { sub = await getSubscription(sn.purchaseToken); }
  catch (e) {
    console.warn('[play] rtdn lecture', e.message, e.detail || '');
    if (e.status === 400 || e.status === 404 || e.status === 410) return res.status(200).json({ ok: true, ignored: 'token' });
    return res.status(500).json({ error: 'Google indisponible' });   // Pub/Sub renverra la notification
  }

  // Compte lié : par ce jeton, ou par l'ancien jeton (changement de formule, réabonnement)
  const tokens = [sn.purchaseToken, sub.linkedPurchaseToken].filter(Boolean);
  const { data: rows, error: readError } = await supabase.from('profiles').select(PROFILE_COLS).in('play_purchase_token', tokens);
  if (readError) return res.status(500).json({ error: readError.message });
  const profile = (rows || []).find(p => p.play_purchase_token === sn.purchaseToken) || (rows || [])[0];
  // Achat pas encore relié à un compte : l'appli s'en charge juste après le paiement (play-verify)
  if (!profile) return res.status(200).json({ ok: true, ignored: 'user' });
  if (stripeLive(profile)) { await logEvent(profile.id, 'store_event_ignored', { store: 'play', type: sn.notificationType }); return res.status(200).json({ ok: true, ignored: 'stripe' }); }

  const payload = profilePayload(sub, sn.purchaseToken);
  if (!payload) return res.status(200).json({ ok: true, ignored: sub.subscriptionState || 'state' });
  // Ancien jeton qui expire alors qu'un nouveau a pris le relais : on ne coupe pas l'accès
  if (profile.play_purchase_token !== sn.purchaseToken && !payload.is_premium) return res.status(200).json({ ok: true, ignored: 'stale' });

  const li = lineItem(sub);
  if (sub.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING' && li && payload.is_premium) {
    try { await acknowledge(li.productId, sn.purchaseToken); } catch (e) { console.warn('[play] rtdn accusé', e.message); }
  }
  const { error } = await supabase.from('profiles').update(payload).eq('id', profile.id);
  if (error) return res.status(500).json({ error: error.message });   // Pub/Sub renverra la notification
  if (RTDN_LOG[sn.notificationType]) await logEvent(profile.id, RTDN_LOG[sn.notificationType], { store: 'play', plan: payload.subscription_plan, message_id: body.message && body.message.messageId || null });
  return res.status(200).json({ ok: true });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    if (req.query && req.query.rtdn !== undefined) return await notification(req, res);
    return await verifyFromApp(req, res);
  } catch (e) {
    console.error('[play]', e.message);
    return res.status(500).json({ error: 'Erreur serveur, réessaie' });
  }
};
