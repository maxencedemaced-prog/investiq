// ===== CONFIG =====
const SUPABASE_URL = 'https://soyyznyceqzimhoaffaw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3_8eb6YbCfJ04Qihdy9ivw_NsQ4H_cu';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== STATE =====
let currentUser = null;
let positions = [];
let profile = { bankroll: 5000, horizon: 'moyen', risk: 'faible' };
let objective = { target: 50000, years: 10, rate: 7, monthly: 200 };
let newsData = [];
let newsLoaded = false;
let newsFilter = 'tous';
let notifications = [];
let posSignals = {};
const HL = { court: 'Court terme (<3 ans)', moyen: 'Moyen terme (3–7 ans)', long: 'Long terme (>7 ans)' };
const RL = { faible: 'Faible', modere: 'Modérée', eleve: 'Élevée' };
const COLORS = ['#1d1d1f','#1a7f3c','#d70015','#1a56db','#92400e','#6b21a8'];

// ===== INIT =====
window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) await initApp(session.user);
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) await initApp(session.user);
    if (event === 'SIGNED_OUT') showAuth();
  });
});

async function initApp(user) {
  currentUser = user;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  const email = user.email || '';
  document.getElementById('topbar-email').textContent = email.split('@')[0];
  document.getElementById('topbar-avatar').textContent = (email[0] || 'U').toUpperCase();
  await loadProfile();
  await loadPositions();
  await loadObjective();
  nav('home');
  setTimeout(() => checkAndGenerateNotifications(), 3000);
  if ('Notification' in window) Notification.requestPermission();
}

function showAuth() {
  currentUser = null;
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

// ===== AUTH =====
function switchAuth(mode) {
  document.getElementById('auth-login').style.display = mode === 'login' ? 'block' : 'none';
  document.getElementById('auth-signup').style.display = mode === 'signup' ? 'block' : 'none';
  document.getElementById('tab-login').classList.toggle('active', mode === 'login');
  document.getElementById('tab-signup').classList.toggle('active', mode === 'signup');
  setAuthMsg('');
}
function setAuthMsg(msg, isError = true) {
  const el = document.getElementById('auth-msg');
  el.textContent = msg;
  el.className = 'auth-msg ' + (isError ? 'error' : 'success');
}
async function login() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!email || !pass) { setAuthMsg('Remplis tous les champs.'); return; }
  setAuthMsg('Connexion...', false);
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) setAuthMsg('Email ou mot de passe incorrect.');
}
async function signup() {
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-pass').value;
  const pass2 = document.getElementById('signup-pass2').value;
  if (!email || !pass) { setAuthMsg('Remplis tous les champs.'); return; }
  if (pass !== pass2) { setAuthMsg('Les mots de passe ne correspondent pas.'); return; }
  if (pass.length < 6) { setAuthMsg('Mot de passe trop court (6 min).'); return; }
  setAuthMsg('Création...', false);
  const { error } = await sb.auth.signUp({ email, password: pass });
  if (error) setAuthMsg(error.message);
  else setAuthMsg('Compte créé ! Vérifie ton email.', false);
}
async function logout() {
  await sb.auth.signOut();
  positions = []; newsLoaded = false; notifications = []; posSignals = {};
  closeSidebar();
}

// ===== DATA =====
async function loadProfile() {
  const { data } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
  if (data) {
    profile = { bankroll: data.bankroll || 5000, horizon: data.horizon || 'moyen', risk: data.risk || 'faible' };
    document.getElementById('s-bankroll').value = profile.bankroll;
    document.getElementById('s-horizon').value = profile.horizon;
    document.getElementById('s-risk').value = profile.risk;
  }
}
async function saveProfile() {
  profile.bankroll = parseFloat(document.getElementById('s-bankroll').value) || 5000;
  profile.horizon = document.getElementById('s-horizon').value;
  profile.risk = document.getElementById('s-risk').value;
  await sb.from('profiles').upsert({ id: currentUser.id, ...profile });
}
async function loadPositions() {
  const { data } = await sb.from('positions').select('*').eq('user_id', currentUser.id).order('created_at');
  positions = data || [];
}
async function loadObjective() {
  const { data } = await sb.from('objectives').select('*').eq('user_id', currentUser.id).single();
  if (data) {
    objective = { target: data.target, years: data.years, rate: data.rate, monthly: data.monthly };
    document.getElementById('obj-target').value = objective.target;
    document.getElementById('obj-years').value = objective.years;
    document.getElementById('obj-rate').value = objective.rate;
    document.getElementById('obj-monthly').value = objective.monthly;
  }
}

// ===== NAV =====
function nav(page) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('sec-' + page);
  const btn = document.getElementById('nav-' + page);
  if (sec) sec.classList.add('active');
  if (btn) btn.classList.add('active');
  closeSidebar();
  const renders = { home: renderHome, portfolio: renderPortfolio, sante: renderSante, objectif: renderObj, crise: renderCrise, dca: updateDCA, news: () => { if (!newsLoaded) loadNews(); } };
  if (renders[page]) renders[page]();
}
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

// ===== NOTIFICATIONS =====
function toggleNotifPanel() {
  document.getElementById('notif-panel').classList.toggle('open');
  document.getElementById('notif-dot').classList.remove('show');
}
function closeNotifPanel() {
  document.getElementById('notif-panel').classList.remove('open');
}

async function checkAndGenerateNotifications() {
  if (!positions.length) return;
  const prompt = `Analyse ce portefeuille et génère des alertes importantes pour aujourd'hui.
Positions : ${positions.map(p => `${p.name}(${p.type}, PRU:${p.pru}€, actuel:${p.price}€)`).join(', ')}
Retourne UNIQUEMENT un JSON (sans backticks) : tableau de max 4 objets {"titre":"...","texte":"1 phrase","action":"quoi faire en 1 phrase","impact":"high|medium|low","heure":"il y a X min"}
UNIQUEMENT le JSON.`;
  
  try {
    const raw = await callClaude(prompt, 'Tu es analyste financier. Retourne uniquement du JSON valide sans texte autour.');
    const s = raw.replace(/```json|```/g, '').trim();
    notifications = JSON.parse(s.slice(s.indexOf('['), s.lastIndexOf(']') + 1));
  } catch {
    notifications = [
      { titre: "Marché en hausse", texte: "Les indices européens progressent ce matin.", action: "Bon moment pour DCA sur ETF monde.", impact: "low", heure: "il y a 5 min" },
      { titre: "Vérification portefeuille", texte: "Ton portefeuille a été analysé.", action: "Consulte la section Santé pour les détails.", impact: "medium", heure: "maintenant" }
    ];
  }
  renderNotifications();
  if (notifications.length > 0) {
    document.getElementById('notif-dot').classList.add('show');
    if ('Notification' in window && Notification.permission === 'granted' && notifications.find(n => n.impact === 'high')) {
      const high = notifications.find(n => n.impact === 'high');
      new Notification('InvestIQ — Alerte importante', { body: high.titre + ' : ' + high.texte, icon: '/icons/icon-192.png' });
    }
  }
}

function renderNotifications() {
  const list = document.getElementById('notif-list');
  if (!notifications.length) { list.innerHTML = '<div class="notif-empty">Aucune notification pour l\'instant.</div>'; return; }
  list.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.impact}">
      <div class="notif-item-title">${n.titre}</div>
      <div class="notif-item-text">${n.texte}</div>
      <button class="notif-item-action">→ ${n.action}</button>
      <div class="notif-item-time">${n.heure}</div>
    </div>`).join('');
}

// ===== FORMATTERS =====
function fmt(n) { return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtK(n) { return n >= 1000 ? (n / 1000).toFixed(1) + ' k€' : fmt(n) + ' €'; }
function fmtI(n) { return Math.round(n).toLocaleString('fr-FR'); }

// ===== HOME =====
function renderHome() {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const name = (currentUser?.email || '').split('@')[0];
  document.getElementById('home-greeting').textContent = greet + ' ' + name + ' !';
  const tv = positions.reduce((a, p) => a + p.qty * p.price, 0);
  const ti = positions.reduce((a, p) => a + p.qty * p.pru, 0);
  const tpnl = tv - ti, tpct = ti ? tpnl / ti * 100 : 0;
  document.getElementById('home-metrics').innerHTML = `
    <div class="metric-card"><div class="metric-label">Valeur totale</div><div class="metric-val">${fmtK(tv)}</div></div>
    <div class="metric-card"><div class="metric-label">Plus-value</div><div class="metric-val ${tpnl >= 0 ? 'green' : 'red'}">${tpnl >= 0 ? '+' : ''}${fmtK(tpnl)}</div></div>
    <div class="metric-card"><div class="metric-label">Performance</div><div class="metric-val ${tpnl >= 0 ? 'green' : 'red'}">${tpnl >= 0 ? '+' : ''}${tpct.toFixed(2)}%</div></div>
    <div class="metric-card"><div class="metric-label">Bankroll</div><div class="metric-val blue">${fmtK(profile.bankroll)}</div></div>`;
  document.getElementById('home-score').innerHTML = positions.length ? buildScore() : emptyMsg();
  document.getElementById('home-alerts').innerHTML = positions.length ? buildAlerts() : emptyMsg();
  const pctObj = Math.min(tv / objective.target * 100, 100);
  document.getElementById('home-obj').innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#86868b;margin-bottom:4px"><span>Objectif : ${fmtK(objective.target)}</span><span>${pctObj.toFixed(1)}%</span></div>
    <div class="obj-bar-bg"><div class="obj-bar-fill" style="width:${pctObj}%"></div></div>
    <div style="font-size:12px;color:#aeaeb2;margin-top:4px">Valeur actuelle : ${fmtK(tv)} · Reste : ${fmtK(Math.max(objective.target - tv, 0))}</div>`;
}

function emptyMsg() { return '<p style="font-size:13px;color:#aeaeb2;padding:4px 0">Ajoutez des positions pour voir cet indicateur.</p>'; }

// ===== SCORE =====
function calcScore() {
  if (!positions.length) return { score: 0, items: [] };
  const tv = positions.reduce((a, p) => a + p.qty * p.price, 0);
  const maxW = Math.max(...positions.map(p => p.qty * p.price / tv * 100));
  const etfPct = positions.filter(p => p.type === 'ETF').reduce((a, p) => a + p.qty * p.price, 0) / tv * 100;
  const pnl = positions.reduce((a, p) => a + (p.qty * p.price - p.qty * p.pru), 0);
  const items = [
    { label: 'Diversification', score: Math.min(10, positions.length * 2.5), tip: positions.length < 4 ? `${positions.length} positions — vise 4+` : '' },
    { label: 'Concentration max', score: maxW > 50 ? 2 : maxW > 35 ? 5 : maxW > 25 ? 7 : 10, tip: maxW > 35 ? `Position dominante à ${maxW.toFixed(0)}%` : '' },
    { label: 'Part ETF', score: etfPct >= 60 ? 10 : etfPct >= 40 ? 8 : etfPct >= 20 ? 5 : 3, tip: etfPct < 40 ? `ETF = ${etfPct.toFixed(0)}% — vise 60%+` : '' },
    { label: 'Performance', score: pnl >= 0 ? 8 : pnl > -tv * 0.1 ? 6 : 4, tip: '' },
  ];
  return { score: Math.round(items.reduce((a, i) => a + i.score, 0) / items.length * 10) / 10, items };
}

function buildScore() {
  const { score, items } = calcScore();
  const color = score >= 7 ? '#1a7f3c' : score >= 5 ? '#92400e' : '#d70015';
  const bg = score >= 7 ? '#e8f9ee' : score >= 5 ? '#fef3c7' : '#fee2e2';
  let html = `<div class="score-wrap"><div class="score-ring" style="background:${bg};border-color:${color}"><div class="score-num" style="color:${color}">${score.toFixed(1)}</div><div class="score-max" style="color:${color}">/10</div></div><div class="score-items">`;
  items.forEach(it => {
    const c = it.score >= 7 ? '#1a7f3c' : it.score >= 5 ? '#92400e' : '#d70015';
    html += `<div class="score-row"><span class="score-row-label">${it.label}</span><div class="score-bar-bg"><div class="score-bar-fill" style="width:${it.score / 10 * 100}%;background:${c}"></div></div><span class="score-val" style="color:${c}">${it.score}</span></div>`;
  });
  html += '</div></div>';
  const tips = items.filter(i => i.tip);
  if (tips.length) html += '<div style="margin-top:8px">' + tips.map(t => `<div style="font-size:12px;color:#86868b;margin-bottom:4px">→ ${t.tip}</div>`).join('') + '</div>';
  return html;
}

function buildAlerts() {
  const tv = positions.reduce((a, p) => a + p.qty * p.price, 0);
  if (!tv) return emptyMsg();
  let alerts = [];
  positions.forEach(p => {
    const w = p.qty * p.price / tv * 100;
    if (w > 40) alerts.push({ type: 'err', msg: `<strong>${p.name}</strong> = ${w.toFixed(0)}% — concentration excessive.` });
    else if (w > 25) alerts.push({ type: 'warn', msg: `<strong>${p.name}</strong> = ${w.toFixed(0)}% — surveille.` });
  });
  const etfPct = positions.filter(p => p.type === 'ETF').reduce((a, p) => a + p.qty * p.price, 0) / tv * 100;
  if (etfPct < 30) alerts.push({ type: 'warn', msg: `Seulement ${etfPct.toFixed(0)}% d'ETF — vise 60–80%.` });
  if (positions.length < 3) alerts.push({ type: 'warn', msg: `${positions.length} position(s) — diversifie avec 3–5 actifs min.` });
  if (!alerts.length) alerts.push({ type: 'ok', msg: 'Portefeuille bien équilibré — aucune alerte !' });
  const icons = { ok: '✓', warn: '⚠', err: '✕' };
  return alerts.map(a => `<div class="alert alert-${a.type}"><span class="alert-icon">${icons[a.type]}</span><div>${a.msg}</div></div>`).join('');
}

// ===== PORTFOLIO =====
function renderPortfolio() {
  const tv = positions.reduce((a, p) => a + p.qty * p.price, 0);
  const ti = positions.reduce((a, p) => a + p.qty * p.pru, 0);
  const tpnl = tv - ti, tpct = ti ? tpnl / ti * 100 : 0;
  document.getElementById('port-metrics').innerHTML = `
    <div class="metric-card"><div class="metric-label">Valeur totale</div><div class="metric-val">${fmtK(tv)}</div></div>
    <div class="metric-card"><div class="metric-label">Investi</div><div class="metric-val">${fmtK(ti)}</div></div>
    <div class="metric-card"><div class="metric-label">Plus-value</div><div class="metric-val ${tpnl >= 0 ? 'green' : 'red'}">${tpnl >= 0 ? '+' : ''}${fmtK(tpnl)}</div></div>
    <div class="metric-card"><div class="metric-label">Performance</div><div class="metric-val ${tpnl >= 0 ? 'green' : 'red'}">${tpnl >= 0 ? '+' : ''}${tpct.toFixed(2)}%</div></div>`;

  const grid = document.getElementById('pos-grid');
  document.getElementById('pos-empty').style.display = positions.length ? 'none' : 'block';
  document.getElementById('alloc-card').style.display = positions.length ? 'block' : 'none';

  if (!positions.length) { grid.innerHTML = ''; return; }

  grid.innerHTML = positions.map((p, idx) => {
    const val = p.qty * p.price, inv = p.qty * p.pru, pnl = val - inv, pct = inv ? pnl / inv * 100 : 0;
    const sig = posSignals[p.id];
    const sigHtml = sig
      ? `<span class="signal-badge-large ${sig.action === 'acheter' ? 'sig-buy' : sig.action === 'vendre' ? 'sig-sell' : 'sig-hold'}">${sig.action === 'acheter' ? '↑ Renforcer' : sig.action === 'vendre' ? '↓ Vendre' : '→ Garder'}</span>`
      : `<span class="signal-badge-large sig-loading">Analyse en cours...</span>`;
    const perfW = Math.min(Math.abs(pct) / 30 * 100, 100);
    return `<div class="pos-card">
      <div class="pos-card-head" onclick="togglePosSignal('${p.id}')">
        <div class="pos-card-left">
          <div class="pos-avatar" style="background:${COLORS[idx % COLORS.length]}">${p.name.slice(0,2).toUpperCase()}</div>
          <div>
            <div class="pos-name">${p.name}</div>
            <div class="pos-meta">${p.type} · ${p.qty} parts · ${p.platform || ''}</div>
          </div>
        </div>
        <div class="pos-card-right">
          <div class="pos-val">${fmt(val)} €</div>
          <div class="pos-pnl ${pnl >= 0 ? 'green' : 'red'}">${pnl >= 0 ? '+' : ''}${pct.toFixed(1)}% (${pnl >= 0 ? '+' : ''}${fmt(pnl)}€)</div>
        </div>
      </div>
      <div class="pos-signal-row" id="sig-${p.id}">
        <div class="pos-signal-content">
          <div class="signal-header">
            <div style="font-size:12px;color:#86868b;font-weight:500">Signal IA</div>
            ${sigHtml}
          </div>
          <div class="perf-bar-wrap">
            <div class="perf-bar-label"><span>Performance</span><span>${pnl >= 0 ? '+' : ''}${fmt(pnl)} € (${pnl >= 0 ? '+' : ''}${pct.toFixed(1)}%)</span></div>
            <div class="perf-bar-bg"><div class="perf-bar-fill" style="width:${perfW}%;background:${pnl >= 0 ? '#1a7f3c' : '#d70015'}"></div></div>
            <div class="perf-bar-label" style="margin-top:4px"><span>PRU : ${fmt(p.pru)} €</span><span>Actuel : ${fmt(p.price)} €</span></div>
          </div>
          ${sig ? `<div class="signal-text" style="margin-top:8px">${sig.texte}</div>` : ''}
          <div class="pos-actions">
            <button class="btn-sm buy" onclick="openDecisionFromPos('${p.name}','acheter')">+ Renforcer</button>
            <button class="btn-sm" onclick="openDecisionFromPos('${p.name}','garder')">Analyser</button>
            <button class="btn-sm sell" onclick="openDecisionFromPos('${p.name}','vendre')">− Alléger</button>
            <button class="btn-sm" onclick="delPos('${p.id}')" style="margin-left:auto;color:#d70015;border-color:#fca5a5">Supprimer</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  if (tv > 0) {
    document.getElementById('alloc-bars').innerHTML = positions.map((p, i) => {
      const pc = p.qty * p.price / tv * 100;
      return `<div class="bar-row"><div class="bar-label"><span>${p.name}</span><span>${pc.toFixed(1)}%</span></div><div class="bar-bg"><div class="bar-fill" style="width:${pc}%;background:${COLORS[i % COLORS.length]}"></div></div></div>`;
    }).join('');
  }

  positions.forEach(p => { if (!posSignals[p.id]) generatePosSignal(p); });
}

async function generatePosSignal(p) {
  const pnl = (p.price - p.pru) / p.pru * 100;
  const prompt = `Position : ${p.name} (${p.type}), PRU ${p.pru}€, prix actuel ${p.price}€, performance ${pnl.toFixed(1)}%. Profil : débutant prudent, horizon ${HL[profile.horizon]}, risque ${RL[profile.risk]}.
Retourne UNIQUEMENT un JSON (sans backticks) : {"action":"acheter|garder|vendre","texte":"1 phrase de conseil simple"}`;
  try {
    const raw = await callClaude(prompt, 'Tu es analyste financier. Retourne uniquement du JSON valide.');
    const s = raw.replace(/```json|```/g, '').trim();
    posSignals[p.id] = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
  } catch {
    posSignals[p.id] = { action: pnl > 5 ? 'garder' : pnl < -10 ? 'vendre' : 'garder', texte: 'Continue à surveiller cette position régulièrement.' };
  }
  const sigEl = document.getElementById('sig-' + p.id);
  if (sigEl && sigEl.style.display === 'block') renderPortfolio();
}

function togglePosSignal(id) {
  const el = document.getElementById('sig-' + id);
  if (!el) return;
  el.style.display = el.style.display === 'block' ? 'none' : 'block';
}

function openDecisionFromPos(name, action) {
  document.getElementById('d-name').value = name;
  document.getElementById('d-horizon').value = profile.horizon;
  document.getElementById('d-risk').value = profile.risk;
  updatePct();
  const notice = document.getElementById('prefill-notice');
  notice.style.display = 'block';
  notice.textContent = `→ Analyse de ${name} — intention : ${action}`;
  nav('decision');
  document.getElementById('nav-decision').classList.add('active');
}

// ===== SANTE =====
function renderSante() {
  document.getElementById('sante-score').innerHTML = positions.length ? buildScore() : emptyMsg();
  document.getElementById('sante-alerts').innerHTML = positions.length ? buildAlerts() : emptyMsg();
}

// ===== OBJECTIF =====
function renderObj() {
  const target = parseFloat(document.getElementById('obj-target').value) || 50000;
  const years = parseInt(document.getElementById('obj-years').value) || 10;
  const rate = parseFloat(document.getElementById('obj-rate').value) / 100 / 12 || 0.07 / 12;
  const monthly = parseFloat(document.getElementById('obj-monthly').value) || 200;
  const tv = positions.reduce((a, p) => a + p.qty * p.price, 0);
  const n = years * 12;
  const fv = tv * Math.pow(1 + rate, n) + monthly * ((Math.pow(1 + rate, n) - 1) / rate);
  const onTrack = fv >= target;
  const monthlyNeeded = Math.max((target - tv * Math.pow(1 + rate, n)) * rate / (Math.pow(1 + rate, n) - 1), 0);
  const pct = Math.min(tv / target * 100, 100);
  document.getElementById('obj-result').innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#86868b;margin-bottom:4px"><span>Aujourd'hui : ${fmtK(tv)}</span><span>Objectif : ${fmtK(target)}</span></div>
    <div class="obj-bar-bg"><div class="obj-bar-fill" style="width:${pct}%"></div></div>
    <div class="metrics-grid" style="margin-top:14px">
      <div class="metric-card"><div class="metric-label">Capital projeté dans ${years} ans</div><div class="metric-val ${onTrack ? 'green' : 'red'}">${fmtK(Math.round(fv))}</div></div>
      <div class="metric-card"><div class="metric-label">Objectif</div><div class="metric-val">${fmtK(target)}</div></div>
      <div class="metric-card"><div class="metric-label">Versement actuel</div><div class="metric-val">${fmtI(monthly)} €/mois</div></div>
      <div class="metric-card"><div class="metric-label">Nécessaire</div><div class="metric-val ${onTrack ? 'green' : 'red'}">${onTrack ? 'En bonne voie !' : fmtI(monthlyNeeded) + ' €/mois'}</div></div>
    </div>
    <div class="alert ${onTrack ? 'alert-ok' : 'alert-warn'}" style="margin-top:12px">
      <span class="alert-icon">${onTrack ? '✓' : '⚠'}</span>
      <div>${onTrack ? `Tu devrais atteindre <strong>${fmtK(Math.round(fv))}</strong> dans ${years} ans.` : `Il te manque <strong>${fmtI(monthlyNeeded - monthly)} €/mois</strong> pour atteindre ton objectif.`}</div>
    </div>`;
}
async function saveObjectif() {
  const data = { target: parseFloat(document.getElementById('obj-target').value) || 50000, years: parseInt(document.getElementById('obj-years').value) || 10, rate: parseFloat(document.getElementById('obj-rate').value) || 7, monthly: parseFloat(document.getElementById('obj-monthly').value) || 200 };
  objective = data;
  await sb.from('objectives').upsert({ ...data, user_id: currentUser.id, updated_at: new Date().toISOString() });
  renderObj();
}

// ===== CRISE =====
function renderCrise() {
  const tv = positions.reduce((a, p) => a + p.qty * p.price, 0);
  if (!tv) { document.getElementById('crise-content').innerHTML = emptyMsg(); return; }
  const scenarios = [
    { label: '-10%', pct: 10, color: '#92400e', bg: '#fef3c7', border: '#fcd34d', event: 'Correction modérée' },
    { label: '-20%', pct: 20, color: '#c2410c', bg: '#ffedd5', border: '#fb923c', event: 'Bear market (2022)' },
    { label: '-30%', pct: 30, color: '#b91c1c', bg: '#fee2e2', border: '#f87171', event: 'Crise (Covid 2020)' },
    { label: '-40%', pct: 40, color: '#991b1b', bg: '#fecaca', border: '#ef4444', event: 'Crash (2008)' },
  ];
  let html = '<div class="crisis-grid">';
  scenarios.forEach(s => {
    const after = tv * (1 - s.pct / 100);
    html += `<div class="crisis-card" style="background:${s.bg};border-color:${s.border}"><div class="crisis-pct" style="color:${s.color}">${s.label}</div><div class="crisis-val" style="color:${s.color}">${fmtK(Math.round(after))}</div><div class="crisis-sub" style="color:${s.color}">${s.event}</div></div>`;
  });
  html += '</div>';
  document.getElementById('crise-content').innerHTML = html;
}

// ===== SETTINGS =====
async function saveSettings() {
  await saveProfile();
  const msg = document.getElementById('settings-msg');
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 2000);
}

// ===== NEWS =====
async function loadNews() {
  const ico = document.getElementById('news-ico');
  const btn = document.getElementById('news-refresh-btn');
  ico.classList.add('spinning'); btn.disabled = true;
  document.getElementById('news-list').innerHTML = '<p style="color:#aeaeb2;font-size:13px;padding:20px 0;text-align:center">Chargement des actualités...</p>';
  const prompt = `Recherche les 6 annonces économiques les plus importantes d'aujourd'hui. Retourne UNIQUEMENT un tableau JSON (sans backticks) de 6 objets : {"titre":"...","resume":"1-2 phrases","categorie":"macro|banque|marche|geo|secteur","impact":"élevé|moyen|faible","heure":"...","signal":"acheter|attendre|éviter|neutre","reco_texte":"2-3 phrases pour débutant","actifs_cibles":["ticker1","ticker2"]}`;
  const raw = await callClaude(prompt, 'Tu es analyste financier. Retourne uniquement du JSON valide sans texte autour ni backticks.');
  try {
    const s = raw.replace(/```json|```/g, '').trim();
    newsData = JSON.parse(s.slice(s.indexOf('['), s.lastIndexOf(']') + 1));
  } catch { newsData = fallbackNews(); }
  newsLoaded = true; ico.classList.remove('spinning'); btn.disabled = false;
  renderNews();
  addNewsNotifications();
}

function addNewsNotifications() {
  const high = newsData.filter(n => n.impact === 'élevé');
  high.forEach(n => {
    notifications.unshift({ titre: n.titre, texte: n.resume, action: n.reco_texte, impact: 'high', heure: n.heure });
  });
  if (high.length) {
    renderNotifications();
    document.getElementById('notif-dot').classList.add('show');
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('InvestIQ — Actualité importante', { body: high[0].titre, icon: '/icons/icon-192.png' });
    }
  }
}

function fallbackNews() {
  return [
    { titre: "BCE : taux inchangés", resume: "La BCE maintient ses taux directeurs.", categorie: "banque", impact: "élevé", heure: "Aujourd'hui", signal: "attendre", reco_texte: "Continue ton DCA normalement.", actifs_cibles: ["IWDA", "VWCE"] },
    { titre: "Inflation zone euro à 2,2%", resume: "L'inflation ralentit en zone euro.", categorie: "macro", impact: "moyen", heure: "Aujourd'hui", signal: "acheter", reco_texte: "Bon signal pour renforcer les ETF monde.", actifs_cibles: ["IWDA", "VWCE"] },
    { titre: "S&P 500 en hausse", resume: "Marchés US portés par la tech.", categorie: "marche", impact: "moyen", heure: "Hier", signal: "neutre", reco_texte: "Pas d'action urgente.", actifs_cibles: ["IWDA"] },
    { titre: "Tensions commerciales Chine-UE", resume: "Droits de douane sur véhicules électriques.", categorie: "geo", impact: "élevé", heure: "Aujourd'hui", signal: "éviter", reco_texte: "Évite les ETF automobile.", actifs_cibles: ["ETF Auto"] },
    { titre: "LVMH : résultats décevants", resume: "Ventes en baisse en Asie.", categorie: "secteur", impact: "moyen", heure: "Ce matin", signal: "attendre", reco_texte: "Garde si tu as LVMH.", actifs_cibles: ["LVMH"] },
    { titre: "Fed : Powell prudent", resume: "Pas de baisse de taux prévue.", categorie: "banque", impact: "élevé", heure: "Hier soir", signal: "attendre", reco_texte: "Prudence sur les achats.", actifs_cibles: ["IWDA"] }
  ];
}

function filterNews(cat, el) {
  newsFilter = cat;
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderNews();
}

function suggestedPct(signal, risk, horizon) {
  const base = { acheter: { faible: 5, modere: 10, eleve: 20 }, attendre: { faible: 2, modere: 4, eleve: 5 }, 'éviter': { faible: 0, modere: 0, eleve: 0 }, neutre: { faible: 3, modere: 7, eleve: 10 } };
  let p = ((base[signal] || base.neutre)[risk]) || 5;
  if (horizon === 'long') p = Math.min(p * 1.5, 40);
  if (horizon === 'court') p = Math.max(p * 0.5, 1);
  return Math.round(p);
}

function renderNews() {
  const list = document.getElementById('news-list');
  const filtered = newsFilter === 'tous' ? newsData : newsData.filter(n => n.categorie === newsFilter);
  if (!filtered.length) { list.innerHTML = '<p style="color:#aeaeb2;font-size:13px;padding:20px 0">Aucune actualité dans cette catégorie.</p>'; return; }
  const tagCls = { macro: 'pill-dark', banque: 'pill-amber', marche: 'pill-blue', geo: 'pill-red', secteur: 'pill-green' };
  const tagLbl = { macro: 'Macro', banque: 'Banque centrale', marche: 'Marchés', geo: 'Géopolitique', secteur: 'Secteurs' };
  const impCls = { 'élevé': 'pill-red', 'moyen': 'pill-amber', 'faible': 'pill-green' };
  const sigCls = { acheter: 'signal-buy', attendre: 'signal-wait', 'éviter': 'signal-avoid', neutre: 'signal-neutral' };
  const sigLbl = { acheter: "↑ Opportunité", attendre: '⏸ Attendre', 'éviter': '↓ Éviter', neutre: '→ Neutre' };
  list.innerHTML = filtered.map((n, i) => {
    const pct = suggestedPct(n.signal, profile.risk, profile.horizon);
    const amt = Math.round(profile.bankroll * pct / 100);
    const first = (n.actifs_cibles || [])[0] || n.titre.slice(0, 8);
    const assets = (n.actifs_cibles || []).map(a => `<span class="pill pill-gray" style="margin-right:4px">${a}</span>`).join('');
    const oppBtn = n.signal !== 'éviter' ? `<button class="btn-analyse" onclick="openDecision('${first}','${n.signal}')">Analyser →</button>` : '';
    return `<div class="news-item">
      <div class="news-item-head" onclick="toggleNews(${i})">
        <div class="news-meta"><span class="pill ${tagCls[n.categorie] || 'pill-gray'}">${tagLbl[n.categorie] || n.categorie}</span><span class="pill ${impCls[n.impact] || 'pill-gray'}">Impact ${n.impact}</span><span class="news-time">${n.heure}</span></div>
        <div class="news-title">${n.titre}</div>
        <div class="news-summary">${n.resume}</div>
        <button class="news-expand" id="nexp-${i}">▾ Recommandation IA</button>
      </div>
      <div class="news-reco" id="nreco-${i}">
        <div class="${sigCls[n.signal] || 'signal-neutral'} signal-badge">${sigLbl[n.signal] || 'Neutre'}</div>
        <div class="news-reco-text">${n.reco_texte}</div>
        ${assets ? `<div style="margin-bottom:12px">${assets}</div>` : ''}
        <div class="opp-strip">
          <div><div class="opp-label">${n.signal === 'éviter' ? 'Pas conseillé' : n.signal === 'acheter' ? 'Opportunité' : 'À surveiller'}</div><div class="opp-sub">${n.signal !== 'éviter' ? `${pct}% bankroll · ${HL[profile.horizon]}` : 'Signal négatif'}</div></div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="opp-amount">${n.signal === 'éviter' ? '0 €' : amt.toLocaleString('fr-FR') + ' €'}</div>
            ${oppBtn}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function toggleNews(i) {
  const r = document.getElementById('nreco-' + i);
  const b = document.getElementById('nexp-' + i);
  const open = r.style.display === 'block';
  r.style.display = open ? 'none' : 'block';
  b.textContent = open ? '▾ Recommandation IA' : '▴ Masquer';
}

// ===== DECISION =====
function openDecision(ticker, signal) {
  const pct = signal === 'éviter' ? 0 : suggestedPct(signal, profile.risk, profile.horizon);
  const amt = Math.round(profile.bankroll * pct / 100);
  document.getElementById('d-name').value = ticker;
  document.getElementById('d-horizon').value = profile.horizon;
  document.getElementById('d-risk').value = profile.risk;
  document.getElementById('d-pct').value = pct;
  document.getElementById('d-pct-num').textContent = pct;
  document.getElementById('d-amount').value = amt;
  document.getElementById('d-pct-lbl').textContent = `= ${amt.toLocaleString('fr-FR')} €`;
  const notice = document.getElementById('prefill-notice');
  notice.style.display = 'block';
  notice.textContent = `✓ Pré-rempli — ${ticker} · ${pct}% de ta bankroll (${amt.toLocaleString('fr-FR')} €)`;
  nav('decision');
  document.getElementById('nav-decision').classList.add('active');
}

function updatePct() {
  const pct = parseInt(document.getElementById('d-pct').value);
  const amt = Math.round(profile.bankroll * pct / 100);
  document.getElementById('d-pct-num').textContent = pct;
  document.getElementById('d-amount').value = amt;
  document.getElementById('d-pct-lbl').textContent = `= ${amt.toLocaleString('fr-FR')} €`;
}

async function analyseDecision() {
  const name = document.getElementById('d-name').value.trim();
  const amount = document.getElementById('d-amount').value;
  const pct = document.getElementById('d-pct').value;
  const horizon = document.getElementById('d-horizon').value;
  const risk = document.getElementById('d-risk').value;
  if (!name) { alert('Indique un actif.'); return; }
  const prompt = `Actif : ${name} | Montant : ${amount || '?'}€ (${pct}% bankroll ${profile.bankroll}€) | Horizon : ${HL[horizon]} | Risque : ${RL[risk]} | Profil : débutant prudent ETF/actions. Analyse en 5 lignes : 1) ce que c'est 2) risque 3) adapté ? 4) montant raisonnable ? 5) alternative.`;
  document.getElementById('d-result').innerHTML = '<div class="bubble bot">Analyse en cours...</div>';
  const r = await callClaude(prompt);
  document.getElementById('d-result').innerHTML = `<div class="bubble bot">${r}</div>`;
}

// ===== DCA =====
function updateDCA() {
  const m = parseFloat(document.getElementById('dca-m').value);
  const y = parseInt(document.getElementById('dca-y').value);
  const rate = parseFloat(document.getElementById('dca-r').value) / 100 / 12;
  const s = parseFloat(document.getElementById('dca-s').value);
  document.getElementById('dca-m-o').textContent = m.toLocaleString('fr-FR') + ' €';
  document.getElementById('dca-y-o').textContent = y + ' ans';
  document.getElementById('dca-r-o').textContent = parseFloat(document.getElementById('dca-r').value).toFixed(1) + ' %';
  document.getElementById('dca-s-o').textContent = s.toLocaleString('fr-FR') + ' €';
  const n = y * 12, total = s * Math.pow(1 + rate, n) + m * ((Math.pow(1 + rate, n) - 1) / rate);
  const invested = s + m * n, gain = total - invested;
  document.getElementById('dca-metrics').innerHTML = `
    <div class="metric-card"><div class="metric-label">Capital final estimé</div><div class="metric-val green">${fmtK(Math.round(total))}</div></div>
    <div class="metric-card"><div class="metric-label">Total investi</div><div class="metric-val">${fmtK(Math.round(invested))}</div></div>
    <div class="metric-card"><div class="metric-label">Intérêts composés</div><div class="metric-val green">+${fmtK(Math.round(gain))}</div></div>
    <div class="metric-card"><div class="metric-label">Multiplicateur</div><div class="metric-val">×${(total / invested).toFixed(2)}</div></div>`;
  document.getElementById('dca-tip').innerHTML = `<div class="alert alert-ok" style="margin-top:12px"><span>✓</span><div>${m.toLocaleString('fr-FR')} €/mois pendant ${y} ans génère <strong>${fmtK(Math.round(gain))}</strong> en intérêts composés.</div></div>`;
}

// ===== PORTFOLIO ACTIONS =====
async function addPos() {
  const name = document.getElementById('f-name').value.trim();
  const qty = parseFloat(document.getElementById('f-qty').value);
  const pru = parseFloat(document.getElementById('f-pru').value);
  const price = parseFloat(document.getElementById('f-price').value);
  if (!name || isNaN(qty) || isNaN(pru) || isNaN(price)) { alert('Remplis tous les champs.'); return; }
  const pos = { user_id: currentUser.id, name, qty, pru, price, type: document.getElementById('f-type').value, sector: document.getElementById('f-sector').value || '', platform: document.getElementById('f-platform').value };
  const { data, error } = await sb.from('positions').insert(pos).select().single();
  if (!error && data) {
    positions.push(data);
    ['f-name', 'f-qty', 'f-pru', 'f-price', 'f-sector'].forEach(id => document.getElementById(id).value = '');
    newsLoaded = false;
    nav('portfolio');
  }
}

async function delPos(id) {
  if (!confirm('Supprimer cette position ?')) return;
  await sb.from('positions').delete().eq('id', id);
  positions = positions.filter(p => p.id !== id);
  delete posSignals[id];
  renderPortfolio();
  renderHome();
}

async function loadDemo() {
  const demo = [
    { name: 'IWDA', qty: 15, pru: 87.5, price: 94.2, type: 'ETF', sector: 'Monde', platform: 'Trade Republic' },
    { name: 'VWCE', qty: 8, pru: 110, price: 118.5, type: 'ETF', sector: 'Monde', platform: 'Trade Republic' },
    { name: 'LVMH', qty: 2, pru: 730, price: 685, type: 'Action', sector: 'Luxe', platform: 'XTB' },
    { name: 'Air Liquide', qty: 5, pru: 162, price: 179, type: 'Action', sector: 'Industrie', platform: 'XTB' },
  ];
  for (const p of demo) {
    const { data } = await sb.from('positions').insert({ ...p, user_id: currentUser.id }).select().single();
    if (data) positions.push(data);
  }
  newsLoaded = false;
  nav('portfolio');
}

// ===== AI =====
async function callClaude(prompt, sys) {
  const system = sys || 'Tu es un assistant financier pédagogue francophone pour investisseurs débutants. Réponds en français, clairement. Tu ne fournis pas de conseil financier réglementé.';
  try {
    const res = await fetch('/api/claude', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, system })
    });
    const d = await res.json();
    return d.text || d.error || 'Aucune réponse.';
  } catch { return 'Erreur de connexion.'; }
}

function sq(q) { document.getElementById('ai-in').value = q; sendAI(); }
async function sendAI() {
  const inp = document.getElementById('ai-in');
  const q = inp.value.trim(); if (!q) return;
  inp.value = '';
  document.getElementById('qbtns').style.display = 'none';
  const chat = document.getElementById('ai-chat');
  chat.innerHTML += `<div class="bubble user">${q}</div><div class="bubble bot" id="ai-loading">Réflexion...</div>`;
  const pCtx = positions.length ? `Mon portefeuille : ${positions.map(p => `${p.name}(${p.type})`).join(', ')}.` : '';
  const r = await callClaude(`${pCtx}\nQuestion : ${q}`);
  document.getElementById('ai-loading').outerHTML = `<div class="bubble bot">${r}</div>`;
  chat.scrollTop = chat.scrollHeight;
}
