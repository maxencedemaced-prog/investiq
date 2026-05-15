// ===== CONFIG SUPABASE =====
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
const HL = { court: 'Court terme (<3 ans)', moyen: 'Moyen terme (3–7 ans)', long: 'Long terme (>7 ans)' };
const RL = { faible: 'Faible', modere: 'Modérée', eleve: 'Élevée' };

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
  if (error) setAuthMsg(error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message);
}

async function signup() {
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-pass').value;
  const pass2 = document.getElementById('signup-pass2').value;
  if (!email || !pass) { setAuthMsg('Remplis tous les champs.'); return; }
  if (pass !== pass2) { setAuthMsg('Les mots de passe ne correspondent pas.'); return; }
  if (pass.length < 6) { setAuthMsg('Le mot de passe doit faire au moins 6 caractères.'); return; }
  setAuthMsg('Création du compte...', false);
  const { error } = await sb.auth.signUp({ email, password: pass });
  if (error) setAuthMsg(error.message);
  else setAuthMsg('Compte créé ! Vérifie ton email pour confirmer.', false);
}

async function logout() {
  await sb.auth.signOut();
  positions = [];
  newsLoaded = false;
  closeSidebar();
}

// ===== SUPABASE DATA =====
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

// ===== NAVIGATION =====
function nav(page) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('sec-' + page);
  const btn = document.getElementById('nav-' + page);
  if (sec) sec.classList.add('active');
  if (btn) btn.classList.add('active');
  closeSidebar();
  const renders = {
    home: renderHome, portfolio: renderPortfolio,
    sante: renderSante, objectif: renderObj,
    crise: renderCrise, dca: updateDCA,
    news: () => { if (!newsLoaded) loadNews(); }
  };
  if (renders[page]) renders[page]();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
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
  const tpnl = tv - ti;
  const tpct = ti ? tpnl / ti * 100 : 0;
  document.getElementById('home-metrics').innerHTML = `
    <div class="metric-card"><div class="metric-label">Valeur totale</div><div class="metric-val">${fmtK(tv)}</div></div>
    <div class="metric-card"><div class="metric-label">Plus-value</div><div class="metric-val ${tpnl >= 0 ? 'green' : 'red'}">${tpnl >= 0 ? '+' : ''}${fmtK(tpnl)}</div></div>
    <div class="metric-card"><div class="metric-label">Performance</div><div class="metric-val ${tpnl >= 0 ? 'green' : 'red'}">${tpnl >= 0 ? '+' : ''}${tpct.toFixed(2)}%</div></div>
    <div class="metric-card"><div class="metric-label">Bankroll dispo</div><div class="metric-val purple">${fmtK(profile.bankroll)}</div></div>`;
  document.getElementById('home-score').innerHTML = positions.length ? buildScore() : emptyMsg();
  document.getElementById('home-alerts').innerHTML = positions.length ? buildAlerts() : emptyMsg();
  const pctObj = Math.min(tv / objective.target * 100, 100);
  document.getElementById('home-obj').innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:4px"><span>Objectif : ${fmtK(objective.target)}</span><span>${pctObj.toFixed(1)}% atteint</span></div>
    <div class="obj-bar-bg"><div class="obj-bar-fill" style="width:${pctObj}%"></div></div>
    <div style="font-size:12px;color:#4b5563;margin-top:4px">Valeur actuelle : ${fmtK(tv)} · Il reste ${fmtK(Math.max(objective.target - tv, 0))}</div>`;
}

function emptyMsg() { return '<p style="font-size:13px;color:#4b5563;padding:4px 0">Ajoutez des positions pour voir cet indicateur.</p>'; }

// ===== SCORE =====
function calcScore() {
  if (!positions.length) return { score: 0, items: [] };
  const tv = positions.reduce((a, p) => a + p.qty * p.price, 0);
  const maxW = Math.max(...positions.map(p => p.qty * p.price / tv * 100));
  const etfPct = positions.filter(p => p.type === 'ETF').reduce((a, p) => a + p.qty * p.price, 0) / tv * 100;
  const pnl = positions.reduce((a, p) => a + (p.qty * p.price - p.qty * p.pru), 0);
  const items = [
    { label: 'Diversification', score: Math.min(10, positions.length >= 4 ? 10 : positions.length * 2.5), tip: positions.length < 4 ? `${positions.length} positions — vise 4+` : '' },
    { label: 'Concentration max', score: maxW > 50 ? 2 : maxW > 35 ? 5 : maxW > 25 ? 7 : 10, tip: maxW > 35 ? `Position dominante à ${maxW.toFixed(0)}%` : '' },
    { label: 'Part ETF', score: etfPct >= 60 ? 10 : etfPct >= 40 ? 8 : etfPct >= 20 ? 5 : 3, tip: etfPct < 40 ? `ETF = ${etfPct.toFixed(0)}% — vise 60%+` : '' },
    { label: 'Performance', score: pnl >= 0 ? 8 : pnl > -tv * 0.1 ? 6 : 4, tip: '' },
  ];
  return { score: Math.round(items.reduce((a, i) => a + i.score, 0) / items.length * 10) / 10, items };
}

function buildScore() {
  const { score, items } = calcScore();
  const color = score >= 7 ? '#4ade80' : score >= 5 ? '#fbbf24' : '#f87171';
  const bg = score >= 7 ? 'rgba(74,222,128,0.1)' : score >= 5 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)';
  let html = `<div class="score-wrap"><div class="score-ring" style="background:${bg};border-color:${color}"><div class="score-num" style="color:${color}">${score.toFixed(1)}</div><div class="score-max" style="color:${color}">/10</div></div><div class="score-items">`;
  items.forEach(it => {
    const c = it.score >= 7 ? '#4ade80' : it.score >= 5 ? '#fbbf24' : '#f87171';
    html += `<div class="score-row"><span class="score-row-label">${it.label}</span><div class="score-bar-bg"><div class="score-bar-fill" style="width:${it.score / 10 * 100}%;background:${c}"></div></div><span class="score-val" style="color:${c}">${it.score}</span></div>`;
  });
  html += '</div></div>';
  const tips = items.filter(i => i.tip);
  if (tips.length) html += '<div style="margin-top:8px">' + tips.map(t => `<div style="font-size:12px;color:#6b7280;margin-bottom:4px">→ ${t.tip}</div>`).join('') + '</div>';
  return html;
}

function buildAlerts() {
  const tv = positions.reduce((a, p) => a + p.qty * p.price, 0);
  if (!tv) return emptyMsg();
  let alerts = [];
  positions.forEach(p => {
    const w = p.qty * p.price / tv * 100;
    if (w > 40) alerts.push({ type: 'err', msg: `<strong>${p.name}</strong> = ${w.toFixed(0)}% de ton portfeuille — rééquilibre.` });
    else if (w > 25) alerts.push({ type: 'warn', msg: `<strong>${p.name}</strong> = ${w.toFixed(0)}% — surveille cette concentration.` });
  });
  const etfPct = positions.filter(p => p.type === 'ETF').reduce((a, p) => a + p.qty * p.price, 0) / tv * 100;
  if (etfPct < 30) alerts.push({ type: 'warn', msg: `Seulement ${etfPct.toFixed(0)}% d'ETF — vise 60–80% pour un débutant prudent.` });
  if (positions.length < 3) alerts.push({ type: 'warn', msg: `${positions.length} position(s) seulement — diversifie avec 3–5 actifs minimum.` });
  if (!alerts.length) alerts.push({ type: 'ok', msg: 'Aucune alerte — ton portefeuille est bien équilibré !' });
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
  const body = document.getElementById('pos-body');
  body.innerHTML = '';
  document.getElementById('pos-empty').style.display = positions.length ? 'none' : 'block';
  document.getElementById('alloc-card').style.display = positions.length ? 'block' : 'none';
  const colors = ['#7c3aed', '#4ade80', '#f87171', '#60a5fa', '#fbbf24', '#f472b6'];
  positions.forEach((p, idx) => {
    const val = p.qty * p.price, inv = p.qty * p.pru, pnl = val - inv, pct = inv ? pnl / inv * 100 : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><strong style="color:#e2e8f0">${p.name}</strong><br><span style="font-size:11px;color:#4b5563">${p.platform || ''}</span></td>
      <td><span class="pill ${p.type === 'ETF' ? 'pill-blue' : 'pill-purple'}">${p.type}</span></td>
      <td>${p.qty}</td><td>${fmt(p.pru)}€</td><td>${fmt(p.price)}€</td>
      <td><strong>${fmt(val)}€</strong></td>
      <td><span class="pill ${pnl >= 0 ? 'pill-green' : 'pill-red'}">${pnl >= 0 ? '+' : ''}${pct.toFixed(1)}%</span></td>
      <td><button class="btn-del" onclick="delPos('${p.id}')">✕</button></td>`;
    body.appendChild(tr);
  });
  if (positions.length && tv > 0) {
    document.getElementById('alloc-bars').innerHTML = positions.map((p, i) => {
      const pc = p.qty * p.price / tv * 100;
      return `<div class="bar-row"><div class="bar-label"><span>${p.name}</span><span>${pc.toFixed(1)}%</span></div><div class="bar-bg"><div class="bar-fill" style="width:${pc}%;background:${colors[i % colors.length]}"></div></div></div>`;
    }).join('');
  }
}

async function addPos() {
  const name = document.getElementById('f-name').value.trim();
  const qty = parseFloat(document.getElementById('f-qty').value);
  const pru = parseFloat(document.getElementById('f-pru').value);
  const price = parseFloat(document.getElementById('f-price').value);
  if (!name || isNaN(qty) || isNaN(pru) || isNaN(price)) { alert('Remplis tous les champs obligatoires.'); return; }
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
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:4px"><span>Aujourd'hui : ${fmtK(tv)}</span><span>Objectif : ${fmtK(target)}</span></div>
    <div class="obj-bar-bg"><div class="obj-bar-fill" style="width:${pct}%"></div></div>
    <div class="metrics-grid" style="margin-top:14px">
      <div class="metric-card"><div class="metric-label">Capital projeté dans ${years} ans</div><div class="metric-val ${onTrack ? 'green' : 'red'}">${fmtK(Math.round(fv))}</div></div>
      <div class="metric-card"><div class="metric-label">Objectif</div><div class="metric-val purple">${fmtK(target)}</div></div>
      <div class="metric-card"><div class="metric-label">Versement actuel</div><div class="metric-val">${fmtI(monthly)} €/mois</div></div>
      <div class="metric-card"><div class="metric-label">Nécessaire pour réussir</div><div class="metric-val ${onTrack ? 'green' : 'red'}">${onTrack ? 'Objectif atteint !' : fmtI(monthlyNeeded) + ' €/mois'}</div></div>
    </div>
    <div class="alert ${onTrack ? 'alert-ok' : 'alert-warn'}" style="margin-top:12px">
      <span class="alert-icon">${onTrack ? '✓' : '⚠'}</span>
      <div>${onTrack ? `Tu es en bonne voie — tu devrais atteindre <strong>${fmtK(Math.round(fv))}</strong> dans ${years} ans.` : `Il te manque <strong>${fmtI(monthlyNeeded - monthly)} €/mois</strong> pour atteindre ton objectif. Augmente ton versement ou allonge la durée.`}</div>
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
    { label: '-10%', pct: 10, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)', event: 'Correction modérée' },
    { label: '-20%', pct: 20, color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', event: 'Bear market (2022)' },
    { label: '-30%', pct: 30, color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', event: 'Crise sévère (Covid 2020)' },
    { label: '-40%', pct: 40, color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)', event: 'Crash majeur (2008)' },
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
  document.getElementById('settings-msg').style.display = 'block';
  setTimeout(() => document.getElementById('settings-msg').style.display = 'none', 2000);
}

// ===== NEWS =====
async function loadNews() {
  const ico = document.getElementById('news-ico');
  const btn = document.getElementById('news-refresh-btn');
  ico.classList.add('spinning'); btn.disabled = true;
  document.getElementById('news-list').innerHTML = '<p style="color:#4b5563;font-size:13px;padding:20px 0;text-align:center">Chargement des actualités en temps réel...</p>';
  const prompt = `Recherche les 6 annonces économiques les plus importantes d'aujourd'hui. Retourne UNIQUEMENT un tableau JSON (sans backticks) de 6 objets : {"titre":"...","resume":"1-2 phrases","categorie":"macro|banque|marche|geo|secteur","impact":"élevé|moyen|faible","heure":"...","signal":"acheter|attendre|éviter|neutre","reco_texte":"2-3 phrases pour débutant prudent","actifs_cibles":["ticker1","ticker2"]}`;
  const raw = await callClaude(prompt, 'Tu es analyste financier. Retourne uniquement du JSON valide sans texte autour ni backticks.');
  try {
    const s = raw.replace(/```json|```/g, '').trim();
    newsData = JSON.parse(s.slice(s.indexOf('['), s.lastIndexOf(']') + 1));
  } catch { newsData = fallbackNews(); }
  newsLoaded = true; ico.classList.remove('spinning'); btn.disabled = false;
  renderNews();
}

function fallbackNews() {
  return [
    { titre: "BCE : taux inchangés", resume: "La BCE maintient ses taux directeurs en mai 2026.", categorie: "banque", impact: "élevé", heure: "Aujourd'hui", signal: "attendre", reco_texte: "Signal neutre. Continue ton DCA sans changement.", actifs_cibles: ["IWDA", "VWCE"] },
    { titre: "Inflation zone euro à 2,2%", resume: "L'inflation continue de ralentir proche de l'objectif BCE.", categorie: "macro", impact: "moyen", heure: "Aujourd'hui", signal: "acheter", reco_texte: "Bonne nouvelle pour les ETF monde long terme. Bon moment pour renforcer.", actifs_cibles: ["IWDA", "VWCE"] },
    { titre: "S&P 500 en hausse", resume: "Marchés US portés par de bons résultats trimestriels.", categorie: "marche", impact: "moyen", heure: "Hier", signal: "neutre", reco_texte: "Hausse profitable aux ETF monde. Pas d'action urgente.", actifs_cibles: ["IWDA", "CSPX"] },
    { titre: "Tensions commerciales Chine-UE", resume: "Bruxelles maintient des droits de douane sur les véhicules électriques.", categorie: "geo", impact: "élevé", heure: "Aujourd'hui", signal: "éviter", reco_texte: "Évite les ETF automobile. Reste sur ETF très diversifiés.", actifs_cibles: ["Stellantis", "ETF Auto"] },
    { titre: "LVMH : résultats décevants en Asie", resume: "Ventes en baisse sur le marché asiatique pour LVMH.", categorie: "secteur", impact: "moyen", heure: "Ce matin", signal: "attendre", reco_texte: "Si tu détiens LVMH, garde. N'achète pas à court terme.", actifs_cibles: ["LVMH", "Kering"] },
    { titre: "Fed : Powell prudent", resume: "La Fed ne prévoit pas de baisser ses taux rapidement.", categorie: "banque", impact: "élevé", heure: "Hier soir", signal: "attendre", reco_texte: "Taux hauts = prudence sur les achats. Continue ton DCA normalement.", actifs_cibles: ["IWDA", "CSPX"] },
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
  if (!filtered.length) { list.innerHTML = '<p style="color:#4b5563;font-size:13px;padding:20px 0">Aucune actualité dans cette catégorie.</p>'; return; }
  const tagCls = { macro: 'pill-purple', banque: 'pill-amber', marche: 'pill-blue', geo: 'pill-red', secteur: 'pill-green' };
  const tagLbl = { macro: 'Macro', banque: 'Banque centrale', marche: 'Marchés', geo: 'Géopolitique', secteur: 'Secteurs' };
  const impCls = { 'élevé': 'pill-red', 'moyen': 'pill-amber', 'faible': 'pill-green' };
  const sigCls = { acheter: 'signal-buy', attendre: 'signal-wait', 'éviter': 'signal-avoid', neutre: 'signal-neutral' };
  const sigLbl = { acheter: "↑ Opportunité d'achat", attendre: '⏸ Attendre', 'éviter': '↓ Éviter', neutre: '→ Neutre' };
  list.innerHTML = filtered.map((n, i) => {
    const pct = suggestedPct(n.signal, profile.risk, profile.horizon);
    const amt = Math.round(profile.bankroll * pct / 100);
    const first = (n.actifs_cibles || [])[0] || n.titre.slice(0, 8);
    const assets = (n.actifs_cibles || []).map(a => `<span class="pill pill-gray" style="margin-right:4px;margin-bottom:4px">${a}</span>`).join('');
    const stripCls = { acheter: 'opp-strip-buy', attendre: 'opp-strip-wait', 'éviter': 'opp-strip-avoid', neutre: 'opp-strip-neutral' }[n.signal] || 'opp-strip-neutral';
    const amtColor = { acheter: '#4ade80', attendre: '#fbbf24', 'éviter': '#f87171', neutre: '#9ca3af' }[n.signal] || '#9ca3af';
    const oppBtn = n.signal !== 'éviter' ? `<button class="btn-analyse" onclick="openDecision('${first}','${n.signal}')">Analyser →</button>` : '';
    return `<div class="news-item">
      <div class="news-item-head" onclick="toggleNews(${i})">
        <div class="news-meta"><span class="pill ${tagCls[n.categorie] || 'pill-gray'}">${tagLbl[n.categorie] || n.categorie}</span><span class="pill ${impCls[n.impact] || 'pill-gray'}">Impact ${n.impact}</span><span class="news-time">${n.heure}</span></div>
        <div class="news-title">${n.titre}</div>
        <div class="news-summary">${n.resume}</div>
        <button class="news-expand" id="nexp-${i}">▾ Voir recommandation IA</button>
      </div>
      <div class="news-reco" id="nreco-${i}">
        <div class="${sigCls[n.signal] || 'signal-neutral'} signal-badge">${sigLbl[n.signal] || 'Neutre'}</div>
        <div class="news-reco-text">${n.reco_texte}</div>
        ${assets ? `<div style="margin-bottom:12px">${assets}</div>` : ''}
        <div class="opp-strip ${stripCls}">
          <div><div class="opp-label">${n.signal === 'éviter' ? 'Pas d\'investissement conseillé' : n.signal === 'acheter' ? 'Opportunité à saisir' : 'À surveiller'}</div><div class="opp-sub">${n.signal !== 'éviter' ? `${pct}% bankroll · ${HL[profile.horizon]} · Risque ${RL[profile.risk]}` : 'Signal négatif — passe ton tour'}</div></div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div class="opp-amount" style="color:${amtColor}">${n.signal === 'éviter' ? '0 €' : amt.toLocaleString('fr-FR') + ' €'}</div>
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
  b.textContent = open ? '▾ Voir recommandation IA' : '▴ Masquer';
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
  notice.textContent = `✓ Pré-rempli depuis les actualités — ${ticker} · ${pct}% de ta bankroll (${amt.toLocaleString('fr-FR')} €)`;
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
  const prompt = `Actif : ${name} | Montant : ${amount || '?'}€ (${pct}% bankroll ${profile.bankroll}€) | Horizon : ${HL[horizon]} | Risque : ${RL[risk]} | Profil : débutant prudent ETF/actions. Analyse en 5 lignes : 1) ce que c'est 2) risque 3) adapté au profil ? 4) montant raisonnable ? 5) alternative si besoin.`;
  document.getElementById('d-result').innerHTML = '<div class="ai-bubble bot">Analyse en cours...</div>';
  const r = await callClaude(prompt);
  document.getElementById('d-result').innerHTML = `<div class="ai-bubble bot">${r}</div>`;
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
    <div class="metric-card"><div class="metric-label">Multiplicateur</div><div class="metric-val purple">×${(total / invested).toFixed(2)}</div></div>`;
  document.getElementById('dca-tip').innerHTML = `<div class="alert alert-ok" style="margin-top:12px"><span class="alert-icon">✓</span><div>${m.toLocaleString('fr-FR')} €/mois pendant ${y} ans génère <strong>${fmtK(Math.round(gain))}</strong> en intérêts composés.</div></div>`;
}

// ===== AI =====
async function callClaude(prompt, sys) {
  const system = sys || 'Tu es un assistant financier pédagogue francophone pour investisseurs débutants. Réponds en français, clairement et concisément. Tu ne fournis pas de conseil financier réglementé.';
  try {
    const res = await fetch('/api/claude', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, system })
    });
    const d = await res.json();
    return d.text || d.error || 'Aucune réponse.';
  } catch { return 'Erreur de connexion à l\'IA.'; }
}

function sq(q) { document.getElementById('ai-in').value = q; sendAI(); }

async function sendAI() {
  const inp = document.getElementById('ai-in');
  const q = inp.value.trim(); if (!q) return;
  inp.value = '';
  document.getElementById('qbtns').style.display = 'none';
  const chat = document.getElementById('ai-chat');
  chat.innerHTML += `<div class="bubble user">${q}</div><div class="bubble bot" id="ai-loading">Réflexion...</div>`;
  const pCtx = positions.length ? `Mon portfeuille : ${positions.map(p => `${p.name}(${p.type})`).join(', ')}.` : '';
  const r = await callClaude(`${pCtx}\nQuestion : ${q}`);
  document.getElementById('ai-loading').outerHTML = `<div class="bubble bot">${r}</div>`;
  chat.scrollTop = chat.scrollHeight;
}
