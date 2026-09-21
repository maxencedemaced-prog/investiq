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
  let { data: devices, error } = await supabase.from('push_devices').select('user_id, endpoint, subscription, moves');
  if (error) ({ data: devices, error } = await supabase.from('push_devices').select('user_id, endpoint, subscription'));   // colonne « moves » pas encore créée
  if (error) throw new Error('lecture push_devices : ' + error.message);
  const byUser = new Map();
  for (const d of devices || []) {
    if (!byUser.has(d.user_id)) byUser.set(d.user_id, { userId: d.user_id, devices: [], notif: 'daily', watchlist: [] });
    byUser.get(d.user_id).devices.push(d);
  }
  const ids = [...byUser.keys()];
  for (const part of chunk(ids, 100)) {
    const { data: profs } = await supabase.from('profiles').select('id, notif, watchlist').in('id', part);
    for (const p of profs || []) if (byUser.has(p.id)) {
      const u = byUser.get(p.id);
      u.notif = p.notif || 'daily';
      u.watchlist = Array.isArray(p.watchlist) ? p.watchlist.filter(w => w && typeof w.ticker === 'string') : [];
    }
  }
  const users = [...byUser.values()];
  users.forEach(u => { u.moves = u.devices.some(d => d.moves !== false); });   // au moins un appareil veut les alertes de mouvements
  return users;
}

async function loadPositions(userIds, alertsOnly) {
  const rows = [];
  for (const part of chunk(userIds, 100)) {
    let q = supabase.from('positions').select('id, user_id, name, type, qty, pru, price, alert_price, alert_sent_at').in('user_id', part);
    if (alertsOnly) q = q.not('alert_price', 'is', null);
    const { data, error } = await q;
    if (error) throw new Error('lecture positions : ' + error.message);
    rows.push(...(data || []));
  }
  return rows;
}

// Envoie à tous les appareils de l'utilisateur ; supprime ceux qui n'existent plus. Renvoie le nombre d'appareils joints.
async function notifyUser(user, payload, deviceFilter, urgency = 'normal') {
  let ok = 0;
  for (const d of user.devices) {
    if (deviceFilter && !deviceFilter(d)) continue;
    const r = await sendToDevice(d, payload, urgency);
    if (r.ok) ok++;
    else if (r.gone) await supabase.from('push_devices').delete().eq('endpoint', d.endpoint);
    else console.error('[push-send] échec pour', user.userId, ':', r.error);
  }
  return ok;
}

// ── Alertes « ça bouge » ──
// Seuils de variation sur la séance : action de ton portefeuille ou de ta watchlist 5 % · ETF 3 % · grande valeur du marché 6 %.
const MOVE_STOCK = 5, MOVE_ETF = 3, MOVE_MARKET = 6, MOVE_MAX_PER_PUSH = 3, MOVE_MAX_MARKET = 2;
const MARKET_LIST = {
  'MC.PA': 'LVMH', 'OR.PA': "L'Oréal", 'RMS.PA': 'Hermès', 'TTE.PA': 'TotalEnergies', 'SAN.PA': 'Sanofi', 'AIR.PA': 'Airbus',
  'AI.PA': 'Air Liquide', 'SU.PA': 'Schneider Electric', 'BNP.PA': 'BNP Paribas', 'CS.PA': 'AXA', 'SAF.PA': 'Safran',
  'DG.PA': 'Vinci', 'KER.PA': 'Kering', 'STLAP.PA': 'Stellantis', 'ASML.AS': 'ASML', 'SAP.DE': 'SAP', 'SIE.DE': 'Siemens',
  'AAPL': 'Apple', 'MSFT': 'Microsoft', 'NVDA': 'NVIDIA', 'GOOGL': 'Alphabet', 'AMZN': 'Amazon', 'META': 'Meta', 'TSLA': 'Tesla',
  'JPM': 'JPMorgan', 'V': 'Visa', 'NFLX': 'Netflix', 'AMD': 'AMD',
};
const sameSym = (a, b) => String(a).toUpperCase() === String(b).toUpperCase();

// Plafond : 2 alertes par jour et par utilisateur (prix + mouvements confondus). Le briefing du matin n'est pas compté.
const MAX_ALERTS_PER_DAY = 2;
const todayKey = () => new Date().toISOString().slice(0, 10);

async function loadAlertCounts(users) {
  const counts = new Map();
  for (const part of chunk(users.map(u => u.userId), 100)) {
    const { data, error } = await supabase.from('push_events').select('user_id').in('user_id', part).like('event_key', `push:${todayKey()}:%`);
    if (error) { console.warn('[push-send] plafond non appliqué (push_events) :', error.message); continue; }
    (data || []).forEach(e => counts.set(e.user_id, (counts.get(e.user_id) || 0) + 1));
  }
  return counts;
}
async function countAlert(userId, counts) {
  const n = (counts.get(userId) || 0) + 1;
  counts.set(userId, n);
  await supabase.from('push_events').upsert({ user_id: userId, event_key: `push:${todayKey()}:${n}` }, { onConflict: 'user_id,event_key', ignoreDuplicates: true });
}

async function sendMoves(users, alertCount) {
  users = users.filter(u => (alertCount.get(u.userId) || 0) < MAX_ALERTS_PER_DAY);   // plafond du jour atteint
  if (!users.length) return 0;
  const day = new Date().toISOString().slice(0, 10);

  // Déjà envoyé aujourd'hui ? Si la table de suivi est absente on s'abstient (sinon on renverrait la même alerte toutes les 30 min).
  const done = new Set();
  for (const part of chunk(users.map(u => u.userId), 100)) {
    const { data, error } = await supabase.from('push_events').select('user_id, event_key').in('user_id', part).like('event_key', `mv:%:${day}`);
    if (error) throw new Error('lecture push_events (SUPABASE_PUSH.sql exécuté ?) : ' + error.message);
    (data || []).forEach(e => done.add(e.user_id + '|' + e.event_key));
  }

  const positions = await loadPositions(users.map(u => u.userId), false);
  const symbols = [...Object.keys(MARKET_LIST), ...positions.map(p => p.name), ...users.flatMap(u => u.watchlist.map(w => w.ticker))];
  const quotes = await getQuotes(symbols, { preferYahoo: true });
  let sent = 0;

  for (const u of users) {
    const cands = [], seen = new Set();
    const add = (sym, label, where, threshold, rank) => {
      const q = quotes[sym]; const k = sym.toUpperCase();
      if (!q || seen.has(k) || Math.abs(q.changePct) < threshold) return;
      seen.add(k);
      if (done.has(`${u.userId}|mv:${k}:${day}`)) return;
      cands.push({ key: `mv:${k}:${day}`, label, where, pct: q.changePct, rank });
    };
    for (const p of positions.filter(p => p.user_id === u.userId)) add(p.name, p.name, 'dans ton portefeuille', /etf/i.test(p.type || '') ? MOVE_ETF : MOVE_STOCK, 0);
    for (const w of u.watchlist) add(w.ticker, w.name || w.ticker, 'dans ta watchlist', MOVE_STOCK, 1);
    for (const [sym, name] of Object.entries(MARKET_LIST)) {
      if (!positions.some(p => p.user_id === u.userId && sameSym(p.name, sym)) && !u.watchlist.some(w => sameSym(w.ticker, sym))) add(sym, name, 'sur le marché', MOVE_MARKET, 2);
    }
    if (!cands.length) continue;

    // Le plus concerné d'abord (portefeuille, puis watchlist, puis marché), puis les plus gros mouvements
    cands.sort((a, b) => a.rank - b.rank || Math.abs(b.pct) - Math.abs(a.pct));
    const picked = [];
    let marketCount = 0;
    for (const c of cands) {
      if (picked.length >= MOVE_MAX_PER_PUSH) break;
      if (c.rank === 2 && marketCount++ >= MOVE_MAX_MARKET) continue;
      picked.push(c);
    }

    const up = (c) => c.pct >= 0;
    const payload = picked.length === 1
      ? { title: `${up(picked[0]) ? '🚀' : '📉'} ${picked[0].label} ${fmtPct(picked[0].pct)}`, body: `${up(picked[0]) ? 'Forte hausse' : 'Forte baisse'} sur la séance, ${picked[0].where}.`, tag: 'investiq-move-' + picked[0].key }
      : { title: '📊 ça bouge sur les marchés', body: picked.map(c => `${up(c) ? '▲' : '▼'} ${c.label} ${fmtPct(c.pct)} (${c.where.replace('dans ton ', '').replace('dans ta ', '')})`).join('\n'), tag: 'investiq-moves-' + day };

    if (await notifyUser(u, payload, d => d.moves !== false, 'high')) {
      sent++;
      await countAlert(u.userId, alertCount);
      await supabase.from('push_events').upsert(picked.map(c => ({ user_id: u.userId, event_key: c.key })), { onConflict: 'user_id,event_key', ignoreDuplicates: true });
    }
  }
  return sent;
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

        if (await notifyUser(u, { title: '☀️ Ton briefing Kapitaro', body, tag: 'investiq-daily' })) sent++;
      }
      return res.status(200).json({ mode, users: targets.length, sent, skipped });
    }

    // ── Alertes de prix ──
    const positions = await loadPositions(recipients.map(u => u.userId), true);
    const dayAgo = Date.now() - 24 * 3600 * 1000;
    const due = positions.filter(p => !p.alert_sent_at || new Date(p.alert_sent_at).getTime() < dayAgo);
    const quotes = await getQuotes(due.map(p => p.name));
    let sent = 0, triggeredCount = 0;
    const alertCount = await loadAlertCounts(recipients);   // alertes déjà envoyées aujourd'hui, par utilisateur

    for (const u of recipients) {
      const hits = due.filter(p => p.user_id === u.userId && quotes[p.name] && quotes[p.name].price <= Number(p.alert_price));
      if (!hits.length) continue;
      triggeredCount += hits.length;
      if ((alertCount.get(u.userId) || 0) >= MAX_ALERTS_PER_DAY) continue;   // plafond du jour atteint : pas marquée « alertée », elle repartira demain si le prix reste sous le seuil
      const first = hits[0], q = quotes[first.name];
      let body = `${first.name} est à ${q.price.toFixed(2).replace('.', ',')} € (ton seuil : ${Number(first.alert_price).toFixed(2).replace('.', ',')} €)`;
      if (hits.length > 1) body += ` · +${hits.length - 1} autre${hits.length > 2 ? 's' : ''} alerte${hits.length > 2 ? 's' : ''}`;
      const reached = await notifyUser(u, { title: `🔔 Alerte prix · ${first.name}`, body, tag: 'investiq-alert-' + first.id }, null, 'high');
      if (reached) {
        sent++;
        await countAlert(u.userId, alertCount);
        // On ne marque « alerté » que si la notification est réellement partie : sinon on réessaiera au prochain passage
        await supabase.from('positions').update({ alert_sent_at: new Date().toISOString() }).in('id', hits.map(p => p.id));
      }
    }
    // ── Gros mouvements : une action de ton portefeuille, de ta watchlist ou une grande valeur du marché ──
    let movesSent = 0;
    try { movesSent = await sendMoves(recipients.filter(u => u.moves), alertCount); }
    catch (err) { console.error('[push-send] mouvements :', err.message); }

    return res.status(200).json({ mode, users: recipients.length, checked: due.length, triggered: triggeredCount, sent, movesSent });
  } catch (err) {
    console.error('[push-send]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
