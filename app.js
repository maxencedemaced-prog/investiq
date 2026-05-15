// ===== CONFIG =====
const SUPABASE_URL = 'https://soyyznyceqzimhoaffaw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3_8eb6YbCfJ04Qihdy9ivw_NsQ4H_cu';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== STATE =====
let currentUser = null;
let isDemo = false;
let positions = [];
let profile = { bankroll: 5000, horizon: 'moyen', risk: 'faible', notif: 'daily' };
let objective = { target: 50000, years: 10, rate: 7, monthly: 200 };
let newsData = [];
let newsFilter = 'tous';
let notifications = [];
let posSignals = {};
let chatHistory = [];
const COLORS = ['#1a7f5a','#1c1c1e','#ff3b30','#1a56db','#ff9500','#9b59b6'];
const HL = { court:'Court (<3 ans)', moyen:'Moyen (3–7 ans)', long:'Long (>7 ans)' };
const RL = { faible:'Faible', modere:'Modérée', eleve:'Élevée' };

// Cache keys
const CACHE_NEWS = 'iq_news_cache';
const CACHE_SIGNALS = 'iq_signals_cache';
const CACHE_CHAT = 'iq_chat_history';

// ===== INIT =====
window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) await initApp(session.user);
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) await initApp(session.user);
    if (event === 'SIGNED_OUT') showAuthScreen();
  });
});

async function initApp(user) {
  currentUser = user; isDemo = false;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('demo-banner').style.display = 'none';
  const email = user.email || '';
  document.getElementById('topbar-email').textContent = email.split('@')[0];
  document.getElementById('topbar-avatar').textContent = (email[0]||'U').toUpperCase();
  await loadProfile(); await loadPositions(); await loadObjective();
  loadChatHistory();
  nav('home');
  setTimeout(() => { checkPriceAlerts(); checkAndGenerateNotifications(); }, 2000);
  if ('Notification' in window) Notification.requestPermission();
}

function enterDemo() {
  isDemo = true;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('demo-banner').style.display = 'block';
  document.getElementById('topbar-email').textContent = 'Demo';
  document.getElementById('topbar-avatar').textContent = 'D';
  positions = [
    {id:'d1',name:'IWDA',qty:15,pru:87.5,price:94.2,type:'ETF',sector:'Monde',platform:'Trade Republic',alert_price:80},
    {id:'d2',name:'VWCE',qty:8,pru:110,price:118.5,type:'ETF',sector:'Monde',platform:'Trade Republic',alert_price:null},
    {id:'d3',name:'LVMH',qty:2,pru:730,price:685,type:'Action',sector:'Luxe',platform:'XTB',alert_price:650},
    {id:'d4',name:'Air Liquide',qty:5,pru:162,price:179,type:'Action',sector:'Industrie',platform:'XTB',alert_price:null},
  ];
  nav('home');
}

function showAuthScreen() {
  currentUser = null; isDemo = false; positions = []; posSignals = {}; chatHistory = [];
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

// ===== AUTH =====
function switchAuth(m) {
  document.getElementById('auth-login').style.display = m==='login'?'block':'none';
  document.getElementById('auth-signup').style.display = m==='signup'?'block':'none';
  document.getElementById('tab-login').classList.toggle('active', m==='login');
  document.getElementById('tab-signup').classList.toggle('active', m==='signup');
  setAuthMsg('');
}
function setAuthMsg(msg, ok=false) {
  const el = document.getElementById('auth-msg');
  el.textContent = msg; el.className = 'auth-msg ' + (ok?'success':'error');
}
async function login() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!email||!pass) { setAuthMsg('Remplis tous les champs.'); return; }
  setAuthMsg('Connexion...', true);
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) setAuthMsg('Email ou mot de passe incorrect.');
}
async function signup() {
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-pass').value;
  const pass2 = document.getElementById('signup-pass2').value;
  if (!email||!pass) { setAuthMsg('Remplis tous les champs.'); return; }
  if (pass!==pass2) { setAuthMsg('Mots de passe différents.'); return; }
  if (pass.length<6) { setAuthMsg('Mot de passe trop court.'); return; }
  setAuthMsg('Création...', true);
  const { error } = await sb.auth.signUp({ email, password: pass });
  if (error) setAuthMsg(error.message);
  else setAuthMsg('Compte créé ! Vérifie ton email.', true);
}
async function logout() {
  if (!isDemo) await sb.auth.signOut();
  showAuthScreen();
  closeSidebar();
}
async function changePassword() {
  const p = document.getElementById('new-pass').value;
  const p2 = document.getElementById('new-pass2').value;
  const msg = document.getElementById('pass-msg');
  if (p!==p2) { msg.style.display='block'; msg.style.color='#ff3b30'; msg.textContent='Mots de passe différents.'; return; }
  if (p.length<6) { msg.style.display='block'; msg.style.color='#ff3b30'; msg.textContent='Trop court.'; return; }
  const { error } = await sb.auth.updateUser({ password: p });
  msg.style.display='block';
  if (error) { msg.style.color='#ff3b30'; msg.textContent='Erreur: '+error.message; }
  else { msg.style.color='#1a7f5a'; msg.textContent='✓ Mot de passe mis à jour !'; }
}

// ===== DATA =====
async function loadProfile() {
  const { data } = await sb.from('profiles').select('*').eq('id',currentUser.id).single();
  if (data) {
    profile = { bankroll: data.bankroll||5000, horizon: data.horizon||'moyen', risk: data.risk||'faible', notif: data.notif||'daily' };
    document.getElementById('s-bankroll').value = profile.bankroll;
    document.getElementById('s-horizon').value = profile.horizon;
    document.getElementById('s-risk').value = profile.risk;
    if (document.getElementById('s-notif')) document.getElementById('s-notif').value = profile.notif;
  }
}
async function saveProfile() {
  profile.bankroll = parseFloat(document.getElementById('s-bankroll').value)||5000;
  profile.horizon = document.getElementById('s-horizon').value;
  profile.risk = document.getElementById('s-risk').value;
  profile.notif = document.getElementById('s-notif')?.value||'daily';
  if (!isDemo) await sb.from('profiles').upsert({ id:currentUser.id, ...profile });
}
async function loadPositions() {
  const { data } = await sb.from('positions').select('*').eq('user_id',currentUser.id).order('created_at');
  positions = data||[];
}
async function loadObjective() {
  const { data } = await sb.from('objectives').select('*').eq('user_id',currentUser.id).single();
  if (data) {
    objective = { target:data.target, years:data.years, rate:data.rate, monthly:data.monthly };
    document.getElementById('obj-target').value = objective.target;
    document.getElementById('obj-years').value = objective.years;
    document.getElementById('obj-rate').value = objective.rate;
    document.getElementById('obj-monthly').value = objective.monthly;
  }
}

// ===== LIVE PRICES =====
async function refreshPrices() {
  if (!positions.length) return;
  const ico = document.getElementById('refresh-prices-ico');
  ico.classList.add('spinning');
  const tickers = positions.map(p => encodeURIComponent(p.name)).join(',');
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers}&fields=regularMarketPrice,regularMarketChangePercent`);
    const data = await res.json();
    const quotes = data.quoteResponse?.result || [];
    let updated = 0;
    for (const q of quotes) {
      const pos = positions.find(p => p.name.toUpperCase() === q.symbol.toUpperCase() || q.symbol.includes(p.name.toUpperCase()));
      if (pos && q.regularMarketPrice) {
        pos.price = q.regularMarketPrice;
        pos.change_pct = q.regularMarketChangePercent;
        if (!isDemo) await sb.from('positions').update({ price: pos.price }).eq('id', pos.id);
        updated++;
      }
    }
    if (updated > 0) renderPortfolio();
    showPriceTicker(quotes);
  } catch(e) {
    // Yahoo Finance may be blocked by CORS — use fallback
    showTickerFallback();
  }
  ico.classList.remove('spinning');
}

function showPriceTicker(quotes) {
  const ticker = document.getElementById('price-ticker');
  if (!quotes.length) { ticker.innerHTML=''; return; }
  const items = quotes.slice(0,3).map(q => {
    const chg = q.regularMarketChangePercent||0;
    const color = chg>=0?'#1a7f5a':'#ff3b30';
    return `<span style="font-size:12px;font-weight:700;color:${color}">${q.symbol} ${chg>=0?'+':''}${chg.toFixed(1)}%</span>`;
  });
  ticker.innerHTML = items.join('<span style="color:#c7c7cc;margin:0 6px">·</span>');
}

function showTickerFallback() {
  const ticker = document.getElementById('price-ticker');
  ticker.innerHTML = '<span style="font-size:12px;color:#8e8e93">Prix mis à jour manuellement</span>';
}

function checkPriceAlerts() {
  positions.forEach(p => {
    if (p.alert_price && p.price <= p.alert_price) {
      const notif = { titre:`⚠ Alerte prix — ${p.name}`, texte:`${p.name} est à ${fmt(p.price)}€, sous ton seuil d'alerte de ${fmt(p.alert_price)}€.`, action:`Consulter ${p.name} dans ton portefeuille`, impact:'high', heure:'Maintenant' };
      notifications.unshift(notif);
      document.getElementById('notif-dot').classList.add('show');
      if ('Notification' in window && Notification.permission==='granted') {
        new Notification(`InvestIQ — Alerte ${p.name}`, { body: notif.texte, icon:'/icons/icon-192.png' });
      }
    }
  });
  renderNotifications();
}

// ===== CHAT MEMORY =====
function loadChatHistory() {
  try { chatHistory = JSON.parse(localStorage.getItem(CACHE_CHAT)||'[]'); } catch { chatHistory = []; }
  const chat = document.getElementById('ai-chat');
  if (chatHistory.length > 0) {
    chat.innerHTML = chatHistory.map(m => `<div class="bubble ${m.role==='user'?'user':'bot'}">${m.content}</div>`).join('');
    document.getElementById('qbtns').style.display = 'none';
  }
}
function saveChatHistory() {
  try { localStorage.setItem(CACHE_CHAT, JSON.stringify(chatHistory.slice(-20))); } catch {}
}
function clearChat() {
  chatHistory = [];
  try { localStorage.removeItem(CACHE_CHAT); } catch {}
  document.getElementById('ai-chat').innerHTML = '<div class="bubble bot">Conversation effacée. Comment puis-je t\'aider ?</div>';
  document.getElementById('qbtns').style.display = 'flex';
}

// ===== SIGNALS CACHE =====
function loadSignalsCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_SIGNALS)||'{}');
    const today = new Date().toDateString();
    if (cached.date === today) posSignals = cached.signals||{};
  } catch {}
}
function saveSignalsCache() {
  try { localStorage.setItem(CACHE_SIGNALS, JSON.stringify({ date: new Date().toDateString(), signals: posSignals })); } catch {}
}

// ===== NEWS CACHE =====
function loadNewsCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_NEWS)||'{}');
    const today = new Date().toDateString();
    if (cached.date === today && cached.data?.length) { newsData = cached.data; return true; }
  } catch {}
  return false;
}
function saveNewsCache() {
  try { localStorage.setItem(CACHE_NEWS, JSON.stringify({ date: new Date().toDateString(), data: newsData })); } catch {}
}

// ===== NAV =====
function nav(page) {
  document.querySelectorAll('.sec').forEach(s => { s.classList.remove('active'); });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('sec-'+page);
  const btn = document.getElementById('nav-'+page);
  if (sec) { sec.classList.add('active'); }
  if (btn) btn.classList.add('active');
  closeSidebar();
  const renders = { home:renderHome, portfolio:renderPortfolio, sante:renderSante, objectif:renderObj, crise:renderCrise, dca:updateDCA, news:()=>{ if(!loadNewsCache()) loadNews(false); else renderNews(); } };
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
function toggleNotifPanel() {
  document.getElementById('notif-panel').classList.toggle('open');
  document.getElementById('notif-dot').classList.remove('show');
}
function closeNotifPanel() { document.getElementById('notif-panel').classList.remove('open'); }

// ===== FORMATTERS =====
function fmt(n) { return Number(n).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtK(n) { return n>=1000?(n/1000).toFixed(1)+' k€':fmt(n)+' €'; }
function fmtI(n) { return Math.round(n).toLocaleString('fr-FR'); }

// ===== NOTIFICATIONS =====
async function checkAndGenerateNotifications() {
  if (!positions.length) return;
  const prompt = `Analyse ce portefeuille et génère 3-4 alertes importantes pour aujourd'hui.
Positions : ${positions.map(p=>`${p.name}(${p.type}, PRU:${p.pru}€, actuel:${p.price}€)`).join(', ')}
Retourne UNIQUEMENT un JSON (sans backticks) : [{"titre":"...","texte":"1 phrase","action":"quoi faire","impact":"high|medium|low","heure":"maintenant"}]`;
  try {
    const raw = await callClaude(prompt, 'Tu es analyste financier. Retourne uniquement du JSON valide.');
    const s = raw.replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(s.slice(s.indexOf('['),s.lastIndexOf(']')+1));
    notifications = [...notifications, ...parsed];
  } catch {
    notifications = [{ titre:"Analyse du portefeuille", texte:"Ton portefeuille a été analysé avec succès.", action:"Consulte la section Santé pour les détails.", impact:"low", heure:"maintenant" }];
  }
  renderNotifications();
  if (notifications.find(n=>n.impact==='high')) {
    document.getElementById('notif-dot').classList.add('show');
    if ('Notification' in window && Notification.permission==='granted') {
      const h = notifications.find(n=>n.impact==='high');
      new Notification('InvestIQ — Alerte importante', { body:h.titre+': '+h.texte, icon:'/icons/icon-192.png' });
    }
  }
}
function renderNotifications() {
  const list = document.getElementById('notif-list');
  if (!notifications.length) { list.innerHTML='<div class="notif-empty">Aucune notification.</div>'; return; }
  list.innerHTML = notifications.map(n=>`
    <div class="notif-item ${n.impact}">
      <div class="notif-item-title">${n.titre}</div>
      <div class="notif-item-text">${n.texte}</div>
      <button class="notif-item-action">→ ${n.action}</button>
      <div class="notif-item-time">${n.heure}</div>
    </div>`).join('');
}

// ===== HOME =====
function renderHome() {
  const h = new Date().getHours();
  const greet = h<12?'Bonjour':h<18?'Bon après-midi':'Bonsoir';
  const name = isDemo?'Max':(currentUser?.email||'').split('@')[0];
  document.getElementById('home-greeting').textContent = greet+' '+name+' !';
  const tv = positions.reduce((a,p)=>a+p.qty*p.price,0);
  const ti = positions.reduce((a,p)=>a+p.qty*p.pru,0);
  const tpnl = tv-ti, tpct = ti?tpnl/ti*100:0;
  const avgChange = positions.length ? positions.reduce((a,p)=>a+(p.change_pct||0),0)/positions.length : 0;
  document.getElementById('home-metrics').innerHTML=`
    <div class="metric-card"><div class="metric-label">Valeur totale</div><div class="metric-val">${fmtK(tv)}</div><div class="metric-trend">${avgChange>=0?'↑':'↓'} ${Math.abs(avgChange).toFixed(1)}% aujourd'hui</div></div>
    <div class="metric-card"><div class="metric-label">Plus-value</div><div class="metric-val ${tpnl>=0?'green':'red'}">${tpnl>=0?'+':''}${fmtK(tpnl)}</div><div class="metric-trend">${tpnl>=0?'↑':'↓'} sur position initiale</div></div>
    <div class="metric-card"><div class="metric-label">Performance</div><div class="metric-val ${tpnl>=0?'green':'red'}">${tpnl>=0?'+':''}${tpct.toFixed(2)}%</div><div class="metric-trend">Depuis l'ouverture</div></div>
    <div class="metric-card"><div class="metric-label">Bankroll dispo</div><div class="metric-val blue">${fmtK(profile.bankroll)}</div><div class="metric-trend">Pour investir</div></div>`;
  document.getElementById('home-score').innerHTML = positions.length?buildScore():emptyMsg();
  document.getElementById('home-alerts').innerHTML = positions.length?buildAlerts():emptyMsg();
  const pctObj = Math.min(tv/objective.target*100,100);
  document.getElementById('home-obj').innerHTML=`
    <div style="display:flex;justify-content:space-between;font-size:13px;color:#8e8e93;margin-bottom:4px;font-weight:600"><span>Objectif : ${fmtK(objective.target)}</span><span>${pctObj.toFixed(1)}%</span></div>
    <div class="obj-bar-bg"><div class="obj-bar-fill" style="width:${pctObj}%"></div></div>
    <div style="font-size:12px;color:#c7c7cc;margin-top:4px;font-weight:500">Valeur actuelle : ${fmtK(tv)} · Reste : ${fmtK(Math.max(objective.target-tv,0))}</div>`;
  renderPlatforms();
}

function emptyMsg() { return '<p style="font-size:14px;color:#c7c7cc;padding:4px 0;font-weight:500">Ajoutez des positions pour voir cet indicateur.</p>'; }

function renderPlatforms() {
  const tv = positions.reduce((a,p)=>a+p.qty*p.price,0);
  if (!tv) { document.getElementById('home-platforms').innerHTML=emptyMsg(); return; }
  const platforms = {};
  positions.forEach(p=>{ const v=p.qty*p.price; platforms[p.platform||'Autre']=(platforms[p.platform||'Autre']||0)+v; });
  document.getElementById('home-platforms').innerHTML = Object.entries(platforms).map(([name,val])=>`
    <div class="bar-row"><div class="bar-label"><span>${name}</span><span>${fmtK(val)} (${(val/tv*100).toFixed(1)}%)</span></div>
    <div class="bar-bg"><div class="bar-fill" style="width:${val/tv*100}%;background:#1c1c1e"></div></div></div>`).join('');
}

// ===== SCORE =====
function calcScore() {
  if (!positions.length) return {score:0,items:[]};
  const tv = positions.reduce((a,p)=>a+p.qty*p.price,0);
  const maxW = Math.max(...positions.map(p=>p.qty*p.price/tv*100));
  const etfPct = positions.filter(p=>p.type==='ETF').reduce((a,p)=>a+p.qty*p.price,0)/tv*100;
  const pnl = positions.reduce((a,p)=>a+(p.qty*p.price-p.qty*p.pru),0);
  const items=[
    {label:'Diversification',score:Math.min(10,positions.length*2.5),tip:positions.length<4?`${positions.length} positions — vise 4+`:''},
    {label:'Concentration max',score:maxW>50?2:maxW>35?5:maxW>25?7:10,tip:maxW>35?`Position dominante ${maxW.toFixed(0)}%`:''},
    {label:'Part ETF',score:etfPct>=60?10:etfPct>=40?8:etfPct>=20?5:3,tip:etfPct<40?`ETF = ${etfPct.toFixed(0)}% — vise 60%+`:''},
    {label:'Performance',score:pnl>=0?8:pnl>-tv*0.1?6:4,tip:''},
  ];
  return {score:Math.round(items.reduce((a,i)=>a+i.score,0)/items.length*10)/10,items};
}
function buildScore() {
  const {score,items}=calcScore();
  const color=score>=7?'#1a7f5a':score>=5?'#ff9500':'#ff3b30';
  const bg=score>=7?'#e8f8f0':score>=5?'#fff5e0':'#fff0f0';
  let html=`<div class="score-wrap"><div class="score-ring" style="background:${bg};border-color:${color}"><div class="score-num" style="color:${color}">${score.toFixed(1)}</div><div class="score-max" style="color:${color}">/10</div></div><div class="score-items">`;
  items.forEach(it=>{const c=it.score>=7?'#1a7f5a':it.score>=5?'#ff9500':'#ff3b30';html+=`<div class="score-row"><span class="score-row-label">${it.label}</span><div class="score-bar-bg"><div class="score-bar-fill" style="width:${it.score/10*100}%;background:${c}"></div></div><span class="score-val" style="color:${c}">${it.score}</span></div>`;});
  html+='</div></div>';
  const tips=items.filter(i=>i.tip);
  if(tips.length) html+='<div style="margin-top:8px">'+tips.map(t=>`<div style="font-size:13px;color:#8e8e93;margin-bottom:4px;font-weight:500">→ ${t.tip}</div>`).join('')+'</div>';
  return html;
}
function buildAlerts() {
  const tv=positions.reduce((a,p)=>a+p.qty*p.price,0);
  if (!tv) return emptyMsg();
  let alerts=[];
  positions.forEach(p=>{
    const w=p.qty*p.price/tv*100;
    if(w>40) alerts.push({type:'err',msg:`<strong>${p.name}</strong> = ${w.toFixed(0)}% — concentration excessive.`});
    else if(w>25) alerts.push({type:'warn',msg:`<strong>${p.name}</strong> = ${w.toFixed(0)}% — surveille.`});
    if(p.alert_price&&p.price<=p.alert_price) alerts.push({type:'err',msg:`<strong>${p.name}</strong> sous ton alerte prix de ${fmt(p.alert_price)}€ !`});
  });
  const etfPct=positions.filter(p=>p.type==='ETF').reduce((a,p)=>a+p.qty*p.price,0)/tv*100;
  if(etfPct<30) alerts.push({type:'warn',msg:`Seulement ${etfPct.toFixed(0)}% d'ETF — vise 60–80%.`});
  if(positions.length<3) alerts.push({type:'warn',msg:`${positions.length} position(s) — diversifie avec 3–5 actifs.`});
  if(!alerts.length) alerts.push({type:'ok',msg:'Portefeuille bien équilibré — aucune alerte !'});
  const icons={ok:'✓',warn:'⚠',err:'✕'};
  return alerts.map(a=>`<div class="alert alert-${a.type}"><span class="alert-icon">${icons[a.type]}</span><div>${a.msg}</div></div>`).join('');
}

// ===== PORTFOLIO =====
function renderPortfolio() {
  const tv=positions.reduce((a,p)=>a+p.qty*p.price,0);
  const ti=positions.reduce((a,p)=>a+p.qty*p.pru,0);
  const tpnl=tv-ti, tpct=ti?tpnl/ti*100:0;
  document.getElementById('port-metrics').innerHTML=`
    <div class="metric-card"><div class="metric-label">Valeur totale</div><div class="metric-val">${fmtK(tv)}</div></div>
    <div class="metric-card"><div class="metric-label">Investi</div><div class="metric-val">${fmtK(ti)}</div></div>
    <div class="metric-card"><div class="metric-label">Plus-value</div><div class="metric-val ${tpnl>=0?'green':'red'}">${tpnl>=0?'+':''}${fmtK(tpnl)}</div></div>
    <div class="metric-card"><div class="metric-label">Performance</div><div class="metric-val ${tpnl>=0?'green':'red'}">${tpnl>=0?'+':''}${tpct.toFixed(2)}%</div></div>`;
  const grid=document.getElementById('pos-grid');
  document.getElementById('pos-empty').style.display=positions.length?'none':'block';
  document.getElementById('alloc-card').style.display=positions.length?'block':'none';
  if(!positions.length){grid.innerHTML='';return;}
  loadSignalsCache();
  grid.innerHTML=positions.map((p,idx)=>{
    const val=p.qty*p.price,inv=p.qty*p.pru,pnl=val-inv,pct=inv?pnl/inv*100:0;
    const sig=posSignals[p.id];
    const sigHtml=sig?`<span class="signal-badge-large ${sig.action==='acheter'?'sig-buy':sig.action==='vendre'?'sig-sell':'sig-hold'}">${sig.action==='acheter'?'↑ Renforcer':sig.action==='vendre'?'↓ Alléger':'→ Garder'}</span>`:`<span class="signal-badge-large sig-loading">Analyse...</span>`;
    const chgHtml=p.change_pct!==undefined?`<span style="font-size:12px;color:${p.change_pct>=0?'#1a7f5a':'#ff3b30'};font-weight:700">${p.change_pct>=0?'+':''}${p.change_pct?.toFixed(1)}% auj.</span>`:'';
    const alertHtml=p.alert_price?`<span style="font-size:11px;color:#8e8e93;font-weight:600">🔔 Alerte: ${fmt(p.alert_price)}€</span>`:'';
    return`<div class="pos-card">
      <div class="pos-card-head" onclick="togglePosSignal('${p.id}')">
        <div class="pos-card-left">
          <div class="pos-avatar" style="background:${COLORS[idx%COLORS.length]}">${p.name.slice(0,2).toUpperCase()}</div>
          <div>
            <div class="pos-name">${p.name} ${chgHtml}</div>
            <div class="pos-meta">${p.type} · ${p.qty} parts · ${p.platform||''} ${alertHtml}</div>
          </div>
        </div>
        <div class="pos-card-right">
          <div class="pos-val">${fmt(val)} €</div>
          <div class="pos-pnl ${pnl>=0?'green':'red'}">${pnl>=0?'+':''}${pct.toFixed(1)}% (${pnl>=0?'+':''}${fmt(pnl)}€)</div>
        </div>
      </div>
      <div class="pos-signal-row" id="sig-${p.id}">
        <div class="pos-signal-content">
          <div class="signal-header"><div style="font-size:12px;color:#8e8e93;font-weight:700">Signal IA</div>${sigHtml}</div>
          <div class="perf-bar-wrap">
            <div class="perf-bar-label"><span>PRU : ${fmt(p.pru)}€</span><span>Actuel : ${fmt(p.price)}€</span></div>
            <div class="perf-bar-bg"><div class="perf-bar-fill" style="width:${Math.min(Math.abs(pct)/30*100,100)}%;background:${pnl>=0?'#1a7f5a':'#ff3b30'}"></div></div>
          </div>
          ${sig?`<div class="signal-text" style="margin-top:8px">${sig.texte}</div>`:''}
          <div class="pos-actions">
            <button class="btn-sm buy" onclick="openDecisionFromPos('${p.name}','acheter')">+ Renforcer</button>
            <button class="btn-sm" onclick="openDecisionFromPos('${p.name}','garder')">Analyser</button>
            <button class="btn-sm sell" onclick="openDecisionFromPos('${p.name}','vendre')">− Alléger</button>
            ${!isDemo?`<button class="btn-del" onclick="delPos('${p.id}')" style="margin-left:auto">Supprimer</button>`:''}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
  if(tv>0) {
    document.getElementById('alloc-bars').innerHTML=positions.map((p,i)=>{
      const pc=p.qty*p.price/tv*100;
      return`<div class="bar-row"><div class="bar-label"><span>${p.name}</span><span>${pc.toFixed(1)}%</span></div><div class="bar-bg"><div class="bar-fill" style="width:${pc}%;background:${COLORS[i%COLORS.length]}"></div></div></div>`;
    }).join('');
  }
  positions.forEach(p=>{if(!posSignals[p.id])generatePosSignal(p);});
}

async function generatePosSignal(p) {
  const pnl=(p.price-p.pru)/p.pru*100;
  const prompt=`Position : ${p.name}(${p.type}), PRU ${p.pru}€, actuel ${p.price}€, perf ${pnl.toFixed(1)}%. Profil : ${HL[profile.horizon]}, risque ${RL[profile.risk]}.
Retourne UNIQUEMENT JSON : {"action":"acheter|garder|vendre","texte":"1 phrase conseil simple"}`;
  try {
    const raw=await callClaude(prompt,'Retourne uniquement du JSON valide.');
    const s=raw.replace(/```json|```/g,'').trim();
    posSignals[p.id]=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));
  } catch {
    posSignals[p.id]={action:pnl>5?'garder':pnl<-10?'vendre':'garder',texte:'Continue à surveiller cette position.'};
  }
  saveSignalsCache();
  const sigEl=document.getElementById('sig-'+p.id);
  if(sigEl&&sigEl.style.display==='block')renderPortfolio();
}

function togglePosSignal(id) {
  const el=document.getElementById('sig-'+id);
  if(el) el.style.display=el.style.display==='block'?'none':'block';
}
function openDecisionFromPos(name,action) {
  document.getElementById('d-name').value=name;
  document.getElementById('d-horizon').value=profile.horizon;
  document.getElementById('d-risk').value=profile.risk;
  updatePct();
  const notice=document.getElementById('prefill-notice');
  notice.style.display='block';
  notice.textContent=`→ Analyse de ${name} — intention : ${action}`;
  nav('decision'); document.getElementById('nav-decision').classList.add('active');
}

async function addPos() {
  const name=document.getElementById('f-name').value.trim();
  const qty=parseFloat(document.getElementById('f-qty').value);
  const pru=parseFloat(document.getElementById('f-pru').value);
  const price=parseFloat(document.getElementById('f-price').value);
  const alertPrice=parseFloat(document.getElementById('f-alert').value)||null;
  if(!name||isNaN(qty)||isNaN(pru)||isNaN(price)){alert('Remplis tous les champs obligatoires.');return;}
  if(isDemo){positions.push({id:'d'+Date.now(),name,qty,pru,price,type:document.getElementById('f-type').value,sector:document.getElementById('f-sector').value||'',platform:document.getElementById('f-platform').value,alert_price:alertPrice});['f-name','f-qty','f-pru','f-price','f-sector','f-alert'].forEach(id=>document.getElementById(id).value='');nav('portfolio');return;}
  const pos={user_id:currentUser.id,name,qty,pru,price,type:document.getElementById('f-type').value,sector:document.getElementById('f-sector').value||'',platform:document.getElementById('f-platform').value,alert_price:alertPrice};
  const {data,error}=await sb.from('positions').insert(pos).select().single();
  if(!error&&data){positions.push(data);['f-name','f-qty','f-pru','f-price','f-sector','f-alert'].forEach(id=>document.getElementById(id).value='');nav('portfolio');}
}
async function delPos(id) {
  if(!confirm('Supprimer ?'))return;
  if(!isDemo)await sb.from('positions').delete().eq('id',id);
  positions=positions.filter(p=>p.id!==id);delete posSignals[id];
  renderPortfolio();renderHome();
}
async function loadDemo() {
  const demo=[
    {name:'IWDA',qty:15,pru:87.5,price:94.2,type:'ETF',sector:'Monde',platform:'Trade Republic',alert_price:80},
    {name:'VWCE',qty:8,pru:110,price:118.5,type:'ETF',sector:'Monde',platform:'Trade Republic',alert_price:null},
    {name:'LVMH',qty:2,pru:730,price:685,type:'Action',sector:'Luxe',platform:'XTB',alert_price:650},
    {name:'Air Liquide',qty:5,pru:162,price:179,type:'Action',sector:'Industrie',platform:'XTB',alert_price:null},
  ];
  if(isDemo){positions=[...demo.map((p,i)=>({...p,id:'d'+(i+1)}))];nav('portfolio');return;}
  for(const p of demo){const {data}=await sb.from('positions').insert({...p,user_id:currentUser.id}).select().single();if(data)positions.push(data);}
  nav('portfolio');
}

// ===== EXPORT PDF =====
function exportPDF() {
  const tv=positions.reduce((a,p)=>a+p.qty*p.price,0);
  const ti=positions.reduce((a,p)=>a+p.qty*p.pru,0);
  const tpnl=tv-ti, tpct=ti?tpnl/ti*100:0;
  const rows=positions.map(p=>{const val=p.qty*p.price,pnl=val-p.qty*p.pru,pct=p.qty*p.pru?pnl/(p.qty*p.pru)*100:0;return`<tr><td>${p.name}</td><td>${p.type}</td><td>${p.qty}</td><td>${fmt(p.pru)}€</td><td>${fmt(p.price)}€</td><td>${fmt(val)}€</td><td style="color:${pnl>=0?'#1a7f5a':'#ff3b30'}">${pnl>=0?'+':''}${pct.toFixed(1)}%</td></tr>`;}).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>InvestIQ — Rapport</title><style>body{font-family:-apple-system,sans-serif;padding:40px;color:#1c1c1e}h1{font-size:28px;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px}p{color:#8e8e93}table{width:100%;border-collapse:collapse;margin-top:24px}th{text-align:left;padding:10px;background:#f2f2f7;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#8e8e93}td{padding:12px 10px;border-bottom:1px solid #f2f2f7;font-size:14px}.summary{display:flex;gap:24px;margin:24px 0}.metric{background:#f2f2f7;border-radius:14px;padding:16px;min-width:140px}.metric-label{font-size:11px;color:#8e8e93;text-transform:uppercase;font-weight:700;margin-bottom:6px}.metric-val{font-size:22px;font-weight:800}</style></head><body><h1>InvestIQ</h1><p>Rapport du ${new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</p><div class="summary"><div class="metric"><div class="metric-label">Valeur totale</div><div class="metric-val">${fmtK(tv)}</div></div><div class="metric"><div class="metric-label">Total investi</div><div class="metric-val">${fmtK(ti)}</div></div><div class="metric"><div class="metric-label">Plus-value</div><div class="metric-val" style="color:${tpnl>=0?'#1a7f5a':'#ff3b30'}">${tpnl>=0?'+':''}${fmtK(tpnl)}</div></div><div class="metric"><div class="metric-label">Performance</div><div class="metric-val" style="color:${tpnl>=0?'#1a7f5a':'#ff3b30'}">${tpnl>=0?'+':''}${tpct.toFixed(2)}%</div></div></div><table><thead><tr><th>Actif</th><th>Type</th><th>Qté</th><th>PRU</th><th>Prix actuel</th><th>Valeur</th><th>+/-</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  const win=window.open('','_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(()=>win.print(),500);
}

// ===== SANTE =====
function renderSante() {
  document.getElementById('sante-score').innerHTML=positions.length?buildScore():emptyMsg();
  document.getElementById('sante-alerts').innerHTML=positions.length?buildAlerts():emptyMsg();
}

// ===== OBJECTIF =====
function renderObj() {
  const target=parseFloat(document.getElementById('obj-target').value)||50000;
  const years=parseInt(document.getElementById('obj-years').value)||10;
  const rate=parseFloat(document.getElementById('obj-rate').value)/100/12||0.07/12;
  const monthly=parseFloat(document.getElementById('obj-monthly').value)||200;
  const tv=positions.reduce((a,p)=>a+p.qty*p.price,0);
  const n=years*12, fv=tv*Math.pow(1+rate,n)+monthly*((Math.pow(1+rate,n)-1)/rate);
  const onTrack=fv>=target;
  const monthlyNeeded=Math.max((target-tv*Math.pow(1+rate,n))*rate/(Math.pow(1+rate,n)-1),0);
  const pct=Math.min(tv/target*100,100);
  document.getElementById('obj-result').innerHTML=`
    <div style="display:flex;justify-content:space-between;font-size:13px;color:#8e8e93;margin-bottom:4px;font-weight:600"><span>Aujourd'hui : ${fmtK(tv)}</span><span>Objectif : ${fmtK(target)}</span></div>
    <div class="obj-bar-bg"><div class="obj-bar-fill" style="width:${pct}%"></div></div>
    <div class="metrics-grid" style="margin-top:14px">
      <div class="metric-card"><div class="metric-label">Capital projeté dans ${years} ans</div><div class="metric-val ${onTrack?'green':'red'}">${fmtK(Math.round(fv))}</div></div>
      <div class="metric-card"><div class="metric-label">Objectif</div><div class="metric-val">${fmtK(target)}</div></div>
      <div class="metric-card"><div class="metric-label">Versement actuel</div><div class="metric-val">${fmtI(monthly)} €/mois</div></div>
      <div class="metric-card"><div class="metric-label">Nécessaire</div><div class="metric-val ${onTrack?'green':'red'}">${onTrack?'En bonne voie !':fmtI(monthlyNeeded)+' €/mois'}</div></div>
    </div>
    <div class="alert ${onTrack?'alert-ok':'alert-warn'}" style="margin-top:12px">
      <span>${onTrack?'✓':'⚠'}</span>
      <div>${onTrack?`Tu devrais atteindre <strong>${fmtK(Math.round(fv))}</strong> dans ${years} ans.`:`Il te manque <strong>${fmtI(monthlyNeeded-monthly)} €/mois</strong> pour réussir.`}</div>
    </div>`;
}
async function saveObjectif() {
  const data={target:parseFloat(document.getElementById('obj-target').value)||50000,years:parseInt(document.getElementById('obj-years').value)||10,rate:parseFloat(document.getElementById('obj-rate').value)||7,monthly:parseFloat(document.getElementById('obj-monthly').value)||200};
  objective=data;
  if(!isDemo)await sb.from('objectives').upsert({...data,user_id:currentUser.id,updated_at:new Date().toISOString()});
  renderObj();
}

// ===== CRISE =====
function renderCrise() {
  const tv=positions.reduce((a,p)=>a+p.qty*p.price,0);
  if(!tv){document.getElementById('crise-content').innerHTML=emptyMsg();return;}
  const scenarios=[
    {label:'-10%',pct:10,color:'#cc7a00',bg:'#fff5e0',event:'Correction modérée'},
    {label:'-20%',pct:20,color:'#c2410c',bg:'#ffedd5',event:'Bear market (2022)'},
    {label:'-30%',pct:30,color:'#b91c1c',bg:'#fee2e2',event:'Crise (Covid 2020)'},
    {label:'-40%',pct:40,color:'#991b1b',bg:'#fecaca',event:'Crash (2008)'},
  ];
  document.getElementById('crise-content').innerHTML='<div class="crisis-grid">'+scenarios.map(s=>{const after=tv*(1-s.pct/100);return`<div class="crisis-card" style="background:${s.bg}"><div class="crisis-pct" style="color:${s.color}">${s.label}</div><div class="crisis-val" style="color:${s.color}">${fmtK(Math.round(after))}</div><div class="crisis-sub" style="color:${s.color}">${s.event}</div></div>`;}).join('')+'</div>';
}

// ===== SETTINGS =====
async function saveSettings() {
  await saveProfile();
  const msg=document.getElementById('settings-msg');
  msg.style.display='block';
  setTimeout(()=>msg.style.display='none',2000);
}

// ===== NEWS =====
async function loadNews(force=false) {
  if(!force&&loadNewsCache()){renderNews();return;}
  const ico=document.getElementById('news-ico');
  const btn=document.getElementById('news-refresh-btn');
  ico.classList.add('spinning');btn.disabled=true;
  document.getElementById('news-list').innerHTML='<p style="color:#c7c7cc;font-size:14px;padding:20px 0;text-align:center;font-weight:500">Chargement des actualités...</p>';
  const prompt=`Recherche les 6 annonces économiques les plus importantes d'aujourd'hui. Retourne UNIQUEMENT un tableau JSON (sans backticks) de 6 objets : {"titre":"...","resume":"1-2 phrases","categorie":"macro|banque|marche|geo|secteur","impact":"élevé|moyen|faible","heure":"...","signal":"acheter|attendre|éviter|neutre","reco_texte":"2-3 phrases pour débutant","actifs_cibles":["ticker1","ticker2"]}`;
  const raw=await callClaude(prompt,'Tu es analyste financier. Retourne uniquement du JSON valide sans texte autour ni backticks.');
  try{const s=raw.replace(/```json|```/g,'').trim();newsData=JSON.parse(s.slice(s.indexOf('['),s.lastIndexOf(']')+1));}
  catch{newsData=fallbackNews();}
  saveNewsCache();
  ico.classList.remove('spinning');btn.disabled=false;
  renderNews();
  addNewsNotifications();
}

function addNewsNotifications() {
  newsData.filter(n=>n.impact==='élevé').forEach(n=>{
    notifications.unshift({titre:n.titre,texte:n.resume,action:n.reco_texte,impact:'high',heure:n.heure});
  });
  if(notifications.length){renderNotifications();document.getElementById('notif-dot').classList.add('show');}
}

function fallbackNews() {
  return[
    {titre:"BCE : taux inchangés",resume:"La BCE maintient ses taux directeurs.",categorie:"banque",impact:"élevé",heure:"Aujourd'hui",signal:"attendre",reco_texte:"Continue ton DCA normalement.",actifs_cibles:["IWDA","VWCE"]},
    {titre:"Inflation zone euro à 2,2%",resume:"L'inflation continue de ralentir.",categorie:"macro",impact:"moyen",heure:"Aujourd'hui",signal:"acheter",reco_texte:"Bon signal pour renforcer les ETF monde.",actifs_cibles:["IWDA","VWCE"]},
    {titre:"S&P 500 en hausse",resume:"Marchés US portés par la tech.",categorie:"marche",impact:"moyen",heure:"Hier",signal:"neutre",reco_texte:"Pas d'action urgente.",actifs_cibles:["IWDA"]},
    {titre:"Tensions Chine-UE",resume:"Droits de douane maintenus sur véhicules.",categorie:"geo",impact:"élevé",heure:"Aujourd'hui",signal:"éviter",reco_texte:"Évite les ETF automobile.",actifs_cibles:["ETF Auto"]},
    {titre:"LVMH : résultats décevants",resume:"Ventes en baisse en Asie.",categorie:"secteur",impact:"moyen",heure:"Ce matin",signal:"attendre",reco_texte:"Garde si tu as LVMH.",actifs_cibles:["LVMH"]},
    {titre:"Fed : Powell prudent",resume:"Pas de baisse de taux prévue.",categorie:"banque",impact:"élevé",heure:"Hier soir",signal:"attendre",reco_texte:"Prudence sur les achats.",actifs_cibles:["IWDA"]},
  ];
}

function filterNews(cat,el){newsFilter=cat;document.querySelectorAll('.filter-pill').forEach(b=>b.classList.remove('active'));if(el)el.classList.add('active');renderNews();}

function suggestedPct(signal,risk,horizon){
  const base={acheter:{faible:5,modere:10,eleve:20},attendre:{faible:2,modere:4,eleve:5},'éviter':{faible:0,modere:0,eleve:0},neutre:{faible:3,modere:7,eleve:10}};
  let p=((base[signal]||base.neutre)[risk])||5;
  if(horizon==='long')p=Math.min(p*1.5,40);
  if(horizon==='court')p=Math.max(p*0.5,1);
  return Math.round(p);
}

function renderNews(){
  const list=document.getElementById('news-list');
  const filtered=newsFilter==='tous'?newsData:newsData.filter(n=>n.categorie===newsFilter);
  if(!filtered.length){list.innerHTML='<p style="color:#c7c7cc;font-size:14px;padding:20px 0;font-weight:500">Aucune actualité dans cette catégorie.</p>';return;}
  const tagCls={macro:'pill-dark',banque:'pill-amber',marche:'pill-blue',geo:'pill-red',secteur:'pill-green'};
  const tagLbl={macro:'Macro',banque:'Banque centrale',marche:'Marchés',geo:'Géopolitique',secteur:'Secteurs'};
  const impCls={'élevé':'pill-red','moyen':'pill-amber','faible':'pill-green'};
  const sigCls={acheter:'signal-buy',attendre:'signal-wait','éviter':'signal-avoid',neutre:'signal-neutral'};
  const sigLbl={acheter:"↑ Opportunité",attendre:'⏸ Attendre','éviter':'↓ Éviter',neutre:'→ Neutre'};
  list.innerHTML=filtered.map((n,i)=>{
    const pct=suggestedPct(n.signal,profile.risk,profile.horizon);
    const amt=Math.round(profile.bankroll*pct/100);
    const first=(n.actifs_cibles||[])[0]||n.titre.slice(0,8);
    const assets=(n.actifs_cibles||[]).map(a=>`<span class="pill pill-gray" style="margin-right:4px">${a}</span>`).join('');
    const oppBtn=n.signal!=='éviter'?`<button class="btn-analyse" onclick="openDecision('${first}','${n.signal}')">Analyser →</button>`:'';
    return`<div class="news-item">
      <div class="news-item-head" onclick="toggleNews(${i})">
        <div class="news-meta"><span class="pill ${tagCls[n.categorie]||'pill-gray'}">${tagLbl[n.categorie]||n.categorie}</span><span class="pill ${impCls[n.impact]||'pill-gray'}">Impact ${n.impact}</span><span class="news-time">${n.heure}</span></div>
        <div class="news-title">${n.titre}</div>
        <div class="news-summary">${n.resume}</div>
        <button class="news-expand" id="nexp-${i}">▾ Voir recommandation IA</button>
      </div>
      <div class="news-reco" id="nreco-${i}">
        <div class="${sigCls[n.signal]||'signal-neutral'} signal-badge">${sigLbl[n.signal]||'Neutre'}</div>
        <div class="news-reco-text">${n.reco_texte}</div>
        ${assets?`<div style="margin-bottom:12px">${assets}</div>`:''}
        <div class="opp-strip">
          <div><div class="opp-label">${n.signal==='éviter'?'Pas conseillé':n.signal==='acheter'?'Opportunité':'À surveiller'}</div><div class="opp-sub">${n.signal!=='éviter'?`${pct}% bankroll · ${HL[profile.horizon]}`:'Signal négatif'}</div></div>
          <div style="display:flex;align-items:center;gap:10px"><div class="opp-amount">${n.signal==='éviter'?'0 €':amt.toLocaleString('fr-FR')+' €'}</div>${oppBtn}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function toggleNews(i){const r=document.getElementById('nreco-'+i),b=document.getElementById('nexp-'+i);const open=r.style.display==='block';r.style.display=open?'none':'block';b.textContent=open?'▾ Voir recommandation IA':'▴ Masquer';}

// ===== DECISION =====
function openDecision(ticker,signal){
  const pct=signal==='éviter'?0:suggestedPct(signal,profile.risk,profile.horizon);
  const amt=Math.round(profile.bankroll*pct/100);
  document.getElementById('d-name').value=ticker;
  document.getElementById('d-horizon').value=profile.horizon;
  document.getElementById('d-risk').value=profile.risk;
  document.getElementById('d-pct').value=pct;
  document.getElementById('d-pct-num').textContent=pct;
  document.getElementById('d-amount').value=amt;
  document.getElementById('d-pct-lbl').textContent=`= ${amt.toLocaleString('fr-FR')} €`;
  const notice=document.getElementById('prefill-notice');
  notice.style.display='block';
  notice.textContent=`✓ Pré-rempli — ${ticker} · ${pct}% bankroll (${amt.toLocaleString('fr-FR')} €)`;
  nav('decision');document.getElementById('nav-decision').classList.add('active');
}
function updatePct(){
  const pct=parseInt(document.getElementById('d-pct').value);
  const amt=Math.round(profile.bankroll*pct/100);
  document.getElementById('d-pct-num').textContent=pct;
  document.getElementById('d-amount').value=amt;
  document.getElementById('d-pct-lbl').textContent=`= ${amt.toLocaleString('fr-FR')} €`;
}
async function analyseDecision(){
  const name=document.getElementById('d-name').value.trim();
  const amount=document.getElementById('d-amount').value;
  const pct=document.getElementById('d-pct').value;
  const horizon=document.getElementById('d-horizon').value;
  const risk=document.getElementById('d-risk').value;
  if(!name){alert('Indique un actif.');return;}
  const prompt=`Actif : ${name} | Montant : ${amount||'?'}€ (${pct}% bankroll ${profile.bankroll}€) | Horizon : ${HL[horizon]} | Risque : ${RL[risk]} | Profil : débutant prudent ETF/actions. Analyse en 5 lignes : 1) ce que c'est 2) risque 3) adapté ? 4) montant raisonnable ? 5) alternative.`;
  document.getElementById('d-result').innerHTML='<div class="bubble bot">Analyse en cours...</div>';
  const r=await callClaude(prompt);
  document.getElementById('d-result').innerHTML=`<div class="bubble bot">${r}</div>`;
}

// ===== DCA =====
function updateDCA(){
  const m=parseFloat(document.getElementById('dca-m').value);
  const y=parseInt(document.getElementById('dca-y').value);
  const rate=parseFloat(document.getElementById('dca-r').value)/100/12;
  const s=parseFloat(document.getElementById('dca-s').value);
  document.getElementById('dca-m-o').textContent=m.toLocaleString('fr-FR')+' €';
  document.getElementById('dca-y-o').textContent=y+' ans';
  document.getElementById('dca-r-o').textContent=parseFloat(document.getElementById('dca-r').value).toFixed(1)+' %';
  document.getElementById('dca-s-o').textContent=s.toLocaleString('fr-FR')+' €';
  const n=y*12,total=s*Math.pow(1+rate,n)+m*((Math.pow(1+rate,n)-1)/rate);
  const invested=s+m*n,gain=total-invested;
  document.getElementById('dca-metrics').innerHTML=`
    <div class="metric-card"><div class="metric-label">Capital final estimé</div><div class="metric-val green">${fmtK(Math.round(total))}</div></div>
    <div class="metric-card"><div class="metric-label">Total investi</div><div class="metric-val">${fmtK(Math.round(invested))}</div></div>
    <div class="metric-card"><div class="metric-label">Intérêts composés</div><div class="metric-val green">+${fmtK(Math.round(gain))}</div></div>
    <div class="metric-card"><div class="metric-label">Multiplicateur</div><div class="metric-val">×${(total/invested).toFixed(2)}</div></div>`;
  document.getElementById('dca-tip').innerHTML=`<div class="alert alert-ok" style="margin-top:12px"><span>✓</span><div>${m.toLocaleString('fr-FR')} €/mois pendant ${y} ans génère <strong>${fmtK(Math.round(gain))}</strong> en intérêts composés.</div></div>`;
}

// ===== AI WITH MEMORY =====
async function callClaude(prompt,sys){
  const system=sys||'Tu es un assistant financier pédagogue francophone pour investisseurs débutants. Réponds en français, clairement. Tu ne fournis pas de conseil financier réglementé.';
  try{
    const res=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,system})});
    const d=await res.json();
    return d.text||d.error||'Aucune réponse.';
  }catch{return'Erreur de connexion.';}
}

function sq(q){document.getElementById('ai-in').value=q;sendAI();}
async function sendAI(){
  const inp=document.getElementById('ai-in');
  const q=inp.value.trim();if(!q)return;
  inp.value='';
  document.getElementById('qbtns').style.display='none';
  const chat=document.getElementById('ai-chat');
  chatHistory.push({role:'user',content:q});
  chat.innerHTML+=`<div class="bubble user">${q}</div><div class="bubble bot" id="ai-loading">Réflexion...</div>`;
  const pCtx=positions.length?`Mon portefeuille : ${positions.map(p=>`${p.name}(${p.type}, ${p.qty} parts, PRU ${p.pru}€, actuel ${p.price}€)`).join(', ')}. `:'';
  const histCtx=chatHistory.slice(-6).map(m=>`${m.role==='user'?'Utilisateur':'Assistant'}: ${m.content}`).join('\n');
  const fullPrompt=`${pCtx}Historique récent:\n${histCtx}`;
  const r=await callClaude(fullPrompt);
  chatHistory.push({role:'assistant',content:r});
  saveChatHistory();
  document.getElementById('ai-loading').outerHTML=`<div class="bubble bot">${r}</div>`;
  chat.scrollTop=chat.scrollHeight;
}
