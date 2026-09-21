// api/push-subscribe.js — SÉCURISÉ
// Le user_id n'est jamais fourni par le client : il est déduit du token vérifié.
//   POST   { subscription }            → enregistre l'appareil courant
//   POST   { test:true, endpoint }     → envoie une notification test à cet appareil
//   DELETE { endpoint? }               → retire cet appareil (ou tous, sans endpoint)
const { createClient } = require('@supabase/supabase-js');
const { pushReady, sendToDevice } = require('./_push');

const ALLOWED_ORIGINS = [
  'https://investiq-kappa.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function getUserIdFromToken(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = await getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; } catch {}

  if (req.method === 'POST') {
    // ── Test : notification envoyée tout de suite à l'appareil qui le demande ──
    if (body.test) {
      if (!pushReady()) return res.status(503).json({ error: 'Clés VAPID manquantes côté serveur.' });
      let q = supabase.from('push_devices').select('endpoint, subscription').eq('user_id', userId);
      if (body.endpoint) q = q.eq('endpoint', String(body.endpoint));
      const { data: devices, error } = await q;
      if (error) return res.status(500).json({ error: error.message });
      if (!devices?.length) return res.status(404).json({ error: 'Aucun appareil enregistré.' });
      let sent = 0, lastErr = '';
      for (const d of devices) {
        const r = await sendToDevice(d, {
          title: '🔔 Notifications activées',
          body: 'Tu recevras ton briefing du matin et une alerte quand un prix tombe sous ton seuil.',
          tag: 'investiq-test',
        });
        if (r.ok) sent++;
        else { lastErr = r.error; if (r.gone) await supabase.from('push_devices').delete().eq('endpoint', d.endpoint); }
      }
      return sent ? res.status(200).json({ ok: true, sent }) : res.status(502).json({ error: lastErr || 'Envoi impossible.' });
    }

    // ── Enregistrement de l'appareil ──
    const sub = body.subscription;
    if (!sub || typeof sub.endpoint !== 'string' || !sub.keys?.p256dh || !sub.keys?.auth) {
      return res.status(400).json({ error: 'Abonnement invalide' });
    }
    const { error } = await supabase.from('push_devices').upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      subscription: JSON.stringify(sub),
      user_agent: String(req.headers['user-agent'] || '').slice(0, 200),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });   // même appareil qui change de compte : l'abonnement passe au nouveau compte
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    let q = supabase.from('push_devices').delete().eq('user_id', userId);
    if (body.endpoint) q = q.eq('endpoint', String(body.endpoint));
    const { error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
