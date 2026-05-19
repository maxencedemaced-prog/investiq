
// ===== VALIDATE & PERSIST OBJECTIF =====
const OBJ_STORAGE = 'iq_validated_objective';

function hasValidObj(o) {
  // Vérifie qu'un objet objectif est valide (capital peut être 0)
  return o && o.target && o.target > 0;
}

async function validateObjectif() {
  const data = {
    capital: objChartCapital,
    monthly: objChartMonthly,
    target: objChartTarget,
    years: objChartYears,
    rate: objChartRate,
    risk: objRisk,
    validatedAt: new Date().toISOString()
  };
  try { localStorage.setItem(OBJ_STORAGE, JSON.stringify(data)); } catch {}
  if (!isDemo && currentUser) {
    try {
      const { error } = await sb.from('objectives').update({
        capital: data.capital,
        monthly: data.monthly,
        target: data.target,
        years: data.years,
        rate: data.rate,
        risk: data.risk,
        validated_at: data.validatedAt,
        updated_at: new Date().toISOString()
      }).eq('user_id', currentUser.id);
      if (error) console.warn('Supabase objectif save failed:', error);
      else console.log('[validateObjectif] Saved to Supabase OK');
    } catch(e) { console.warn('Supabase objectif save failed:', e); }
  }
  const btn = document.querySelector('.btn-obj-validate');
  if (btn) { btn.textContent = '✓ Objectif sauvegardé sur ton compte !'; btn.style.background = '#1a7f5a'; btn.disabled = true; }
  showToast('🎯 Objectif sauvegardé sur ton compte !');
}

function applyObjData(d) {
  // Applique les données objectif aux variables globales
  objChartCapital = d.capital !== null && d.capital !== undefined ? d.capital : 0;
  objChartMonthly = d.monthly || 200;
  objChartTarget  = d.target  || 100000;
  objChartYears   = d.years   || 10;
  objChartRate    = d.rate    || 7;
  objRisk         = d.risk    || 'equilibre';
}

async function loadValidatedObjectif() {
  // 1. Supabase en priorité (déjà chargé dans loadObjective au login)
  if (hasValidObj({ target: objChartTarget }) && objChartTarget !== 100000) {
    console.log('[loadValidatedObjectif] Already loaded from Supabase');
    return true;
  }
  // 2. Recharge depuis Supabase si connecté
  if (!isDemo && currentUser) {
    try {
      const { data } = await sb.from('objectives').select('*').eq('user_id', currentUser.id).maybeSingle();
      console.log('[loadValidatedObjectif] Supabase data:', JSON.stringify(data));
      if (data && hasValidObj(data)) {
        applyObjData(data);
        try { localStorage.setItem(OBJ_STORAGE, JSON.stringify({...data, validatedAt: data.validated_at})); } catch {}
        return true;
      }
    } catch(e) { console.warn('[loadValidatedObjectif] Supabase error:', e); }
  }
  // 3. Fallback localStorage
  try {
    const saved = JSON.parse(localStorage.getItem(OBJ_STORAGE) || 'null');
    if (saved && hasValidObj(saved)) {
      applyObjData(saved);
      return true;
    }
  } catch {}
  return false;
}

function showValidatedChart() {
  if (!hasValidObj({ target: objChartTarget })) return;
  document.getElementById('obj-wizard').style.display = 'none';
  document.getElementById('obj-results').style.display = 'block';
  setTimeout(() => {
    buildObjChart(objChartCapital, objChartMonthly, objChartTarget, objChartYears, objChartRate);
    renderCourtTermePlan();
  }, 100);
  const el = document.getElementById('obj-ai-simple');
  if (el && el.innerHTML.trim() === '') {
    el.innerHTML = `
      <div style="background:#e8f8f0;border-radius:14px;padding:16px;margin-bottom:12px">
        <div style="font-size:14px;font-weight:800;color:#1a7f5a;margin-bottom:4px">✓ Objectif sauvegardé sur ton compte</div>
        <div style="font-size:13px;color:#1a7f5a">Capital : ${fmtK(objChartCapital)} · ${objChartMonthly}€/mois · Profil ${objRisk}</div>
      </div>
      <button class="btn-secondary" onclick="resetObj()" style="font-size:13px;padding:9px 16px">Modifier l'objectif</button>`;
  }
}


// ===== PLAN COURT TERME =====
async function getAIActionRecommendations(risk, capital) {
  // Nombre d'actions selon capital
  const nbActions = capital < 2000 ? 3 : capital < 5000 ? 4 : capital < 10000 ? 5 : 6;
  const profil = risk === 'agressif' || risk === 'eleve' ? 'agressif (accepte forte volatilité)'
    : risk === 'equilibre' || risk === 'modere' ? 'équilibré (mix rendement/sécurité)'
    : 'prudent (préfère stabilité et dividendes)';

  const prompt = `Tu es un conseiller en investissement. Aujourd'hui ${new Date().toLocaleDateString('fr-FR')}, propose exactement ${nbActions} actions pour un investisseur ${profil} avec ${capital}€ de capital court terme.

Réponds UNIQUEMENT en JSON valide, sans markdown, sans explication :
[
  {
    "ticker": "AAPL",
    "name": "Apple",
    "gain": "+5-10%",
    "horizon": "3-6 mois",
    "desc": "Raison courte en 4 mots max",
    "color": "#8b5cf6",
    "montant": 300
  }
]

Règles strictes :
- Tickers réels et valides (ex: AAPL, MC.PA, IWDA.L)
- Adapte aux conditions de marché actuelles
- Profil ${profil} : ${risk === 'agressif' || risk === 'eleve' ? 'actions croissance tech/IA' : risk === 'equilibre' || risk === 'modere' ? 'mix tech + blue chips' : 'blue chips défensives + dividendes'}
- Répartis le capital de ${capital}€ en montants cohérents
- Colors hex variées et distinctes
- desc MAX 4 mots`;

  try {
    const raw = await callClaude(prompt, 'Tu es un expert en investissement. Réponds UNIQUEMENT en JSON valide sans markdown.');
    const clean = raw.replace(/```json|```/g, '').trim();
    const actions = JSON.parse(clean);
    if (Array.isArray(actions) && actions.length > 0) return actions;
  } catch(e) {
    console.warn('AI recs failed, using fallback', e);
  }

  // Fallback statique si l'IA échoue
  return risk === 'agressif' || risk === 'eleve'
    ? [
        { ticker:'NVDA', name:'NVIDIA',   gain:'+12-20%', horizon:'3-6 mois', desc:'Leader IA & GPU',    color:'#6366f1', montant: Math.round(capital*0.4) },
        { ticker:'TSLA', name:'Tesla',    gain:'+8-15%',  horizon:'2-4 mois', desc:'Volatile potentiel', color:'#ec4899', montant: Math.round(capital*0.35) },
        { ticker:'META', name:'Meta',     gain:'+8-12%',  horizon:'3-6 mois', desc:'Pub digitale',       color:'#3b82f6', montant: Math.round(capital*0.25) },
      ]
    : risk === 'equilibre' || risk === 'modere'
    ? [
        { ticker:'AAPL',  name:'Apple',     gain:'+5-10%', horizon:'3-6 mois', desc:'Stable dividendes',  color:'#8b5cf6', montant: Math.round(capital*0.35) },
        { ticker:'MSFT',  name:'Microsoft', gain:'+6-10%', horizon:'3-6 mois', desc:'Cloud IA solide',    color:'#0ea5e9', montant: Math.round(capital*0.35) },
        { ticker:'MC.PA', name:'LVMH',      gain:'+5-10%', horizon:'4-8 mois', desc:'Luxe mondial',       color:'#f59e0b', montant: Math.round(capital*0.30) },
      ]
    : [
        { ticker:'AI.PA',  name:'Air Liquide',   gain:'+4-8%', horizon:'6-12 mois', desc:'Défensif dividendes', color:'#10b981', montant: Math.round(capital*0.4) },
        { ticker:'OR.PA',  name:'LOreal',        gain:'+4-7%', horizon:'6-12 mois', desc:'Consommation stable', color:'#f43f5e', montant: Math.round(capital*0.3) },
        { ticker:'TTE.PA', name:'TotalEnergies', gain:'+5-9%', horizon:'4-8 mois',  desc:'Énergie dividende',   color:'#f97316', montant: Math.round(capital*0.3) },
      ];
}

function renderActionCards(actionRecs, containerEl) {
  containerEl.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px">
      ${actionRecs.map((a, i) => `
      <div onclick="openActionFromObjectif('${a.ticker}','${a.name}',${a.montant})"
           style="background:#fff;border-radius:14px;padding:14px 16px;border:2px solid #f0f0f0;cursor:pointer;transition:all 0.2s"
           onmouseover="this.style.borderColor='#f59e0b';this.style.background='#fffdf5'"
           onmouseout="this.style.borderColor='#f0f0f0';this.style.background='#fff'">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:42px;height:42px;border-radius:12px;background:${a.color}20;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:${a.color}">${a.ticker.slice(0,2)}</div>
            <div>
              <div style="font-size:14px;font-weight:700;color:#1c1c1e">${a.name} <span style="font-size:12px;color:#8e8e93;font-weight:500">${a.ticker}</span></div>
              <div style="font-size:12px;color:#8e8e93;margin-top:1px">${a.desc}</div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:14px;font-weight:800;color:#1a7f5a">${a.gain}</div>
            <div style="font-size:11px;color:#8e8e93">${a.horizon}</div>
          </div>
        </div>
        <div style="margin-top:10px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#8e8e93;margin-bottom:4px">
            <span>Montant suggéré : <strong style="color:#1c1c1e">${fmtK(a.montant)}</strong></span>
            <span style="font-weight:700;color:#f59e0b">Analyser & Acheter →</span>
          </div>
          <div style="background:#f5f5f5;border-radius:6px;height:6px;overflow:hidden">
            <div style="height:100%;background:linear-gradient(90deg,${a.color}60,${a.color});width:${40 + i*12}%"></div>
          </div>
        </div>
      </div>`).join('')}
    </div>
    <div style="margin-top:10px;padding:10px 14px;background:#fff9e6;border-radius:12px;font-size:12px;color:#92400e">
      ⚠️ Recommandations éducatives générées par IA. Clique pour analyser avant d'investir.
    </div>`;
}

async function renderCourtTermePlan() {
  const el = document.getElementById('obj-court-terme');
  const actionsEl = document.getElementById('obj-court-actions');
  if (!el || !actionsEl) return;

  const capital = objChartCapital || profile.bankroll || 1000;
  const budgetCourt = Math.round(capital * 0.3);
  const risk = objRisk || profile.risk || 'faible';

  el.style.display = 'block';
  actionsEl.innerHTML = `
    <div style="font-size:13px;color:#8e8e93;margin-bottom:12px">
      Budget alloué : <strong style="color:#1c1c1e">${fmtK(budgetCourt)}</strong> · Clique pour analyser et ajouter au portefeuille
    </div>
    <div style="text-align:center;padding:20px;color:#8e8e93">
      <div style="font-size:24px;margin-bottom:8px">🧠</div>
      <div style="font-size:13px">Analyse du marché en cours...</div>
    </div>`;

  const actionRecs = await getAIActionRecommendations(risk, budgetCourt);
  actionsEl.innerHTML = `
    <div style="font-size:13px;color:#8e8e93;margin-bottom:12px">
      Budget alloué : <strong style="color:#1c1c1e">${fmtK(budgetCourt)}</strong> · ${actionRecs.length} opportunités selon le marché aujourd'hui
    </div>`;
  renderActionCards(actionRecs, actionsEl.appendChild(document.createElement('div')));
}

async function openActionFromObjectif(ticker, name, amount) {
  decisionIntention = 'acheter';
  nav('decision');
  setTimeout(() => {
    const nameEl = document.getElementById('d-name');
    if (nameEl) nameEl.value = ticker;
    const pct = Math.max(1, Math.min(50, Math.round(amount / (profile.bankroll || 1000) * 100)));
    const pctEl = document.getElementById('d-pct');
    if (pctEl) { pctEl.value = pct; updatePct(); }
    setDecisionIntent('acheter');
  }, 100);
}

// ===== OBJECTIF INTERACTIVE CHART =====
let objChartInstance = null;
let objProjectionData = [];
let objChartYears = 10;
let objChartCapital = 0;
let objChartMonthly = 200;
let objChartRate = 7;
let objChartTarget = 100000;
let objRisk = 'equilibre';

function buildObjChart(capital, monthly, target, years, annualRate) {
  objChartCapital = capital;
  objChartMonthly = monthly;
  objChartTarget = target;
  objChartYears = years;
  objChartRate = annualRate;

  const tv = positions.reduce((a,p)=>a+p.qty*p.price, 0);
  const rate = annualRate / 100 / 12;
  const totalMonths = years * 12;

  // Build projection data — split into: invested vs compound gains
  objProjectionData = [];
  const investedData = [];
  const gainsData = [];
  
  for (let m = 0; m <= totalMonths; m++) {
    const n = m;
    const fv = capital * Math.pow(1+rate, n) + monthly * ((Math.pow(1+rate,n)-1)/rate);
    const invested = capital + monthly * n;
    objProjectionData.push(Math.round(fv));
    investedData.push(Math.round(invested));
    gainsData.push(Math.round(fv - invested));
  }

  // Sample to 60 points
  const step = Math.max(1, Math.floor(totalMonths / 60));
  const labels = [];
  const values = [];
  const invested60 = [];
  for (let m = 0; m <= totalMonths; m += step) {
    const yr = m / 12;
    labels.push(yr === 0 ? "Auj." : yr % 1 === 0 ? `${Math.round(yr)}a` : "");
    values.push(objProjectionData[m]);
    invested60.push(investedData[m]);
  }

  // Find when target is reached
  const targetMonth = objProjectionData.findIndex(v => v >= target);
  const targetYear = targetMonth > 0 ? (targetMonth/12).toFixed(1) : null;

  // Update slider end label
  document.getElementById('obj-slider-end').textContent = `Dans ${years} an${years>1?'s':''}`;

  // Draw chart
  const canvas = document.getElementById('obj-chart');
  if (!canvas) return;
  if (objChartInstance) objChartInstance.destroy();

  const ctx = canvas.getContext('2d');

  // Gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 160);
  gradient.addColorStop(0, 'rgba(255,255,255,0.15)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  objChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Capital projeté',
          data: values,
          borderColor: '#fff',
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: '#fff',
        },
        {
          label: 'Capital investi',
          data: invested60,
          borderColor: 'rgba(255,255,255,0.3)',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderDash: [5,5],
          fill: false,
          tension: 0,
          pointRadius: 0,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => fmtK(ctx.raw) + ' €',
            title: ctx => ctx[0].label ? `+${ctx[0].label}` : "Aujourd'hui"
          },
          backgroundColor: 'rgba(255,255,255,0.15)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255,255,255,0.2)',
          borderWidth: 1,
        }
      },
      scales: {
        x: { display: false },
        y: { display: false }
      },
      interaction: { mode: 'index', intersect: false }
    }
  });

  // Init slider at max
  updateObjSlider(100);

  // Real progress bar
  const pct = Math.min(tv / target * 100, 100);
  const el = document.getElementById('obj-real-bar');
  const marker = document.getElementById('obj-real-marker');
  if (el) el.style.width = pct + '%';
  if (marker) marker.style.left = pct + '%';
  const pctEl = document.getElementById('obj-real-pct');
  if (pctEl) pctEl.textContent = pct.toFixed(1) + '%';
  const valEl = document.getElementById('obj-real-val');
  if (valEl) valEl.textContent = fmtK(tv);
  const targetEl = document.getElementById('obj-real-target');
  if (targetEl) targetEl.textContent = fmtK(target);

  // Track badge
  const fvFinal = objProjectionData[objProjectionData.length-1];
  const badge = document.getElementById('obj-track-badge');
  if (badge) {
    if (fvFinal >= target) {
      badge.textContent = targetYear ? `✓ Atteint en ${targetYear} ans` : '✓ Objectif atteint';
      badge.className = 'obj-track-badge on-track';
    } else {
      badge.textContent = '⚠ Ajustement conseillé';
      badge.className = 'obj-track-badge off-track';
    }
  }
}

function updateObjSlider(val) {
  const pct = val / 100;
  const monthIndex = Math.round(pct * (objProjectionData.length - 1));
  const projValue = objProjectionData[monthIndex] || 0;
  const years = (monthIndex / 12).toFixed(1);

  const amountEl = document.getElementById('obj-chart-amount');
  const labelEl = document.getElementById('obj-chart-label');

  const invested = Math.round(objChartCapital + objChartMonthly * monthIndex);
  const gains = Math.max(0, projValue - invested);
  const gainsPct = invested > 0 ? Math.round(gains/invested*100) : 0;

  if (amountEl) {
    amountEl.textContent = fmtK(projValue);
    amountEl.style.color = projValue >= objChartTarget ? '#4ade80' : '#fff';
  }
  if (labelEl) {
    if (monthIndex === 0) {
      labelEl.textContent = "Point de départ";
    } else if (projValue >= objChartTarget) {
      labelEl.innerHTML = `<span style="color:#4ade80">🎯 Objectif atteint !</span> · +${fmtK(gains)} d'intérêts composés`;
    } else {
      labelEl.innerHTML = `Dans ${years} ans · <span style="color:#4ade80">+${fmtK(gains)} de gains</span> (+${gainsPct}%)`;
    }
  }

  // Update chart vertical line (point highlight)
  if (objChartInstance) {
    const step = Math.max(1, Math.floor((objChartYears*12) / 60));
    const chartIndex = Math.round(monthIndex / step);
    objChartInstance.data.datasets[0].pointRadius = objChartInstance.data.datasets[0].data.map((_,i) => i === chartIndex ? 8 : 0);
    objChartInstance.data.datasets[0].pointBackgroundColor = '#fff';
    objChartInstance.update('none');
  }
}


// ===== SMART AUTO REFRESH =====
let priceInterval = null;

// Vérifie les nouveaux événements agenda toutes les heures
let lastAgendaCheck = 0;
async function checkAgendaUpdates() {
  if (Date.now() - lastAgendaCheck < 60 * 60 * 1000) return; // max 1x/heure
  lastAgendaCheck = Date.now();
  try {
    const res = await fetch('/api/agenda');
    if (!res.ok) return;
    const data = await res.json();
    const newEvents = data.events || [];

    // Trouve les nouveaux événements forts d'aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const todayHigh = newEvents.filter(e => e.date === today && e.impact === 'high');

    if (todayHigh.length > 0) {
      // Invalide le cache agenda pour forcer un rechargement
      newsTabCache.agenda.html = '';
      newsTabCache.agenda.ts = 0;
      agendaEvents = newEvents;

      // Ajoute une notification
      const notif = {
        titre: `📅 ${todayHigh.length} événement${todayHigh.length>1?'s':''} important${todayHigh.length>1?'s':''} aujourd'hui`,
        texte: todayHigh.slice(0,2).map(e=>e.titre).join(' · '),
        action: 'Voir Agenda',
        impact: 'high',
        heure: 'Maintenant',
        type: 'agenda'
      };
      // N'ajoute que si pas déjà présent
      if (!notifications.find(n => n.type === 'agenda' && n.texte === notif.texte)) {
        notifications = [notif, ...notifications].slice(0, 10);
        renderNotifications();
        document.getElementById('notif-dot').classList.add('show');
        // Notification push
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('InvestIQ — Agenda', { body: notif.texte, icon: '/icons/icon-192.png' });
        }
      }
    }
  } catch(e) {}
}

function startSmartRefresh() {
  if (priceInterval) clearInterval(priceInterval);
  priceInterval = setInterval(() => {
    // Only refresh if tab is visible AND on portfolio or home page
    const activeSec = document.querySelector('.sec.active');
    const activeId = activeSec ? activeSec.id : '';
    // Refresh prices on any page (topbar + bloomberg ticker need it everywhere)
    if (document.visibilityState === 'visible' && positions.length) {
      refreshPrices();
    }
    // Vérifie les nouveaux événements agenda en arrière-plan
    if (document.visibilityState === 'visible') {
      checkAgendaUpdates();
    }
  }, 3 * 60 * 1000); // every 3 minutes
}

// Pause when tab hidden, resume when visible
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    startSmartRefresh();
  } else {
    if (priceInterval) clearInterval(priceInterval);
  }
});


// ===== EDIT POSITION =====
function openEditPos(id) {
  const pos = positions.find(p => String(p.id) === String(id));
  if (!pos) { showToast('Position introuvable'); return; }
  const modal = document.getElementById('edit-modal');
  if (!modal) { showToast('Erreur: modal manquant'); return; }
  document.getElementById('edit-pos-id').value = id;
  document.getElementById('edit-name').value = pos.name;
  document.getElementById('edit-qty').value = pos.qty;
  document.getElementById('edit-pru').value = pos.pru;
  document.getElementById('edit-price').value = pos.price;
  document.getElementById('edit-alert').value = pos.alert_price || '';
  modal.style.display = 'flex';
}

async function saveEditPos() {
  const id = document.getElementById('edit-pos-id').value;
  const qty = parseFloat(document.getElementById('edit-qty').value);
  const pru = parseFloat(document.getElementById('edit-pru').value);
  const price = parseFloat(document.getElementById('edit-price').value);
  const alert_price = parseFloat(document.getElementById('edit-alert').value) || null;

  if (isNaN(qty) || isNaN(pru) || isNaN(price)) { showToast('⚠ Remplis tous les champs'); return; }

  const pos = positions.find(p => p.id === id);
  if (!pos) return;

  pos.qty = qty;
  pos.pru = pru;
  pos.price = price;
  pos.alert_price = alert_price;

  if (!isDemo) {
    await sb.from('positions').update({ qty, pru, price, alert_price }).eq('id', id);
  }

  document.getElementById('edit-modal').style.display = 'none';
  renderPortfolio();
  renderHome();
  showToast('✓ Position modifiée !');
}


async function tryAlternativeTicker(ticker, priceInput, liveLabel) {
  // Try common suffixes
  const alternatives = [ticker+'.DE', ticker+'.PA', ticker+'.L', ticker+'.MI'];
  for (const alt of alternatives) {
    try {
      const res = await fetch('/api/prices?symbols=' + encodeURIComponent(alt));
      const data = await res.json();
      const q = data.quotes?.[0];
      if (q && q.price) {
        if (priceInput) { priceInput.value = q.price.toFixed(2); priceInput.style.color = '#1c1c1e'; }
        if (liveLabel) liveLabel.style.display = 'inline';
        // Update the stored ticker
        if (acSelected) acSelected.ticker = alt;
        document.getElementById('f-name').value = alt;
        return;
      }
    } catch {}
  }
}


async function acSearchYahoo(query) {
  const drop = document.getElementById('ac-drop');
  if (!drop) return;
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    const results = data.results || [];
    if (!results.length) {
      drop.innerHTML = `<div class="ac-no-result">
        <div style="font-size:13px;font-weight:600;color:#8e8e93">Aucun résultat pour "${query}"</div>
        <button class="ac-manual-btn" onclick="acSelectManual('${query.toUpperCase()}')">Utiliser "${query.toUpperCase()}" comme ticker →</button>
      </div>`;
      return;
    }
    drop.innerHTML = results.map(r => `
      <div class="ac-item" onclick="acSelect(${JSON.stringify(r).replace(/"/g,'&quot;')})">
        <div class="ac-item-avatar">${r.ticker.slice(0,2)}</div>
        <div class="ac-item-info">
          <div class="ac-item-name">${r.name}</div>
          <div class="ac-item-meta">${r.ticker} · ${r.type} · ${r.sector} · ${r.exchange}</div>
        </div>
        <div class="ac-item-type">${r.type}</div>
      </div>`).join('');
  } catch {
    const drop2 = document.getElementById('ac-drop');
    if (drop2) drop2.innerHTML = `<div class="ac-no-result">
      <div style="font-size:13px;font-weight:600;color:#8e8e93">Aucun résultat trouvé</div>
      <button class="ac-manual-btn" onclick="acSelectManual('${query.toUpperCase()}')">Utiliser "${query.toUpperCase()}" comme ticker →</button>
    </div>`;
  }
}


// ===== AUTO REFRESH PRICES =====
// Simple manual refresh only - no auto loop


// ===== AUTOCOMPLETE ADD POSITION =====
const AC_DB = [
  // ===== ETF MONDE =====
  {ticker:'IWDA.L',name:'iShares Core MSCI World ETF',type:'ETF',sector:'Monde',exchange:'LSE'},
  {ticker:'VWCE.DE',name:'Vanguard FTSE All-World UCITS ETF',type:'ETF',sector:'Monde',exchange:'XETRA'},
  {ticker:'CW8',name:'Amundi MSCI World UCITS ETF',type:'ETF',sector:'Monde',exchange:'Euronext'},
  {ticker:'EUNL',name:'iShares Core MSCI World EUR Hedged',type:'ETF',sector:'Monde',exchange:'XETRA'},
  {ticker:'MWRD',name:'iShares MSCI World Swap UCITS ETF',type:'ETF',sector:'Monde',exchange:'LSE'},
  {ticker:'LCUW',name:'Amundi MSCI World II UCITS ETF',type:'ETF',sector:'Monde',exchange:'Euronext'},
  {ticker:'WEBG',name:'Amundi Prime All Country World',type:'ETF',sector:'Monde',exchange:'XETRA'},
  // ===== ETF USA =====
  {ticker:'CSPX.L',name:'iShares Core S&P 500 UCITS ETF',type:'ETF',sector:'USA',exchange:'LSE'},
  {ticker:'VUSA.L',name:'Vanguard S&P 500 UCITS ETF',type:'ETF',sector:'USA',exchange:'LSE'},
  {ticker:'VUAA.DE',name:'Vanguard S&P 500 UCITS ETF Acc',type:'ETF',sector:'USA',exchange:'XETRA'},
  {ticker:'LYPS',name:'Lyxor S&P 500 UCITS ETF',type:'ETF',sector:'USA',exchange:'XETRA'},
  {ticker:'500',name:'Amundi S&P 500 UCITS ETF',type:'ETF',sector:'USA',exchange:'Euronext'},
  {ticker:'SPYL',name:'SPDR S&P 500 UCITS ETF',type:'ETF',sector:'USA',exchange:'LSE'},
  // ===== ETF EUROPE =====
  {ticker:'MEUD',name:'Amundi MSCI Europe UCITS ETF',type:'ETF',sector:'Europe',exchange:'Euronext'},
  {ticker:'EXSA',name:'iShares Core EURO STOXX 50 ETF',type:'ETF',sector:'Europe',exchange:'XETRA'},
  {ticker:'PAREU',name:'Amundi MSCI Europe',type:'ETF',sector:'Europe',exchange:'Euronext'},
  {ticker:'VEUR',name:'Vanguard FTSE Developed Europe ETF',type:'ETF',sector:'Europe',exchange:'LSE'},
  // ===== ETF EMERGENTS =====
  {ticker:'PAEEM',name:'Amundi MSCI Emerging Markets',type:'ETF',sector:'Émergents',exchange:'Euronext'},
  {ticker:'IDEM',name:'iShares MSCI Emerging Markets',type:'ETF',sector:'Émergents',exchange:'LSE'},
  {ticker:'VFEM',name:'Vanguard FTSE Emerging Markets ETF',type:'ETF',sector:'Émergents',exchange:'LSE'},
  // ===== ETF OBLIGATIONS =====
  {ticker:'AGGH.L',name:'iShares Core Global Aggregate Bond',type:'ETF',sector:'Obligations',exchange:'LSE'},
  {ticker:'IEAG',name:'iShares Core Euro Aggregate Bond',type:'ETF',sector:'Obligations',exchange:'XETRA'},
  {ticker:'IEGE',name:'iShares € Govt Bond ETF',type:'ETF',sector:'Obligations',exchange:'XETRA'},
  {ticker:'XGLE',name:'Xtrackers Global Government Bond',type:'ETF',sector:'Obligations',exchange:'XETRA'},
  // ===== ETF THEMATIQUES =====
  {ticker:'IITU.L',name:'iShares S&P 500 Information Technology',type:'ETF',sector:'Tech',exchange:'LSE'},
  {ticker:'HEAL.L',name:'iShares Healthcare Innovation ETF',type:'ETF',sector:'Santé',exchange:'LSE'},
  {ticker:'INRG.L',name:'iShares Global Clean Energy ETF',type:'ETF',sector:'Énergie verte',exchange:'LSE'},
  {ticker:'WCLD',name:'WisdomTree Cloud Computing ETF',type:'ETF',sector:'Cloud',exchange:'NASDAQ'},
  {ticker:'ROBO',name:'ROBO Global Robotics & Automation',type:'ETF',sector:'Robotique',exchange:'LSE'},
  {ticker:'ECAR.L',name:'iShares Electric Vehicles & Driving',type:'ETF',sector:'Véhicules élec.',exchange:'LSE'},
  // ===== ETF OR & MATIERES =====
  {ticker:'SGLD.L',name:'Invesco Physical Gold ETC',type:'ETF',sector:'Or',exchange:'LSE'},
  {ticker:'PHAU.L',name:'WisdomTree Physical Gold',type:'ETF',sector:'Or',exchange:'LSE'},
  {ticker:'IGLN.L',name:'iShares Physical Gold ETC',type:'ETF',sector:'Or',exchange:'LSE'},
  // ===== ETF IMMOBILIER =====
  {ticker:'IWDP.L',name:'iShares Developed Markets Property ETF',type:'ETF',sector:'Immobilier',exchange:'LSE'},
  {ticker:'EPRA',name:'Amundi FTSE EPRA NAREIT Global',type:'ETF',sector:'Immobilier',exchange:'Euronext'},
  // ===== CAC 40 =====
  {ticker:'MC.PA',name:'LVMH Moët Hennessy Louis Vuitton',type:'Action',sector:'Luxe',exchange:'Euronext'},
  {ticker:'RMS.PA',name:'Hermès International',type:'Action',sector:'Luxe',exchange:'Euronext'},
  {ticker:'OR.PA',name:"L'Oréal",type:'Action',sector:'Beauté',exchange:'Euronext'},
  {ticker:'TTE.PA',name:'TotalEnergies',type:'Action',sector:'Énergie',exchange:'Euronext'},
  {ticker:'SAN.PA',name:'Sanofi',type:'Action',sector:'Santé',exchange:'Euronext'},
  {ticker:'AI.PA',name:'Air Liquide',type:'Action',sector:'Industrie',exchange:'Euronext'},
  {ticker:'AIR.PA',name:'Airbus Group',type:'Action',sector:'Aéronautique',exchange:'Euronext'},
  {ticker:'BNP.PA',name:'BNP Paribas',type:'Action',sector:'Finance',exchange:'Euronext'},
  {ticker:'KER.PA',name:'Kering',type:'Action',sector:'Luxe',exchange:'Euronext'},
  {ticker:'DG.PA',name:'Vinci',type:'Action',sector:'Industrie',exchange:'Euronext'},
  {ticker:'CAP.PA',name:'Capgemini',type:'Action',sector:'Tech',exchange:'Euronext'},
  {ticker:'SAF.PA',name:'Safran',type:'Action',sector:'Aéronautique',exchange:'Euronext'},
  {ticker:'SU.PA',name:'Schneider Electric',type:'Action',sector:'Industrie',exchange:'Euronext'},
  {ticker:'ACA.PA',name:'Crédit Agricole',type:'Action',sector:'Finance',exchange:'Euronext'},
  {ticker:'GLE.PA',name:'Société Générale',type:'Action',sector:'Finance',exchange:'Euronext'},
  {ticker:'BN.PA',name:'Danone',type:'Action',sector:'Alimentation',exchange:'Euronext'},
  {ticker:'VIE.PA',name:'Veolia Environnement',type:'Action',sector:'Utilities',exchange:'Euronext'},
  {ticker:'ORA.PA',name:'Orange',type:'Action',sector:'Télécoms',exchange:'Euronext'},
  {ticker:'RNO.PA',name:'Renault',type:'Action',sector:'Auto',exchange:'Euronext'},
  {ticker:'STLAM.MI',name:'Stellantis',type:'Action',sector:'Auto',exchange:'Milan'},
  {ticker:'ML.PA',name:'Michelin',type:'Action',sector:'Auto',exchange:'Euronext'},
  {ticker:'SW.PA',name:'Sodexo',type:'Action',sector:'Services',exchange:'Euronext'},
  {ticker:'PUB.PA',name:'Publicis Groupe',type:'Action',sector:'Media',exchange:'Euronext'},
  {ticker:'LR.PA',name:'Legrand',type:'Action',sector:'Industrie',exchange:'Euronext'},
  {ticker:'DSY.PA',name:'Dassault Systèmes',type:'Action',sector:'Tech',exchange:'Euronext'},
  {ticker:'HO.PA',name:'Thales',type:'Action',sector:'Défense',exchange:'Euronext'},
  {ticker:'SGO.PA',name:'Saint-Gobain',type:'Action',sector:'Matériaux',exchange:'Euronext'},
  {ticker:'RI.PA',name:'Pernod Ricard',type:'Action',sector:'Alimentation',exchange:'Euronext'},
  {ticker:'WLN.PA',name:'Worldline',type:'Action',sector:'Fintech',exchange:'Euronext'},
  {ticker:'EN.PA',name:'Bouygues',type:'Action',sector:'Industrie',exchange:'Euronext'},
  {ticker:'VIV.PA',name:'Vivendi',type:'Action',sector:'Media',exchange:'Euronext'},
  {ticker:'ATO.PA',name:'Atos',type:'Action',sector:'Tech',exchange:'Euronext'},
  {ticker:'UBI.PA',name:'Ubisoft Entertainment',type:'Action',sector:'Gaming',exchange:'Euronext'},
  // ===== TECH US =====
  {ticker:'AAPL',name:'Apple Inc.',type:'Action',sector:'Tech',exchange:'NASDAQ'},
  {ticker:'MSFT',name:'Microsoft Corporation',type:'Action',sector:'Tech',exchange:'NASDAQ'},
  {ticker:'NVDA',name:'NVIDIA Corporation',type:'Action',sector:'Tech',exchange:'NASDAQ'},
  {ticker:'GOOGL',name:'Alphabet (Google)',type:'Action',sector:'Tech',exchange:'NASDAQ'},
  {ticker:'META',name:'Meta Platforms (Facebook)',type:'Action',sector:'Tech',exchange:'NASDAQ'},
  {ticker:'AMZN',name:'Amazon.com Inc.',type:'Action',sector:'Tech',exchange:'NASDAQ'},
  {ticker:'TSLA',name:'Tesla Inc.',type:'Action',sector:'Auto',exchange:'NASDAQ'},
  {ticker:'NFLX',name:'Netflix Inc.',type:'Action',sector:'Tech',exchange:'NASDAQ'},
  {ticker:'AMD',name:'Advanced Micro Devices',type:'Action',sector:'Tech',exchange:'NASDAQ'},
  {ticker:'INTC',name:'Intel Corporation',type:'Action',sector:'Tech',exchange:'NASDAQ'},
  {ticker:'ORCL',name:'Oracle Corporation',type:'Action',sector:'Tech',exchange:'NYSE'},
  {ticker:'CRM',name:'Salesforce Inc.',type:'Action',sector:'Tech',exchange:'NYSE'},
  {ticker:'ADBE',name:'Adobe Inc.',type:'Action',sector:'Tech',exchange:'NASDAQ'},
  {ticker:'QCOM',name:'Qualcomm Inc.',type:'Action',sector:'Tech',exchange:'NASDAQ'},
  {ticker:'AVGO',name:'Broadcom Inc.',type:'Action',sector:'Tech',exchange:'NASDAQ'},
  {ticker:'SPOT',name:'Spotify Technology',type:'Action',sector:'Tech',exchange:'NYSE'},
  {ticker:'UBER',name:'Uber Technologies',type:'Action',sector:'Tech',exchange:'NYSE'},
  {ticker:'PYPL',name:'PayPal Holdings',type:'Action',sector:'Fintech',exchange:'NASDAQ'},
  {ticker:'SQ',name:'Block Inc. (Square)',type:'Action',sector:'Fintech',exchange:'NYSE'},
  {ticker:'SHOP',name:'Shopify Inc.',type:'Action',sector:'Tech',exchange:'NYSE'},
  {ticker:'SNOW',name:'Snowflake Inc.',type:'Action',sector:'Tech',exchange:'NYSE'},
  {ticker:'PLTR',name:'Palantir Technologies',type:'Action',sector:'Tech',exchange:'NYSE'},
  {ticker:'AI',name:'C3.ai Inc.',type:'Action',sector:'IA',exchange:'NYSE'},
  {ticker:'MSCI',name:'MSCI Inc.',type:'Action',sector:'Finance',exchange:'NYSE'},
  // ===== GAMING & DIVERTISSEMENT =====
  {ticker:'TTWO',name:'Take-Two Interactive',type:'Action',sector:'Gaming',exchange:'NASDAQ'},
  {ticker:'EA',name:'Electronic Arts',type:'Action',sector:'Gaming',exchange:'NASDAQ'},
  {ticker:'ATVI',name:'Activision Blizzard',type:'Action',sector:'Gaming',exchange:'NASDAQ'},
  {ticker:'NTDOY',name:'Nintendo Co. Ltd',type:'Action',sector:'Gaming',exchange:'OTC'},
  {ticker:'SONY',name:'Sony Group Corporation',type:'Action',sector:'Tech',exchange:'NYSE'},
  {ticker:'RBLX',name:'Roblox Corporation',type:'Action',sector:'Gaming',exchange:'NYSE'},
  {ticker:'U',name:'Unity Software',type:'Action',sector:'Gaming',exchange:'NYSE'},
  {ticker:'CDR.WA',name:'CD Projekt',type:'Action',sector:'Gaming',exchange:'Varsovie'},
  // ===== AUTO =====
  {ticker:'RACE',name:'Ferrari N.V.',type:'Action',sector:'Auto Premium',exchange:'NYSE'},
  {ticker:'PAH3.DE',name:'Porsche AG',type:'Action',sector:'Auto Premium',exchange:'XETRA'},
  {ticker:'BMW.DE',name:'BMW Group',type:'Action',sector:'Auto',exchange:'XETRA'},
  {ticker:'MBG.DE',name:'Mercedes-Benz Group',type:'Action',sector:'Auto',exchange:'XETRA'},
  {ticker:'VOW3.DE',name:'Volkswagen AG',type:'Action',sector:'Auto',exchange:'XETRA'},
  {ticker:'TM',name:'Toyota Motor Corporation',type:'Action',sector:'Auto',exchange:'NYSE'},
  // ===== FINANCE =====
  {ticker:'V',name:'Visa Inc.',type:'Action',sector:'Finance',exchange:'NYSE'},
  {ticker:'MA',name:'Mastercard Incorporated',type:'Action',sector:'Finance',exchange:'NYSE'},
  {ticker:'JPM',name:'JPMorgan Chase & Co.',type:'Action',sector:'Finance',exchange:'NYSE'},
  {ticker:'GS',name:'Goldman Sachs Group',type:'Action',sector:'Finance',exchange:'NYSE'},
  {ticker:'HSBC',name:'HSBC Holdings',type:'Action',sector:'Finance',exchange:'LSE'},
  {ticker:'AXA.PA',name:'AXA Group',type:'Action',sector:'Assurance',exchange:'Euronext'},
  {ticker:'CS.PA',name:'AXA',type:'Action',sector:'Assurance',exchange:'Euronext'},
  // ===== SANTE =====
  {ticker:'JNJ',name:'Johnson & Johnson',type:'Action',sector:'Santé',exchange:'NYSE'},
  {ticker:'UNH',name:'UnitedHealth Group',type:'Action',sector:'Santé',exchange:'NYSE'},
  {ticker:'PFE',name:'Pfizer Inc.',type:'Action',sector:'Santé',exchange:'NYSE'},
  {ticker:'MRNA',name:'Moderna Inc.',type:'Action',sector:'Santé',exchange:'NASDAQ'},
  {ticker:'NVO',name:'Novo Nordisk',type:'Action',sector:'Santé',exchange:'Copenhague'},
  {ticker:'NVS',name:'Novartis AG',type:'Action',sector:'Santé',exchange:'NYSE'},
  {ticker:'ROG.SW',name:'Roche Holding',type:'Action',sector:'Santé',exchange:'Zurich'},
  // ===== CONSOMMATION =====
  {ticker:'PG',name:'Procter & Gamble',type:'Action',sector:'Consommation',exchange:'NYSE'},
  {ticker:'KO',name:'Coca-Cola Company',type:'Action',sector:'Consommation',exchange:'NYSE'},
  {ticker:'PEP',name:'PepsiCo Inc.',type:'Action',sector:'Consommation',exchange:'NASDAQ'},
  {ticker:'MCD',name:"McDonald's Corporation",type:'Action',sector:'Restauration',exchange:'NYSE'},
  {ticker:'SBUX',name:'Starbucks Corporation',type:'Action',sector:'Restauration',exchange:'NASDAQ'},
  {ticker:'NKE',name:'Nike Inc.',type:'Action',sector:'Sport',exchange:'NYSE'},
  {ticker:'ADDYY',name:'Adidas AG',type:'Action',sector:'Sport',exchange:'OTC'},
  // ===== EUROPE TECH =====
  {ticker:'ASML',name:'ASML Holding N.V.',type:'Action',sector:'Tech',exchange:'NASDAQ'},
  {ticker:'SAP',name:'SAP SE',type:'Action',sector:'Tech',exchange:'NYSE'},
  {ticker:'SIE.DE',name:'Siemens AG',type:'Action',sector:'Industrie',exchange:'XETRA'},
  {ticker:'NOK',name:'Nokia Corporation',type:'Action',sector:'Télécoms',exchange:'Helsinki'},
  {ticker:'ERIC',name:'Ericsson',type:'Action',sector:'Télécoms',exchange:'NASDAQ'},
  // ===== ENERGIE =====
  {ticker:'XOM',name:'ExxonMobil Corporation',type:'Action',sector:'Énergie',exchange:'NYSE'},
  {ticker:'CVX',name:'Chevron Corporation',type:'Action',sector:'Énergie',exchange:'NYSE'},
  {ticker:'SHEL',name:'Shell plc',type:'Action',sector:'Énergie',exchange:'NYSE'},
  {ticker:'NEE',name:'NextEra Energy',type:'Action',sector:'Énergie verte',exchange:'NYSE'},
  {ticker:'ENPH',name:'Enphase Energy',type:'Action',sector:'Énergie verte',exchange:'NASDAQ'},
  // ===== LUXE & MODE =====
  {ticker:'BC.MI',name:'Brunello Cucinelli',type:'Action',sector:'Luxe',exchange:'Milan'},
  {ticker:'MONC.MI',name:'Moncler',type:'Action',sector:'Luxe',exchange:'Milan'},
  {ticker:'BRBY.L',name:'Burberry Group',type:'Action',sector:'Luxe',exchange:'LSE'},
  // ===== IMMOBILIER =====
  {ticker:'AMT',name:'American Tower Corp',type:'Action',sector:'Immobilier',exchange:'NYSE'},
  {ticker:'PLD',name:'Prologis Inc.',type:'Action',sector:'Immobilier',exchange:'NYSE'},
];

let acSelected = null;

function acSearch(query) {
  const drop = document.getElementById('ac-drop');
  const clearBtn = document.getElementById('ac-clear');
  if (!query || query.length < 2) {
    drop.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
    return;
  }
  if (clearBtn) clearBtn.style.display = 'block';
  const q = query.toLowerCase();
  const results = AC_DB.filter(c =>
    c.ticker.toLowerCase().includes(q) ||
    c.name.toLowerCase().includes(q) ||
    c.sector.toLowerCase().includes(q)
  ).slice(0, 7);

  if (!results.length) {
    // Try dynamic search via Yahoo Finance
    drop.style.display = 'block';
    drop.innerHTML = '<div class="ac-no-result"><div style="font-size:13px;color:#8e8e93;font-weight:600">Recherche en cours...</div></div>';
    acSearchYahoo(query);
    return;
  }

  drop.style.display = 'block';
  drop.innerHTML = results.map(r => `
    <div class="ac-item" onclick="acSelect(${JSON.stringify(r).replace(/"/g,'&quot;')})">
      <div class="ac-item-avatar ${r.type==='ETF'?'etf':''}">${r.ticker.slice(0,2)}</div>
      <div class="ac-item-info">
        <div class="ac-item-name">${r.name}</div>
        <div class="ac-item-meta">${r.ticker} · ${r.type} · ${r.sector} · ${r.exchange}</div>
      </div>
      <div class="ac-item-type ${r.type==='ETF'?'etf':''}">${r.type}</div>
    </div>`).join('');
}

async function acSelect(company) {
  acSelected = company;
  document.getElementById('ac-drop').style.display = 'none';
  document.getElementById('f-search').value = company.name + ' (' + company.ticker + ')';
  document.getElementById('ac-clear').style.display = 'block';

  // Fill hidden fields
  document.getElementById('f-name').value = company.ticker;
  document.getElementById('f-type-hidden').value = company.type;
  document.getElementById('f-sector').value = company.sector;

  // Show selected badge
  const badge = document.getElementById('ac-selected');
  const badgeContent = document.getElementById('ac-badge-content');
  badge.style.display = 'flex';
  badgeContent.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px">
      <div class="ac-item-avatar ${company.type==='ETF'?'etf':''}" style="width:36px;height:36px;font-size:12px">${company.ticker.slice(0,2)}</div>
      <div>
        <div style="font-size:14px;font-weight:800;color:#1c1c1e">${company.name}</div>
        <div style="font-size:12px;color:#8e8e93;font-weight:500">${company.ticker} · ${company.type} · ${company.sector}</div>
      </div>
    </div>`;

  // Show form fields
  document.getElementById('f-fields').style.display = 'block';
  document.getElementById('f-empty-state').style.display = 'none';

  // Fetch live price
  const liveLabel = document.getElementById('ac-live-label');
  const priceInput = document.getElementById('f-price');
  if (liveLabel) liveLabel.style.display = 'none';
  if (priceInput) { priceInput.value = ''; priceInput.placeholder = '⏳ Chargement...'; priceInput.style.color = '#8e8e93'; }

  try {
    const res = await fetch('/api/prices?symbols=' + encodeURIComponent(company.ticker));
    const data = await res.json();
    const q = data.quotes?.[0];
    if (q && q.price) {
      if (priceInput) {
        priceInput.value = q.price.toFixed(2);
        priceInput.placeholder = q.price.toFixed(2);
        priceInput.style.color = '#1c1c1e';
      }
      if (liveLabel) liveLabel.style.display = 'inline';
      // Also pre-fill PRU with current price as suggestion
      const pruInput = document.getElementById('f-pru');
      if (pruInput && !pruInput.value) {
        pruInput.placeholder = q.price.toFixed(2) + ' (suggestion)';
      }
    } else {
      if (priceInput) { priceInput.placeholder = 'Saisir manuellement'; priceInput.style.color = '#1c1c1e'; }
      // Try with .DE suffix for European stocks
      if (!company.ticker.includes('.') && !company.ticker.includes('-')) {
        tryAlternativeTicker(company.ticker, priceInput, liveLabel);
      }
    }
  } catch {
    if (priceInput) { priceInput.placeholder = 'Saisir manuellement'; priceInput.style.color = '#1c1c1e'; }
  }
}

function acSelectManual(ticker) {
  acSelect({ ticker, name: ticker, type: 'Action', sector: '', exchange: '' });
}

function acClear() {
  acSelected = null;
  document.getElementById('f-search').value = '';
  document.getElementById('ac-drop').style.display = 'none';
  document.getElementById('ac-clear').style.display = 'none';
  document.getElementById('ac-selected').style.display = 'none';
  document.getElementById('f-fields').style.display = 'none';
  document.getElementById('f-empty-state').style.display = 'block';
  document.getElementById('f-name').value = '';
  ['f-qty','f-pru','f-price','f-sector','f-alert'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// Close autocomplete on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.ac-wrap')) {
    const drop = document.getElementById('ac-drop');
    if (drop) drop.style.display = 'none';
  }
});


// ===== PORTFOLIO TABS =====
function switchPortTab(tab, el) {
  ['positions','chart','transactions'].forEach(t => {
    const el2 = document.getElementById('port-tab-'+t);
    if (el2) el2.style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('.port-tab').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  if (tab === 'chart') setTimeout(renderPortfolioChart, 100);
  if (tab === 'transactions') loadTransactions().then(renderTransactions);
}

// ===== SHARE PORTFOLIO =====
function sharePortfolio() {
  const tv = positions.reduce((a,p)=>a+p.qty*p.price,0);
  const ti = positions.reduce((a,p)=>a+p.qty*p.pru,0);
  const tpnl = tv-ti, tpct = ti?tpnl/ti*100:0;
  const text = `Mon portefeuille InvestIQ 📊\n\nValeur : ${fmtK(tv)}\nPlus-value : ${tpnl>=0?'+':''}${fmtK(tpnl)} (${tpnl>=0?'+':''}${tpct.toFixed(1)}%)\n\nPositions : ${positions.map(p=>p.name).join(', ')}\n\n🔗 investiq-kappa.vercel.app`;
  if (navigator.share) {
    navigator.share({ title: 'Mon portefeuille InvestIQ', text, url: 'https://investiq-kappa.vercel.app' })
      .catch(() => copyToClipboard(text));
  } else {
    copyToClipboard(text);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('✓ Copié dans le presse-papiers !');
  }).catch(() => {
    showToast('Partage non disponible sur ce navigateur.');
  });
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ===== TX MODAL =====
function showAddTxModal() {
  document.getElementById('tx-modal').style.display = 'flex';
}

async function saveTx() {
  const name = document.getElementById('tx-name').value.trim();
  const type = document.getElementById('tx-type').value;
  const qty = parseFloat(document.getElementById('tx-qty').value);
  const price = parseFloat(document.getElementById('tx-price').value);
  const notes = document.getElementById('tx-notes').value;
  if (!name || isNaN(qty) || isNaN(price)) { alert('Remplis les champs obligatoires.'); return; }
  await addTransaction(name, type, qty, price, notes);
  document.getElementById('tx-modal').style.display = 'none';
  ['tx-name','tx-qty','tx-price','tx-notes'].forEach(id => document.getElementById(id).value = '');
  renderTransactions();
}

// ===== PAGE TRANSITIONS =====
function animatePageIn(sectionId) {
  const el = document.getElementById(sectionId);
  if (!el) return;
  el.style.opacity = '0';
  el.style.transform = 'translateY(8px)';
  el.classList.add('active');
  setTimeout(() => {
    el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  }, 10);
}


// ===== PORTFOLIO CHART =====
function renderPortfolioChart() {
  const canvas = document.getElementById('portfolio-chart');
  if (!canvas || !positions.length) return;
  
  const tv = positions.reduce((a,p)=>a+p.qty*p.price,0);
  const ti = positions.reduce((a,p)=>a+p.qty*p.pru,0);
  
  // Generate simulated history (last 12 months)
  const labels = [];
  const values = [];
  const invested = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleDateString('fr-FR', {month:'short', year:'2-digit'}));
    // Simulate growth
    const factor = 1 + (11 - i) / 11 * (tv/ti - 1);
    values.push(Math.round(ti * factor));
    invested.push(ti);
  }
  values[11] = Math.round(tv);
  
  if (window.portfolioChart) window.portfolioChart.destroy();
  
  const ctx = canvas.getContext('2d');
  window.portfolioChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Valeur du portefeuille',
          data: values,
          borderColor: '#1c1c1e',
          backgroundColor: 'rgba(28,28,30,0.05)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
        {
          label: 'Capital investi',
          data: invested,
          borderColor: '#c7c7cc',
          borderWidth: 1.5,
          borderDash: [4,4],
          fill: false,
          tension: 0,
          pointRadius: 0,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ctx.dataset.label + ': ' + ctx.raw.toLocaleString('fr-FR') + ' €'
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, color: '#8e8e93' } },
        y: { grid: { color: '#f5f5f5' }, ticks: { font: { size: 11, weight: '600' }, color: '#8e8e93', callback: v => v.toLocaleString('fr-FR') + ' €' } }
      }
    }
  });
}


// ===== TRANSACTIONS =====
let transactions = [];

async function loadTransactions() {
  if (isDemo) {
    transactions = [
      {id:'t1',position_name:'IWDA.L',type:'achat',qty:10,price:87.5,total:875,date:new Date(Date.now()-86400000*30).toISOString(),notes:'Premier achat ETF monde'},
      {id:'t2',position_name:'LVMH',type:'achat',qty:2,price:730,total:1460,date:new Date(Date.now()-86400000*14).toISOString(),notes:''},
      {id:'t3',position_name:'IWDA.L',type:'achat',qty:5,price:91,total:455,date:new Date(Date.now()-86400000*7).toISOString(),notes:'Renforcement DCA'},
    ];
    return;
  }
  const { data } = await sb.from('transactions').select('*').eq('user_id',currentUser.id).order('date',{ascending:false}).limit(50);
  transactions = data || [];
}

async function addTransaction(posName, type, qty, price, notes='') {
  const total = qty * price;
  const tx = { position_name:posName, type, qty, price, total, notes };
  if (!isDemo) {
    const { data } = await sb.from('transactions').insert({...tx, user_id:currentUser.id}).select().single();
    if (data) transactions.unshift(data);
  } else {
    transactions.unshift({...tx, id:'t'+Date.now(), date:new Date().toISOString()});
  }
}

function renderTransactions() {
  const el = document.getElementById('tx-list');
  if (!el) return;
  if (!transactions.length) {
    el.innerHTML = '<div class="empty-state" style="padding:24px"><div class="empty-icon">📋</div><div>Aucune transaction enregistrée</div></div>';
    return;
  }
  el.innerHTML = transactions.map(tx => {
    const d = new Date(tx.date);
    const dateStr = d.toLocaleDateString('fr-FR', {day:'2-digit',month:'short',year:'numeric'});
    const typeColor = tx.type === 'achat' ? '#1a7f5a' : '#cc2f26';
    const typeBg = tx.type === 'achat' ? '#e8f8f0' : '#fff0f0';
    return `<div class="tx-item">
      <div class="tx-left">
        <div class="tx-avatar" style="background:${typeColor}">${tx.type==='achat'?'↑':'↓'}</div>
        <div>
          <div class="tx-name">${tx.position_name} <span style="font-size:11px;font-weight:700;background:${typeBg};color:${typeColor};padding:2px 8px;border-radius:99px">${tx.type}</span></div>
          <div class="tx-meta">${tx.qty} parts × ${fmt(tx.price)}€ · ${dateStr}</div>
          ${tx.notes?`<div class="tx-notes">${tx.notes}</div>`:''}
        </div>
      </div>
      <div class="tx-total" style="color:${typeColor}">${tx.type==='achat'?'-':'+'}${fmt(tx.total)}€</div>
    </div>`;
  }).join('');
}


function buildEmptyHome() {
  return `<div class="empty-home">
    <div class="empty-home-icon">👋</div>
    <div class="empty-home-title">Commence par ajouter tes positions</div>
    <div class="empty-home-sub">Ou charge un exemple pour découvrir l'app</div>
    <div class="empty-home-actions">
      <button class="btn-primary" onclick="nav('ajouter')">+ Ajouter une position</button>
      <button class="btn-secondary" onclick="loadDemo()">Voir un exemple</button>
    </div>
  </div>`;
}


// ===== ONBOARDING =====
const OB_KEY = 'iq_onboarded';
let obGoals = { long: false, court: false };

function showOnboarding(force) {
  if (!force && localStorage.getItem(OB_KEY)) return;
  obGoals = { long: false, court: false };
  obNext(1);
  document.getElementById('onboarding-modal').style.display = 'flex';
}

function obNext(step) {
  // Validation étape 3 — budget obligatoire
  if (step === 4) {
    const bankroll = document.getElementById('ob-bankroll')?.value;
    const monthly  = document.getElementById('ob-monthly')?.value;
    const target   = document.getElementById('ob-target')?.value;
    if (!bankroll || !monthly || !target || bankroll === '' || monthly === '' || target === '') {
      const err = document.getElementById('ob-budget-error');
      if (err) err.style.display = 'block';
      if (!bankroll) document.getElementById('ob-bankroll')?.focus();
      else if (!monthly) document.getElementById('ob-monthly')?.focus();
      else document.getElementById('ob-target')?.focus();
      return;
    }
  }
  document.querySelectorAll('.onboard-step').forEach(s => s.style.display = 'none');
  const el = document.getElementById('ob-step-' + step);
  if (el) el.style.display = 'block';
  // Update progress bars
  for (let i = 1; i <= 5; i++) {
    const bar = document.getElementById('ob-bar-' + i);
    if (bar) bar.classList.toggle('active', i <= step);
  }
  // Generate plan on step 5
  if (step === 5) obGeneratePlan();
}

function obToggleGoal(goal) {
  obGoals[goal] = !obGoals[goal];
  const card = document.getElementById('ob-goal-' + goal);
  const check = document.getElementById('ob-check-' + goal);
  if (obGoals[goal]) {
    card.style.border = '2px solid #1c1c1e';
    card.style.background = '#f5f5f5';
    check.textContent = '✓';
    check.style.color = '#1c1c1e';
    check.style.fontWeight = '800';
  } else {
    card.style.border = '2px solid #e5e5ea';
    card.style.background = '#fff';
    check.textContent = '○';
  }
  // Update horizon based on goals
  const hEl = document.getElementById('ob-horizon');
  if (hEl) {
    if (obGoals.long && obGoals.court) hEl.value = 'mixte';
    else if (obGoals.long) hEl.value = 'long';
    else if (obGoals.court) hEl.value = 'court';
  }
  // Enable next button
  const btn = document.getElementById('ob-btn-2');
  if (btn) btn.disabled = !obGoals.long && !obGoals.court;
}

function obSelectRisk(risk) {
  ['faible','modere','eleve'].forEach(r => {
    const card = document.getElementById('ob-risk-' + r);
    const check = document.getElementById('ob-rcheck-' + r);
    if (card) { card.style.border = r === risk ? '2px solid #1c1c1e' : '2px solid #e5e5ea'; card.style.background = r === risk ? '#f5f5f5' : '#fff'; }
    if (check) { check.textContent = r === risk ? '✓' : '○'; check.style.fontWeight = r === risk ? '800' : '400'; }
  });
  const rEl = document.getElementById('ob-risk');
  if (rEl) rEl.value = risk;
  const btn = document.getElementById('ob-btn-4');
  if (btn) btn.disabled = false;
}

async function obOpenAction(ticker, name, amount) {
  // Ferme l'onboarding et sauvegarde
  document.getElementById('onboarding-modal').style.display = 'none';
  localStorage.setItem(OB_KEY, '1');
  await obFinishSilent();

  // Ouvre aide décision avec tout pré-rempli
  decisionIntention = 'acheter';
  nav('decision');
  setTimeout(() => {
    const nameEl = document.getElementById('d-name');
    if (nameEl) nameEl.value = ticker;
    const pct = Math.max(1, Math.min(50, Math.round(amount / (profile.bankroll || 1000) * 100)));
    const pctEl = document.getElementById('d-pct');
    if (pctEl) { pctEl.value = pct; updatePct(); }
    setDecisionIntent('acheter');
    // Lance l'analyse automatiquement
    setTimeout(() => analyseDecision(), 200);
  }, 150);
}

async function obFinishSilent() {
  const bankroll = parseFloat(document.getElementById('ob-bankroll')?.value) || 1000;
  const monthly  = parseFloat(document.getElementById('ob-monthly')?.value)  || 200;
  const risk     = document.getElementById('ob-risk')?.value    || 'faible';
  const horizon  = document.getElementById('ob-horizon')?.value || 'long';
  profile.bankroll = bankroll;
  profile.risk     = risk;
  profile.horizon  = horizon === 'mixte' ? 'moyen' : horizon;
  if (!isDemo) await saveProfile();
}

function obCheckBudget() {
  const bankroll = document.getElementById('ob-bankroll')?.value;
  const monthly  = document.getElementById('ob-monthly')?.value;
  const target   = document.getElementById('ob-target')?.value;
  const filled = bankroll !== '' && monthly !== '' && target !== '';
  const btn = document.getElementById('ob-btn-3');
  const err = document.getElementById('ob-budget-error');
  if (btn) btn.disabled = !filled;
  if (err) err.style.display = filled ? 'none' : 'block';
}

async function obGeneratePlan() {
  const bankroll = parseFloat(document.getElementById('ob-bankroll')?.value) || 0;
  const monthly  = parseFloat(document.getElementById('ob-monthly')?.value)  || 0;
  const target   = parseFloat(document.getElementById('ob-target')?.value)   || 50000;
  const risk     = document.getElementById('ob-risk')?.value || 'faible';
  const planEl   = document.getElementById('ob-plan-content');

  // Calculs de projection
  const r10 = Math.pow(1.07, 10);
  const budgetCourt = Math.round(bankroll * 0.3);
  const budgetLong  = bankroll - budgetCourt;

  // Allocation ETF selon risque
  const etfAlloc = risk === 'eleve'
    ? ['70% IWDA (ETF Monde)', '30% VWCE (ETF All-World)']
    : risk === 'modere'
    ? ['80% IWDA (ETF Monde)', '20% VWCE (ETF All-World)']
    : ['90% IWDA (ETF Monde)', '10% VWCE (ETF All-World)'];

  const both = obGoals.long && obGoals.court;

  let html = '';

  // PLAN LONG TERME
  if (obGoals.long) {
    const capitalLong = both ? budgetLong : bankroll;
    const monthlyLong = both ? Math.round(monthly * 0.7) : monthly;
    const yearsNeeded = calcNeededYears(capitalLong, monthlyLong, target, 7) || 10;
    const rr = Math.pow(1.07, 10);
    const proj = Math.round(capitalLong * rr + monthlyLong * 12 * ((rr - 1) / 0.07));
    html += `
    <div style="background:#e8f8f0;border-radius:14px;padding:14px 16px;margin-bottom:10px;border-left:4px solid #1a7f5a">
      <div style="font-size:12px;font-weight:800;color:#1a7f5a;margin-bottom:10px">🏦 PLAN LONG TERME — Construire ton patrimoine</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="background:#fff;border-radius:10px;padding:10px 12px">
          <div style="font-size:11px;font-weight:700;color:#8e8e93;margin-bottom:4px">ALLOCATION RECOMMANDÉE</div>
          ${etfAlloc.map(e => `<div style="font-size:13px;color:#1c1c1e">• ${e}</div>`).join('')}
        </div>
        <div style="background:#fff;border-radius:10px;padding:10px 12px;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">
          <div><div style="font-size:11px;color:#8e8e93;font-weight:700">DÉPART</div><div style="font-size:13px;font-weight:800">${fmtK(capitalLong)}</div></div>
          <div><div style="font-size:11px;color:#8e8e93;font-weight:700">MENSUEL</div><div style="font-size:13px;font-weight:800">${monthlyLong}€/mois</div></div>
          <div><div style="font-size:11px;color:#8e8e93;font-weight:700">OBJECTIF</div><div style="font-size:13px;font-weight:800;color:#1c1c1e">${fmtK(target)}</div></div>
          <div><div style="font-size:11px;color:#8e8e93;font-weight:700">DANS 10 ANS</div><div style="font-size:13px;font-weight:800;color:#1a7f5a">~${fmtK(proj)}</div></div>
        </div>
        <div style="background:#fff;border-radius:10px;padding:10px 12px;font-size:12px;color:#8e8e93">
          ⏱ Horizon : 10-20 ans · Ne pas toucher · Réinvestir les dividendes
        </div>
      </div>
    </div>`;
  }

  // PLAN COURT TERME — placeholder, actions chargées après
  if (obGoals.court) {
    const capitalCourt = both ? budgetCourt : bankroll;
    const monthlyTrade = both ? Math.round(monthly * 0.3) : monthly;
    html += `
    <div style="background:#fff9e6;border-radius:14px;padding:14px 16px;margin-bottom:10px;border-left:4px solid #f59e0b">
      <div style="font-size:12px;font-weight:800;color:#92400e;margin-bottom:4px">⚡ PLAN COURT TERME — Complément de salaire</div>
      <div style="font-size:12px;color:#92400e;margin-bottom:12px">Capital : ${fmtK(capitalCourt)} · ${monthlyTrade}€/mois · Objectif +5 à 15%/an</div>
      <div id="ob-action-recs" style="text-align:center;padding:16px;color:#8e8e93">
        <div style="font-size:20px;margin-bottom:6px">🧠</div>
        <div style="font-size:13px">Analyse du marché en cours...</div>
      </div>
    </div>`;
  }

  html += `<div id="ob-ai-advice" style="text-align:center;padding:12px;color:#8e8e93;font-size:13px">💬 Conseil IA en cours...</div>`;
  planEl.innerHTML = html;

  // Charge les actions en parallèle
  if (obGoals.court) {
    const capitalCourt = both ? budgetCourt : bankroll;
    getAIActionRecommendations(risk, capitalCourt).then(actionRecs => {
      const recsEl = document.getElementById('ob-action-recs');
      if (!recsEl) return;
      const wrapper = document.createElement('div');
      recsEl.replaceWith(wrapper);
      renderActionCards(actionRecs, wrapper);
    });
  }

  // Conseil IA personnalisé
  try {
    const goalsTxt = both ? 'patrimoine long terme (ETF) ET complément de salaire (actions)'
      : obGoals.long ? 'patrimoine long terme avec ETF'
      : 'complément de salaire avec actions court terme';
    const prompt = `Débutant en bourse. Objectif : ${goalsTxt}. Budget : ${bankroll}€, ${monthly}€/mois. Profil : ${risk}.
En 2-3 phrases MAX, donne un conseil de départ simple et encourageant. Pas de jargon. Commence par "Pour toi,"`;
    const advice = await callClaude(prompt);
    const el = document.getElementById('ob-ai-advice');
    if (el) el.innerHTML = `<div style="background:#f9f9f9;border-radius:12px;padding:12px 14px;font-size:13px;color:#3c3c43;line-height:1.6">💬 ${advice}</div>`;
  } catch(e) {}
}

async function obFinish(action) {
  localStorage.setItem(OB_KEY, '1');
  document.getElementById('onboarding-modal').style.display = 'none';

  // Si "Voir un exemple" → pas de sauvegarde, juste charger la démo
  if (action === 'demo') {
    await loadDemo();
    return;
  }

  const bankroll = parseFloat(document.getElementById('ob-bankroll')?.value) || 0;
  const monthly  = parseFloat(document.getElementById('ob-monthly')?.value)  || 0;
  const target   = parseFloat(document.getElementById('ob-target')?.value)   || 50000;
  const risk     = document.getElementById('ob-risk')?.value    || 'faible';
  const horizon  = document.getElementById('ob-horizon')?.value || 'long';

  // Ne sauvegarde que si les champs ont été remplis
  if (bankroll === 0 && monthly === 0) {
    nav(action);
    return;
  }

  profile.bankroll = bankroll;
  profile.risk     = risk;
  profile.horizon  = horizon === 'mixte' ? 'moyen' : horizon;

  if (document.getElementById('s-bankroll')) document.getElementById('s-bankroll').value = bankroll;
  if (document.getElementById('s-risk'))     document.getElementById('s-risk').value     = risk;
  if (document.getElementById('s-horizon'))  document.getElementById('s-horizon').value  = horizon === 'mixte' ? 'moyen' : horizon;

  // Applique les variables objectif
  objChartCapital = bankroll;
  objChartMonthly = monthly;
  objChartTarget  = target;
  objChartYears   = 10;
  objChartRate    = risk === 'eleve' ? 9 : risk === 'modere' ? 7 : 5;
  objRisk         = risk === 'eleve' ? 'agressif' : risk === 'modere' ? 'equilibre' : 'prudent';

  // Sauvegarde profil + objectif en Supabase
  if (!isDemo && currentUser) {
    await saveProfile();
    try {
      await sb.from('objectives').update({
        capital: bankroll, monthly: monthly,
        target: target, years: 10, rate: objChartRate,
        risk: objRisk, validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('user_id', currentUser.id);
    } catch(e) {}
  }

  // localStorage fallback
  try { localStorage.setItem('iq_validated_objective', JSON.stringify({
    capital: bankroll, monthly: monthly, target: target,
    years: 10, rate: objChartRate, risk: objRisk,
    validatedAt: new Date().toISOString()
  })); } catch {}

  nav(action);
}


// ===== MARKDOWN FORMATTER =====
function formatMD(text) {
  if (!text) return '';
  return text
    .replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #f0f0f0;margin:10px 0">')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#1c1c1e;font-weight:800">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<div style="font-size:15px;font-weight:800;color:#1c1c1e;margin:14px 0 6px;letter-spacing:-0.2px;padding-top:8px;border-top:1px solid #f5f5f5">$1</div>')
    .replace(/^[-•]\s+(.+)$/gm, '<div style="display:flex;gap:8px;margin:5px 0;font-size:14px"><span style="color:#1a7f5a;font-weight:800;flex-shrink:0">→</span><span>$1</span></div>')
    .replace(/^(\d+)\.\s+(.+)$/gm, '<div style="display:flex;gap:10px;margin:6px 0;align-items:flex-start"><span style="background:#1c1c1e;color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;margin-top:1px">$1</span><span style="font-size:14px">$2</span></div>')
    .replace(/\n\n/g, '<div style="height:10px"></div>')
    .replace(/\n/g, '<br>');
}

// ===== WATCHLIST & SEARCH MODULE =====
let watchlist = []; // {ticker, name, type}
let searchResults = [];
let activeCompany = null;
const CACHE_WATCHLIST = 'iq_watchlist';

// Popular companies for quick add
const POPULAR = [
  {ticker:'NVDA', name:'NVIDIA', sector:'Tech'},
  {ticker:'AAPL', name:'Apple', sector:'Tech'},
  {ticker:'MSFT', name:'Microsoft', sector:'Tech'},
  {ticker:'TSLA', name:'Tesla', sector:'Auto'},
  {ticker:'AMZN', name:'Amazon', sector:'Tech'},
  {ticker:'GOOGL', name:'Alphabet', sector:'Tech'},
  {ticker:'META', name:'Meta', sector:'Tech'},
  {ticker:'SNE', name:'Sony', sector:'Tech'},
  {ticker:'TTWO', name:'Take-Two', sector:'Gaming'},
  {ticker:'MC.PA', name:'LVMH', sector:'Luxe'},
  {ticker:'AI.PA', name:'Air Liquide', sector:'Industrie'},
  {ticker:'TTE.PA', name:'TotalEnergies', sector:'Énergie'},
  {ticker:'BNP.PA', name:'BNP Paribas', sector:'Finance'},
  {ticker:'IWDA.L', name:'iShares MSCI World', sector:'ETF'},
  {ticker:'VWCE.DE', name:'Vanguard FTSE All-World', sector:'ETF'},
];

async function loadWatchlist() {
  if (!isDemo && currentUser) {
    try {
      const { data } = await sb.from('profiles').select('watchlist').eq('id', currentUser.id).single();
      if (data && Array.isArray(data.watchlist)) {
        watchlist = data.watchlist;
        localStorage.setItem(CACHE_WATCHLIST, JSON.stringify(watchlist));
        return;
      }
    } catch(e) {}
  }
  try { watchlist = JSON.parse(localStorage.getItem(CACHE_WATCHLIST) || '[]'); } catch { watchlist = []; }
}

async function saveWatchlist() {
  try { localStorage.setItem(CACHE_WATCHLIST, JSON.stringify(watchlist)); } catch {}
  if (!isDemo && currentUser) {
    try {
      await sb.from('profiles').update({ watchlist: watchlist }).eq('id', currentUser.id);
    } catch(e) { console.warn('Watchlist save failed:', e); }
  }
}

async function toggleFavorite(ticker, name, sector) {
  await loadWatchlist();
  const idx = watchlist.findIndex(w => w.ticker === ticker);
  if (idx >= 0) {
    watchlist.splice(idx, 1);
    showToast('Retiré des favoris');
  } else {
    watchlist.push({ ticker, name: name||ticker, sector: sector||'Autre' });
    showToast('★ ' + (name||ticker) + ' ajouté aux favoris !');
  }
  await saveWatchlist();
}

function isFavorite(ticker) {
  return watchlist.some(w => w.ticker === ticker);
}

function toggleNewsItemFav(ticker, name, starId) {
  // Vérifie si c'est un vrai ticker (pas un ID de news générique)
  const isRealTicker = ticker && !ticker.startsWith('news-') && ticker.length < 20;
  
  if (isRealTicker) {
    toggleFavorite(ticker, name, '');
  }
  const isFav = isRealTicker ? isFavorite(ticker) : false;

  // Met à jour UNIQUEMENT l'étoile cliquée (par son ID unique)
  if (starId) {
    const btn = document.getElementById(starId);
    if (btn) {
      btn.textContent = isFav ? '★' : '☆';
      btn.style.color = isFav ? '#f59e0b' : 'rgba(0,0,0,0.15)';
    }
  }

  // Si c'est un vrai ticker, met aussi à jour les autres étoiles du même ticker (signaux, etc.)
  if (isRealTicker) {
    document.querySelectorAll('[data-fav-ticker="' + ticker + '"]').forEach(btn => {
      btn.textContent = isFav ? '★' : '☆';
      btn.style.color = isFav ? '#f59e0b' : 'rgba(0,0,0,0.15)';
    });
    showToast(isFav ? '★ ' + name + ' ajouté aux favoris !' : 'Retiré des favoris');
  }

  // Si on est sur l'onglet Mes favoris et qu'on retire → recharge
  if (!isFav && newsFilter === 'favoris') {
    setTimeout(() => renderFavorisNews(), 300);
  }

  // Met à jour le compteur pill
  const pill = document.getElementById('news-fil-favoris');
  if (pill) pill.innerHTML = '⭐ Mes favoris' + (watchlist.length > 0 ? ' <span class="pill-count">' + watchlist.length + '</span>' : '');
}

function buildBloombergTicker(allTracked) {
  const dupeMap = { 'MC.PA':'LVMH','AI.PA':'Air Liquide','TTE.PA':'TotalEnergies','VIE.PA':'Veolia Environnement','PAH3.DE':'Porsche Automobil Holding' };
  const seen = new Set();
  const unique = allTracked.filter(c => {
    const key = dupeMap[c.ticker] || c.ticker;
    if(seen.has(key)) return false; seen.add(key); return true;
  });
  // Triple pour avoir assez d'items (évite le blanc entre les boucles)
  const items = [...unique, ...unique, ...unique];
  return items.map(c => {
    const pos = positions.find(p => p.name === c.ticker);
    const chg = pos && pos.change_pct !== undefined ? Number(pos.change_pct) : null;
    const price = pos ? pos.price : null;
    const up = chg !== null ? chg >= 0 : true;
    const upColor = '#22c55e';   // vert vif
    const downColor = '#ef4444'; // rouge vif
    const color = chg !== null ? (up ? upColor : downColor) : 'rgba(255,255,255,0.3)';
    const arrow = up ? '▲' : '▼';
    const chgStr = chg !== null ? (up?'+':'') + chg.toFixed(2) + '%' : '';
    const priceStr = price ? fmt(price) + '€' : '';
    const sep = '<span style="color:rgba(255,255,255,0.1);margin:0 4px;font-size:10px">|</span>';
    const tickerEl = document.createElement('span');
    tickerEl.setAttribute('style', 'display:inline-flex;align-items:center;gap:6px;padding:0 18px;height:42px;cursor:pointer;flex-shrink:0');
    tickerEl.setAttribute('onmouseover', "this.style.background='rgba(255,255,255,0.07)'");
    tickerEl.setAttribute('onmouseout', "this.style.background='transparent'");
    tickerEl.setAttribute('onclick', "setNewsFilter('entreprises',document.getElementById('news-fil-entreprises'));setTimeout(function(){showEntrepriseDetail('" + c.ticker + "','" + (c.name||c.ticker) + "')},100)");
    const innerHtml = '<span style="font-size:12px;font-weight:800;color:#fff;letter-spacing:0.4px">' + c.ticker + '</span>'
      + (priceStr ? '<span style="font-size:12px;color:rgba(255,255,255,0.4)">' + priceStr + '</span>' : '')
      + (chgStr
          ? '<span style="font-size:11px;font-weight:800;color:' + color + '">' + arrow + ' ' + chgStr + '</span>'
          : '<span style="font-size:10px;color:rgba(255,255,255,0.2)">—</span>')
      + sep;
    tickerEl.innerHTML = innerHtml;
    return tickerEl.outerHTML;
  }).join('');
}

function renderNewsPage() {
  loadWatchlist();
  const container = document.getElementById('news-page-content');
  if (!container) return;

  // Get all companies to track (portfolio + watchlist)
  loadWatchlist(); // make sure watchlist is loaded fresh
  const portfolioCompanies = positions.map(p => ({
    ticker: p.name, name: p.name, sector: p.sector || 'Portefeuille', inPortfolio: true
  }));
  const watchCompanies = watchlist.map(w => ({ ...w, inPortfolio: false }));
  const allTracked = [...portfolioCompanies, ...watchCompanies.filter(w => !portfolioCompanies.find(p => p.ticker === w.ticker))];

  container.innerHTML = `
    <!-- SEARCH BAR -->
    <div class="search-wrap">
      <div class="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="company-search" placeholder="Rechercher une entreprise ou un ticker..." oninput="searchCompany(this.value)" autocomplete="off">
        <button id="search-clear" style="display:none;background:transparent;border:none;cursor:pointer;color:#8e8e93;font-size:18px;line-height:1" onclick="clearSearch()">×</button>
      </div>
      <div id="search-results-drop" class="search-drop" style="display:none"></div>
    </div>

    <!-- FILTER PILLS -->
    <div class="filter-row" style="margin-top:14px">
      <button class="filter-pill active" id="news-fil-tous" onclick="setNewsFilter('tous',this)">Toutes les actus</button>
      <button class="filter-pill" id="news-fil-signaux" onclick="setNewsFilter('signaux',this)" style="background:linear-gradient(135deg,#cc2f26,#ff5c5c);color:#fff;border-color:#cc2f26;box-shadow:0 0 12px rgba(204,47,38,0.4);font-weight:800">⚡ Signaux</button>
      <button class="filter-pill" id="news-fil-entreprises" onclick="setNewsFilter('entreprises',this)">🏢 Entreprises</button>
      <button class="filter-pill" id="news-fil-agenda" onclick="setNewsFilter('agenda',this)">📅 Agenda</button>
      <button class="filter-pill" id="news-fil-favoris" onclick="setNewsFilter('favoris',this)">
        ⭐ Mes favoris ${watchlist.length > 0 ? `<span class="pill-count">${watchlist.length}</span>` : ''}
      </button>
      <button class="filter-pill" id="news-fil-macro" onclick="setNewsFilter('macro',this)">Macro</button>
      <button class="filter-pill" id="news-fil-banque" onclick="setNewsFilter('banque',this)">Banques centrales</button>
      <button class="filter-pill" id="news-fil-marche" onclick="setNewsFilter('marche',this)">Marchés</button>
    </div>

    <!-- BLOOMBERG TICKER STRIP -->
    ${allTracked.length > 0 ? `
    <div style="margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:#8e8e93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">
        Mes valeurs suivies · <span style="font-weight:400">${watchlist.length} favoris · ${positions.filter((p,i,a)=>a.findIndex(x=>x.name===p.name)===i).length} positions</span>
      </div>
      <div style="background:#0f0f10;border-radius:12px;overflow:hidden;position:relative;height:42px">
        <div style="display:flex;overflow:hidden;position:relative;height:42px;align-items:center">
          <div class="bloomberg-ticker" id="bloomberg-strip">
            ${buildBloombergTicker(allTracked)}
          </div>
        </div>
      </div>
    </div>` : `
    <div style="text-align:center;padding:16px;background:#f9f9f9;border-radius:14px;margin-bottom:14px">
      <div style="font-size:13px;font-weight:600;color:#8e8e93">Aucune valeur suivie — recherche une entreprise ci-dessus et clique ☆ Suivre</div>
    </div>`}

    <!-- POPULAR TO ADD -->
    ${allTracked.length < 5 ? `
    <div class="popular-section">
      <div class="popular-title">Entreprises populaires à suivre</div>
      <div class="popular-grid">
        ${POPULAR.filter(p => !allTracked.find(t => t.ticker === p.ticker)).slice(0, 8).map(p => `
          <div class="popular-chip" onclick="openCompany('${p.ticker}','${p.name}','${p.sector}')">
            <div class="popular-left">
              <div class="popular-avatar">${p.ticker.slice(0,2)}</div>
              <div><div class="popular-name">${p.name}</div><div class="popular-ticker">${p.ticker} · ${p.sector}</div></div>
            </div>
            <button class="btn-follow ${isFavorite(p.ticker)?'following':''}" onclick="event.stopPropagation();toggleFavorite('${p.ticker}','${p.name}','${p.sector}')">
              ${isFavorite(p.ticker) ? '✓ Suivi' : '+ Suivre'}
            </button>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <!-- NEWS LIST -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-size:14px;font-weight:800;color:#1c1c1e">Actualités du marché</div>
      <button class="btn-refresh" id="news-refresh-btn" onclick="Object.keys(newsTabCache).forEach(k=>{newsTabCache[k].html='';newsTabCache[k].ts=0;});loadNews(true)">
        <svg id="news-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
        Actualiser
      </button>
    </div>
    <div id="news-list"></div>
  `;

  // Load news
  if (!loadNewsCache()) loadNews(false);
  else renderNewsList();
}

// ===== ONGLET AGENDA =====
let agendaView = 'semaine'; // 'semaine' | 'mois' | 'liste'
let agendaEvents = [];
let agendaCurrentDate = new Date();
let agendaSelectedEvent = null;

// ===== CACHE ONGLETS NEWS =====
// Vide le cache quand l'utilisateur quitte et revient sur l'appli
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Revenu sur l'appli — vide le cache si > 30 min
    Object.keys(newsTabCache).forEach(k => {
      if (Date.now() - newsTabCache[k].ts > NEWS_CACHE_TTL) {
        newsTabCache[k].html = '';
        newsTabCache[k].ts = 0;
      }
    });
  }
});
const NEWS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const newsTabCache = {
  signaux:     { data: null, ts: 0, html: '' },
  entreprises: { data: null, ts: 0, html: '' },
  agenda:      { data: null, ts: 0, html: '' },
};

function isCacheValid(key) {
  return newsTabCache[key].html && (Date.now() - newsTabCache[key].ts) < NEWS_CACHE_TTL;
}

function restoreFromCache(key) {
  const list = document.getElementById('news-list');
  if (list) list.innerHTML = newsTabCache[key].html;
}

function saveToCache(key) {
  const list = document.getElementById('news-list');
  if (list) {
    newsTabCache[key].html = list.innerHTML;
    newsTabCache[key].ts = Date.now();
  }
}

async function renderAgenda() {
  const list = document.getElementById('news-list');
  if (!list) return;

  list.innerHTML = `<div style="text-align:center;padding:30px;color:#8e8e93">
    <div style="font-size:28px;margin-bottom:8px">📅</div>
    <div style="font-size:13px">Chargement du calendrier...</div>
  </div>`;

  try {
    const res = await fetch('/api/agenda');
    if (!res.ok) throw new Error('API ' + res.status);
    const data = await res.json();
    agendaEvents = data.events || [];
  } catch(e) {
    console.warn('Agenda API failed, using AI fallback');
    // Fallback : génère les événements via l'IA
    try {
      const date = new Date().toLocaleDateString('fr-FR');
      const raw = await callClaude(
        `Liste 8 événements économiques importants prévus dans les 30 prochains jours à partir du ${date}. Mix : BCE, Fed, inflation, PIB, emploi, résultats d'entreprises.
Réponds UNIQUEMENT en JSON :
[{"id":"1","date":"2026-05-20","heure":"14:30","titre":"Décision taux Fed","pays":"US","impact":"high","prevision":"4.25%","precedent":"4.25%"}]
impact: high/medium/low. pays: US/EU/FR/DE/UK.`,
        'Réponds UNIQUEMENT en JSON valide.'
      );
      const clean = raw.replace(/\`\`\`json|\`\`\`/g,'').trim();
      const s = clean.indexOf('['), e = clean.lastIndexOf(']');
      if (s !== -1 && e !== -1) agendaEvents = JSON.parse(clean.slice(s, e+1));
    } catch(e2) { agendaEvents = []; }
  }

  renderAgendaView();
  saveToCache('agenda');
}

function renderAgendaView() {
  const list = document.getElementById('news-list');
  if (!list) return;

  const impactColor = { high:'#cc2f26', medium:'#f59e0b', low:'#8e8e93' };
  const impactBg    = { high:'#fff0f0', medium:'#fff9e6', low:'#f5f5f5' };
  const impactLabel = { high:'Fort', medium:'Moyen', low:'Faible' };
  const paysFlag    = { US:'🇺🇸', EU:'🇪🇺', FR:'🇫🇷', DE:'🇩🇪', UK:'🇬🇧', JP:'🇯🇵', CN:'🇨🇳' };

  const now = new Date();
  const pad = n => String(n).padStart(2,'0');

  // Navigation header
  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const dayNames = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

  function getWeekDates(baseDate) {
    const d = new Date(baseDate);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return Array.from({length:7}, (_,i) => {
      const dd = new Date(monday);
      dd.setDate(monday.getDate() + i);
      return dd;
    });
  }

  function getMonthDates(baseDate) {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month+1, 0);
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const days = [];
    for (let i = 0; i < startDay; i++) {
      const d = new Date(firstDay);
      d.setDate(firstDay.getDate() - startDay + i);
      days.push({ date: d, current: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), current: true });
    }
    while (days.length % 7 !== 0) {
      const d = new Date(days[days.length-1].date);
      d.setDate(d.getDate()+1);
      days.push({ date: d, current: false });
    }
    return days;
  }

  function eventsForDate(date) {
    const str = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
    return agendaEvents.filter(e => e.date === str);
  }

  function eventDot(evt) {
    return `<div style="width:6px;height:6px;border-radius:50%;background:${impactColor[evt.impact]||'#8e8e93'};display:inline-block;margin:1px"></div>`;
  }

  function eventDetailCard(evt) {
    const borderW = evt.impact === 'high' ? '4px' : evt.impact === 'medium' ? '3px' : '2px';
    const cardBg = evt.impact === 'high' ? '#fff5f5' : evt.impact === 'medium' ? '#fffbf0' : '#fafafa';
    return `
    <div style="background:${cardBg};border-radius:14px;padding:14px 16px;margin-bottom:10px;border-left:${borderW} solid ${impactColor[evt.impact]||'#8e8e93'};box-shadow:0 1px 4px rgba(0,0,0,0.06)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div style="font-size:15px;font-weight:800;color:#1c1c1e;flex:1;line-height:1.3">${paysFlag[evt.pays]||'🌍'} ${evt.titre}</div>
        <span style="background:${impactColor[evt.impact]};color:#fff;font-size:11px;font-weight:800;padding:4px 10px;border-radius:8px;white-space:nowrap;margin-left:10px">${impactLabel[evt.impact]||'Faible'}</span>
      </div>
      <div style="display:flex;gap:14px;font-size:13px;color:#555;font-weight:600;margin-bottom:10px">
        <span>🕐 ${evt.heure}</span>
        <span>${evt.pays}</span>
      </div>
      ${evt.prevision || evt.precedent ? `
      <div style="display:grid;grid-template-columns:1fr 1fr${evt.actual?' 1fr':''};gap:8px;margin-bottom:10px">
        ${evt.precedent ? `<div style="background:#fff;border-radius:10px;padding:8px 10px;text-align:center;border:1px solid #e5e5ea"><div style="font-size:11px;color:#666;font-weight:700;margin-bottom:3px">PRÉCÉDENT</div><div style="font-size:14px;font-weight:800;color:#1c1c1e">${evt.precedent}</div></div>` : ''}
        ${evt.prevision ? `<div style="background:#fff;border-radius:10px;padding:8px 10px;text-align:center;border:1px solid #e5e5ea"><div style="font-size:11px;color:#666;font-weight:700;margin-bottom:3px">PRÉVISION</div><div style="font-size:14px;font-weight:800;color:#1c1c1e">${evt.prevision}</div></div>` : ''}
        ${evt.actual ? `<div style="background:#e8f8f0;border-radius:10px;padding:8px 10px;text-align:center;border:1px solid #1a7f5a40"><div style="font-size:11px;color:#1a7f5a;font-weight:700;margin-bottom:3px">RÉSULTAT</div><div style="font-size:14px;font-weight:800;color:#1a7f5a">${evt.actual}</div></div>` : ''}
      </div>` : ''}
      <div id="evt-impact-${evt.id}" style="font-size:13px;color:#1c1c1e;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:6px" onclick="loadEventImpact('${evt.id}','${evt.titre.replace(/'/g,"\'")}','${evt.impact}')">
        💬 <span style="text-decoration:underline;color:#1a7f5a">Voir l'impact potentiel sur les marchés →</span>
      </div>
    </div>`;
  }

  // Build view
  let calHtml = '';

  if (agendaView === 'semaine') {
    const days = getWeekDates(agendaCurrentDate);
    calHtml = `
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:12px">
      ${dayNames.map(d=>`<div style="text-align:center;font-size:10px;font-weight:700;color:#8e8e93;padding:4px 0">${d}</div>`).join('')}
      ${days.map(d => {
        const evts = eventsForDate(d);
        const isToday = d.toDateString() === now.toDateString();
        const isPast = d < now && !isToday;
        const hasHigh2   = evts.some(e=>e.impact==='high');
        const hasMedium2 = evts.some(e=>e.impact==='medium');
        const wBg = isToday ? '#1c1c1e'
          : hasHigh2   ? '#fff0f0'
          : hasMedium2 ? '#fff9e6'
          : evts.length > 0 ? '#f9f9f9'
          : '#fff';
        const wBorder = isToday ? '#1c1c1e' : hasHigh2 ? '#cc2f26' : hasMedium2 ? '#f59e0b' : '#f0f0f0';
        const wNumColor = isToday ? '#fff' : hasHigh2 ? '#cc2f26' : hasMedium2 ? '#92400e' : '#1c1c1e';

        return `<div onclick="agendaSelectDay('${d.toISOString()}')"
          style="min-height:70px;background:${wBg};border-radius:10px;padding:8px 6px;cursor:pointer;border:2px solid ${wBorder};opacity:${isPast?0.5:1};transition:all 0.15s"
          onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='${isPast?0.5:1}'">
          <div style="font-size:14px;font-weight:800;color:${wNumColor};margin-bottom:4px">${d.getDate()}</div>
          ${evts.length>0?`<div style="font-size:11px;font-weight:800;color:${isToday?'#aaa':hasHigh2?'#cc2f26':hasMedium2?'#92400e':'#555'}">${evts.length} evt</div>`:''}
          ${hasHigh2?`<div style="font-size:10px;font-weight:700;color:#cc2f26;margin-top:2px">⚡ Fort</div>`:''}
          ${!hasHigh2&&hasMedium2?`<div style="font-size:10px;font-weight:700;color:#f59e0b;margin-top:2px">● Moyen</div>`:''}
        </div>`;
      }).join('')}
    </div>
    <div id="agenda-day-detail"></div>`;

  } else if (agendaView === 'mois') {
    const days = getMonthDates(agendaCurrentDate);
    calHtml = `
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:12px">
      ${dayNames.map(d=>`<div style="text-align:center;font-size:10px;font-weight:700;color:#8e8e93;padding:4px 0">${d}</div>`).join('')}
      ${days.map(({date:d, current}) => {
        const evts = eventsForDate(d);
        const isToday = d.toDateString() === now.toDateString();
        // Couleur de la journée selon l'impact dominant
        const hasHigh   = evts.some(e=>e.impact==='high');
        const hasMedium = evts.some(e=>e.impact==='medium');
        const dayBg = isToday ? '#1c1c1e'
          : !current ? '#f8f8f8'
          : hasHigh   ? '#fff0f0'
          : hasMedium ? '#fff9e6'
          : evts.length > 0 ? '#f5f5f5'
          : '#fff';
        const dayBorder = isToday ? '#1c1c1e'
          : hasHigh   ? '#cc2f26'
          : hasMedium ? '#f59e0b'
          : evts.length > 0 ? '#e0e0e0'
          : '#f0f0f0';
        const dayNumColor = isToday ? '#fff' : hasHigh ? '#cc2f26' : hasMedium ? '#92400e' : current ? '#1c1c1e' : '#aaa';
        const evtCountColor = isToday ? '#aaa' : hasHigh ? '#cc2f26' : hasMedium ? '#92400e' : '#555';

        return `<div onclick="agendaSelectDay('${d.toISOString()}')"
          style="min-height:58px;background:${dayBg};border-radius:10px;padding:6px;cursor:pointer;border:2px solid ${dayBorder};opacity:${current?1:0.35};transition:all 0.15s"
          onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='${current?1:0.35}'">
          <div style="font-size:13px;font-weight:${isToday||hasHigh?900:600};color:${dayNumColor}">${d.getDate()}</div>
          ${evts.length>0?`<div style="font-size:10px;font-weight:800;color:${evtCountColor};margin-top:4px">${evts.length} evt</div>`:''}
          ${hasHigh?`<div style="font-size:9px;font-weight:700;color:#cc2f26;margin-top:1px">⚡ Fort</div>`:''}
        </div>`;
      }).join('')}
    </div>
    <div id="agenda-day-detail"></div>`;

  } else { // liste
    const upcoming = agendaEvents
      .filter(e => new Date(e.date) >= new Date(now.toDateString()))
      .sort((a,b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure));

    let lastDate = '';
    calHtml = upcoming.map(e => {
      let dateHeader = '';
      if (e.date !== lastDate) {
        lastDate = e.date;
        const d = new Date(e.date);
        const isToday = d.toDateString() === now.toDateString();
        const isTomorrow = d.toDateString() === new Date(now.getTime()+86400000).toDateString();
        const label = isToday ? "📅 Aujourd'hui" : isTomorrow ? '⏭ Demain' : `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
        dateHeader = `<div style="font-size:12px;font-weight:800;color:#1c1c1e;margin:12px 0 6px;padding-bottom:4px;border-bottom:2px solid #f0f0f0">${label}</div>`;
      }
      return dateHeader + eventDetailCard(e);
    }).join('') || `<div style="text-align:center;padding:30px;color:#8e8e93">Aucun événement à venir</div>`;
  }

  const monthLabel = `${monthNames[agendaCurrentDate.getMonth()]} ${agendaCurrentDate.getFullYear()}`;
  const weekStart = getWeekDates(agendaCurrentDate)[0];
  const weekEnd = getWeekDates(agendaCurrentDate)[6];
  const weekLabel = `${weekStart.getDate()} - ${weekEnd.getDate()} ${monthNames[weekEnd.getMonth()]}`;

  list.innerHTML = `
    <!-- HEADER NAVIGATION -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <button onclick="agendaNav(-1)" style="background:#f5f5f5;border:none;border-radius:8px;padding:8px 12px;font-size:14px;cursor:pointer">←</button>
      <div style="text-align:center">
        <div style="font-size:14px;font-weight:800;color:#1c1c1e">${agendaView==='semaine'?weekLabel:agendaView==='mois'?monthLabel:'Événements à venir'}</div>
      </div>
      <button onclick="agendaNav(1)" style="background:#f5f5f5;border:none;border-radius:8px;padding:8px 12px;font-size:14px;cursor:pointer">→</button>
    </div>

    <!-- VUE SWITCHER -->
    <div style="display:flex;gap:6px;margin-bottom:14px">
      ${['semaine','mois','liste'].map(v=>`
      <button onclick="agendaView='${v}';renderAgendaView()" 
        style="flex:1;padding:7px;border-radius:8px;border:2px solid ${agendaView===v?'#1c1c1e':'#e5e5ea'};background:${agendaView===v?'#1c1c1e':'#fff'};color:${agendaView===v?'#fff':'#1c1c1e'};font-size:12px;font-weight:700;cursor:pointer">
        ${v==='semaine'?'Semaine':v==='mois'?'Mois':'Liste'}
      </button>`).join('')}
    </div>

    <!-- LÉGENDE IMPACT -->
    <div style="display:flex;gap:10px;margin-bottom:12px;font-size:11px">
      ${Object.entries(impactColor).map(([k,c])=>`<div style="display:flex;align-items:center;gap:4px"><div style="width:8px;height:8px;border-radius:50%;background:${c}"></div><span style="color:#8e8e93">${impactLabel[k]}</span></div>`).join('')}
    </div>

    <!-- CALENDRIER -->
    ${calHtml}`;
}

function agendaNav(dir) {
  if (agendaView === 'semaine') {
    agendaCurrentDate.setDate(agendaCurrentDate.getDate() + dir * 7);
  } else if (agendaView === 'mois') {
    agendaCurrentDate.setMonth(agendaCurrentDate.getMonth() + dir);
  }
  renderAgendaView();
}

function agendaSelectDay(isoDate) {
  const d = new Date(isoDate);
  const pad = n => String(n).padStart(2,'0');
  const str = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const evts = agendaEvents.filter(e => e.date === str);
  const detail = document.getElementById('agenda-day-detail');
  if (!detail) return;

  const dayNames = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const impactColor = { high:'#cc2f26', medium:'#f59e0b', low:'#8e8e93' };
  const impactBg    = { high:'#fff0f0', medium:'#fff9e6', low:'#f5f5f5' };
  const impactLabel = { high:'Fort', medium:'Moyen', low:'Faible' };
  const paysFlag    = { US:'🇺🇸', EU:'🇪🇺', FR:'🇫🇷', DE:'🇩🇪', UK:'🇬🇧', JP:'🇯🇵', CN:'🇨🇳' };

  if (!evts.length) {
    detail.innerHTML = `<div style="text-align:center;padding:20px;color:#8e8e93;font-size:13px">Aucun événement ce jour</div>`;
    return;
  }

  detail.innerHTML = `
    <div style="font-size:13px;font-weight:800;color:#1c1c1e;margin-bottom:10px;padding-top:10px;border-top:2px solid #f0f0f0">
      ${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]} — ${evts.length} événement${evts.length>1?'s':''}
    </div>
    ${evts.sort((a,b)=>a.heure.localeCompare(b.heure)).map(evt => `
    <div style="background:${evt.impact==='high'?'#fff5f5':evt.impact==='medium'?'#fffbf0':'#fafafa'};border-radius:14px;padding:14px 16px;margin-bottom:10px;border-left:${evt.impact==='high'?'4px':evt.impact==='medium'?'3px':'2px'} solid ${impactColor[evt.impact]||'#8e8e93'};box-shadow:0 1px 4px rgba(0,0,0,0.06)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div style="font-size:15px;font-weight:800;color:#1c1c1e;flex:1;line-height:1.3">${paysFlag[evt.pays]||'🌍'} ${evt.titre}</div>
        <span style="background:${impactColor[evt.impact]};color:#fff;font-size:11px;font-weight:800;padding:4px 10px;border-radius:8px;margin-left:10px">${impactLabel[evt.impact]||''}</span>
      </div>
      <div style="font-size:13px;color:#555;font-weight:600;margin-bottom:10px">🕐 ${evt.heure} · ${evt.pays}</div>
      ${evt.prevision || evt.precedent ? `
      <div style="display:grid;grid-template-columns:${evt.actual?'1fr 1fr 1fr':'1fr 1fr'};gap:8px;margin-bottom:10px">
        ${evt.precedent?`<div style="background:#fff;border-radius:10px;padding:8px;text-align:center;border:1px solid #e5e5ea"><div style="font-size:11px;color:#666;font-weight:700;margin-bottom:3px">PRÉCÉDENT</div><div style="font-size:14px;font-weight:800;color:#1c1c1e">${evt.precedent}</div></div>`:''}
        ${evt.prevision?`<div style="background:#fff;border-radius:10px;padding:8px;text-align:center;border:1px solid #e5e5ea"><div style="font-size:11px;color:#666;font-weight:700;margin-bottom:3px">PRÉVISION</div><div style="font-size:14px;font-weight:800;color:#1c1c1e">${evt.prevision}</div></div>`:''}
        ${evt.actual?`<div style="background:#e8f8f0;border-radius:10px;padding:8px;text-align:center;border:1px solid #1a7f5a40"><div style="font-size:11px;color:#1a7f5a;font-weight:700;margin-bottom:3px">RÉSULTAT</div><div style="font-size:14px;font-weight:800;color:#1a7f5a">${evt.actual}</div></div>`:''}
      </div>` : ''}
      <div id="evt-impact-${evt.id}" style="font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px" onclick="loadEventImpact('${evt.id}','${evt.titre.replace(/'/g,"\'")}','${evt.impact}')">
        💬 <span style="text-decoration:underline;color:#1a7f5a">Voir l'impact potentiel →</span>
      </div>
    </div>`).join('')}`;
}

async function loadEventImpact(id, titre, impact) {
  const el = document.getElementById('evt-impact-' + id);
  if (!el) return;
  el.innerHTML = '🧠 Analyse en cours...';

  try {
    const impactDesc = { high:'très fort', medium:'modéré', low:'faible' }[impact] || 'modéré';
    const prompt = `Événement économique : "${titre}" (impact ${impactDesc}).
En 3 points courts et simples pour un débutant, explique :
1. Ce que c'est
2. Si le résultat est meilleur que prévu → impact sur les marchés
3. Si le résultat est moins bon que prévu → impact sur les marchés
Sois très concret (ex: "Les actions tech montent", "L'euro baisse"). Max 4 lignes au total.`;

    const resp = await callClaude(prompt, 'Tu es un expert financier pédagogue. Sois bref et clair.');
    el.innerHTML = '<div style="background:rgba(255,255,255,0.9);border-radius:10px;padding:10px 12px;margin-top:6px;font-size:12px;color:#1c1c1e;line-height:1.6">' + resp.split('\n').join('<br>') + '</div>';
  } catch(e) {
    el.innerHTML = '<span style="color:#cc2f26;font-size:12px">Impossible de charger l\'analyse</span>';
  }
}

// ===== ONGLET ENTREPRISES =====
let entrepriseSearchTimeout = null;

async function renderEntreprises() {
  const list = document.getElementById('news-list');
  if (!list) return;

  // Entreprises vedettes à afficher par défaut
  const featured = [
    { ticker:'AAPL',   name:'Apple' },
    { ticker:'MSFT',   name:'Microsoft' },
    { ticker:'NVDA',   name:'NVIDIA' },
    { ticker:'TSLA',   name:'Tesla' },
    { ticker:'MC.PA',  name:'LVMH' },
    { ticker:'TTE.PA', name:'TotalEnergies' },
    { ticker:'AI.PA',  name:'Air Liquide' },
    { ticker:'BNP.PA', name:'BNP Paribas' },
    { ticker:'ASML',   name:'ASML' },
    { ticker:'AMZN',   name:'Amazon' },
  ];

  // Ajoute mes positions en premier
  const myCompanies = [...new Set(positions.map(p => ({ ticker: p.name, name: p.name })))];
  const allCompanies = [...myCompanies, ...featured.filter(f => !myCompanies.find(m => m.ticker === f.ticker))].slice(0, 12);

  list.innerHTML = `
    <!-- Barre de recherche -->
    <div style="position:relative;margin-bottom:16px">
      <input type="text" id="ent-search" placeholder="🔍 Rechercher une entreprise (ex: Apple, LVMH, Tesla...)"
        style="width:100%;padding:13px 16px;border-radius:14px;border:2px solid #e5e5ea;font-size:14px;outline:none;box-sizing:border-box;background:#fafafa"
        oninput="searchEntreprise(this.value)"
        onfocus="this.style.borderColor='#1c1c1e';this.style.background='#fff'"
        onblur="this.style.borderColor='#e5e5ea';this.style.background='#fafafa'">
      <div id="ent-search-results" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border-radius:12px;border:2px solid #e5e5ea;z-index:100;max-height:220px;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,0.1)"></div>
    </div>

    <!-- Actualités par entreprise -->
    <div style="font-size:11px;font-weight:700;color:#8e8e93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">
      📰 Actualités des entreprises — clic pour voir les détails
    </div>
    <div id="ent-news-list">
      <div style="text-align:center;padding:30px;color:#8e8e93">
        <div style="font-size:24px;margin-bottom:8px">🧠</div>
        <div style="font-size:13px">Chargement des actualités...</div>
      </div>
    </div>`;

  // Charge les actualités
  await loadEntrepriseNews(allCompanies);
  saveToCache('entreprises');
}

async function loadEntrepriseNews(companies) {
  const newsEl = document.getElementById('ent-news-list');
  if (!newsEl) return;

  try {
    // Récupère les news via l'API existante
    const tickers = companies.map(c => c.ticker).join(',');
    const res = await fetch('/api/search?q=' + encodeURIComponent(companies.map(c=>c.name).join(' OR ')));
    
    // Génère un résumé des actualités importantes via l'IA
    const date = new Date().toLocaleDateString('fr-FR');
    const companiesList = companies.map(c=>c.name).join(', ');
    const prompt = `Journaliste financier, le ${date}. Donne 6 actualités importantes récentes pour ces entreprises : ${companiesList}.
Réponds UNIQUEMENT en JSON valide, sans markdown :
[{"ticker":"AAPL","entreprise":"Apple","titre":"Titre court","resume":"2 phrases max","impact":"positif","categorie":"Résultats","date":"Cette semaine"}]
impact: positif/negatif/neutre. categorie: Résultats/Produit/Direction/Marché/Réglementation.`;

    const raw = await callClaude(prompt, 'Tu es journaliste financier. Réponds UNIQUEMENT en JSON valide.');
    const clean = raw.replace(/```json|```/g,'').trim();
    const s = clean.indexOf('['), e = clean.lastIndexOf(']');
    const articles = JSON.parse(clean.slice(s, e+1));

    const impactColor = { positif:'#1a7f5a', negatif:'#cc2f26', neutre:'#8e8e93' };
    const impactBg    = { positif:'#e8f8f0', negatif:'#fff0f0', neutre:'#f5f5f5' };
    const impactIcon  = { positif:'📈', negatif:'📉', neutre:'📊' };

    newsEl.innerHTML = articles.map(a => {
      const myPos = positions.find(p => p.name === a.ticker);
      const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(a.entreprise + ' actualité bourse 2026');
      return `
      <div style="background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:10px;border:2px solid #f0f0f0;transition:all 0.2s"
           onmouseover="this.style.borderColor='#1c1c1e'" onmouseout="this.style.borderColor='#f0f0f0'">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:36px;height:36px;border-radius:10px;background:${impactBg[a.impact]};display:flex;align-items:center;justify-content:center;font-size:16px">${impactIcon[a.impact]}</div>
            <div>
              <div style="font-size:13px;font-weight:800;color:#1c1c1e">${a.entreprise} <span style="font-size:11px;color:#8e8e93;font-weight:500">${a.ticker}</span>
                ${myPos ? '<span style="background:#1c1c1e;color:#fff;font-size:9px;font-weight:700;padding:2px 5px;border-radius:5px;margin-left:4px">📦 Portef.</span>' : ''}
              </div>
              <div style="display:flex;gap:6px;align-items:center;margin-top:2px">
                <span style="background:${impactBg[a.impact]};color:${impactColor[a.impact]};font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px">${a.categorie}</span>
                <span style="font-size:11px;color:#8e8e93">${a.date}</span>
              </div>
            </div>
          </div>
          <div style="width:8px;height:8px;border-radius:50%;background:${impactColor[a.impact]};margin-top:6px;flex-shrink:0"></div>
        </div>
        <!-- Titre -->
        <div style="font-size:15px;font-weight:700;color:#1c1c1e;margin-bottom:6px;line-height:1.3">${a.titre}</div>
        <!-- Résumé -->
        <div style="font-size:13px;color:#3c3c43;line-height:1.6;margin-bottom:10px">${a.resume}</div>
        <!-- Actions -->
        <div style="display:flex;gap:8px;align-items:center">
          <a href="${searchUrl}" target="_blank" rel="noopener"
             style="flex:1;background:#f5f5f5;color:#1c1c1e;border:none;border-radius:10px;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer;text-decoration:none;text-align:center;display:block">
            🔗 Voir les articles
          </a>
          <button onclick="openDecisionFromPos('${a.ticker}','garder')"
             style="flex:1;background:#1c1c1e;color:#fff;border:none;border-radius:10px;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer">
            🤔 Analyser l'impact
          </button>
        </div>
      </div>`;
    }).join('') + `
    <div style="text-align:center;padding:12px;color:#8e8e93;font-size:12px">
      ⚠️ Actualités générées par IA à titre informatif · Vérifiez via les liens fournis
    </div>`;

  } catch(e) {
    newsEl.innerHTML = `<div style="text-align:center;padding:20px;color:#8e8e93">
      <div style="font-size:20px;margin-bottom:8px">⚠️</div>
      <div style="font-size:13px">Impossible de charger les actualités.<br>Réessaie dans quelques secondes.</div>
      <button onclick="renderEntreprises()" style="margin-top:12px;background:#1c1c1e;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer">🔄 Réessayer</button>
    </div>`;
  }
}

function searchEntreprise(query) {
  clearTimeout(entrepriseSearchTimeout);
  const drop = document.getElementById('ent-search-results');
  if (!query || query.length < 2) { drop.style.display = 'none'; return; }
  entrepriseSearchTimeout = setTimeout(async () => {
    try {
      const res = await fetch('/api/search?q=' + encodeURIComponent(query));
      const data = await res.json();
      const results = (data.quotes || []).slice(0, 6);
      if (!results.length) { drop.style.display = 'none'; return; }
      drop.style.display = 'block';
      drop.innerHTML = results.map(r => `
        <div onclick="searchEntrepriseNews('${r.symbol}','${(r.shortname||r.longname||r.symbol).replace(/'/g,'\\')}');document.getElementById('ent-search-results').style.display='none';document.getElementById('ent-search').value='${(r.shortname||r.symbol).replace(/'/g,'\\')}'"
             style="padding:12px 14px;cursor:pointer;border-bottom:1px solid #f0f0f0"
             onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='#fff'">
          <div style="font-size:13px;font-weight:700;color:#1c1c1e">${r.shortname || r.symbol}</div>
          <div style="font-size:12px;color:#8e8e93">${r.symbol} · ${r.exchDisp || r.exchange || ''}</div>
        </div>`).join('');
    } catch(e) { drop.style.display = 'none'; }
  }, 400);
}

async function searchEntrepriseNews(ticker, name) {
  const newsEl = document.getElementById('ent-news-list');
  if (!newsEl) return;
  newsEl.innerHTML = `<div style="text-align:center;padding:20px;color:#8e8e93"><div style="font-size:20px;margin-bottom:6px">🧠</div><div>Recherche des actualités de ${name}...</div></div>`;
  await loadEntrepriseNews([{ ticker, name }]);
}

function addToWatchlistBtn(ticker, name) {
  toggleFavorite(ticker, name, '');
  showToast('⭐ ' + name + ' ajouté aux favoris !');
}

function removeFromWatchlist(ticker, name) {
  toggleFavorite(ticker, name, '');
  showToast('Retiré des favoris');
}


async function renderSignaux() {
  const list = document.getElementById('news-list');
  if (!list) return;

  // Constants
  const sigColor = { acheter:'#1a7f5a', attendre:'#f59e0b', vendre:'#cc2f26', eviter:'#8e8e93' };
  const sigBg    = { acheter:'#e8f8f0', attendre:'#fff9e6', vendre:'#fff0f0', eviter:'#f5f5f5' };
  const sigIcon  = { acheter:'↑', attendre:'⏸', vendre:'↓', eviter:'✕' };
  const sigLabel = { acheter:'ACHETER', attendre:'ATTENDRE', vendre:'VENDRE', eviter:'ÉVITER' };

  function riskBar(n) {
    const colors = ['#1a7f5a','#1a7f5a','#f59e0b','#f59e0b','#cc2f26'];
    const labels = ['','Très faible','Faible','Moyen','Élevé','Très élevé'];
    return `<div style="display:flex;align-items:center;gap:4px">
      ${[1,2,3,4,5].map(i => `<div style="width:14px;height:6px;border-radius:2px;background:${i<=n?colors[n-1]:'#e5e5ea'}"></div>`).join('')}
      <span style="font-size:10px;color:#8e8e93;margin-left:2px">${labels[n]||''}</span>
    </div>`;
  }

  function signalCard(s, isMine) {
    const myPos = positions.find(p => p.name === s.ticker);
    const myPnl = myPos ? ((myPos.price - myPos.pru) / myPos.pru * 100).toFixed(1) : null;
    return `
    <div style="background:${sigBg[s.signal]||'#f9f9f9'};border-radius:14px;padding:14px 16px;margin-bottom:10px;border-left:4px solid ${sigColor[s.signal]||'#e5e5ea'};cursor:pointer"
         onclick="openDecisionFromPos('${s.ticker}','${s.signal==='acheter'?'acheter':s.signal==='vendre'?'vendre':'garder'}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:12px;background:${sigColor[s.signal]}20;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:${sigColor[s.signal]}">${sigIcon[s.signal]}</div>
          <div>
            <div style="font-size:14px;font-weight:800;color:#1c1c1e;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              ${s.name} <span style="font-size:11px;color:#8e8e93;font-weight:500">${s.ticker}</span>
              ${isMine ? '<span style="background:#1c1c1e;color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px">📦 Portef.</span>' : ''}
              <button data-fav-ticker="${s.ticker}"
                onclick="event.stopPropagation();toggleNewsItemFav('${s.ticker}','${s.name}','sig-star-${s.ticker}')"
                id="sig-star-${s.ticker}"
                style="background:none;border:none;cursor:pointer;font-size:16px;padding:0;line-height:1;color:${isFavorite(s.ticker)?'#f59e0b':'rgba(0,0,0,0.2)'};transition:color 0.2s">${isFavorite(s.ticker)?'★':'☆'}</button>
            </div>
            <div style="font-size:11px;color:#8e8e93;margin-top:2px">${s.type||''} · ${s.secteur||''}</div>
            <div style="margin-top:4px;display:flex;align-items:center;gap:4px">
              <span style="font-size:10px;color:#8e8e93;font-weight:700">RISQUE</span>
              ${riskBar(s.risque||3)}
            </div>
          </div>
        </div>
        <div style="background:${sigColor[s.signal]};color:#fff;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:800;white-space:nowrap">
          ${sigLabel[s.signal]||s.signal.toUpperCase()}
        </div>
      </div>
      <div style="font-size:13px;color:#1c1c1e;font-weight:500;margin-bottom:8px">${s.raison}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(70px,1fr));gap:6px">
        <div style="background:rgba(255,255,255,0.8);border-radius:8px;padding:6px 8px;text-align:center">
          <div style="font-size:10px;color:#8e8e93;font-weight:700">HORIZON</div>
          <div style="font-size:11px;font-weight:800;color:#1c1c1e;margin-top:1px">${s.horizon}</div>
        </div>
        ${s.objectif > 0 ? `<div style="background:rgba(255,255,255,0.8);border-radius:8px;padding:6px 8px;text-align:center">
          <div style="font-size:10px;color:#1a7f5a;font-weight:700">OBJECTIF <span title="Prix cible estimé — bon moment de vendre si atteint" style="display:inline-block;width:12px;height:12px;background:#1a7f5a20;color:#1a7f5a;border-radius:50%;font-size:8px;font-weight:800;line-height:12px;text-align:center;cursor:help">?</span></div>
          <div style="font-size:11px;font-weight:800;color:#1a7f5a;margin-top:1px">${s.objectif}€</div>
        </div>` : ''}
        ${s.stop_loss > 0 ? `<div style="background:rgba(255,255,255,0.8);border-radius:8px;padding:6px 8px;text-align:center">
          <div style="font-size:10px;color:#cc2f26;font-weight:700">STOP <span title="Vends si l'action descend à ce prix pour limiter les pertes" style="display:inline-block;width:12px;height:12px;background:#cc2f2620;color:#cc2f26;border-radius:50%;font-size:8px;font-weight:800;line-height:12px;text-align:center;cursor:help">?</span></div>
          <div style="font-size:11px;font-weight:800;color:#cc2f26;margin-top:1px">${s.stop_loss}€</div>
        </div>` : ''}
        ${isMine && myPnl !== null ? `<div style="background:rgba(255,255,255,0.8);border-radius:8px;padding:6px 8px;text-align:center">
          <div style="font-size:10px;color:#8e8e93;font-weight:700">MA PERF.</div>
          <div style="font-size:11px;font-weight:800;color:${parseFloat(myPnl)>=0?'#1a7f5a':'#cc2f26'};margin-top:1px">${parseFloat(myPnl)>=0?'+':''}${myPnl}%</div>
        </div>` : ''}
      </div>
      <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:11px;color:${sigColor[s.signal]};font-weight:600">Analyser & investir →</div>
        <button data-fav-ticker="${s.ticker}"
          id="sig-star-bot-${s.ticker}"
          onclick="event.stopPropagation();toggleNewsItemFav('${s.ticker}','${s.name}','sig-star-bot-${s.ticker}')"
          style="background:none;border:none;cursor:pointer;font-size:20px;padding:0;line-height:1;color:${isFavorite(s.ticker)?'#f59e0b':'rgba(0,0,0,0.15)'};transition:color 0.2s"
          title="${isFavorite(s.ticker)?'Retirer des favoris':'Ajouter aux favoris'}">${isFavorite(s.ticker)?'★':'☆'}</button>
      </div>
    </div>`;
  }

  async function fetchSignaux(tickers) {
    const date = new Date().toLocaleDateString('fr-FR');
    const prompt = `Analyste financier, le ${date}. Donne un signal pour ces actifs : ${tickers.join(', ')}.
Réponds UNIQUEMENT avec ce JSON (rien d'autre) :
[{"ticker":"AAPL","name":"Apple","signal":"acheter","conviction":"forte","risque":2,"objectif":210,"stop_loss":185,"horizon":"2-4 semaines","raison":"Bonne dynamique","type":"Action","secteur":"Tech"}]
Valeurs signal: acheter, attendre, vendre, eviter. risque: 1 a 5.`;
    try {
      const raw = await callClaude(prompt, 'Tu es analyste. Réponds UNIQUEMENT avec du JSON valide. Aucun texte avant ou après.');
      console.log('[fetchSignaux] raw:', raw?.slice(0,200));
      if (!raw || raw === 'Aucune réponse.' || raw === 'Erreur de connexion.') throw new Error('API error: ' + raw);
      const clean = raw.replace(/```json|```/g,'').trim();
      const s = clean.indexOf('['), e = clean.lastIndexOf(']');
      if (s === -1 || e === -1) throw new Error('No JSON array in: ' + clean.slice(0,100));
      return JSON.parse(clean.slice(s, e+1));
    } catch(err) {
      console.error('[fetchSignaux] error:', err.message);
      // Fallback statique
      return tickers.map(t => ({
        ticker: t, name: t, signal: 'attendre', conviction: 'faible',
        risque: 3, objectif: 0, stop_loss: 0,
        horizon: '2-4 semaines', raison: 'Analyse temporairement indisponible',
        type: t.includes('.') ? 'ETF' : 'Action', secteur: ''
      }));
    }
  }

  const date = new Date().toLocaleDateString('fr-FR');
  const myTickers = [...new Set(positions.map(p => p.name))].slice(0, 6); // max 6 = 2 batches
  
  // L'IA choisit elle-même les meilleures opportunités du jour
  async function getOppoTickers() {
    const exclude = myTickers.join(', ');
    const prompt = `Analyste financier, le ${date}. Sélectionne 9 tickers avec les meilleures opportunités aujourd'hui.
OBLIGATOIRE : exactement ce mix :
- 2 grandes caps US (ex: NVDA, MSFT, AAPL, AMZN, TSLA)
- 2 actions françaises CAC40 (ex: MC.PA, TTE.PA, BNP.PA, AI.PA, SAN.PA, ORA.PA)
- 2 actions européennes hors France (ex: ASML, SAP.DE, NOVO-B.CO, NESN.SW, SHEL.L)
- 2 mid-cap moins connues prometteuses (ex: ALTEN.PA, SOITEC.PA, CRWD, DDOG, PLTR, NET)
- 1 action de n'importe quel secteur avec une opportunité spéciale aujourd'hui
Exclus : ${exclude || 'aucun'}.
Réponds UNIQUEMENT : ["TICKER1","TICKER2",...]`;
    try {
      const raw = await callClaude(prompt, 'Réponds UNIQUEMENT avec un tableau JSON de tickers. Rien d autre.');
      const clean = raw.replace(/```json|```/g,'').trim();
      const s = clean.indexOf('['), e = clean.lastIndexOf(']');
      if (s === -1 || e === -1) throw new Error('no array');
      const tickers = JSON.parse(clean.slice(s, e+1));
      return tickers.filter(t => !myTickers.includes(t)).slice(0, 9);
    } catch(e) {
      // Fallback varié si l'IA échoue
      return ['NVDA','ASML','MSFT','TTE.PA','SAN.PA','NOVO-B.CO','SAP.DE','CRWD','BNP.PA']
        .filter(t => !myTickers.includes(t)).slice(0, 9);
    }
  }
  const oppoTickers = await getOppoTickers();

  list.innerHTML = `<div style="text-align:center;padding:30px;color:#8e8e93">
    <div style="font-size:28px;margin-bottom:8px">🧠</div>
    <div style="font-size:13px;font-weight:600">Analyse du marché en cours...</div>
  </div>`;

  try {
    // Batch mes positions par 5
    const myBatches = [];
    for (let i = 0; i < myTickers.length; i += 3) myBatches.push(myTickers.slice(i, i+3));
    let mySignaux = [];
    for (const batch of myBatches) {
      const res = await fetchSignaux(batch);
      mySignaux = [...mySignaux, ...res];
      // Affichage progressif après chaque batch
      const posSection = document.getElementById('my-positions-section');
      if (posSection) posSection.innerHTML = mySignaux.map(s => signalCard(s, true)).join('');
    }

    list.innerHTML = `
      <div style="font-size:11px;color:#8e8e93;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">⚡ Signaux IA — ${date}</div>
      ${mySignaux.length ? `
        <div style="font-size:12px;font-weight:800;color:#1c1c1e;margin-bottom:8px">📦 Mes positions <span style="font-size:11px;color:#8e8e93;font-weight:400">${mySignaux.length} actifs</span></div>
        <div id="my-positions-section">${mySignaux.map(s => signalCard(s, true)).join('')}</div>` : ''}
      <div style="font-size:12px;font-weight:800;color:#1c1c1e;margin:16px 0 8px">🔭 Opportunités du marché</div>
      <div id="oppo-loading" style="text-align:center;padding:20px;color:#8e8e93">
        <div style="font-size:20px;margin-bottom:6px">🧠</div>
        <div style="font-size:13px">Analyse des opportunités...</div>
      </div>`;

    const oppoSignaux = await fetchSignaux(oppoTickers);
    const oppoLoader = document.getElementById('oppo-loading');
    if (oppoLoader) {
      oppoLoader.outerHTML = oppoSignaux.map(s => signalCard(s, false)).join('') +
        `<div style="padding:10px 14px;background:#f5f5f5;border-radius:12px;font-size:12px;color:#8e8e93;text-align:center;margin-top:8px">
          ⚠️ Signaux éducatifs générés par IA — pas des conseils financiers réglementés
        </div>`;
    }
  } catch(e) {
    list.innerHTML = `<div style="text-align:center;padding:20px;color:#8e8e93">
      <div style="font-size:20px;margin-bottom:8px">⚠️</div>
      <div style="font-size:13px">Impossible de charger les signaux.<br>Réessaie dans quelques secondes.</div>
      <button onclick="renderSignaux()" style="margin-top:12px;background:#1c1c1e;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer">🔄 Réessayer</button>
    </div>`;
  }
  saveToCache('signaux');
}

function setNewsFilter(filter, el) {
  newsFilter = filter;
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  // Style spécial pour signaux
  const sigBtn = document.getElementById('news-fil-signaux');
  if (sigBtn) {
    if (filter === 'signaux') {
      sigBtn.style.cssText = 'background:linear-gradient(135deg,#cc2f26,#ff5c5c);color:#fff;border-color:#cc2f26;box-shadow:0 0 16px rgba(204,47,38,0.6);font-weight:800;transform:scale(1.03)';
    } else {
      sigBtn.style.cssText = 'background:linear-gradient(135deg,#cc2f26,#ff5c5c);color:#fff;border-color:#cc2f26;box-shadow:0 0 12px rgba(204,47,38,0.4);font-weight:800';
    }
  }
  if (el) el.classList.add('active');

  // Scroll vers le haut
  document.getElementById('news-list')?.scrollIntoView({behavior:'smooth', block:'start'});

  if (filter === 'signaux') {
    if (isCacheValid('signaux')) { restoreFromCache('signaux'); return; }
    renderSignaux();
  } else if (filter === 'entreprises') {
    if (isCacheValid('entreprises')) { restoreFromCache('entreprises'); return; }
    renderEntreprises();
  } else if (filter === 'agenda') {
    if (isCacheValid('agenda')) { restoreFromCache('agenda'); return; }
    renderAgenda();
  } else {
    renderNewsList();
  }
}

async function renderFavorisNews() {
  const list = document.getElementById('news-list');
  if (!list) return;
  const favNames = watchlist.map(w => w.name || w.ticker);
  list.innerHTML = `<div style="font-size:11px;font-weight:700;color:#8e8e93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">⭐ Actualités de tes ${watchlist.length} favori${watchlist.length>1?'s':''}</div>
    <div id="favoris-news-content" style="text-align:center;padding:24px;color:#8e8e93"><div style="font-size:24px;margin-bottom:8px">🧠</div><div>Chargement...</div></div>`;
  try {
    const date = new Date().toLocaleDateString('fr-FR');
    const prompt = 'Journaliste financier, le ' + date + '. Actualités pour : ' + favNames.join(', ') + '.\nRéponds UNIQUEMENT JSON : [{"ticker":"X","entreprise":"Nom","titre":"Titre","resume":"2 phrases","impact":"positif","categorie":"Résultats","date":"Cette semaine"}]';
    const raw = await callClaude(prompt, 'Réponds UNIQUEMENT en JSON valide.');
    const clean = raw.replace(/```json|```/g,'').trim();
    const articles = JSON.parse(clean.slice(clean.indexOf('['), clean.lastIndexOf(']')+1));
    const ic = { positif:'#1a7f5a', negatif:'#cc2f26', neutre:'#8e8e93' };
    const ib = { positif:'#e8f8f0', negatif:'#fff0f0', neutre:'#f5f5f5' };
    const el = document.getElementById('favoris-news-content');
    if (el) el.outerHTML = articles.map(a => {
      const url = 'https://www.google.com/search?q=' + encodeURIComponent(a.entreprise + ' actualité bourse 2026');
      return '<div style="background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:10px;border:2px solid #f0f0f0">'
        + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
        + '<span style="background:' + (ib[a.impact]||'#f5f5f5') + ';color:' + (ic[a.impact]||'#8e8e93') + ';font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px">' + a.categorie + '</span>'
        + '<span style="font-size:12px;font-weight:800;color:#1c1c1e">' + a.entreprise + '</span>'
        + '<button onclick="toggleNewsItemFav(\"' + a.ticker + '\",\"' + a.entreprise + '\")" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:16px;color:#f59e0b">★</button>'
        + '</div>'
        + '<div style="font-size:15px;font-weight:700;color:#1c1c1e;margin-bottom:6px">' + a.titre + '</div>'
        + '<div style="font-size:13px;color:#3c3c43;line-height:1.6;margin-bottom:10px">' + a.resume + '</div>'
        + '<div style="display:flex;gap:8px">'
        + '<a href="' + url + '" target="_blank" style="flex:1;background:#f5f5f5;color:#1c1c1e;border-radius:10px;padding:8px;font-size:12px;font-weight:700;text-align:center;text-decoration:none">🔗 Articles</a>'
        + '<button onclick="openDecisionFromPos(\"' + a.ticker + '\",\"garder\")" style="flex:1;background:#1c1c1e;color:#fff;border:none;border-radius:10px;padding:8px;font-size:12px;font-weight:700;cursor:pointer">🤔 Analyser</button>'
        + '</div></div>';
    }).join('');
  } catch(e) {
    const el = document.getElementById('favoris-news-content');
    if (el) el.innerHTML = '<div style="text-align:center;padding:20px;color:#8e8e93">Impossible de charger.<br><button onclick="renderFavorisNews()" style="background:#1c1c1e;color:#fff;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;margin-top:8px">Réessayer</button></div>';
  }
}

function renderNewsList() {
  const list = document.getElementById('news-list');
  if (!list) return;
  let filtered = newsData;
  if (newsFilter === 'favoris') {
    // Si pas de favoris, affiche message
    if (watchlist.length === 0) {
      list.innerHTML = `<div style="text-align:center;padding:30px;color:#8e8e93">
        <div style="font-size:32px;margin-bottom:10px">⭐</div>
        <div style="font-size:15px;font-weight:700;color:#1c1c1e;margin-bottom:6px">Aucun favori</div>
        <div style="font-size:13px">Clique sur l'étoile ☆ sur un signal ou une actu pour ajouter aux favoris.</div>
      </div>`;
      return;
    }
    // Génère des actus IA pour les favoris
    renderFavorisNews();
    return;
  } else if (newsFilter !== 'tous') {
    filtered = newsData.filter(n => n.categorie === newsFilter);
  }

  if (!filtered.length) { list.innerHTML = '<p style="color:#c7c7cc;font-size:14px;padding:20px 0;font-weight:500">Aucune actualité.</p>'; return; }

  const tagCls = { macro:'pill-dark', banque:'pill-amber', marche:'pill-blue', geo:'pill-red', secteur:'pill-green' };
  const tagLbl = { macro:'Macro', banque:'Banque centrale', marche:'Marchés', geo:'Géopolitique', secteur:'Secteurs' };
  const impCls = { 'élevé':'pill-red', 'moyen':'pill-amber', 'faible':'pill-green' };
  const sigCls = { acheter:'signal-buy', attendre:'signal-wait', 'éviter':'signal-avoid', neutre:'signal-neutral' };
  const sigLbl = { acheter:'↑ Opportunité', attendre:'⏸ Attendre', 'éviter':'↓ Éviter', neutre:'→ Neutre' };

  list.innerHTML = filtered.map((n, i) => {
    const pct = suggestedPct(n.signal, profile.risk, profile.horizon);
    const amt = Math.round(profile.bankroll * pct / 100);
    const first = (n.actifs_cibles || [])[0] || '';
    const assets = (n.actifs_cibles || []).map(a => {
      const isFav = isFavorite(a) || positions.find(p => p.name === a);
      return `<span class="pill pill-gray" style="cursor:pointer;${isFav?'background:#f0f0f0;font-weight:800':''}" onclick="openCompany('${a}','${a}','')">${isFav?'★ ':''} ${a}</span>`;
    }).join(' ');
    const oppBtn = n.signal !== 'éviter' ? `<button class="btn-analyse" onclick="openDecision('${first}','${n.signal}')">Analyser →</button>` : '';
    const assetsForStar = n.actifs_cibles || [];
    const firstTicker = assetsForStar[0] || n.titre?.split(' ')[0] || 'news-' + i;
    const starFav = isFavorite(firstTicker);
    const starUniqueId = 'star-news-' + i + '-' + Date.now();
    const starHtml = `<button id="${starUniqueId}" 
      data-fav-ticker="${firstTicker}"
      onclick="event.stopPropagation();toggleNewsItemFav('${firstTicker}','${firstTicker}','${starUniqueId}')" 
      style="background:none;border:none;cursor:pointer;font-size:18px;padding:2px 4px;line-height:1;color:${starFav?'#f59e0b':'rgba(0,0,0,0.15)'};transition:color 0.2s" 
      title="${starFav?'Retirer des favoris':'Ajouter aux favoris'}">${starFav?'★':'☆'}</button>`;
    return `<div class="news-item">
      <div class="news-item-head" onclick="toggleNews(${i})">
        <div class="news-meta" style="display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span class="pill ${tagCls[n.categorie]||'pill-gray'}">${tagLbl[n.categorie]||n.categorie}</span>
            <span class="pill ${impCls[n.impact]||'pill-gray'}">Impact ${n.impact}</span>
            <span class="news-time">${n.heure}</span>
          </div>
          ${starHtml}
        </div>
        <div class="news-title">${n.titre}</div>
        <div class="news-summary">${n.resume}</div>
        <button class="news-expand" id="nexp-${i}">▾ Voir recommandation IA</button>
      </div>
      <div class="news-reco" id="nreco-${i}">
        <div class="${sigCls[n.signal]||'signal-neutral'} signal-badge">${sigLbl[n.signal]||'Neutre'}</div>
        <div class="news-reco-text">${n.reco_texte}</div>
        ${assets ? `<div style="margin-bottom:12px;display:flex;flex-wrap:wrap;gap:6px">${assets}</div>` : ''}
        <div class="opp-strip">
          <div><div class="opp-label">${n.signal==='éviter'?'Pas conseillé':n.signal==='acheter'?'Opportunité':'À surveiller'}</div>
          <div class="opp-sub">${n.signal!=='éviter'?`${pct}% bankroll · ${HL[profile.horizon]}`:'Signal négatif'}</div></div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="opp-amount">${n.signal==='éviter'?'0 €':amt.toLocaleString('fr-FR')+' €'}</div>
            ${oppBtn}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ===== COMPANY DETAIL PAGE =====
async function openCompany(ticker, name, sector) {
  activeCompany = { ticker, name, sector };
  const main = document.getElementById('news-page-content');
  if (!main) return;

  main.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <button class="btn-secondary" style="padding:8px 14px;font-size:13px" onclick="renderNewsPage()">← Retour</button>
      <div style="flex:1">
        <div style="font-size:22px;font-weight:800;color:#1c1c1e;letter-spacing:-0.5px">${name}</div>
        <div style="font-size:13px;color:#8e8e93;font-weight:500">${ticker} · ${sector}</div>
      </div>
      <button class="btn-follow ${isFavorite(ticker)?'following':''}" id="fav-btn-${ticker}" onclick="toggleFavorite('${ticker}','${name}','${sector}');updateFavBtn('${ticker}')">
        ${isFavorite(ticker) ? '★ Suivi' : '☆ Suivre'}
      </button>
    </div>

    <!-- COMPANY METRICS -->
    <div class="metrics-grid" id="company-metrics">
      <div class="metric-card"><div class="metric-label">Chargement prix...</div><div class="metric-val" id="co-price">—</div></div>
      <div class="metric-card"><div class="metric-label">Variation aujourd'hui</div><div class="metric-val" id="co-change">—</div></div>
      <div class="metric-card"><div class="metric-label">Signal IA</div><div class="metric-val" id="co-signal" style="font-size:16px">Analyse...</div></div>
      <div class="metric-card"><div class="metric-label">Dans mon portf.</div><div class="metric-val" id="co-portfolio" style="font-size:16px">${positions.find(p=>p.name===ticker)?'✓ Oui':'—'}</div></div>
    </div>

    <!-- AI ANALYSIS -->
    <div class="card">
      <div class="card-head"><div class="card-title"><div class="card-icon dark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>Analyse IA complète</div></div>
      <div id="co-analysis" style="font-size:14px;color:#8e8e93;font-weight:500">
        <div style="display:flex;align-items:center;gap:10px;color:#8e8e93"><svg class="spinning" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Génération de l'analyse en cours...</div>
      </div>
    </div>

    <!-- COMPANY NEWS -->
    <div class="card">
      <div class="card-head"><div class="card-title"><div class="card-icon dark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg>Actualités récentes — ${name}</div></div>
      <div id="co-news" style="font-size:14px;color:#8e8e93">
        <div style="display:flex;align-items:center;gap:10px;color:#8e8e93"><svg class="spinning" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Chargement des actualités...</div>
      </div>
    </div>
  `;

  // Fetch price and analysis in parallel
  fetchCompanyPrice(ticker);
  generateCompanyAnalysis(ticker, name, sector);
  fetchCompanyNews(ticker, name);
}

function updateFavBtn(ticker) {
  const btn = document.getElementById('fav-btn-' + ticker);
  if (btn) btn.outerHTML = `<button class="btn-follow ${isFavorite(ticker)?'following':''}" id="fav-btn-${ticker}" onclick="toggleFavorite('${ticker}','${activeCompany?.name||ticker}','${activeCompany?.sector||''}');updateFavBtn('${ticker}')">${isFavorite(ticker)?'★ Suivi':'☆ Suivre'}</button>`;
}

async function fetchCompanyPrice(ticker) {
  try {
    const res = await fetch(`/api/prices?symbols=${encodeURIComponent(ticker)}`);
    const data = await res.json();
    const q = data.quotes?.[0];
    if (q) {
      const priceEl = document.getElementById('co-price');
      const changeEl = document.getElementById('co-change');
      if (priceEl) { priceEl.textContent = q.price ? q.price.toFixed(2) + ' €' : '—'; }
      if (changeEl) {
        const chg = q.changePct || 0;
        changeEl.textContent = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
        changeEl.className = 'metric-val ' + (chg >= 0 ? 'green' : 'red');
      }
    }
  } catch { /* skip */ }
}

async function generateCompanyAnalysis(ticker, name, sector) {
  const inPortfolio = positions.find(p => p.name === ticker);
  const portfolioCtx = inPortfolio ? `Je détiens ${inPortfolio.qty} parts à PRU ${inPortfolio.pru}€, prix actuel ${inPortfolio.price}€.` : '';
  const prompt = `Génère une analyse complète et détaillée de ${name} (${ticker}) pour un investisseur débutant prudent.
Profil : ${HL[profile.horizon]}, risque ${RL[profile.risk]}. ${portfolioCtx}
Structure ton analyse en sections claires :
1. **Présentation** — ce que fait l'entreprise en 2-3 phrases simples
2. **Points forts** — 3 raisons d'investir
3. **Points de risque** — 3 risques principaux
4. **Signal** — Acheter / Garder / Éviter avec explication
5. **Verdict** — recommandation finale adaptée au profil débutant prudent
Sois pédagogue, concis et direct. Utilise des termes simples.`;

  const r = await callClaude(prompt);
  const el = document.getElementById('co-analysis');
  if (el) {
    // Format the response nicely
    const formatted = formatMD(r);
    el.innerHTML = `<div style="font-size:13px;color:#3c3c43;line-height:1.7;font-weight:500"><p>${formatted}</p></div>
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-primary" style="font-size:13px;padding:10px 16px" onclick="openDecision('${ticker}','acheter')">Analyser pour investir →</button>
        <button class="btn-secondary" style="font-size:13px;padding:10px 16px" onclick="toggleFavorite('${ticker}','${activeCompany?.name||ticker}','${activeCompany?.sector||''}');updateFavBtn('${ticker}')">${isFavorite(ticker)?'★ Suivi':'☆ Suivre'}</button>
      </div>`;
    // Update signal
    const signalEl = document.getElementById('co-signal');
    if (signalEl) {
      const txt = r.toLowerCase();
      if (txt.includes('acheter') || txt.includes('opportunité')) { signalEl.textContent = '↑ Acheter'; signalEl.className = 'metric-val green'; }
      else if (txt.includes('éviter') || txt.includes('vendre')) { signalEl.textContent = '↓ Éviter'; signalEl.className = 'metric-val red'; }
      else { signalEl.textContent = '→ Garder'; signalEl.className = 'metric-val'; }
    }
  }
}

async function fetchCompanyNews(ticker, name) {
  const prompt = `Recherche les 5 actualités les plus récentes et importantes sur ${name} (ticker: ${ticker}).
Pour chaque actualité retourne UNIQUEMENT un JSON (sans backticks) : [{"titre":"...","resume":"1-2 phrases","impact":"positif|négatif|neutre","heure":"..."}]
UNIQUEMENT le JSON.`;
  const raw = await callClaude(prompt, 'Tu es journaliste financier. Retourne uniquement du JSON valide.');
  try {
    const s = raw.replace(/```json|```/g, '').trim();
    const items = JSON.parse(s.slice(s.indexOf('['), s.lastIndexOf(']') + 1));
    const el = document.getElementById('co-news');
    if (el) {
      el.innerHTML = items.map(item => {
        const color = item.impact === 'positif' ? '#1a7f5a' : item.impact === 'négatif' ? '#cc2f26' : '#8e8e93';
        const bg = item.impact === 'positif' ? '#e8f8f0' : item.impact === 'négatif' ? '#fff0f0' : '#f5f5f5';
        return `<div style="padding:12px 0;border-bottom:1px solid #f5f5f5">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
            <span style="font-size:11px;font-weight:700;padding:2px 9px;border-radius:99px;background:${bg};color:${color}">${item.impact}</span>
            <span style="font-size:11px;color:#c7c7cc;font-weight:500">${item.heure}</span>
          </div>
          <div style="font-size:14px;font-weight:700;color:#1c1c1e;margin-bottom:3px">${item.titre}</div>
          <div style="font-size:13px;color:#8e8e93;line-height:1.4">${item.resume}</div>
        </div>`;
      }).join('');
    }
  } catch {
    const el = document.getElementById('co-news');
    if (el) el.innerHTML = '<p style="color:#c7c7cc;font-size:13px">Actualités non disponibles pour ce ticker.</p>';
  }
}

// ===== SEARCH =====
function searchCompany(query) {
  const clear = document.getElementById('search-clear');
  const drop = document.getElementById('search-results-drop');
  if (!query || query.length < 2) {
    if (drop) drop.style.display = 'none';
    if (clear) clear.style.display = 'none';
    return;
  }
  if (clear) clear.style.display = 'block';
  const q = query.toLowerCase();
  const results = POPULAR.filter(p =>
    p.ticker.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
  ).slice(0, 6);

  // Add custom entry if not found
  if (!results.find(r => r.ticker.toLowerCase() === q)) {
    results.push({ ticker: query.toUpperCase(), name: query.toUpperCase(), sector: 'Recherche personnalisée', custom: true });
  }

  if (drop) {
    drop.style.display = 'block';
    drop.innerHTML = results.map(r => `
      <div class="search-result-item" onclick="openCompany('${r.ticker}','${r.name}','${r.sector}');clearSearch()">
        <div class="sr-avatar">${r.ticker.slice(0,2).toUpperCase()}</div>
        <div>
          <div class="sr-name">${r.name}</div>
          <div class="sr-ticker">${r.ticker} · ${r.sector}</div>
        </div>
        <button class="btn-follow sm ${isFavorite(r.ticker)?'following':''}" onclick="event.stopPropagation();toggleFavorite('${r.ticker}','${r.name}','${r.sector}')" style="margin-left:auto">
          ${isFavorite(r.ticker) ? '★' : '☆'}
        </button>
      </div>`).join('');
  }
}

function clearSearch() {
  const inp = document.getElementById('company-search');
  const drop = document.getElementById('search-results-drop');
  const clear = document.getElementById('search-clear');
  if (inp) inp.value = '';
  if (drop) drop.style.display = 'none';
  if (clear) clear.style.display = 'none';
}

// Close search on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) {
    const drop = document.getElementById('search-results-drop');
    if (drop) drop.style.display = 'none';
  }
});


// Auto-init if page loads on news section
window.addEventListener('load', () => {
  // Make sure functions are available globally
  window.renderNewsPage = renderNewsPage;
  window.openCompany = openCompany;
  window.toggleFavorite = toggleFavorite;
  window.searchCompany = searchCompany;
  window.clearSearch = clearSearch;
  window.setNewsFilter = setNewsFilter;
  window.renderNewsList = renderNewsList;
});


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
  // Si objectif chargé depuis Supabase, prêt à afficher au clic sur Objectif
  if (objChartCapital && objChartTarget) {
    try { localStorage.setItem('iq_validated_objective', JSON.stringify({
      capital: objChartCapital, monthly: objChartMonthly, target: objChartTarget,
      years: objChartYears, rate: objChartRate, risk: objRisk,
      validatedAt: new Date().toISOString()
    })); } catch {}
  }
  setTimeout(() => { checkPriceAlerts(); checkAndGenerateNotifications(); }, 2000);
  setTimeout(() => showOnboarding(), 500);
  startSmartRefresh();
  setTimeout(() => { refreshPrices(); }, 2000);
  setTimeout(() => showPriceTicker(), 1000); // show immediately from stored prices
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
    {id:'d1',name:'IWDA.L',qty:15,pru:87.5,price:94.2,type:'ETF',sector:'Monde',platform:'Trade Republic',alert_price:80},
    {id:'d2',name:'VWCE.DE',qty:8,pru:110,price:118.5,type:'ETF',sector:'Monde',platform:'Trade Republic',alert_price:null},
    {id:'d3',name:'LVMH',qty:2,pru:730,price:685,type:'Action',sector:'Luxe',platform:'XTB',alert_price:650},
    {id:'d4',name:'Air Liquide',qty:5,pru:162,price:179,type:'Action',sector:'Industrie',platform:'XTB',alert_price:null},
  ];
  nav('home');
  // Reset et affiche l'onboarding depuis l'étape 1
  obGoals = { long: false, court: false };
  obNext(1);
  document.getElementById('onboarding-modal').style.display = 'flex';
}

function showAuthScreen(tab) {
  currentUser = null; isDemo = false; positions = []; posSignals = {}; chatHistory = [];
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('demo-banner').style.display = 'none';
  if (tab === 'signup') setTimeout(() => switchAuth('signup'), 50);
}

// ===== AUTH =====
async function resetPassword() {
  const email = document.getElementById('login-email')?.value?.trim();
  if (!email) {
    setAuthMsg('Entre ton email puis clique Mot de passe oublié', false);
    document.getElementById('login-email')?.focus();
    return;
  }
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://investiq-kappa.vercel.app'
    });
    if (error) throw error;
    setAuthMsg('📧 Email de réinitialisation envoyé !', true);
  } catch(e) {
    setAuthMsg('Erreur : ' + (e.message || 'Réessaie'), false);
  }
}

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
  const { data } = await sb.from('objectives').select('*').eq('user_id',currentUser.id).maybeSingle();
  console.log('[loadObjective] data=', JSON.stringify(data));
  if (data) {
    objective = { target:data.target, years:data.years, rate:data.rate, monthly:data.monthly };
    if (data.target) applyObjData(data);
    try { localStorage.setItem('iq_validated_objective', JSON.stringify({
      capital: data.capital || 0, monthly: data.monthly, target: data.target,
      years: data.years, rate: data.rate, risk: data.risk || 'equilibre',
      validatedAt: data.validated_at || new Date().toISOString()
    })); } catch {}
  }
}


// ===== LIVE PRICES =====
async function refreshPrices() {
  if (!positions.length) return;
  const btn = document.getElementById('refresh-prices-btn');
  const ico = document.getElementById('refresh-prices-ico');
  if (btn) btn.disabled = true;
  if (ico) ico.classList.add('spinning');
  try {
    const tickers = positions.map(p => p.name).join(',');
    const res = await fetch('/api/prices?symbols=' + encodeURIComponent(tickers));
    if (!res.ok) throw new Error('API error ' + res.status);
    const data = await res.json();
    const quotes = data.quotes || [];
    let updated = 0;
    for (const q of quotes) {
      if (!q.price || q.price <= 0) continue;
      // Match by symbol (case insensitive)
      // Match by symbol or by known name->ticker mapping
      const nameMap = {
        'LVMH': 'MC.PA', 'Air Liquide': 'AI.PA', 'TotalEnergies': 'TTE.PA',
        'BNP Paribas': 'BNP.PA', 'Veolia Environnement': 'VIE.PA',
        'Porsche Automobil Holding': 'PAH3.DE', 'LOreal': 'OR.PA'
      };
      const pos = positions.find(p => {
        const sym = (q.symbol||'').toUpperCase();
        const posName = p.name.toUpperCase();
        const mapped = (nameMap[p.name]||'').toUpperCase();
        return posName === sym || mapped === sym || 
               posName === sym.replace('.PA','') || posName === sym.replace('.DE','');
      });
      if (pos) {
        pos.price = parseFloat(q.price);
        const newChg = parseFloat(q.changePct);
        if (!isNaN(newChg) && newChg !== 0) {
          pos.change_pct = newChg;
          // Also update grouped positions with same name
          positions.filter(p => p.name === pos.name).forEach(p => { p.change_pct = newChg; p.price = pos.price; });
        }
        else if (pos.change_pct === undefined) pos.change_pct = 0;
        if (!isDemo) {
          sb.from('positions').update({ price: pos.price }).eq('id', pos.id).then(()=>{});
        }
        updated++;
      }
    }
    console.log('Prix mis à jour:', updated, 'positions sur', positions.length);
    renderPortfolio();
    renderHome();
    setTimeout(() => showPriceTicker(), 100);
    showToast('✓ ' + updated + ' prix mis à jour');
    // Refresh bloomberg ticker with latest prices
    const strip = document.getElementById('bloomberg-strip');
    if (strip) {
      const seen = new Set();
      const myTickers = positions.filter(p=>{ if(seen.has(p.name)) return false; seen.add(p.name); return true; })
        .map(p => ({ ticker: p.name, name: p.name, inPortfolio: true }));
      const wlItems = watchlist.map(w => ({ ticker: w.ticker, name: w.name||w.ticker, inPortfolio: false }));
      const allT = [...myTickers, ...wlItems.filter(w => !myTickers.find(m => m.ticker === w.ticker))];
      strip.innerHTML = buildBloombergTicker(allT);
    }
  } catch(e) {
    // Market may be closed - keep last known prices and ticker
    showPriceTicker(); // show last known
    showToast('Marché fermé — derniers prix connus affichés');
  } finally {
    if (btn) btn.disabled = false;
    if (ico) ico.classList.remove('spinning');
  }
}




let tickerInterval = null;
let tickerIndex = 0;

function showPriceTicker() {
  const ticker = document.getElementById('price-ticker');
  if (!ticker || !positions || !positions.length) return;

  const allItems = positions.map(p => {
    const chg = p.change_pct || 0;
    const color = chg >= 0 ? '#1a7f5a' : '#cc2f26';
    const sign = chg >= 0 ? '+' : '';
    return `<span style="font-size:11px;font-weight:700;color:${color};white-space:nowrap">${p.name} ${sign}${chg.toFixed(1)}%</span>`;
  });

  if (allItems.length <= 3) {
    ticker.innerHTML = allItems.join('<span style="color:#c7c7cc;margin:0 5px">·</span>');
    return;
  }

  function showNext() {
    const chunk = [];
    for (let i = 0; i < 3; i++) {
      chunk.push(allItems[(tickerIndex + i) % allItems.length]);
    }
    ticker.style.opacity = '0';
    ticker.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      ticker.innerHTML = chunk.join('<span style="color:#c7c7cc;margin:0 5px">·</span>');
      ticker.style.opacity = '1';
    }, 300);
    tickerIndex = (tickerIndex + 3) % allItems.length;
  }

  showNext();
  if (tickerInterval) clearInterval(tickerInterval);
  tickerInterval = setInterval(showNext, 3000);
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
  if (sec) { animatePageIn('sec-'+page); }
  if (btn) btn.classList.add('active');
  closeSidebar();
  const renders = { home:renderHome, portfolio:renderPortfolio, sante:renderSante, objectif: async ()=>{ const alreadyLoaded = objChartCapital > 0 && objChartTarget > 0 && objChartTarget !== 100000; const hasValidated = alreadyLoaded || await loadValidatedObjectif(); if(hasValidated && document.getElementById('obj-results')?.style.display !== 'block') { showValidatedChart(); } else if(document.getElementById('obj-results')?.style.display === 'block') { setTimeout(()=>buildObjChart(objChartCapital,objChartMonthly,objChartTarget,objChartYears,objChartRate),100); } }, crise:renderCrise, dca:updateDCA, news:()=>{ if(typeof renderNewsPage==='function'){loadWatchlist();renderNewsPage();}else{if(!loadNewsCache())loadNews(false);else renderNewsList();} } };
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
  const newNotifs = [];

  // ── 1. ALERTES PRIX (déjà existant, gardé ici) ──
  positions.forEach(p => {
    if (p.alert_price && p.price <= p.alert_price) {
      newNotifs.push({ titre:`⚠️ Alerte prix — ${p.name}`, texte:`${p.name} est à ${fmt(p.price)}€, sous ton seuil de ${fmt(p.alert_price)}€.`, action:`Voir ${p.name}`, impact:'high', heure:'Maintenant', type:'prix' });
    }
  });

  // ── 2. RÉÉQUILIBRAGE ──
  const tv = positions.reduce((a,p)=>a+p.qty*p.price,0);
  if (tv > 0) {
    const etfs = positions.filter(p=>p.type==='ETF');
    const etfVal = etfs.reduce((a,p)=>a+p.qty*p.price,0);
    const etfPct = etfVal/tv*100;
    // Si ETF > 80% ou < 50% d'un portefeuille mixte avec actions
    const hasActions = positions.some(p=>p.type==='Action'||p.type==='action');
    if (hasActions && etfPct > 80) {
      newNotifs.push({ titre:'⚖️ Rééquilibrage conseillé', texte:`Tes ETF représentent ${etfPct.toFixed(0)}% du portefeuille. Tu pourrais réduire légèrement pour garder un bon équilibre.`, action:'Voir Santé du portefeuille', impact:'medium', heure:'Analyse', type:'reequilibrage' });
    } else if (hasActions && etfPct < 40) {
      newNotifs.push({ titre:'⚖️ Trop concentré en actions', texte:`Tes ETF ne représentent que ${etfPct.toFixed(0)}% — tu prends plus de risque que nécessaire. Pense à renforcer tes ETF.`, action:'Aide à la décision', impact:'medium', heure:'Analyse', type:'reequilibrage' });
    }
    // Position trop dominante (>40% du portefeuille)
    positions.forEach(p => {
      const pct = p.qty*p.price/tv*100;
      if (pct > 40 && positions.length > 2) {
        newNotifs.push({ titre:`📊 ${p.name} trop dominant`, texte:`${p.name} représente ${pct.toFixed(0)}% de ton portefeuille. Une forte concentration augmente ton risque.`, action:`Analyser ${p.name}`, impact:'medium', heure:'Analyse', type:'concentration' });
      }
    });
  }

  // ── 3. MARCHÉ EN BAISSE — opportunité DCA ──
  const avgChange = positions.length ? positions.reduce((a,p)=>a+(p.change_pct||0),0)/positions.length : 0;
  if (avgChange < -3) {
    newNotifs.push({ titre:'📉 Marché en baisse — opportunité !', texte:`Ton portefeuille baisse de ${Math.abs(avgChange).toFixed(1)}% aujourd'hui. Historiquement, c'est le bon moment pour renforcer en DCA, pas pour vendre.`, action:'Simulateur DCA', impact:'medium', heure:"Aujourd'hui", type:'marche' });
  } else if (avgChange < -1.5) {
    newNotifs.push({ titre:'📊 Légère baisse du marché', texte:`Baisse de ${Math.abs(avgChange).toFixed(1)}% aujourd'hui — reste calme, c'est normal. Ton horizon long terme est ton meilleur allié.`, action:'Voir Objectif', impact:'low', heure:"Aujourd'hui", type:'marche' });
  }

  // ── 4. OBJECTIF EN DANGER ──
  if (objChartTarget && objChartTarget > 0 && tv > 0) {
    const pct = tv / objChartTarget * 100;
    if (pct < 10 && objChartYears <= 5) {
      newNotifs.push({ titre:'🎯 Objectif en danger', texte:`Tu as atteint ${pct.toFixed(1)}% de ton objectif de ${fmtK(objChartTarget)} avec ${objChartYears} ans devant toi. Augmente tes versements mensuels.`, action:'Voir Objectif', impact:'high', heure:'Analyse', type:'objectif' });
    } else if (pct < 20 && objChartYears <= 3) {
      newNotifs.push({ titre:'⚡ Accélère vers ton objectif', texte:`${pct.toFixed(1)}% de l'objectif atteint. Il te reste ${objChartYears} ans — le moment d'intensifier les versements.`, action:'Simulateur DCA', impact:'medium', heure:'Analyse', type:'objectif' });
    }
  }

  // ── 5. ANNIVERSAIRE INVESTISSEUR ──
  if (positions.length > 0) {
    const oldest = positions.reduce((min, p) => {
      const d = new Date(p.created_at || Date.now());
      return d < min ? d : min;
    }, new Date());
    const daysSince = Math.floor((Date.now() - oldest) / 86400000);
    if (daysSince === 365 || daysSince === 730 || daysSince === 180) {
      const label = daysSince >= 365 ? `${Math.floor(daysSince/365)} an${daysSince>=730?'s':''}` : '6 mois';
      const gain = tv - positions.reduce((a,p)=>a+p.qty*p.pru,0);
      newNotifs.push({ titre:`🎉 ${label} d'investissement !`, texte:`Ça fait ${label} que tu investis ! Plus-value actuelle : ${gain>=0?'+':''}${fmtK(gain)}. Continue comme ça !`, action:'Voir Portefeuille', impact:'low', heure:'Anniversaire', type:'anniversaire' });
    }
  }

  // ── 6. INACTIVITÉ (pas de position récente) ──
  if (profile.bankroll > 0 && positions.length > 0) {
    const lastAdded = positions.reduce((max, p) => {
      const d = new Date(p.created_at || 0);
      return d > max ? d : max;
    }, new Date(0));
    const daysSinceLast = Math.floor((Date.now() - lastAdded) / 86400000);
    if (daysSinceLast > 60 && objChartMonthly > 0) {
      newNotifs.push({ titre:'📅 Rappel versement mensuel', texte:`Ça fait ${daysSinceLast} jours sans nouvel investissement. Pense à placer tes ${objChartMonthly}€/mois pour profiter des intérêts composés.`, action:'Ajouter une position', impact:'medium', heure:`Il y a ${daysSinceLast} jours`, type:'inactivite' });
    }
  }

  // Déduplique par type (garde seulement 1 par type)
  const seen = new Set();
  const deduped = newNotifs.filter(n => {
    if (seen.has(n.type)) return false;
    seen.add(n.type);
    return true;
  });

  notifications = [...deduped, ...notifications.filter(n => n.type === 'prix')].slice(0, 10);
  renderNotifications();

  const hasHigh = notifications.find(n=>n.impact==='high');
  if (notifications.length > 0) document.getElementById('notif-dot').classList.add('show');
  if (hasHigh && 'Notification' in window && Notification.permission==='granted') {
    new Notification('InvestIQ — Alerte importante', { body: hasHigh.texte, icon:'/icons/icon-192.png' });
  }
}
const NOTIF_NAV = {
  'Voir Portefeuille': 'portfolio',
  'Voir Santé du portefeuille': 'sante',
  'Aide à la décision': 'decision',
  'Voir Objectif': 'objectif',
  'Simulateur DCA': 'dca',
  'Ajouter une position': 'ajouter',
};

function renderNotifications() {
  const list = document.getElementById('notif-list');
  if (!notifications.length) {
    list.innerHTML = '<div class="notif-empty" style="padding:20px;text-align:center;color:#8e8e93;font-size:13px">✅ Tout va bien — aucune alerte</div>';
    return;
  }
  const impactBg = { high:'#fff0f0', medium:'#fff9e6', low:'#f5f5f5' };
  const impactBorder = { high:'#cc2f26', medium:'#f59e0b', low:'#e5e5ea' };
  list.innerHTML = notifications.map((n,i) => {
    const page = Object.entries(NOTIF_NAV).find(([k])=>n.action.includes(k.split(' ').pop()));
    const navPage = page ? page[1] : null;
    return `
    <div class="notif-item ${n.impact}" style="background:${impactBg[n.impact]||'#f5f5f5'};border-left:3px solid ${impactBorder[n.impact]||'#e5e5ea'};border-radius:12px;padding:12px 14px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <div style="font-size:13px;font-weight:800;color:#1c1c1e;line-height:1.3">${n.titre}</div>
        <div style="font-size:11px;color:#8e8e93;white-space:nowrap;margin-left:8px">${n.heure}</div>
      </div>
      <div style="font-size:12px;color:#3c3c43;line-height:1.5;margin-bottom:8px">${n.texte}</div>
      <button onclick="closeNotifPanel();${navPage?`nav('${navPage}')`:''}" 
              style="background:#1c1c1e;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer">
        → ${n.action}
      </button>
    </div>`;
  }).join('');
}

// ===== HOME =====
async function renderHome() {
  const h = new Date().getHours();
  const greet = h<12?'Bonjour':h<18?'Bon après-midi':'Bonsoir';
  const name = isDemo?'Toi':(currentUser?.email||'').split('@')[0];
  const tv = positions.reduce((a,p)=>a+p.qty*p.price,0);
  const ti = positions.reduce((a,p)=>a+p.qty*p.pru,0);
  const tpnl = tv-ti, tpct = ti?tpnl/ti*100:0;
  const avgChange = positions.length ? positions.reduce((a,p)=>a+(p.change_pct||0),0)/positions.length : 0;
  const {score} = calcScore();
  const scoreColor = score>=7?'#1a7f5a':score>=5?'#f59e0b':'#cc2f26';
  const targetVal = objChartTarget > 1000 ? objChartTarget : (objective.target || objChartTarget || 0);
  const pctObj = targetVal > 0 ? Math.min(tv/targetVal*100,100) : 0;

  // Prochain événement agenda important
  const today = new Date().toISOString().split('T')[0];
  const nextEvent = agendaEvents.filter(e => e.date >= today && e.impact === 'high')
    .sort((a,b) => a.date.localeCompare(b.date))[0];

  // Meilleure/pire position du jour
  const sorted = [...positions].sort((a,b)=>(b.change_pct||0)-(a.change_pct||0));
  const best = sorted[0], worst = sorted[sorted.length-1];

  document.getElementById('home-greeting').textContent = greet+' '+name+' !';

  // MÉTRIQUES PRINCIPALES
  document.getElementById('home-metrics').innerHTML=`
    <div class="metric-card" onclick="nav('portfolio')" style="cursor:pointer">
      <div class="metric-label">Valeur totale</div>
      <div class="metric-val">${fmtK(tv)}</div>
      <div class="metric-trend" style="color:${avgChange>=0?'#1a7f5a':'#cc2f26'}">${avgChange>=0?'↑':'↓'} ${Math.abs(avgChange).toFixed(1)}% auj.</div>
    </div>
    <div class="metric-card" onclick="nav('portfolio')" style="cursor:pointer">
      <div class="metric-label">Plus-value</div>
      <div class="metric-val ${tpnl>=0?'green':'red'}">${tpnl>=0?'+':''}${fmtK(tpnl)}</div>
      <div class="metric-trend" style="color:${tpnl>=0?'#1a7f5a':'#cc2f26'}">${tpnl>=0?'+':''}${tpct.toFixed(1)}% total</div>
    </div>
    <div class="metric-card" onclick="nav('sante')" style="cursor:pointer">
      <div class="metric-label">Santé</div>
      <div class="metric-val" style="color:${scoreColor}">${score.toFixed(1)}/10</div>
      <div class="metric-trend">Score portefeuille</div>
    </div>
    <div class="metric-card" onclick="nav('objectif')" style="cursor:pointer">
      <div class="metric-label">Objectif</div>
      <div class="metric-val">${pctObj.toFixed(1)}%</div>
      <div class="metric-trend">${fmtK(tv)} / ${fmtK(targetVal)}</div>
    </div>`;

  // RÉSUMÉ DU JOUR
  let dayHtml = '';

  // Performance du jour
  if (positions.length) {
    dayHtml += `
    <div style="background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:10px;border:2px solid #f0f0f0">
      <div style="font-size:12px;font-weight:700;color:#8e8e93;text-transform:uppercase;margin-bottom:10px">📊 Performance du jour</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${best ? `<div style="background:#e8f8f0;border-radius:10px;padding:10px 12px">
          <div style="font-size:10px;color:#1a7f5a;font-weight:700;margin-bottom:2px">🏆 MEILLEURE</div>
          <div style="font-size:14px;font-weight:800;color:#1c1c1e">${best.name}</div>
          <div style="font-size:13px;color:#1a7f5a;font-weight:700">+${(best.change_pct||0).toFixed(2)}%</div>
        </div>` : ''}
        ${worst && worst !== best ? `<div style="background:#fff0f0;border-radius:10px;padding:10px 12px">
          <div style="font-size:10px;color:#cc2f26;font-weight:700;margin-bottom:2px">📉 PLUS FAIBLE</div>
          <div style="font-size:14px;font-weight:800;color:#1c1c1e">${worst.name}</div>
          <div style="font-size:13px;color:#cc2f26;font-weight:700">${(worst.change_pct||0).toFixed(2)}%</div>
        </div>` : ''}
      </div>
    </div>`;
  }

  // Prochain événement agenda
  if (nextEvent) {
    const evtDate = new Date(nextEvent.date);
    const isToday = nextEvent.date === today;
    const isTomorrow = nextEvent.date === new Date(Date.now()+86400000).toISOString().split('T')[0];
    const quand = isToday ? "Aujourd'hui" : isTomorrow ? 'Demain' : evtDate.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
    dayHtml += `
    <div style="background:#fff0f0;border-radius:14px;padding:14px 16px;margin-bottom:10px;border-left:4px solid #cc2f26;cursor:pointer" onclick="setNewsFilter('agenda',document.getElementById('news-fil-agenda'));nav('news')">
      <div style="font-size:12px;font-weight:700;color:#cc2f26;text-transform:uppercase;margin-bottom:6px">⚡ PROCHAIN ÉVÉNEMENT FORT</div>
      <div style="font-size:15px;font-weight:800;color:#1c1c1e">${nextEvent.titre}</div>
      <div style="font-size:13px;color:#555;margin-top:4px">📅 ${quand} à ${nextEvent.heure} · ${nextEvent.pays}</div>
      <div style="font-size:12px;color:#cc2f26;font-weight:600;margin-top:6px">Voir dans l'agenda →</div>
    </div>`;
  }

  // Progression objectif
  if (targetVal > 0) {
    const yearsLeft = objChartYears - (tv > 0 ? Math.log(tv/objChartCapital||1)/Math.log(1.07) : 0);
    dayHtml += `
    <div style="background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:10px;border:2px solid #f0f0f0;cursor:pointer" onclick="nav('objectif')">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:12px;font-weight:700;color:#8e8e93;text-transform:uppercase">🎯 Mon objectif</div>
        <div style="font-size:13px;font-weight:800;color:#1c1c1e">${fmtK(tv)} / ${fmtK(objChartTarget)}</div>
      </div>
      <div style="background:#f0f0f0;border-radius:6px;height:8px;overflow:hidden;margin-bottom:6px">
        <div style="height:100%;background:linear-gradient(90deg,#1a7f5a,#4ade80);width:${pctObj}%;border-radius:6px;transition:width 0.5s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#8e8e93">
        <span>${pctObj.toFixed(1)}% atteint</span>
        <span>Reste : ${fmtK(Math.max(targetVal-tv,0))}</span>
      </div>
    </div>`;
  }

  // Alertes rapides
  const alerts = buildAlertsData();
  if (alerts.filter(a=>a.type==='err').length > 0) {
    dayHtml += `
    <div style="background:#fff0f0;border-radius:14px;padding:14px 16px;margin-bottom:10px;border-left:4px solid #cc2f26">
      <div style="font-size:12px;font-weight:700;color:#cc2f26;text-transform:uppercase;margin-bottom:8px">⚠️ Alertes</div>
      ${alerts.filter(a=>a.type==='err').map(a=>`<div style="font-size:13px;color:#1c1c1e;margin-bottom:4px">${a.msg}</div>`).join('')}
    </div>`;
  }

  // Actions rapides si portefeuille vide
  if (!positions.length) {
    dayHtml = `
    <div style="background:#f9f9f9;border-radius:14px;padding:24px;text-align:center;margin-bottom:10px">
      <div style="font-size:32px;margin-bottom:12px">📈</div>
      <div style="font-size:16px;font-weight:800;color:#1c1c1e;margin-bottom:6px">Commence ton investissement</div>
      <div style="font-size:13px;color:#8e8e93;margin-bottom:16px">Suis ton portefeuille et reçois des conseils personnalisés</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button onclick="nav('ajouter')" style="background:#1c1c1e;color:#fff;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:700;cursor:pointer">➕ Ajouter ma première position</button>
        <button onclick="nav('objectif')" style="background:#f0f0f0;color:#1c1c1e;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:700;cursor:pointer">🎯 Définir mon objectif</button>
        <button onclick="nav('news')" style="background:#f0f0f0;color:#1c1c1e;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:700;cursor:pointer">📰 Explorer les marchés</button>
      </div>
    </div>`;
  }

  document.getElementById('home-score').innerHTML = dayHtml;
  document.getElementById('home-alerts').innerHTML = '';
  document.getElementById('home-obj').innerHTML = '';
  renderPlatforms();
}

function buildAlertsData() {
  const tv=positions.reduce((a,p)=>a+p.qty*p.price,0);
  if (!tv) return [];
  let alerts=[];
  positions.forEach(p=>{
    const w=p.qty*p.price/tv*100;
    if(w>40) alerts.push({type:'err',msg:`⚡ <strong>${p.name}</strong> = ${w.toFixed(0)}% — concentration excessive`});
    else if(w>25) alerts.push({type:'warn',msg:`<strong>${p.name}</strong> = ${w.toFixed(0)}% — surveille`});
    if(p.alert_price&&p.price<=p.alert_price) alerts.push({type:'err',msg:`🔔 <strong>${p.name}</strong> sous ton alerte ${fmt(p.alert_price)}€`});
  });
  const etfPct=positions.filter(p=>p.type==='ETF').reduce((a,p)=>a+p.qty*p.price,0)/tv*100;
  if(etfPct<30) alerts.push({type:'warn',msg:`Seulement ${etfPct.toFixed(0)}% d'ETF — vise 60–80%`});
  if(!alerts.length) alerts.push({type:'ok',msg:'✅ Portefeuille bien équilibré'});
  return alerts;
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

  // Groupe les positions par ticker
  const grouped = {};
  positions.forEach(p => {
    if (!grouped[p.name]) {
      grouped[p.name] = { ...p, _ids: [p.id], _lines: [p] };
    } else {
      const g = grouped[p.name];
      const totalQty = g.qty + p.qty;
      // PRU moyen pondéré
      g.pru = (g.qty * g.pru + p.qty * p.pru) / totalQty;
      g.qty = totalQty;
      g.price = p.price; // même prix live
      g.change_pct = p.change_pct;
      g.alert_price = g.alert_price || p.alert_price;
      g._ids.push(p.id);
      g._lines.push(p);
    }
  });
  const grouped_arr = Object.values(grouped);

  grid.innerHTML=grouped_arr.map((p,idx)=>{
    const val=p.qty*p.price,inv=p.qty*p.pru,pnl=val-inv,pct=inv?pnl/inv*100:0;
    const sig=posSignals[p.id] || posSignals[p._ids[0]];
    const sigHtml=sig?`<span class="signal-badge-large ${sig.action==='acheter'?'sig-buy':sig.action==='vendre'?'sig-sell':'sig-hold'}">${sig.action==='acheter'?'↑ Renforcer':sig.action==='vendre'?'↓ Alléger':'→ Garder'}</span>`:`<span class="signal-badge-large sig-loading">Analyse...</span>`;
    // Mini badge visible sur la carte sans cliquer
    const miniSigColor = sig ? (sig.action==='acheter'?'#1a7f5a':sig.action==='vendre'?'#cc2f26':'#f59e0b') : '#8e8e93';
    const miniSigLabel = sig ? (sig.action==='acheter'?'↑ Renforcer':sig.action==='vendre'?'↓ Vendre':'→ Garder') : '···';
    const miniSigBadge = `<span style="background:${miniSigColor}15;color:${miniSigColor};font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;margin-left:6px">${miniSigLabel}</span>`;
    const chgHtml=p.change_pct!==undefined?`<span style="font-size:12px;color:${p.change_pct>=0?'#1a7f5a':'#ff3b30'};font-weight:700">${p.change_pct>=0?'+':''}${p.change_pct?.toFixed(1)}% auj.</span>`:'';
    const alertHtml=p.alert_price?`<span style="font-size:11px;color:#8e8e93;font-weight:600">🔔 Alerte: ${fmt(p.alert_price)}€</span>`:'';
    const multiHtml=p._ids.length>1?`<span style="font-size:11px;color:#8e8e93;font-weight:600">📦 ${p._ids.length} lignes · PRU moy. ${fmt(p.pru)}€</span>`:'';
    const idsJson=JSON.stringify(p._ids).replace(/"/g,"'");
    return`<div class="pos-card">
      <div class="pos-card-head" onclick="togglePosSignal('${p._ids[0]}')">
        <div class="pos-card-left">
          <div class="pos-avatar" style="background:${COLORS[idx%COLORS.length]}">${p.name.slice(0,2).toUpperCase()}</div>
          <div>
            <div class="pos-name">${p.name} ${chgHtml}${miniSigBadge}</div>
            <div class="pos-meta">${p.type} · ${p.qty} parts · ${p.platform||''} ${alertHtml}</div>
            ${multiHtml}
          </div>
        </div>
        <div class="pos-card-right">
          <div class="pos-val">${fmt(val)} €</div>
          <div class="pos-pnl ${pnl>=0?'green':'red'}">${pnl>=0?'+':''}${pct.toFixed(1)}% (${pnl>=0?'+':''}${fmt(pnl)}€)</div>
        </div>
      </div>
      <div class="pos-signal-row" id="sig-${p._ids[0]}">
        <div class="pos-signal-content">
          <div class="signal-header"><div style="font-size:12px;color:#8e8e93;font-weight:700">Signal IA</div>${sigHtml}</div>
          <div class="perf-bar-wrap">
            <div class="perf-bar-label"><span>PRU moy. : ${fmt(p.pru)}€</span><span>Actuel : ${fmt(p.price)}€</span></div>
            <div class="perf-bar-bg"><div class="perf-bar-fill" style="width:${Math.min(Math.abs(pct)/30*100,100)}%;background:${pnl>=0?'#1a7f5a':'#ff3b30'}"></div></div>
          </div>
          ${sig ? `
          <div style="margin-top:10px;background:#f9f9f9;border-radius:12px;padding:12px 14px">
            <div style="font-size:13px;color:#1c1c1e;font-weight:600;margin-bottom:8px">${sig.texte}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr${sig.prix_cible > 0 ? ' 1fr 1fr' : ''};gap:8px;margin-bottom:8px">
              <div style="background:#fff;border-radius:8px;padding:8px 10px;text-align:center">
                <div style="font-size:10px;color:#8e8e93;font-weight:700;text-transform:uppercase">Timing</div>
                <div style="font-size:12px;font-weight:800;color:#1c1c1e;margin-top:2px">${sig.timing || '—'}</div>
              </div>
              <div style="background:#fff;border-radius:8px;padding:8px 10px;text-align:center">
                <div style="font-size:10px;color:#8e8e93;font-weight:700;text-transform:uppercase">Horizon</div>
                <div style="font-size:12px;font-weight:800;color:#1c1c1e;margin-top:2px">${sig.horizon_signal || '—'}</div>
              </div>
              ${sig.prix_cible > 0 ? `
              <div style="background:#e8f8f0;border-radius:8px;padding:8px 10px;text-align:center">
                <div style="font-size:10px;color:#1a7f5a;font-weight:700;text-transform:uppercase">Objectif
                  <span title="Prix cible estimé — bon moment de vendre une partie si atteint" style="display:inline-block;width:12px;height:12px;background:#1a7f5a20;color:#1a7f5a;border-radius:50%;font-size:8px;font-weight:800;line-height:12px;text-align:center;cursor:help;margin-left:2px">?</span>
                </div>
                <div style="font-size:12px;font-weight:800;color:#1a7f5a;margin-top:2px">${fmt(sig.prix_cible)}€</div>
              </div>
              <div style="background:#fff0f0;border-radius:8px;padding:8px 10px;text-align:center">
                <div style="font-size:10px;color:#cc2f26;font-weight:700;text-transform:uppercase">Stop loss
                  <span title="Si l'action descend à ce prix, vends pour limiter tes pertes" style="display:inline-block;width:12px;height:12px;background:#cc2f2620;color:#cc2f26;border-radius:50%;font-size:8px;font-weight:800;line-height:12px;text-align:center;cursor:help;margin-left:2px">?</span>
                </div>
                <div style="font-size:12px;font-weight:800;color:#cc2f26;margin-top:2px">${fmt(sig.stop_loss)}€</div>
              </div>` : ''}
            </div>
            ${sig.catalyseurs?.length ? `<div style="margin-bottom:6px">
              <div style="font-size:10px;color:#8e8e93;font-weight:700;text-transform:uppercase;margin-bottom:3px">✅ Catalyseurs</div>
              ${sig.catalyseurs.map(c=>`<div style="font-size:11px;color:#1a7f5a;margin-bottom:2px">• ${c}</div>`).join('')}
            </div>` : ''}
            ${sig.risques?.length ? `<div>
              <div style="font-size:10px;color:#8e8e93;font-weight:700;text-transform:uppercase;margin-bottom:3px">⚠ Risques</div>
              ${sig.risques.map(r=>`<div style="font-size:11px;color:#cc2f26;margin-bottom:2px">• ${r}</div>`).join('')}
            </div>` : ''}
          </div>` : ''}
          <div class="pos-actions">
            <button class="btn-sm buy" onclick="openDecisionFromPos('${p.name}','acheter')">💰 Acheter plus</button>
            <button class="btn-sm" onclick="openDecisionFromPos('${p.name}','garder')">🤔 Que faire ?</button>
            <button class="btn-sm sell" onclick="openDecisionFromPos('${p.name}','vendre')">📤 Vendre</button>
            ${!isDemo?`<button class="btn-sm" onclick="openEditPos('${p._ids[0]}')">✏ Modifier</button>`:''}
            ${!isDemo?`<button class="btn-del" onclick="delPosGroup(${idsJson})">🗑 Supprimer</button>`:''}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
  if(tv>0) {
    document.getElementById('alloc-bars').innerHTML=grouped_arr.map((p,i)=>{
      const pc=p.qty*p.price/tv*100;
      return`<div class="bar-row"><div class="bar-label"><span>${p.name}</span><span>${pc.toFixed(1)}%</span></div><div class="bar-bg"><div class="bar-fill" style="width:${pc}%;background:${COLORS[i%COLORS.length]}"></div></div></div>`;
    }).join('');
  }
  positions.forEach(p=>{if(!posSignals[p.id])generatePosSignal(p);});
  // Load transactions if visible
  if (document.getElementById('tx-list')) { loadTransactions().then(renderTransactions); }
}

async function generatePosSignal(p) {
  const pnl = (p.price - p.pru) / p.pru * 100;
  const isAction = p.type === 'Action' || p.type === 'action';

  const prompt = `Tu es un analyste financier expert. Analyse cette position pour un investisseur ${RL[profile.risk]}, horizon ${HL[profile.horizon]}.

Position : ${p.name} (${p.type})
PRU : ${p.pru}€ | Prix actuel : ${p.price}€ | Performance : ${pnl.toFixed(1)}%
Quantité : ${p.qty} parts | Valeur totale : ${fmt(p.qty * p.price)}€

${isAction ? `C'est une action individuelle — donne un signal court terme précis avec timing.` : `C'est un ETF — signal long terme, pas de timing court terme.`}

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "action": "acheter" ou "garder" ou "vendre",
  "conviction": "forte" ou "modérée" ou "faible",
  "texte": "Conseil principal en 1 phrase simple",
  ${isAction ? `
  "prix_cible": 0,
  "stop_loss": 0,
  "horizon_signal": "2-4 semaines",
  "timing": "Maintenant" ou "Attendre" ou "Progressif",
  "catalyseurs": ["raison 1", "raison 2"],
  "risques": ["risque 1"]` : `
  "horizon_signal": "Long terme",
  "timing": "DCA régulier",
  "catalyseurs": ["raison long terme"],
  "risques": ["risque principal"]`}
}`;

  try {
    const raw = await callClaude(prompt, 'Tu es un analyste financier. Réponds UNIQUEMENT en JSON valide.');
    const s = raw.replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}')+1));
    posSignals[p.id] = parsed;
  } catch {
    posSignals[p.id] = {
      action: pnl > 5 ? 'garder' : pnl < -15 ? 'vendre' : 'garder',
      conviction: 'modérée',
      texte: pnl < -15 ? 'Perte importante — envisage de couper.' : pnl > 15 ? 'Belle performance — sécurise une partie.' : 'Continue à surveiller cette position.',
      horizon_signal: p.type === 'ETF' ? 'Long terme' : '1-3 mois',
      timing: 'Attendre',
      catalyseurs: ['Analyse en cours'],
      risques: ['Volatilité du marché'],
      prix_cible: 0,
      stop_loss: 0
    };
  }
  saveSignalsCache();
  const sigEl = document.getElementById('sig-'+p.id);
  if (sigEl && sigEl.style.display === 'block') renderPortfolio();
}

function togglePosSignal(id) {
  const el=document.getElementById('sig-'+id);
  if(el) el.style.display=el.style.display==='block'?'none':'block';
}
let decisionIntention = null;
function openDecisionFromPos(name, action) {
  decisionIntention = action;
  nav('decision');
  // Attendre que le DOM soit prêt
  setTimeout(() => {
    const nameEl = document.getElementById('d-name');
    if (nameEl) nameEl.value = name;
    const hEl = document.getElementById('d-horizon');
    if (hEl) hEl.value = profile.horizon;
    const rEl = document.getElementById('d-risk');
    if (rEl) rEl.value = profile.risk;
    updatePct();
    setDecisionIntent(action);
    // Scroll vers le haut
    document.getElementById('sec-decision')?.scrollTo(0,0);
  }, 50);
}

async function addPos() {
  const name = document.getElementById('f-name').value.trim();
  const qty = parseFloat(document.getElementById('f-qty').value);
  const pru = parseFloat(document.getElementById('f-pru').value);
  const price = parseFloat(document.getElementById('f-price').value);
  const alertPrice = parseFloat(document.getElementById('f-alert').value) || null;
  const type = document.getElementById('f-type-hidden')?.value || (acSelected?.type) || 'Action';
  const sector = document.getElementById('f-sector').value || (acSelected?.sector) || '';
  const platform = document.getElementById('f-platform').value || 'Autre';

  // Validation avec messages clairs
  if (!name) { showToast('⚠ Recherche et sélectionne une action'); return; }
  if (isNaN(qty) || qty <= 0) { showToast('⚠ Indique une quantité valide'); return; }
  if (isNaN(pru) || pru <= 0) { showToast('⚠ Indique ton prix de revient (PRU)'); return; }
  if (isNaN(price) || price <= 0) { showToast('⚠ Indique le prix actuel'); return; }

  const pos = { name, qty, pru, price, type, sector, platform, alert_price: alertPrice };

  if (isDemo) {
    positions.push({ id: 'd'+Date.now(), ...pos });
    acClear();
    nav('portfolio');
    showToast('✓ Position ajoutée !');
    return;
  }

  const { data, error } = await sb.from('positions').insert({ ...pos, user_id: currentUser.id }).select().single();
  if (error) { showToast('Erreur: ' + error.message); return; }
  if (data) {
    positions.push(data);
    await addTransaction(name, 'achat', qty, pru, 'Ouverture de position');
    acClear();
    nav('portfolio');
    showToast('✓ ' + name + ' ajouté au portefeuille !');
  }
}
async function delPos(id) {
  if(!confirm('Supprimer cette position ?'))return;
  if(!isDemo)await sb.from('positions').delete().eq('id',id);
  positions=positions.filter(p=>p.id!==id);delete posSignals[id];
  renderPortfolio();renderHome();
}

async function delPosGroup(ids) {
  const msg = ids.length > 1
    ? `Supprimer les ${ids.length} lignes de cette position ?`
    : 'Supprimer cette position ?';
  if(!confirm(msg)) return;
  for (const id of ids) {
    if(!isDemo) await sb.from('positions').delete().eq('id', id);
    positions = positions.filter(p => p.id !== id);
    delete posSignals[id];
  }
  renderPortfolio(); renderHome();
}
async function loadDemo() {
  const demo=[
    {name:'IWDA.L',qty:15,pru:87.5,price:94.2,type:'ETF',sector:'Monde',platform:'Trade Republic',alert_price:80},
    {name:'VWCE.DE',qty:8,pru:110,price:118.5,type:'ETF',sector:'Monde',platform:'Trade Republic',alert_price:null},
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
async function renderSante() {
  const el = document.getElementById('sante-content');
  if (!el) return;

  if (!positions.length) {
    el.innerHTML = `<div style="text-align:center;padding:40px;color:#8e8e93">
      <div style="font-size:40px;margin-bottom:12px">📊</div>
      <div style="font-size:16px;font-weight:700;color:#1c1c1e;margin-bottom:8px">Ajoute des positions</div>
      <div style="font-size:13px">La santé de ton portefeuille s'affichera ici</div>
      <button onclick="nav('ajouter')" style="margin-top:16px;background:#1c1c1e;color:#fff;border:none;border-radius:12px;padding:12px 24px;font-size:14px;font-weight:700;cursor:pointer">➕ Ajouter une position</button>
    </div>`;
    return;
  }

  const tv = positions.reduce((a,p)=>a+p.qty*p.price,0);
  const ti = positions.reduce((a,p)=>a+p.qty*p.pru,0);
  const tpnl = tv-ti, tpct = ti?tpnl/ti*100:0;
  const {score, items} = calcScore();
  const scoreColor = score>=7?'#1a7f5a':score>=5?'#f59e0b':'#cc2f26';
  const scoreBg    = score>=7?'#e8f8f0':score>=5?'#fff9e6':'#fff0f0';
  const scoreLabel = score>=7?'Excellent 💪':score>=5?'Correct 👍':'À améliorer ⚠️';

  // Calculs diversification
  const etfs = positions.filter(p=>p.type==='ETF'||p.type==='etf');
  const actions = positions.filter(p=>p.type==='Action'||p.type==='action');
  const etfPct = tv > 0 ? etfs.reduce((a,p)=>a+p.qty*p.price,0)/tv*100 : 0;
  const grouped = {};
  positions.forEach(p => { grouped[p.name] = (grouped[p.name]||0) + p.qty*p.price; });
  const maxPos = Object.entries(grouped).sort((a,b)=>b[1]-a[1])[0];
  const maxPct = maxPos ? maxPos[1]/tv*100 : 0;
  const platforms = {};
  positions.forEach(p => { platforms[p.platform||'Autre'] = (platforms[p.platform||'Autre']||0) + p.qty*p.price; });

  // Comparaison profil idéal
  const idealEtf = profile.risk==='eleve' ? 50 : profile.risk==='modere' ? 70 : 80;
  const idealMaxPos = profile.risk==='eleve' ? 40 : profile.risk==='modere' ? 30 : 25;
  const idealNbPos = profile.risk==='eleve' ? 5 : profile.risk==='modere' ? 4 : 3;

  el.innerHTML = `
    <!-- SCORE GLOBAL -->
    <div style="background:${scoreBg};border-radius:16px;padding:20px;margin-bottom:12px;border:2px solid ${scoreColor}20">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div>
          <div style="font-size:13px;font-weight:700;color:${scoreColor};text-transform:uppercase;letter-spacing:0.5px">Score de santé</div>
          <div style="font-size:42px;font-weight:900;color:${scoreColor};line-height:1">${score.toFixed(1)}<span style="font-size:20px">/10</span></div>
          <div style="font-size:14px;font-weight:700;color:${scoreColor};margin-top:4px">${scoreLabel}</div>
        </div>
        <div style="width:80px;height:80px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;border:4px solid ${scoreColor}">
          <div style="font-size:28px">${score>=7?'💚':score>=5?'🟡':'🔴'}</div>
        </div>
      </div>
      <!-- Barres des critères -->
      <div style="display:flex;flex-direction:column;gap:10px">
        ${items.map(it => {
          const c = it.score>=7?'#1a7f5a':it.score>=5?'#f59e0b':'#cc2f26';
          return `<div>
            <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:4px">
              <span style="color:#1c1c1e">${it.label}</span>
              <span style="color:${c}">${it.score}/10</span>
            </div>
            <div style="background:rgba(0,0,0,0.08);border-radius:4px;height:6px;overflow:hidden">
              <div style="height:100%;background:${c};width:${it.score/10*100}%;border-radius:4px;transition:width 0.6s"></div>
            </div>
            ${it.tip?`<div style="font-size:11px;color:${c};margin-top:2px">→ ${it.tip}</div>`:''}
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- COMPOSITION -->
    <div style="background:#fff;border-radius:16px;padding:16px;margin-bottom:12px;border:2px solid #f0f0f0">
      <div style="font-size:13px;font-weight:800;color:#1c1c1e;margin-bottom:12px">📊 Composition du portefeuille</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div style="background:#f9f9f9;border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:11px;color:#8e8e93;font-weight:700;margin-bottom:4px">ETF</div>
          <div style="font-size:20px;font-weight:900;color:${etfPct>=idealEtf?'#1a7f5a':'#f59e0b'}">${etfPct.toFixed(0)}%</div>
          <div style="font-size:11px;color:#8e8e93">Idéal : ${idealEtf}%+</div>
        </div>
        <div style="background:#f9f9f9;border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:11px;color:#8e8e93;font-weight:700;margin-bottom:4px">Concentration max</div>
          <div style="font-size:20px;font-weight:900;color:${maxPct<=idealMaxPos?'#1a7f5a':'#cc2f26'}">${maxPct.toFixed(0)}%</div>
          <div style="font-size:11px;color:#8e8e93">${maxPos?maxPos[0]:''} · Max : ${idealMaxPos}%</div>
        </div>
        <div style="background:#f9f9f9;border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:11px;color:#8e8e93;font-weight:700;margin-bottom:4px">Nb. positions</div>
          <div style="font-size:20px;font-weight:900;color:${Object.keys(grouped).length>=idealNbPos?'#1a7f5a':'#f59e0b'}">${Object.keys(grouped).length}</div>
          <div style="font-size:11px;color:#8e8e93">Min conseillé : ${idealNbPos}</div>
        </div>
        <div style="background:#f9f9f9;border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:11px;color:#8e8e93;font-weight:700;margin-bottom:4px">Performance</div>
          <div style="font-size:20px;font-weight:900;color:${tpnl>=0?'#1a7f5a':'#cc2f26'}">${tpnl>=0?'+':''}${tpct.toFixed(1)}%</div>
          <div style="font-size:11px;color:#8e8e93">${tpnl>=0?'+':''}${fmtK(tpnl)}</div>
        </div>
      </div>
      <!-- Répartition par type -->
      ${Object.entries(grouped).map(([name,val]) => `
      <div style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:2px">
          <span>${name}</span><span>${(val/tv*100).toFixed(1)}% · ${fmtK(val)}</span>
        </div>
        <div style="background:#f0f0f0;border-radius:4px;height:6px;overflow:hidden">
          <div style="height:100%;background:#1c1c1e;width:${val/tv*100}%;border-radius:4px"></div>
        </div>
      </div>`).join('')}
    </div>

    <!-- CONSEILS IA -->
    <div style="background:#fff;border-radius:16px;padding:16px;margin-bottom:12px;border:2px solid #f0f0f0">
      <div style="font-size:13px;font-weight:800;color:#1c1c1e;margin-bottom:8px">🧠 Conseils personnalisés</div>
      <div id="sante-ia-conseils" style="text-align:center;padding:16px;color:#8e8e93">
        <div style="font-size:18px;margin-bottom:6px">💬</div>
        <div style="font-size:13px">Génération des conseils...</div>
      </div>
    </div>

    <!-- ALERTES -->
    <div id="sante-alertes-wrap"></div>
  `;

  // Alertes
  const alerts = buildAlertsData();
  const alertsHtml = alerts.filter(a=>a.type!=='ok').map(a => `
    <div style="background:${a.type==='err'?'#fff0f0':'#fff9e6'};border-radius:12px;padding:12px 14px;margin-bottom:8px;border-left:3px solid ${a.type==='err'?'#cc2f26':'#f59e0b'}">
      <div style="font-size:13px;color:#1c1c1e;font-weight:600">${a.msg}</div>
    </div>`).join('');
  const alertsWrap = document.getElementById('sante-alertes-wrap');
  if (alertsWrap && alertsHtml) {
    alertsWrap.innerHTML = `<div style="background:#fff;border-radius:16px;padding:16px;margin-bottom:12px;border:2px solid #f0f0f0">
      <div style="font-size:13px;font-weight:800;color:#1c1c1e;margin-bottom:8px">⚠️ Points d'attention</div>
      ${alertsHtml}
    </div>`;
  }

  // Conseils IA
  try {
    const prompt = `Analyse ce portefeuille et donne 3 conseils courts et actionnables pour un débutant.
Positions : ${Object.entries(grouped).map(([n,v])=>`${n} (${(v/tv*100).toFixed(0)}%)`).join(', ')}.
ETF : ${etfPct.toFixed(0)}%, Actions : ${(100-etfPct).toFixed(0)}%, Performance : ${tpct.toFixed(1)}%.
Profil : ${RL[profile.risk]}, horizon ${HL[profile.horizon]}.
3 conseils max, 1 phrase chacun. PAS de markdown ni de ##. Commence chaque ligne par un emoji.`;
    const conseils = await callClaude(prompt, 'Tu es conseiller financier pédagogue. Sois bref et concret.');
    const conseilEl = document.getElementById('sante-ia-conseils');
    if (conseilEl) {
      const parts = conseils.replace(/#{1,3}\s/g,'').split('\n').filter(l=>l.trim());
      conseilEl.innerHTML = parts.map(l => `<div style="font-size:13px;color:#1c1c1e;padding:8px 10px;background:#f9f9f9;border-radius:10px;margin-bottom:6px;line-height:1.5">${l.replace(/\*\*/g,'').replace(/\*/g,'')}</div>`).join('');
        `<div style="font-size:13px;color:#1c1c1e;padding:8px 10px;background:#f9f9f9;border-radius:10px;margin-bottom:6px;line-height:1.5">${l}</div>`
    }
  } catch(e) {}
}

// ===== OBJECTIF WIZARD =====
let objPlan = null;

function objGo(step) {
  [1,2,3].forEach(i => {
    const s = document.getElementById('obj-s'+i);
    if (s) s.style.display = i===step ? 'block' : 'none';
    const wp = document.getElementById('owp'+i);
    if (wp) {
      wp.classList.toggle('active', i<=step);
      wp.classList.toggle('done', i<step);
    }
  });
  // Étape 1 : pré-remplit le capital avec la valeur du portefeuille
  if (step === 1) {
    const tv = positions.reduce((a,p)=>a+p.qty*p.price, 0);
    const capitalEl = document.getElementById('obj-capital');
    const monthlyEl = document.getElementById('obj-monthly');
    if (capitalEl && tv > 0 && !capitalEl.value) {
      capitalEl.value = Math.round(tv);
    }
    if (monthlyEl && objChartMonthly > 0 && !monthlyEl.value) {
      monthlyEl.value = objChartMonthly;
    }
    // Affiche un message informatif
    const hint = document.getElementById('obj-capital-hint');
    if (hint && tv > 0) {
      hint.textContent = `💡 Pré-rempli avec ton portefeuille actuel (${fmtK(tv)})`;
      hint.style.display = 'block';
    }
  }
}

function selectRisk(risk) {
  objRisk = risk;
  document.querySelectorAll('.risk-card').forEach(c => c.classList.remove('active'));
  document.getElementById('risk-' + risk)?.classList.add('active');
}

function toggleObjDetail() {
  const wrap = document.getElementById('obj-detail-wrap');
  const btn = document.getElementById('obj-detail-btn');
  if (!wrap) return;
  const open = wrap.style.display === 'block';
  wrap.style.display = open ? 'none' : 'block';
  btn.textContent = open ? '▾ Voir la projection détaillée' : '▴ Masquer la projection';
}

function resetObj() {
  // Reset les variables pour forcer le wizard
  objChartTarget = 0;
  objChartCapital = 0;
  document.getElementById('obj-results').style.display = 'none';
  document.getElementById('obj-wizard').style.display = 'block';
  const el = document.getElementById('obj-ai-simple');
  if (el) el.innerHTML = '';
  // Efface aussi le cache localStorage pour éviter rechargement auto
  try { localStorage.removeItem('iq_validated_objective'); } catch {}
  objGo(1);
}

async function generateObjPlan() {
  const tv = positions.reduce((a,p) => a+p.qty*p.price, 0);
  const capital = parseFloat(document.getElementById('obj-capital').value) || tv || 0;
  const monthly = parseFloat(document.getElementById('obj-monthly').value) || 200;
  const target = parseFloat(document.getElementById('obj-target').value) || 100000;
  const years = parseInt(document.getElementById('obj-years').value) || 10;
  const goal = document.getElementById('obj-goal').value;
  const goalLabels = { retraite:'Retraite anticipée', immo:'Achat immobilier', enfants:'Études enfants', liberte:'Liberté financière', autre:'Projet personnel' };
  const riskRates = { prudent: 4.5, equilibre: 7, agressif: 11 };
  const rate = riskRates[objRisk] / 100 / 12;
  const n = years * 12;

  // Save objective
  objective = { target, years, rate: riskRates[objRisk], monthly };
  if (!isDemo) { try { await sb.from('objectives').upsert({ ...objective, user_id: currentUser.id, updated_at: new Date().toISOString() }); } catch(e) {} }

  // Show results section
  document.getElementById('obj-wizard').style.display = 'none';
  document.getElementById('obj-results').style.display = 'block';

  // Calculate projection
  const fv = capital * Math.pow(1+rate, n) + monthly * ((Math.pow(1+rate,n)-1)/rate);
  const onTrack = fv >= target;
  const monthlyNeeded = Math.max((target - capital*Math.pow(1+rate,n)) * rate / (Math.pow(1+rate,n)-1), 0);
  const pct = Math.min(tv/target*100, 100);
  const rateNeeded = onTrack ? riskRates[objRisk] : calcNeededRate(capital, monthly, target, years);

  // Progress card now handled by buildObjChart
  // (obj-progress-card is no longer used — chart takes its place)

  // AI Plan
  document.getElementById('obj-ai-plan').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;color:#8e8e93;font-size:14px;padding:12px 0">
      <svg class="spinning" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      Génération de ton plan personnalisé...
    </div>`;

  const portfolioCtx = positions.length ? `Portefeuille actuel : ${positions.map(p=>`${p.name}(${p.type},${p.qty}parts,PRU ${p.pru}€)`).join(', ')}.` : 'Pas encore de positions.';
  const prompt = `Tu es un conseiller financier expert pour débutants. Génère un plan d'investissement ultra-personnalisé.

PROFIL :
- Capital de départ : ${fmtK(capital)}
- Versement mensuel : ${monthly}€/mois  
- Objectif : ${fmtK(target)} en ${years} ans pour : ${goalLabels[goal]}
- Profil de risque : ${objRisk} (~${riskRates[objRisk]}%/an)
- ${portfolioCtx}

Génère un plan structuré avec :

**1. Analyse de la faisabilité**
Est-ce que l'objectif est réaliste ? Sois honnête et pédagogue.

**2. Allocation recommandée**
Répartition précise en % avec les ETF/actions spécifiques à acheter (donne les vrais tickers).

**3. Plan d'action mois par mois**
Comment répartir les ${monthly}€/mois exactement.

**4. Les 3-5 actifs prioritaires à acheter maintenant**
Avec le montant exact à investir sur chacun.

**5. Points de vigilance**
Les risques spécifiques à ce profil et comment s'en protéger.

Sois très concret, donne des chiffres précis, utilise un langage simple pour débutant.`;

  // Simple plan first
  const adjustMsg = !onTrack ? `\n\nSituation : l'objectif n'est PAS atteint avec ce plan. Pour y arriver il faudrait soit : augmenter le versement à ${fmtI(monthlyNeeded)}€/mois, soit viser un rendement de ${rateNeeded}%/an (profil plus agressif), soit allonger la durée.` : '';

  const simplePrompt = `Tu es conseiller financier. Réponds en 3 blocs clairs avec des titres en gras :

**Ton premier apport de ${capital}€**
Répartition exacte avec montants (ex: 700€ sur IWDA, 300€ sur VWCE)

**Chaque mois : ${monthly}€**  
Répartition exacte avec montants

**Pourquoi cette stratégie ?**
1 phrase simple${adjustMsg}

Profil : ${objRisk} (~${riskRates[objRisk]}%/an), objectif ${fmtK(target)} en ${years} ans. Sois ULTRA concret, donne les vrais noms et montants.`;
  
  const simpleR = await callClaude(simplePrompt);
  
  // Build nice cards for the recommendation
  document.getElementById('obj-ai-simple').innerHTML = `
    <div style="font-size:14px;color:#1c1c1e;line-height:1.8">${formatMD(simpleR)}</div>
    ${!onTrack ? `
    <div style="margin-top:16px;background:#fff5e0;border-radius:14px;padding:16px;border-left:4px solid #f59e0b">
      <div style="font-size:14px;font-weight:800;color:#92400e;margin-bottom:8px">⚠ Ajustement conseillé</div>
      <div style="font-size:13px;color:#78350f;line-height:1.6">
        Pour atteindre <strong>${fmtK(target)}</strong> en <strong>${years} ans</strong>, voici tes options :
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
          <div style="background:#fff;border-radius:10px;padding:10px 14px;font-weight:600">💰 Augmenter à <strong>${fmtI(monthlyNeeded)}€/mois</strong> (au lieu de ${monthly}€)</div>
          <div style="background:#fff;border-radius:10px;padding:10px 14px;font-weight:600">📈 Viser <strong>${rateNeeded <= 15 ? rateNeeded + '%/an' : 'un rendement trop élevé'}</strong>${rateNeeded <= 15 ? ' → profil ' + (rateNeeded > 9 ? 'Agressif 🚀' : 'Équilibré ⚖️') : ' — non réaliste'}</div>
          <div style="background:#fff;border-radius:10px;padding:10px 14px;font-weight:600">⏳ Allonger à <strong>${calcNeededYears(capital, monthly, target, riskRates[objRisk]) ? calcNeededYears(capital, monthly, target, riskRates[objRisk]) + '+ ans' : '60+ ans (très long terme)'}</strong></div>
        </div>
      </div>
    </div>` : `
    <div style="margin-top:16px;background:#e8f8f0;border-radius:14px;padding:14px 16px;border-left:4px solid #1a7f5a">
      <div style="font-size:14px;font-weight:700;color:#1a7f5a">✓ Objectif atteignable avec ce plan — continue comme ça !</div>
    </div>`}
    <div style="margin-top:12px;padding:10px 14px;background:#f5f5f5;border-radius:12px;font-size:12px;color:#8e8e93">
      ⚠ Simulation éducative — pas un conseil financier réglementé.
    </div>
    <div style="margin-top:16px;text-align:center">
      <button class="btn-obj-validate" onclick="validateObjectif()">✓ Valider et suivre cet objectif</button>
    </div>`;

  // Full analysis in background
  callClaude(prompt).then(r => {
    const el = document.getElementById('obj-ai-plan');
    if (el) el.innerHTML = `<div style="font-size:14px;color:#3c3c43;line-height:1.7;font-weight:500">${formatMD(r)}</div>`;
  });

  // Build interactive chart
  setTimeout(() => buildObjChart(capital, monthly, target, years, riskRates[objRisk]), 100);
  // Projection table in background
  renderProjectionTable(capital, monthly, target, years, riskRates[objRisk]);
}

function calcNeededRate(capital, monthly, target, years) {
  // Binary search for needed rate
  let lo = 0, hi = 30;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const r = mid/100/12, n = years*12;
    const fv = capital*Math.pow(1+r,n) + monthly*((Math.pow(1+r,n)-1)/r);
    if (fv < target) lo = mid; else hi = mid;
  }
  return Math.round((lo+hi)/2 * 10) / 10;
}

function calcNeededYears(capital, monthly, target, annualRate) {
  // Binary search: how many years to reach target at given rate
  const r = annualRate / 100 / 12;
  for (let y = 1; y <= 60; y++) {
    const n = y * 12;
    const fv = r > 0
      ? capital * Math.pow(1+r, n) + monthly * ((Math.pow(1+r, n) - 1) / r)
      : capital + monthly * n;
    if (fv >= target) return y;
  }
  return null; // not reachable in 60 years
}

function renderProjectionTable(capital, monthly, target, years, annualRate) {
  const rate = annualRate/100/12;
  let rows = '';
  const milestones = [1,2,3,5,7,10,15,20].filter(y => y <= years+1);
  for (const y of milestones) {
    const n = y*12;
    const fv = capital*Math.pow(1+rate,n) + monthly*((Math.pow(1+rate,n)-1)/rate);
    const invested = capital + monthly*n;
    const gain = fv - invested;
    const onT = fv >= target;
    rows += `<tr>
      <td style="font-weight:700">Année ${y}</td>
      <td style="font-weight:800;color:${onT?'#1a7f5a':'#1c1c1e'}">${fmtK(Math.round(fv))}</td>
      <td style="color:#8e8e93">${fmtK(Math.round(invested))}</td>
      <td style="color:#1a7f5a;font-weight:700">+${fmtK(Math.round(gain))}</td>
      <td>${onT?'<span style="color:#1a7f5a;font-weight:700">✓ Atteint</span>':'<span style="color:#8e8e93">En cours</span>'}</td>
    </tr>`;
  }
  document.getElementById('obj-projection').innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="border-bottom:2px solid #f5f5f5">
        <th style="text-align:left;padding:8px 0;color:#8e8e93;font-weight:700;font-size:11px;text-transform:uppercase">Année</th>
        <th style="text-align:left;padding:8px 0;color:#8e8e93;font-weight:700;font-size:11px;text-transform:uppercase">Capital</th>
        <th style="text-align:left;padding:8px 0;color:#8e8e93;font-weight:700;font-size:11px;text-transform:uppercase">Investi</th>
        <th style="text-align:left;padding:8px 0;color:#8e8e93;font-weight:700;font-size:11px;text-transform:uppercase">Gains</th>
        <th style="text-align:left;padding:8px 0;color:#8e8e93;font-weight:700;font-size:11px;text-transform:uppercase">Objectif</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderObj() { /* legacy - kept for compat */ }
async function saveObjectif() { /* legacy */ }

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
function setDecisionIntent(intent) {
  decisionIntention = intent;
  ['garder','acheter','vendre'].forEach(i => {
    const btn = document.getElementById('d-int-'+i);
    if (btn) btn.classList.toggle('active', i === intent);
  });
}

async function analyseDecision() {
  const name = document.getElementById('d-name').value.trim();
  const pct  = parseInt(document.getElementById('d-pct').value) || 10;
  const amt  = Math.round((profile.bankroll || 5000) * pct / 100);
  document.getElementById('d-amount').value = amt;

  if (!name) { showToast('⚠ Indique un actif'); return; }

  // Contexte position existante
  const pos = positions.find(p => p.name.toLowerCase() === name.toLowerCase());
  const posCtx = pos
    ? `L'utilisateur a déjà cette position : ${pos.qty} parts, PRU ${fmt(pos.pru)}€, prix actuel ${fmt(pos.price)}€, performance ${((pos.price-pos.pru)/pos.pru*100).toFixed(1)}%.`
    : "L'utilisateur n'a pas encore cette position.";

  const intent = decisionIntention || 'garder';
  const intentTxt = { acheter: 'acheter ou renforcer', vendre: 'vendre ou réduire', garder: 'savoir quoi faire' }[intent];

  const prompt = `Tu es un conseiller financier pédagogue. Un débutant veut ${intentTxt} ${name}.
${posCtx}
Montant envisagé : ${amt}€ (${pct}% de sa bankroll de ${profile.bankroll}€).
Profil : horizon ${HL[profile.horizon]}, risque ${RL[profile.risk]}.

Réponds UNIQUEMENT en JSON valide avec exactement cette structure :
{
  "recommandation": "ACHETER" ou "ATTENDRE" ou "VENDRE" ou "EVITER",
  "emoji": "✅" ou "⚠️" ou "❌" ou "⏳",
  "phrase_cle": "Une phrase courte et directe (max 15 mots)",
  "risque_niveau": "Faible" ou "Moyen" ou "Élevé",
  "risque_explication": "Pourquoi ce niveau de risque (1 phrase)",
  "horizon_conseille": "Ex: 5 à 10 ans minimum",
  "montant_conseille": "Ex: 300€ maximum (6% de ta bankroll)",
  "pour": ["point positif 1", "point positif 2"],
  "contre": ["point négatif 1", "point négatif 2"],
  "conseil_final": "Conseil concret en 2-3 phrases simples pour un débutant"
}`;

  const result = document.getElementById('d-result');
  result.innerHTML = `<div class="card" style="text-align:center;padding:32px">
    <div style="font-size:32px;margin-bottom:8px">🧠</div>
    <div style="font-weight:700;color:#1c1c1e">Analyse en cours...</div>
    <div style="font-size:13px;color:#8e8e93;margin-top:4px">L'IA analyse ${name} pour toi</div>
  </div>`;

  try {
    const raw = await callClaude(prompt);
    const clean = raw.replace(/```json|```/g,'').trim();
    const d = JSON.parse(clean);

    const riskColor = d.risque_niveau === 'Faible' ? '#1a7f5a' : d.risque_niveau === 'Moyen' ? '#f59e0b' : '#cc2f26';
    const recoBg = d.recommandation === 'ACHETER' ? '#e8f8f0' : d.recommandation === 'VENDRE' ? '#fff0f0' : d.recommandation === 'EVITER' ? '#fff0f0' : '#fff9e6';
    const recoColor = d.recommandation === 'ACHETER' ? '#1a7f5a' : d.recommandation === 'VENDRE' || d.recommandation === 'EVITER' ? '#cc2f26' : '#92400e';

    result.innerHTML = `
      <!-- RECOMMANDATION PRINCIPALE -->
      <div class="card" style="background:${recoBg};border:2px solid ${recoColor}20">
        <div style="display:flex;align-items:center;gap:16px">
          <div style="font-size:48px">${d.emoji}</div>
          <div>
            <div style="font-size:11px;font-weight:700;color:${recoColor};text-transform:uppercase;letter-spacing:1px">${name} · ${['garder','acheter','vendre'].includes(intent) ? {garder:'Analyse générale',acheter:'Acheter ?',vendre:'Vendre ?'}[intent] : 'Analyse'}</div>
            <div style="font-size:24px;font-weight:900;color:${recoColor}">${d.recommandation}</div>
            <div style="font-size:15px;font-weight:600;color:#1c1c1e;margin-top:2px">${d.phrase_cle}</div>
          </div>
        </div>
      </div>

      <!-- MÉTRIQUES CLÉS -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:10px">
        <div class="card" style="padding:14px;text-align:center">
          <div style="font-size:11px;font-weight:700;color:#8e8e93;text-transform:uppercase;margin-bottom:4px">Risque</div>
          <div style="font-size:16px;font-weight:800;color:${riskColor}">${d.risque_niveau}</div>
          <div style="font-size:11px;color:#8e8e93;margin-top:2px">${d.risque_explication}</div>
        </div>
        <div class="card" style="padding:14px;text-align:center">
          <div style="font-size:11px;font-weight:700;color:#8e8e93;text-transform:uppercase;margin-bottom:4px">Horizon</div>
          <div style="font-size:13px;font-weight:800;color:#1c1c1e">${d.horizon_conseille}</div>
        </div>
        <div class="card" style="padding:14px;text-align:center">
          <div style="font-size:11px;font-weight:700;color:#8e8e93;text-transform:uppercase;margin-bottom:4px">Montant</div>
          <div style="font-size:13px;font-weight:800;color:#1c1c1e">${d.montant_conseille}</div>
        </div>
      </div>

      <!-- POUR / CONTRE -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
        <div class="card" style="padding:14px">
          <div style="font-size:12px;font-weight:700;color:#1a7f5a;margin-bottom:8px">✅ Points positifs</div>
          ${d.pour.map(p=>`<div style="font-size:13px;color:#3c3c43;padding:4px 0;border-bottom:1px solid #f0f0f0">• ${p}</div>`).join('')}
        </div>
        <div class="card" style="padding:14px">
          <div style="font-size:12px;font-weight:700;color:#cc2f26;margin-bottom:8px">⚠️ Points négatifs</div>
          ${d.contre.map(p=>`<div style="font-size:13px;color:#3c3c43;padding:4px 0;border-bottom:1px solid #f0f0f0">• ${p}</div>`).join('')}
        </div>
      </div>

      <!-- CONSEIL FINAL -->
      <div class="card" style="margin-top:10px;background:#f9f9f9">
        <div style="font-size:12px;font-weight:700;color:#8e8e93;text-transform:uppercase;margin-bottom:8px">💬 Conseil personnalisé</div>
        <div style="font-size:14px;color:#1c1c1e;line-height:1.7;font-weight:500">${d.conseil_final}</div>
      </div>

      <!-- AJOUTER AU PORTEFEUILLE -->
      ${d.recommandation !== 'EVITER' ? `
      <button class="btn-primary" onclick="addToPortfolioFromDecision('${name}', ${amt})" style="width:100%;margin-top:10px;background:#1a7f5a">
        ➕ Ajouter au portefeuille
      </button>` : ''}
      <button class="btn-secondary" onclick="document.getElementById('d-result').innerHTML='';document.getElementById('d-name').value='';document.getElementById('d-name').focus()" style="width:100%;margin-top:8px">
        🔄 Analyser un autre actif
      </button>
      <div style="margin-top:8px;padding:10px 14px;background:#f5f5f5;border-radius:12px;font-size:12px;color:#8e8e93;text-align:center">
        ⚠ Simulation éducative — pas un conseil financier réglementé.
      </div>`;
  } catch(e) {
    result.innerHTML = `<div class="card"><div style="color:#cc2f26;font-weight:700">Erreur d'analyse</div><div style="font-size:13px;margin-top:4px">Réessaie dans quelques secondes.</div></div>`;
  }
  decisionIntention = null;
}

async function addToPortfolioFromDecision(ticker, amount) {
  nav('ajouter');
  setTimeout(async () => {
    try {
      // Cherche le prix live
      const res = await fetch('/api/prices?symbols=' + encodeURIComponent(ticker));
      const data = await res.json();
      const quote = data.quotes?.[0];
      const price = quote?.price || 0;
      const qty = price > 0 ? Math.max(1, Math.floor(amount / price)) : 1;

      // Simule une sélection autocomplete
      const company = {
        ticker: ticker,
        name: ticker,
        type: ticker.includes('.') && !ticker.includes('.PA') ? 'ETF' : 'Action',
        sector: ''
      };
      await acSelect(company);

      // Remplis qty et PRU après acSelect (qui charge le prix live)
      setTimeout(() => {
        const qtyEl = document.getElementById('f-qty');
        const pruEl = document.getElementById('f-pru');
        if (qtyEl && !qtyEl.value) qtyEl.value = qty;
        if (pruEl && !pruEl.value && price) pruEl.value = price;
        showToast(`✅ ${ticker} pré-rempli — vérifie et valide !`);
      }, 1000);
    } catch(e) {
      // Fallback manuel
      const company = { ticker, name: ticker, type: 'Action', sector: '' };
      acSelect(company);
      showToast('✅ Remplis les détails et valide');
    }
  }, 200);
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
  // Keep quick questions visible

  const chat=document.getElementById('ai-chat');
  chatHistory.push({role:'user',content:q});
  chat.innerHTML+=`<div class="bubble user">${q}</div><div class="bubble bot" id="ai-loading">Réflexion...</div>`;
  const pCtx=positions.length?`Mon portefeuille : ${positions.map(p=>`${p.name}(${p.type}, ${p.qty} parts, PRU ${p.pru}€, actuel ${p.price}€)`).join(', ')}. `:'';
  const histCtx=chatHistory.slice(-6).map(m=>`${m.role==='user'?'Utilisateur':'Assistant'}: ${m.content}`).join('\n');
  const fullPrompt=`${pCtx}Historique récent:\n${histCtx}`;
  const r=await callClaude(fullPrompt);
  chatHistory.push({role:'assistant',content:r});
  saveChatHistory();
  document.getElementById('ai-loading').outerHTML=`<div class="bubble bot">${formatMD(r)}</div>`;
  chat.scrollTop=chat.scrollHeight;
}
