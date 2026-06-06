// api/push-subscribe.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; } catch {}

  if (req.method === 'POST') {
    const { subscription, user_id } = body;
    if (!subscription || !user_id) return res.status(400).json({ error: 'Missing fields' });

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id,
        subscription: JSON.stringify(subscription),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { user_id } = body;
    if (user_id) await supabase.from('push_subscriptions').delete().eq('user_id', user_id);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
