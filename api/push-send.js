// api/push-send.js — v2
// Deux modes :
//   ?mode=briefing (défaut) → briefing quotidien du matin, toujours le briefing
//   ?mode=alerts            → vérifie les franchissements de prix d'alerte (intra-day)
export const config = { runtime: 'nodejs' };

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

const fmtK = (n) => n >= 1000 ? (n/1000).toFixed(1).replace('.', ',') + ' k€' : Math.round(n) + ' €';

// Prix live Finnhub (pour le mode alerts)
async function fetchLivePrice(symbol) {
  try {
    const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${process.env.FINNHUB_API_KEY}`);
    const d = await r.json();
    return d && d.c > 0 ? { price: d.c, changePct: d.dp || 0 } : null;
  } catch { return null; }
}

async function sendPush(subscriptionRaw, payload) {
  const subscription = JSON.parse(subscriptionRaw);
  await webpush.sendNotification(subscription, JSON.stringify({
    icon: '/icons/icon-192.png', url: '/', ...payload
  }));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const isTest = req.query && req.query.test === '1';
  const mode = (req.query && req.query.mode) || 'briefing';

  if (!isTest) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // ── MODE TEST ──
  if (isTest) {
    let body = {};
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; } catch {}
    const user_id = body.user_id;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    const { data: sub, error: subErr } = await supabase
      .from('push_subscriptions').select('subscription').eq('user_id', user_id).single();
    if (subErr || !sub) return res.status(404).json({ error: 'No subscription found.' });
    try {
      await sendPush(sub.subscription, {
        title: '🧪 Test InvestIQ',
        body: 'Les notifications fonctionnent ! Briefing chaque matin à 8h, alertes prix en journée.',
        tag: 'investiq-test',
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  const { data: subs, error } = await supabase
    .from('push_subscriptions').select('user_id, subscription');
  if (error || !subs?.length) return res.status(200).json({ sent: 0, error: error?.message });

  let sent = 0, failed = 0;

  // ══════════════════════════════════════════════════
  //  MODE BRIEFING (8h) — TOUJOURS le briefing du jour
  // ══════════════════════════════════════════════════
  if (mode === 'briefing') {
    for (const sub of subs) {
      try {
        const { data: positions } = await supabase
          .from('positions').select('name, price, pru, qty').eq('user_id', sub.user_id);

        let totalVal = 0, totalCost = 0;
        (positions || []).forEach(p => { totalVal += (p.price || p.pru) * p.qty; totalCost += p.pru * p.qty; });
        const pnl = totalVal - totalCost;
        const pnlPct = totalCost > 0 ? (pnl / totalCost * 100) : 0;
        const inLoss = (positions || []).filter(p => p.pru > 0 && (p.price - p.pru) / p.pru * 100 < -10).length;

        // Le briefing reste le briefing. Les positions en difficulté sont mentionnées
        // dans le corps, elles ne remplacent plus le titre.
        const title = '☀️ Ton briefing InvestIQ';
        let body = `${fmtK(totalVal)} · ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}% global · ${(positions || []).length} positions`;
        if (inLoss > 0) body += ` · ${inLoss} à surveiller`;

        await sendPush(sub.subscription, { title, body, tag: 'investiq-daily' });
        sent++;
      } catch (err) {
        failed++;
        if (err.statusCode === 410) await supabase.from('push_subscriptions').delete().eq('user_id', sub.user_id);
      }
    }
    return res.status(200).json({ mode, sent, failed });
  }

  // ══════════════════════════════════════════════════════════════
  //  MODE ALERTS (intra-day) — franchissements de prix d'alerte
  //  N'envoie QUE si un seuil défini par l'utilisateur est franchi,
  //  max 1 alerte / position / 24h (colonne alert_sent_at).
  // ══════════════════════════════════════════════════════════════
  if (mode === 'alerts') {
    for (const sub of subs) {
      try {
        const { data: positions } = await supabase
          .from('positions')
          .select('id, name, price, alert_price, alert_sent_at')
          .eq('user_id', sub.user_id)
          .not('alert_price', 'is', null);
        if (!positions?.length) continue;

        const dayAgo = Date.now() - 24 * 3600 * 1000;
        const triggered = [];

        for (const p of positions) {
          if (p.alert_sent_at && new Date(p.alert_sent_at).getTime() > dayAgo) continue; // déjà alerté < 24h
          const live = await fetchLivePrice(p.name);
          if (!live) continue;
          if (live.price <= p.alert_price) {
            triggered.push({ ...p, livePrice: live.price });
            await supabase.from('positions')
              .update({ price: live.price, alert_sent_at: new Date().toISOString() })
              .eq('id', p.id);
          }
        }

        if (triggered.length) {
          const first = triggered[0];
          const title = `🔔 Alerte prix — ${first.name}`;
          let body = `${first.name} a atteint ${first.livePrice.toFixed(2)} € (ton seuil : ${Number(first.alert_price).toFixed(2)} €)`;
          if (triggered.length > 1) body += ` · +${triggered.length - 1} autre${triggered.length > 2 ? 's' : ''} alerte${triggered.length > 2 ? 's' : ''}`;
          await sendPush(sub.subscription, { title, body, tag: 'investiq-alert-' + first.id });
          sent++;
        }
      } catch (err) {
        failed++;
        if (err.statusCode === 410) await supabase.from('push_subscriptions').delete().eq('user_id', sub.user_id);
      }
    }
    return res.status(200).json({ mode, sent, failed });
  }

  return res.status(400).json({ error: 'Unknown mode' });
};
