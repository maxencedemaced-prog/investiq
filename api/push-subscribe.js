// api/push-subscribe.js — SÉCURISÉ
// Le user_id n'est plus fourni par le client : il est déduit du token vérifié.
const { createClient } = require('@supabase/supabase-js');

const ALLOWED_ORIGINS = [
  'https://investiq-kappa.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Vérifie le token utilisateur et renvoie son id (ou null)
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

  // Authentification obligatoire — le user_id vient du token, pas du body
  const userId = await getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; } catch {}

  if (req.method === 'POST') {
    const { subscription } = body;
    if (!subscription) return res.status(400).json({ error: 'Missing subscription' });

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        subscription: JSON.stringify(subscription),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
