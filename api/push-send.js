// api/push-send.js
const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

webpush.setVapidDetails(
  'mailto:contact@investiq.fr',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const isTest = req.query.test === '1';

  if (!isTest) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (isTest) {
    const { user_id } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    const { data: sub } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)
      .single();

    if (!sub) return res.status(404).json({ error: 'No subscription found' });

    try {
      const subscription = JSON.parse(sub.subscription);
      await webpush.sendNotification(subscription, JSON.stringify({
        title: '🧪 Test InvestIQ',
        body: 'Les notifications fonctionnent ! Ton briefing arrive chaque matin à 8h.',
        icon: '/icons/icon-192.png',
        url: '/',
        tag: 'investiq-test',
      }));
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription');

  if (error || !subs?.length) {
    return res.status(200).json({ sent: 0, error: error?.message });
  }

  let sent = 0, failed = 0;

  for (const sub of subs) {
    try {
      const subscription = JSON.parse(sub.subscription);
      const { data: positions } = await supabase
        .from('positions')
        .select('name, price, pru, qty')
        .eq('user_id', sub.user_id);

      let totalVal = 0, totalCost = 0;
      (positions || []).forEach(p => {
        totalVal  += (p.price || p.pru) * p.qty;
        totalCost += p.pru * p.qty;
      });
      const pnlPct = totalCost > 0 ? ((totalVal - totalCost) / totalCost * 100).toFixed(1) : 0;
      const alerts = (positions || []).filter(p => p.pru > 0 && (p.price - p.pru) / p.pru * 100 < -10);

      let title = '📊 Briefing InvestIQ';
      let body  = `Portefeuille : ${pnlPct >= 0 ? '+' : ''}${pnlPct}%`;
      if (alerts.length > 0) {
        title = `⚠️ ${alerts.length} alerte${alerts.length > 1 ? 's' : ''} détectée${alerts.length > 1 ? 's' : ''}`;
        body  = `${alerts[0].name} en baisse · ${body}`;
      }

      await webpush.sendNotification(subscription, JSON.stringify({
        title, body, icon: '/icons/icon-192.png', url: '/', tag: 'investiq-daily'
      }));
      sent++;
    } catch (err) {
      failed++;
      if (err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('user_id', sub.user_id);
      }
    }
  }

  return res.status(200).json({ sent, failed });
};
