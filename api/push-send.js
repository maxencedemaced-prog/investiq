// api/push-send.js — v3 : envoi programmé des notifications (appelé par les crons, jamais par le navigateur)
//   ?mode=briefing  → briefing du matin (valeur du portefeuille, variation de la dernière séance, à surveiller)
//   ?mode=alerts    → prix passé sous le seuil d'alerte d'une position (max 1 alerte / position / 24 h)
// Chaque utilisateur choisit dans ses paramètres : daily (chaque jour) · weekly (le lundi) · off (rien).
const { createClient } = require('@supabase/supabase-js');
const { pushReady, sendToDevice } = require('./_push');
const { getQuotes } = require('./_quotes');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const fmtEur = (n) => Math.abs(n) >= 1000
  ? (n / 1000).toFixed(1).replace('.', ',') + ' k€'
  : Math.round(n).toLocaleString('fr-FR') + ' €';
const fmtPct = (n) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(1).replace('.', ',') + ' %';
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

// Appareils regroupés par utilisateur, avec sa préférence de fréquence
async function loadRecipients() {
  const { data: devices, error } = await supabase.from('push_devices').select('user_id, endpoint, subscription');
  if (error) throw new Error('lecture push_devices : ' + error.message);
  const byUser = new Map();
  for (const d of devices || []) {
    if (!byUser.has(d.user_id)) byUser.set(d.user_id, { userId: d.user_id, devices: [], notif: 'daily' });
    byUser.get(d.user_id).devices.push(d);
  }
  const ids = [...byUser.keys()];
  for (const part of chunk(ids, 100)) {
    const { data: profs } = await supabase.from('profiles').select('id, notif').in('id', part);
    for (const p of profs || []) if (byUser.has(p.id)) byUser.get(p.id).notif = p.notif || 'daily';
  }
  return [...byUser.values()];
}

async function loadPositions(userIds, alertsOnly) {
  const rows = [];
  for (const part of chunk(userIds, 100)) {
    let q = supabase.from('positions').select('id, user_id, name, qty, pru, price, alert_price, alert_sent_at').in('user_id', part);
    if (alertsOnly) q = q.not('alert_price', 'is', null);
    const { data, error } = await q;
    if (error) throw new Error('lecture positions : ' + error.message);
    rows.push(...(data || []));
  }
  return rows;
}

// Envoie à tous les appareils de l'utilisateur ; supprime ceux qui n'existent plus. Renvoie le nombre d'appareils joints.
async function notifyUser(user, payload) {
  let ok = 0;
  for (const d of user.devices) {
    const r = await sendToDevice(d, payload);
    if (r.ok) ok++;
    else if (r.gone) await supabase.from('push_devices').delete().eq('endpoint', d.endpoint);
    else console.error('[push-send] échec pour', user.userId, ':', r.error);
  }
  return ok;
}

module.exports = async function handler(req, res) {
  // Réservé aux crons : sans le secret, ce point d'entrée pourrait notifier n'importe qui.
  if (!process.env.CRON_SECRET || req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!pushReady()) return res.status(500).json({ error: 'Clés VAPID manquantes (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).' });

  const mode = (req.query && req.query.mode) || 'briefing';
  if (mode !== 'briefing' && mode !== 'alerts') return res.status(400).json({ error: 'Unknown mode' });

  try {
    const recipients = (await loadRecipients()).filter(u => u.notif !== 'off');
    if (!recipients.length) return res.status(200).json({ mode, users: 0, sent: 0 });

    // ── Briefing du matin ──
    if (mode === 'briefing') {
      const isMonday = new Date().getUTCDay() === 1;
      const targets = recipients.filter(u => u.notif !== 'weekly' || isMonday);
      const positions = await loadPositions(targets.map(u => u.userId), false);
      const quotes = await getQuotes(positions.map(p => p.name));
      let sent = 0, skipped = 0;

      for (const u of targets) {
        const mine = positions.filter(p => p.user_id === u.userId);
        if (!mine.length) { skipped++; continue; }   // rien à résumer

        let value = 0, cost = 0, dayDelta = 0;
        const movers = [];
        for (const p of mine) {
          const q = quotes[p.name];
          const price = q ? q.price : (p.price || p.pru);
          const v = price * p.qty;
          value += v; cost += p.pru * p.qty;
          if (q && q.changePct) {
            dayDelta += v - v / (1 + q.changePct / 100);
            movers.push({ name: p.name, pct: q.changePct });
          }
        }
        const prevValue = value - dayDelta;
        const dayPct = prevValue > 0 ? dayDelta / prevValue * 100 : 0;
        const totalPct = cost > 0 ? (value - cost) / cost * 100 : 0;
        const inLoss = mine.filter(p => p.pru > 0 && ((quotes[p.name]?.price ?? p.price) - p.pru) / p.pru * 100 < -10).length;

        let body = movers.length
          ? `${fmtEur(value)} · ${fmtPct(dayPct)} à la dernière séance · ${fmtPct(totalPct)} depuis l'achat`
          : `${fmtEur(value)} · ${fmtPct(totalPct)} depuis l'achat · ${mine.length} position${mine.length > 1 ? 's' : ''}`;
        movers.sort((a, b) => b.pct - a.pct);
        if (movers.length > 1 && (Math.abs(movers[0].pct) >= 1.5 || Math.abs(movers[movers.length - 1].pct) >= 1.5)) {
          const best = movers[0], worst = movers[movers.length - 1];
          body += `\n▲ ${best.name} ${fmtPct(best.pct)} · ▼ ${worst.name} ${fmtPct(worst.pct)}`;
        }
        if (inLoss) body += `\n${inLoss} position${inLoss > 1 ? 's' : ''} à plus de 10 % sous ton prix d'achat`;

        if (await notifyUser(u, { title: '☀️ Ton briefing InvestIQ', body, tag: 'investiq-daily' })) sent++;
      }
      return res.status(200).json({ mode, users: targets.length, sent, skipped });
    }

    // ── Alertes de prix ──
    const positions = await loadPositions(recipients.map(u => u.userId), true);
    const dayAgo = Date.now() - 24 * 3600 * 1000;
    const due = positions.filter(p => !p.alert_sent_at || new Date(p.alert_sent_at).getTime() < dayAgo);
    const quotes = await getQuotes(due.map(p => p.name));
    let sent = 0, triggeredCount = 0;

    for (const u of recipients) {
      const hits = due.filter(p => p.user_id === u.userId && quotes[p.name] && quotes[p.name].price <= Number(p.alert_price));
      if (!hits.length) continue;
      triggeredCount += hits.length;
      const first = hits[0], q = quotes[first.name];
      let body = `${first.name} est à ${q.price.toFixed(2).replace('.', ',')} € (ton seuil : ${Number(first.alert_price).toFixed(2).replace('.', ',')} €)`;
      if (hits.length > 1) body += ` · +${hits.length - 1} autre${hits.length > 2 ? 's' : ''} alerte${hits.length > 2 ? 's' : ''}`;
      const reached = await notifyUser(u, { title: `🔔 Alerte prix · ${first.name}`, body, tag: 'investiq-alert-' + first.id });
      if (reached) {
        sent++;
        // On ne marque « alerté » que si la notification est réellement partie : sinon on réessaiera au prochain passage
        await supabase.from('positions').update({ alert_sent_at: new Date().toISOString() }).in('id', hits.map(p => p.id));
      }
    }
    return res.status(200).json({ mode, users: recipients.length, checked: due.length, triggered: triggeredCount, sent });
  } catch (err) {
    console.error('[push-send]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
