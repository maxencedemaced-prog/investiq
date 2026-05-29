
// ===== VALIDATE & PERSIST OBJECTIF =====
const OBJ_STORAGE = 'iq_validated_objective';

function hasValidObj(o) {
  // Vérifie qu'un objet objectif est valide (capital peut être 0)
  return o && o.target && o.target > 0;
}

async function validateObjectif(labelOverride) {
  // Vérifie si c'est une mise à jour d'un objectif existant
  const isUpdate = allObjectives.some(o => o.target === objChartTarget && o.monthly === objChartMonthly);
  if (!isUpdate && allObjectives.length >= 3) {
    // Bandeau rouge
    const existing = document.getElementById('obj-max-banner');
    if (!existing) {
      const banner = document.createElement('div');
      banner.id = 'obj-max-banner';
      banner.style.cssText = 'background:#fff0f0;border:2px solid #cc2f26;border-radius:14px;padding:14px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:12px';
      banner.innerHTML = '<div><div style="font-size:14px;font-weight:800;color:#cc2f26">⚠ Maximum 3 objectifs atteint</div><div style="font-size:13px;color:#7f1d1d;margin-top:3px">Supprime un objectif existant (bouton ×) pour en créer un nouveau.</div></div><button onclick="document.getElementById(\'obj-max-banner\').remove()" style="background:#cc2f26;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0">OK</button>';
      const resultsEl = document.getElementById('obj-results');
      if (resultsEl) resultsEl.insertBefore(banner, resultsEl.firstChild);
    }
    renderMultiObjChart();
    return;
  }
  const label = labelOverride || ('Objectif ' + (allObjectives.length + 1));
  const data = {
    capital: objChartCapital, monthly: objChartMonthly,
    target: objChartTarget, years: objChartYears,
    rate: objChartRate, risk: objRisk,
    label, validated_at: new Date().toISOString()
  };
  try { localStorage.setItem(OBJ_STORAGE, JSON.stringify({...data, validatedAt: data.validated_at})); } catch {}
  if (!isDemo && currentUser) {
    try {
      // Vérifie si un objectif identique existe déjà (même target+monthly = mise à jour)
      const existing = allObjectives.find(o => o.target === data.target && o.monthly === data.monthly);
      let savedId = null;
      if (existing) {
        // Mise à jour — sans updated_at si la colonne n'existe pas
        const updatePayload = {
          capital: data.capital, monthly: data.monthly, target: data.target,
          years: data.years, rate: data.rate, risk: data.risk
        };
        const { error } = await sb.from('objectives').update(updatePayload).eq('id', existing.id);
        if (error) console.warn('[validateObjectif] update error:', error.message);
        else savedId = existing.id;
      } else {
        // Nouvel objectif — sans updated_at
        const insertPayload = {
          user_id: currentUser.id, capital: data.capital, monthly: data.monthly,
          target: data.target, years: data.years, rate: data.rate, risk: data.risk
        };
        const { data: inserted, error } = await sb.from('objectives').insert(insertPayload).select().single();
        if (error) console.warn('[validateObjectif] insert error:', error.message);
        else if (inserted) savedId = inserted.id;
      }
      // Recharge tous les objectifs
      await loadObjective();
      renderMultiObjChart();
    } catch(e) { console.warn('Supabase objectif save failed:', e); }
  }
  const btn = document.querySelector('.btn-obj-validate');
  if (btn) { btn.textContent = '✓ Objectif sauvegardé !'; btn.style.background = '#1a7f5a'; btn.disabled = true; }
  showToast('🎯 Objectif sauvegardé !');
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

  const active = allObjectives.find(o => o.id === activeObjId) || allObjectives[0];
  const riskLabel = objRisk === 'agressif' ? 'Agressif' : objRisk === 'equilibre' ? 'Équilibré' : 'Prudent';
  const color = active ? active.color : '#1a7f5a';

  setTimeout(() => {
    if (allObjectives.length > 0) {
      renderMultiObjChart();
    } else {
      buildObjChart(objChartCapital, objChartMonthly, objChartTarget, objChartYears, objChartRate);
    }
    renderCourtTermePlan();
  }, 100);

  // Plan pour l'objectif ACTIF
  const el = document.getElementById('obj-ai-simple');
  if (el) {
    el.innerHTML = `
      <div style="background:${color}12;border-radius:14px;padding:14px 16px;margin-bottom:14px;border-left:4px solid ${color}">
        <div style="font-size:13px;font-weight:800;color:${color};margin-bottom:2px">✓ ${active ? active.label : 'Objectif'} — Profil ${riskLabel}</div>
        <div style="font-size:12px;color:#555">
          ${objChartCapital > 0 ? fmtK(objChartCapital) + ' de départ · ' : ''}${objChartMonthly}€/mois · ${objChartYears} ans · ${objChartRate}%/an
        </div>
      </div>

      <!-- Plan ETF -->
      <div style="font-size:12px;font-weight:700;color:#1c1c1e;margin-bottom:8px">🏦 Où et comment investir</div>
      <div id="obj-etf-plan" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:8px;padding:14px;color:#8e8e93;background:#f9f9f9;border-radius:12px">
          <svg class="spinning" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3fb950" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          <span style="font-size:13px;font-weight:500">Génération du plan personnalisé...</span>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn-secondary" onclick="resetObj()" style="font-size:13px;padding:9px 16px;flex:1">✏ Modifier</button>
        <button class="btn-secondary" onclick="nav('ai')" style="font-size:13px;padding:9px 16px;flex:1">🤖 Analyse IA →</button>
      </div>`;
    generateETFPlan(activeObjId);
  }
}

const CACHE_ETF_PLAN = 'iq_etf_plan';
const CACHE_ETF_TTL  = 24 * 60 * 60 * 1000; // 24h

async function generateETFPlan(objId) {
  const el = document.getElementById('obj-etf-plan');
  if (!el) return;

  // Utilise l'ID passé, sinon l'objectif actif global
  const effectiveId = objId || activeObjId;
  const cacheKey = effectiveId ? CACHE_ETF_PLAN + '_' + effectiveId : CACHE_ETF_PLAN;

  // Vérifie le cache — d'abord par ID, puis global
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || localStorage.getItem(CACHE_ETF_PLAN) || 'null');
    if (cached && cached.etfs && Date.now() - cached.ts < CACHE_ETF_TTL && cached.risk === objRisk) {
      renderETFCards(cached.etfs, el);
      return;
    }
  } catch {}

  const riskLabel = objRisk === 'agressif' ? 'Agressif' : objRisk === 'equilibre' ? 'Équilibré' : 'Prudent';

  const prompt = `Conseiller financier. Propose exactement 3 ETF pour un profil ${riskLabel}.
Capital de départ : ${objChartCapital}€ · Versement mensuel : ${objChartMonthly}€ · Durée : ${objChartYears} ans.
Réponds UNIQUEMENT en JSON valide sans markdown :
[
  {
    "ticker": "IWDA.L",
    "name": "iShares Core MSCI World",
    "desc": "1600+ entreprises mondiales diversifiées",
    "pct_capital": 70,
    "pct_mensuel": 70,
    "color": "#1a7f5a",
    "pourquoi": "Cœur du portefeuille — diversification maximale"
  }
]
Règles : tickers réels LSE/XETRA, max 3 ETF, répartition en % qui fait 100, adapté au profil ${riskLabel}.`;

  try {
    const raw = await callClaude(prompt, 'Réponds UNIQUEMENT en JSON valide.');
    const clean = raw.replace(/\`\`\`json|\`\`\`/g, '').trim();
    const etfs = JSON.parse(clean.slice(clean.indexOf('['), clean.lastIndexOf(']') + 1));
    if (Array.isArray(etfs) && etfs.length > 0) {
      try {
        const cacheData = JSON.stringify({ etfs, risk: objRisk, ts: Date.now() });
        localStorage.setItem(cacheKey, cacheData);
        localStorage.setItem(CACHE_ETF_PLAN, cacheData);
        // Sauvegarde aussi avec l'activeObjId si différent
        if (activeObjId && activeObjId !== effectiveId) {
          localStorage.setItem(CACHE_ETF_PLAN + '_' + activeObjId, cacheData);
        }
      } catch {}
      renderETFCards(etfs, el);
      return;
    }
  } catch(e) {}

  // Fallback
  const fallback = objRisk === 'agressif'
    ? [
        { ticker:'IWDA.L',  name:'iShares MSCI World',      desc:'1600+ entreprises mondiales',    pct_capital:60, pct_mensuel:60, color:'#1a7f5a', pourquoi:'Base solide du portefeuille' },
        { ticker:'VWCE.DE', name:'Vanguard FTSE All-World',  desc:'Inclut les marchés émergents',   pct_capital:20, pct_mensuel:20, color:'#6366f1', pourquoi:'Diversification globale' },
        { ticker:'IITU.L',  name:'iShares S&P 500 IT ETF',   desc:'Top tech US : Apple, NVIDIA...', pct_capital:20, pct_mensuel:20, color:'#f59e0b', pourquoi:'Exposition tech croissance' },
      ]
    : objRisk === 'equilibre'
    ? [
        { ticker:'IWDA.L',  name:'iShares MSCI World',       desc:'1600+ entreprises mondiales',   pct_capital:80, pct_mensuel:80, color:'#1a7f5a', pourquoi:'Cœur du portefeuille' },
        { ticker:'VWCE.DE', name:'Vanguard FTSE All-World',   desc:'Inclut les marchés émergents',  pct_capital:20, pct_mensuel:20, color:'#6366f1', pourquoi:'Complément diversifié' },
      ]
    : [
        { ticker:'IWDA.L',  name:'iShares MSCI World',       desc:'1600+ entreprises mondiales',   pct_capital:90, pct_mensuel:90, color:'#1a7f5a', pourquoi:'Maximum de diversification' },
        { ticker:'AGGH.L',  name:'iShares Global Aggregate', desc:'Obligations mondiales stables', pct_capital:10, pct_mensuel:10, color:'#0ea5e9', pourquoi:'Stabilité et protection' },
      ];
  renderETFCards(fallback, el);
}

function renderETFCards(etfs, containerEl) {
  const montantCapital = objChartCapital || 0;
  const montantMensuel = objChartMonthly || 200;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const surface = isDark ? 'var(--color-surface-raised)' : '#fff';
  const border = isDark ? 'var(--color-border)' : '#e4e4e7';
  const text = isDark ? 'var(--color-text)' : '#09090b';
  const sub = isDark ? 'var(--color-text-secondary)' : '#71717a';
  const trackBg = isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f2';
  const totalCapital = montantCapital;
  const targetPct = 80;

  containerEl.innerHTML = `
  ${montantCapital > 0 ? `
  <!-- PLAN ETF LONG TERME -->
  <div style="margin-bottom:6px">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:11px;font-weight:700;color:${sub};text-transform:uppercase;letter-spacing:0.08em">Plan ETF long terme</span>
      </div>
      <span style="font-size:11px;color:${sub}">Répartition ciblée — ${targetPct}% · ${fmtK(montantCapital)} k€</span>
    </div>
    ${etfs.map((e,i) => {
      const montant = Math.round(montantCapital * (e.pct_capital||33) / 100);
      const pct = e.pct_capital || 33;
      return `
      <div onclick="openActionFromObjectif('${e.ticker}','${e.name}',${montant})" style="background:${surface};border:1px solid ${border};border-radius:12px;padding:14px 16px;margin-bottom:8px;cursor:pointer;transition:all 0.15s;position:relative;overflow:hidden"
        onmouseover="this.style.borderColor='${e.color}'" onmouseout="this.style.borderColor='${border}'">
        <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:${e.color};border-radius:3px 0 0 3px"></div>
        <div style="display:flex;align-items:center;gap:12px;padding-left:8px">
          <div style="width:36px;height:36px;border-radius:10px;background:${e.color}20;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:${e.color};flex-shrink:0">${(e.ticker||'ET').slice(0,2)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;color:${text}">${e.name} <span style="font-size:10px;color:${sub};background:${isDark?'rgba(255,255,255,0.08)':'#f4f4f5'};padding:1px 6px;border-radius:4px;font-weight:500">${e.ticker||''}</span></div>
            <div style="font-size:11px;color:${sub};margin-top:2px">${e.type||'Obligations'} · ${e.desc||''}</div>
            <div style="margin-top:6px;background:${trackBg};border-radius:99px;height:3px;overflow:hidden">
              <div style="height:100%;background:${e.color};width:${pct}%;border-radius:99px;transition:width 1s ease"></div>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:15px;font-weight:800;color:${e.color}">${montant.toLocaleString('fr-FR')} € ›</div>
            <div style="font-size:11px;color:${sub};margin-top:2px">${pct}% du plan</div>
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>` : ''}

  <!-- ÉPARGNE MENSUELLE -->
  <div style="margin-bottom:12px">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:11px;font-weight:700;color:${sub};text-transform:uppercase;letter-spacing:0.08em">⊕ Épargne mens.</span>
      </div>
      <span style="font-size:11px;color:${sub}">${montantMensuel}% · ${fmtK(montantMensuel)} k€</span>
    </div>
    ${etfs.map((e,i) => {
      const montant = Math.round(montantMensuel * (e.pct_mensuel||33) / 100);
      return `
      <div onclick="openActionFromObjectif('${e.ticker}','${e.name}',${montant})" style="background:${surface};border:1px solid ${border};border-radius:12px;padding:12px 16px;margin-bottom:6px;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:12px;position:relative;overflow:hidden"
        onmouseover="this.style.borderColor='${e.color}'" onmouseout="this.style.borderColor='${border}'">
        <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:${e.color};border-radius:3px 0 0 3px"></div>
        <div style="width:32px;height:32px;border-radius:9px;background:${e.color}20;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:${e.color};flex-shrink:0;margin-left:8px">${(e.ticker||'ET').slice(0,2)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:${text}">${e.name} <span style="font-size:10px;color:${sub}">${e.ticker||''}</span></div>
          <div style="font-size:11px;color:#3fb950;font-weight:600;margin-top:1px">${e.pourquoi||'Croissance long terme'}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:14px;font-weight:800;color:${e.color}">+${montant.toLocaleString('fr-FR')} € ›</div>
          <div style="font-size:10px;color:${sub}">${e.pct_mensuel||33}% / mois</div>
        </div>
      </div>`;
    }).join('')}
  </div>

  <!-- CTA analyser -->
  <div style="background:${isDark?'rgba(63,185,80,0.08)':'#f0fdf4'};border:1px solid ${isDark?'rgba(63,185,80,0.2)':'rgba(22,163,74,0.2)'};border-radius:10px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:${isDark?'rgba(255,255,255,0.5)':sub}">
      <span>💡</span>
      <span>Cliquez sur un ETF pour l'analyser avec l'IA InvestIQ</span>
    </div>
    <button onclick="nav('ai')" style="padding:5px 12px;background:#16a34a;border:none;border-radius:6px;font-size:11px;font-weight:700;color:#fff;cursor:pointer">Analyser</button>
  </div>
  `;

}





// ===== PLAN COURT TERME =====
async function getAIActionRecommendations(risk, capital) {
  // Nombre d'actions selon capital
  const nbActions = capital < 2000 ? 3 : capital < 5000 ? 4 : capital < 10000 ? 5 : 6;
  const profil = risk === 'agressif' || risk === 'eleve' ? 'agressif (accepte forte volatilité)'
    : risk === 'equilibre' || risk === 'modere' ? 'équilibré (mix rendement/sécurité)'
    : 'prudent (préfère stabilité et dividendes)';

  const prompt = `Tu es un conseiller en investissement ÉDUCATIF et RESPONSABLE. Aujourd'hui ${new Date().toLocaleDateString('fr-FR')}, propose exactement ${nbActions} actifs RÉALISTES pour un investisseur ${profil} avec ${capital}€.

RÈGLES ABSOLUES DE RÉALISME :
- Gains attendus RÉALISTES uniquement : prudent +3-6%/an, équilibré +5-10%/an, agressif +8-15%/an MAX
- JAMAIS de gains > 20% sauf mention explicite "très spéculatif" avec avertissement
- Privilégie les ETF (IWDA, VWCE, SP500) et les grandes caps stables (AAPL, MSFT, LVMH, TTE.PA)
- INTERDITS : actifs micro-cap, penny stocks, quantique pur, levier
- Pour profil prudent/équilibré : 60-70% ETF monde + 30-40% actions blue chip
- Pour profil agressif : max 50% actions croissance, 50% ETF monde obligatoire
- Horizon réaliste : 6-18 mois minimum, pas de "3-6 mois" pour les ETF

Réponds UNIQUEMENT en JSON valide, sans markdown :
[{"ticker":"IWDA.L","name":"iShares MSCI World","gain":"+6-9%","horizon":"12+ mois","desc":"ETF monde diversifié","color":"#1a7f5a","montant":${Math.round(capital*0.5)}}]

Profil ${profil} — répartis ${capital}€ de façon PRUDENTE et RÉALISTE. Colors hex variées.`;

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

// ===== CACHE ACTIONS COURT TERME =====
const CACHE_ACTIONS = 'iq_court_actions';
const CACHE_ACTIONS_TTL = 24 * 60 * 60 * 1000; // 24h

function loadActionsCache(risk) {
  return loadActionsCacheKey(CACHE_ACTIONS, risk);
}

function loadActionsCacheKey(key, risk) {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if (!cached) return null;
    const age = Date.now() - cached.ts;
    if (age > CACHE_ACTIONS_TTL || cached.risk !== risk) return null;
    return cached;
  } catch { return null; }
}

function saveActionsCache(actions, risk) {
  // Sauvegarde dans la clé globale ET dans la clé spécifique à l'objectif
  const data = JSON.stringify({ actions, risk, ts: Date.now(), date: new Date().toLocaleDateString('fr-FR') });
  try { localStorage.setItem(CACHE_ACTIONS, data); } catch {}
  if (activeObjId) {
    try { localStorage.setItem(CACHE_ACTIONS + '_' + activeObjId, data); } catch {}
  }
}

function forceRefreshActions() {
  // Vide le cache de l'objectif actif
  try { localStorage.removeItem(CACHE_ACTIONS); } catch {}
  if (activeObjId) { try { localStorage.removeItem(CACHE_ACTIONS + '_' + activeObjId); } catch {} }
  renderCourtTermePlan();
}

function renderActionCard(a, i, isOld) {
  const opacity = isOld ? '0.45' : '1';
  const strikeStyle = isOld ? 'text-decoration:line-through;color:#c7c7cc' : '';
  const badgeHtml = isOld
    ? '<span style="background:#f0f0f0;color:#8e8e93;font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;margin-left:6px">Remplacé</span>'
    : '<span style="background:#e8f8f0;color:#1a7f5a;font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;margin-left:6px">⚡ Actuel</span>';
  const cursor = isOld ? 'default' : 'pointer';
  const onclick = isOld ? '' : `onclick="openActionFromObjectif('${a.ticker}','${a.name}',${a.montant})"`;
  const hover = isOld ? '' : `onmouseover="this.style.borderColor='#f59e0b';this.style.background='#fffdf5'" onmouseout="this.style.borderColor='#f0f0f0';this.style.background='#fff'"`;

  return `<div ${onclick} ${hover}
       style="background:#fff;border-radius:14px;padding:14px 16px;border:2px solid #f0f0f0;cursor:${cursor};transition:all 0.2s;opacity:${opacity}">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;border-radius:12px;background:${a.color}20;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:${a.color};${isOld?'filter:grayscale(0.7)':''}">${a.ticker.slice(0,2)}</div>
        <div>
          <div style="font-size:14px;font-weight:700;color:${isOld?'#c7c7cc':'#1c1c1e'};${strikeStyle}">
            ${a.name} <span style="font-size:12px;color:#8e8e93;font-weight:500">${a.ticker}</span>
            ${badgeHtml}
          </div>
          <div style="font-size:12px;color:#8e8e93;margin-top:1px">${a.desc}</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:14px;font-weight:800;color:${isOld?'#c7c7cc':'#1a7f5a'}">${a.gain}</div>
        <div style="font-size:11px;color:#8e8e93">${a.horizon}</div>
      </div>
    </div>
    ${!isOld ? `<div style="margin-top:10px">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#8e8e93;margin-bottom:4px">
        <span>Montant suggéré : <strong style="color:#1c1c1e">${fmtK(a.montant)}</strong></span>
        <span style="font-weight:700;color:#f59e0b">Analyser & Acheter →</span>
      </div>
      <div style="background:#f5f5f5;border-radius:6px;height:6px;overflow:hidden">
        <div style="height:100%;background:linear-gradient(90deg,${a.color}60,${a.color});width:${40 + i*12}%"></div>
      </div>
    </div>` : ''}
  </div>`;
}

function renderActionCards(actionRecs, containerEl, oldRecs) {
  const hasOld = oldRecs && oldRecs.length > 0;
  // Détecte les nouvelles actions (tickers différents des anciennes)
  const newTickers = new Set(actionRecs.map(a => a.ticker));
  const oldTickers = hasOld ? new Set(oldRecs.map(a => a.ticker)) : new Set();
  const hasChanges = hasOld && [...newTickers].some(t => !oldTickers.has(t));

  let html = '<div style="display:flex;flex-direction:column;gap:10px">';

  if (hasOld && hasChanges) {
    // Affiche les nouvelles en premier avec badge "Actuel"
    html += `<div style="font-size:11px;font-weight:700;color:#1a7f5a;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:2px">⚡ Nouvelles opportunités du marché</div>`;
    html += actionRecs.map((a, i) => renderActionCard(a, i, false)).join('');

    // Anciennes barrées en dessous
    const deprecated = oldRecs.filter(a => !newTickers.has(a.ticker));
    if (deprecated.length > 0) {
      html += `<div style="font-size:11px;font-weight:700;color:#c7c7cc;text-transform:uppercase;letter-spacing:0.4px;margin-top:6px;margin-bottom:2px">Anciennes recommandations</div>`;
      html += deprecated.map((a, i) => renderActionCard(a, i, true)).join('');
    }
  } else {
    // Pas d'historique ou pas de changement — affiche normalement
    html += actionRecs.map((a, i) => renderActionCard(a, i, false)).join('');
  }

  html += '</div>';
  html += `<div style="margin-top:10px;padding:10px 14px;background:#fff9e6;border-radius:12px;font-size:12px;color:#92400e">
    ⚠️ Recommandations éducatives IA · Actualisation automatique chaque 24h ·
    <button onclick="forceRefreshActions()" style="background:none;border:none;color:#f59e0b;font-weight:700;cursor:pointer;font-size:12px;text-decoration:underline">Actualiser maintenant</button>
  </div>`;

  containerEl.innerHTML = html;
}

async function renderCourtTermePlan() {
  const el = document.getElementById('obj-court-terme');
  const actionsEl = document.getElementById('obj-court-actions');
  if (!el || !actionsEl) return;

  const capital = objChartCapital || profile.bankroll || 1000;
  const budgetCourt = Math.round(capital * 0.3);
  const risk = objRisk || profile.risk || 'faible';

  el.style.display = 'block';

  // Cache spécifique à l'objectif actif
  const cacheKey = activeObjId ? CACHE_ACTIONS + '_' + activeObjId : CACHE_ACTIONS;
  const cached = loadActionsCacheKey(cacheKey, risk);
  if (cached) {
    // Cache valide — affiche directement sans appel IA
    const ageH = Math.floor((Date.now() - cached.ts) / 3600000);
    actionsEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:6px">
        <div style="font-size:13px;color:#8e8e93">
          Budget alloué : <strong style="color:#1c1c1e">${fmtK(budgetCourt)}</strong> · ${cached.actions.length} opportunités
        </div>
        <div style="font-size:11px;color:#c7c7cc;font-weight:500">
          Mis à jour ${ageH < 1 ? 'il y a moins d\'1h' : 'il y a ' + ageH + 'h'} · ${cached.date}
        </div>
      </div>
      <div id="action-cards-wrap"></div>`;
    renderActionCards(cached.actions, document.getElementById('action-cards-wrap'));
    return;
  }

  // Cache expiré ou absent — récupère les anciennes depuis localStorage pour les afficher barrées
  let oldActions = null;
  try {
    const old = JSON.parse(localStorage.getItem(cacheKey) || localStorage.getItem(CACHE_ACTIONS) || 'null');
    if (old && old.actions) oldActions = old.actions;
  } catch {}

  // Affiche loading avec les anciennes si dispo
  actionsEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:6px">
      <div style="font-size:13px;color:#8e8e93">Budget alloué : <strong style="color:#1c1c1e">${fmtK(budgetCourt)}</strong></div>
      <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#1a7f5a;font-weight:600">
        <svg class="spinning" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        Analyse du marché en cours...
      </div>
    </div>
    ${oldActions ? `<div style="font-size:11px;font-weight:700;color:#c7c7cc;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px">Dernières recommandations (en cours d'actualisation)</div>
      ${oldActions.map((a,i) => renderActionCard(a, i, true)).join('')}` : `
    <div style="text-align:center;padding:20px;color:#8e8e93">
      <div style="font-size:24px;margin-bottom:8px">🧠</div>
      <div style="font-size:13px">Analyse du marché en cours...</div>
    </div>`}`;

  // Génère les nouvelles recommandations
  const actionRecs = await getAIActionRecommendations(risk, budgetCourt);
  saveActionsCache(actionRecs, risk); // sauvegarde dans les 2 clés

  actionsEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:6px">
      <div style="font-size:13px;color:#8e8e93">
        Budget alloué : <strong style="color:#1c1c1e">${fmtK(budgetCourt)}</strong> · ${actionRecs.length} opportunités
      </div>
      <div style="font-size:11px;color:#c7c7cc;font-weight:500">Mis à jour aujourd'hui</div>
    </div>
    <div id="action-cards-wrap"></div>`;
  renderActionCards(actionRecs, document.getElementById('action-cards-wrap'), oldActions);
}

async function openActionFromObjectif(ticker, name, amount) {
  decisionIntention = 'acheter';
  // Vider l'ancienne analyse
  document.getElementById('d-result').innerHTML = '';
  nav('decision');
  setTimeout(() => {
    const nameEl = document.getElementById('d-name');
    if (nameEl) nameEl.value = ticker;
    const pct = Math.max(1, Math.min(50, Math.round(amount / (profile.bankroll || 1000) * 100)));
    const pctEl = document.getElementById('d-pct');
    if (pctEl) { pctEl.value = pct; updatePct(); }
    setDecisionIntent('acheter');
    document.getElementById('sec-decision')?.scrollTo(0,0);
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
// Multi-objectifs
let allObjectives = []; // [{id, label, capital, monthly, target, years, rate, risk, color}]
let activeObjId = null;
const OBJ_COLORS = ['#1a7f5a','#6366f1','#f59e0b','#ec4899','#0ea5e9','#10b981'];

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
  if (el) { el.style.width = '0%'; el.style.transition = 'width 1s cubic-bezier(0.16,1,0.3,1)'; setTimeout(() => { el.style.width = pct + '%'; }, 150); }
  if (marker) { marker.style.left = '0%'; marker.style.transition = 'left 1s cubic-bezier(0.16,1,0.3,1)'; setTimeout(() => { marker.style.left = pct + '%'; }, 150); }
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

// ===== MULTI-OBJECTIFS CHART =====
function renderMultiObjChart() {
  const el = document.getElementById('obj-results');
  const wizard = document.getElementById('obj-wizard');
  if (!allObjectives.length) return;
  if (el) el.style.display = 'block';
  if (wizard) wizard.style.display = 'none';

  const tv = positions.reduce((a,p) => a + p.qty*p.price, 0);

  // Calcule la durée max parmi tous les objectifs
  const maxYears = Math.max(...allObjectives.map(o => o.years));
  const maxMonths = maxYears * 12;
  const step = Math.max(1, Math.floor(maxMonths / 60));

  // Labels communs
  const labels = [];
  for (let m = 0; m <= maxMonths; m += step) {
    const yr = m / 12;
    labels.push(yr === 0 ? "Auj." : yr % 1 === 0 ? Math.round(yr) + 'a' : '');
  }

  // Datasets : une courbe par objectif
  const datasets = allObjectives.flatMap((obj, i) => {
    const rate = obj.rate / 100 / 12;
    const projData = [];
    const invData  = [];
    for (let m = 0; m <= maxMonths; m += step) {
      const n = Math.min(m, obj.years * 12);
      const fv = obj.capital * Math.pow(1+rate,n) + (rate>0 ? obj.monthly*((Math.pow(1+rate,n)-1)/rate) : obj.monthly*n);
      projData.push(Math.round(fv));
      invData.push(Math.round(obj.capital + obj.monthly*n));
    }
    return [
      {
        label: obj.label,
        data: projData,
        borderColor: obj.color,
        backgroundColor: obj.color + '18',
        borderWidth: 2.5,
        fill: false,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: obj.color,
        objId: obj.id
      },
      {
        label: obj.label + ' (investi)',
        data: invData,
        borderColor: obj.color + '55',
        borderWidth: 1,
        borderDash: [4,4],
        fill: false,
        tension: 0,
        pointRadius: 0,
        hidden: true
      }
    ];
  });

  // Mise à jour ou création du graphique
  const canvas = document.getElementById('obj-chart');
  if (!canvas) return;
  if (objChartInstance) objChartInstance.destroy();

  const ctx = canvas.getContext('2d');
  objChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => c.dataset.label + ' : ' + fmtK(c.raw)
          },
          backgroundColor: 'rgba(255,255,255,0.12)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255,255,255,0.2)',
          borderWidth: 1,
        }
      },
      scales: { x: { display: false }, y: { display: false } },
      interaction: { mode: 'index', intersect: false }
    }
  });

  // Légende + gestion des objectifs
  renderObjLegend(tv);

  // Slider : suit UNIQUEMENT l'objectif actif
  const active = allObjectives.find(o => o.id === activeObjId) || allObjectives[0];
  if (active) {
    objChartCapital = active.capital;
    objChartMonthly = active.monthly;
    objChartTarget  = active.target;
    objChartYears   = active.years;
    objChartRate    = active.rate;
    // Projection de l'objectif actif seulement
    objProjectionData = [];
    const rActive = active.rate/100/12;
    for (let m = 0; m <= active.years*12; m++) {
      objProjectionData.push(Math.round(active.capital*Math.pow(1+rActive,m)+(rActive>0?active.monthly*((Math.pow(1+rActive,m)-1)/rActive):active.monthly*m)));
    }
  }

  const sliderEnd = document.getElementById('obj-slider-end');
  if (sliderEnd && active) sliderEnd.textContent = `Dans ${active.years} an${active.years>1?'s':''}`;
  updateObjSlider(100);

  // Barre progression réelle
  if (active) {
    const pct = Math.min(tv / active.target * 100, 100);
    const bar = document.getElementById('obj-real-bar');
    const marker = document.getElementById('obj-real-marker');
    const pctEl = document.getElementById('obj-real-pct');
    const valEl = document.getElementById('obj-real-val');
    const targetEl = document.getElementById('obj-real-target');
    if (bar) bar.style.width = pct + '%';
    if (marker) marker.style.left = pct + '%';
    if (pctEl) pctEl.textContent = pct.toFixed(1) + '%';
    if (valEl) valEl.textContent = fmtK(tv);
    if (targetEl) targetEl.textContent = fmtK(active.target);
  }
}

function renderObjLegend(tv) {
  // Utilise le div dédié #obj-tabs dans le HTML
  const tabsEl = document.getElementById('obj-tabs');
  if (!tabsEl) return;

  const active = allObjectives.find(o => o.id === activeObjId) || allObjectives[0];

  // ── ONGLETS ──
  const tabsHtml = allObjectives.map((obj) => {
    const isActive = obj.id === activeObjId;
    return `<button class="obj-tab-btn${isActive?' active':''}"
      style="${isActive ? 'background:'+obj.color+';border-color:'+obj.color : ''}"
      onclick="setActiveObj('${obj.id}')">
      <span class="obj-tab-dot" style="background:${isActive?'rgba(255,255,255,0.8)':obj.color}"></span>
      ${obj.label}
      <span class="obj-tab-del" onclick="event.stopPropagation();deleteObjective('${obj.id}')" title="Supprimer">×</span>
    </button>`;
  }).join('') +
  `${allObjectives.length < 3 ? '<button class="obj-tab-new" onclick="resetObj()">+ Nouveau objectif</button>' : ''}`;

  // ── PANEL résumé de l'objectif actif ──
  let panelHtml = '';
  if (active) {
    const rate = active.rate/100/12;
    const n = active.years*12;
    const fv = Math.round(active.capital*Math.pow(1+rate,n)+(rate>0?active.monthly*((Math.pow(1+rate,n)-1)/rate):active.monthly*n));
    const pct = tv > 0 && active.target > 0 ? Math.min(tv/active.target*100, 100) : 0;
    panelHtml = `<div style="width:100%;margin-top:6px;background:${active.color}10;border:1.5px solid ${active.color}30;border-radius:14px;padding:11px 14px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px">
      <div>
        <div style="font-size:13px;font-weight:800;color:#1c1c1e">${active.label}</div>
        <div style="font-size:11px;color:#8e8e93;margin-top:1px">${active.capital>0?fmtK(active.capital)+' départ · ':''}${active.monthly}€/mois · ${active.years}ans · ${active.rate}%/an</div>
        <div style="margin-top:5px;background:#e5e5ea;border-radius:4px;height:4px;width:180px;overflow:hidden">
          <div style="height:100%;background:${active.color};width:${pct}%;border-radius:4px"></div>
        </div>
        <div style="font-size:10px;color:#8e8e93;margin-top:2px">${pct.toFixed(1)}% atteint</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:900;color:${active.color}">${fmtK(fv)}</div>
        <div style="font-size:10px;color:#8e8e93">projection finale</div>
      </div>
    </div>`;
  }

  tabsEl.innerHTML = tabsHtml + panelHtml;
}

function setActiveObj(id) {
  activeObjId = id;
  const obj = allObjectives.find(o => o.id === id);
  if (obj) {
    applyObjData(obj);
    // Cache spécifique à cet objectif — vide seulement si c'est un nouvel objectif
    const cacheKeyETF     = CACHE_ETF_PLAN + '_' + id;
    const cacheKeyActions = CACHE_ACTIONS  + '_' + id;
    // Swap les caches : sauvegarde le cache de l'ancien objectif, charge celui du nouveau
    try { localStorage.setItem(CACHE_ETF_PLAN,  localStorage.getItem(cacheKeyETF)     || ''); } catch {}
    try { localStorage.setItem(CACHE_ACTIONS,   localStorage.getItem(cacheKeyActions) || ''); } catch {}
  }
  renderMultiObjChart();
  showValidatedChart();
}

async function deleteObjective(id) {
  if (!confirm('Supprimer cet objectif ?')) return;
  if (!isDemo && currentUser) {
    try { await sb.from('objectives').delete().eq('id', id); } catch(e) {}
  }
  allObjectives = allObjectives.filter(o => o.id !== id);
  if (activeObjId === id) activeObjId = allObjectives[0]?.id || null;
  if (allObjectives.length === 0) {
    // Plus d'objectifs — retour au wizard
    const el = document.getElementById('obj-results');
    const wizard = document.getElementById('obj-wizard');
    if (el) el.style.display = 'none';
    if (wizard) wizard.style.display = 'block';
    showToast('Objectif supprimé');
    return;
  }
  if (activeObjId) applyObjData(allObjectives.find(o => o.id === activeObjId) || allObjectives[0]);
  renderMultiObjChart();
  showValidatedChart();
  showToast('✓ Objectif supprimé');
}

// Sauvegarder la simulation DCA comme nouvel objectif — avec plan IA
async function saveDCAAsObjective() {
  const m  = parseFloat(document.getElementById('dca-m')?.value) || 200;
  const y  = parseInt(document.getElementById('dca-y')?.value)   || 10;
  const r  = parseFloat(document.getElementById('dca-r')?.value) || 7;
  const s  = parseFloat(document.getElementById('dca-s')?.value) || 0;
  const rate = r/100/12, n = y*12;
  const total = s*Math.pow(1+rate,n)+(rate>0?m*((Math.pow(1+rate,n)-1)/rate):m*n);
  const invested = s + m*n;
  const gain = total - invested;

  // Métriques dans la modale
  const mEl    = document.getElementById('dca-plan-m');
  const yEl    = document.getElementById('dca-plan-y');
  const totEl  = document.getElementById('dca-plan-total');
  const subEl  = document.getElementById('dca-plan-subtitle');
  if (mEl)   mEl.textContent   = m.toLocaleString('fr-FR') + ' €/mois';
  if (yEl)   yEl.textContent   = y + ' an' + (y>1?'s':'');
  if (totEl) totEl.textContent = fmtK(Math.round(total));
  if (subEl) subEl.textContent = `${s>0?s.toLocaleString('fr-FR')+'€ de départ · ':''}${r}%/an · +${fmtK(Math.round(gain))} d'intérêts composés`;

  // Reset contenu + désactiver le bouton save
  const contentEl = document.getElementById('dca-plan-content');
  const saveBtn   = document.getElementById('dca-plan-save-btn');
  if (contentEl) contentEl.innerHTML = `
    <div style="text-align:center;padding:30px;color:#8e8e93">
      <svg class="spinning" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a7f5a" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      <div style="font-size:14px;font-weight:600;margin-top:12px;color:#1c1c1e">Génération de ton plan personnalisé...</div>
      <div style="font-size:12px;color:#c7c7cc;margin-top:4px">L'IA analyse tes paramètres DCA</div>
    </div>`;
  if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = '0.5'; }

  // Ouvre la modale
  document.getElementById('dca-plan-modal').style.display = 'flex';

  // Stocke les params pour la sauvegarde finale
  window._dcaPlanParams = { m, y, r, s, total };

  // Génère le plan IA
  const risk = r >= 9 ? 'agressif' : r >= 6 ? 'equilibre' : 'prudent';
  const riskLabel = r >= 9 ? 'Agressif' : r >= 6 ? 'Équilibré' : 'Prudent';
  const portfolioCtx = positions.length
    ? `Portefeuille actuel : ${positions.slice(0,4).map(p=>`${p.name} (${p.type})`).join(', ')}.`
    : 'Pas encore de positions.';

  const prompt = `Tu es conseiller financier pour débutants. Un investisseur veut mettre en place ce DCA :
- Versement mensuel : ${m}€/mois
- Capital de départ : ${s}€
- Durée : ${y} ans
- Rendement visé : ${r}%/an (profil ${riskLabel})
- Objectif final estimé : ${fmtK(Math.round(total))}
${portfolioCtx}

Génère un plan d'action CONCRET en 4 blocs avec des titres en gras :

**🏦 Quoi acheter avec ton apport initial de ${s>0?s.toLocaleString('fr-FR')+'€':m.toLocaleString('fr-FR')+'€ (premier mois)'}**
Liste les actifs précis avec les montants exacts (ex: 300€ → IWDA.L sur Trade Republic)

**📅 Chaque mois : ${m.toLocaleString('fr-FR')}€ à répartir comme suit**
Répartition exacte mensuelle avec tickers et montants

**🎯 Pourquoi cette stratégie est adaptée à ton profil ${riskLabel}**
2 phrases claires et pédagogiques

**⚡ 3 actions concrètes pour démarrer cette semaine**
Étapes simples et actionnables (ouvrir compte, faire le 1er achat, activer DCA auto)

Sois ULTRA concret. Donne de vrais tickers (IWDA.L, VWCE.DE, AAPL, etc.) et de vrais montants.`;

  try {
    const r_resp = await callClaude(prompt, 'Tu es conseiller financier pédagogue. Sois concret et donne des vrais noms et montants.');
    if (contentEl) {
      // Extrait les lignes clés : première ligne de chaque bloc **titre**
      const keyLines = r_resp.split('\n')
        .filter(l => l.trim() && !l.startsWith('|') && !l.match(/^[-\s]+$/) && !l.match(/^\d+\./))
        .slice(0, 6)
        .map(l => l.replace(/\*\*/g,'').replace(/^#{1,3}\s*/,'').replace(/^[-•>]\s*/,'').trim())
        .filter(l => l.length > 5 && l.length < 80);

      const summaryHtml = keyLines.length ? `
        <div style="margin-bottom:14px">
          ${keyLines.map(l => `<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid #f5f5f5">
            <span style="color:#1a7f5a;font-weight:800;flex-shrink:0">✓</span>
            <span style="font-size:13px;color:#1c1c1e;font-weight:500">${l}</span>
          </div>`).join('')}
        </div>` : '';

      contentEl.innerHTML = `
        ${summaryHtml}
        <!-- Analyse complète masquée par défaut -->
        <div id="dca-full-analysis" style="display:none">
          <div style="font-size:14px;color:#1c1c1e;line-height:1.8;margin-bottom:12px">${formatMD(r_resp)}</div>
        </div>
        <button onclick="const el=document.getElementById('dca-full-analysis');const btn=this;if(el.style.display==='none'){el.style.display='block';btn.textContent='▴ Masquer l\'analyse';btn.style.background='#f0f0f0';}else{el.style.display='none';btn.textContent='🔬 Voir l\'analyse complète';btn.style.background='#fff';}"
          style="width:100%;background:#fff;border:1.5px solid #e5e5ea;border-radius:10px;padding:10px;font-size:13px;font-weight:700;color:#1c1c1e;cursor:pointer;margin-bottom:12px;transition:all 0.15s">
          🔬 Voir l'analyse complète
        </button>
        <div style="background:#e8f8f0;border-radius:12px;padding:12px 14px;border-left:3px solid #1a7f5a">
          <div style="font-size:12px;font-weight:700;color:#1a7f5a">✓ Plan prêt — clique sur Sauvegarder</div>
          <div style="font-size:12px;color:#065f46;margin-top:3px">Retrouve ce plan et ton graphique de projection dans la page Objectif.</div>
        </div>`;
    }
    if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; }
  } catch(e) {
    if (contentEl) contentEl.innerHTML = `<div style="color:#cc2f26;padding:16px;font-size:13px">Erreur de génération — réessaie.</div>`;
  }
}

function closeDCAPlanModal() {
  document.getElementById('dca-plan-modal').style.display = 'none';
}

async function confirmSaveDCAObjective() {
  const p = window._dcaPlanParams;
  if (!p) return;

  // Pré-remplit les variables globales objectif
  objChartCapital = p.s;
  objChartMonthly = p.m;
  objChartTarget  = Math.round(p.total);
  objChartYears   = p.y;
  objChartRate    = p.r;
  objRisk         = p.r >= 9 ? 'agressif' : p.r >= 6 ? 'equilibre' : 'prudent';

  const label = `DCA ${p.m.toLocaleString('fr-FR')}€/mois · ${p.y}ans`;
  await validateObjectif(label);

  closeDCAPlanModal();
  nav('objectif');
  showToast('🎯 Objectif sauvegardé ! Suis ta progression dans Objectif.');
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

  // Update chart — highlight UNIQUEMENT la courbe de l'objectif actif
  if (objChartInstance) {
    const maxYears = Math.max(...allObjectives.map(o => o.years));
    const maxMonths = maxYears * 12;
    const step = Math.max(1, Math.floor(maxMonths / 60));
    // monthIndex est basé sur l'objectif actif, on le convertit en index chart
    const chartIndex = Math.round(monthIndex / step);

    // Highlight uniquement la courbe active (dataset index = position dans allObjectives * 2)
    const activeIdx = allObjectives.findIndex(o => o.id === activeObjId);
    objChartInstance.data.datasets.forEach((ds, di) => {
      if (di % 2 === 0) {
        if (di === activeIdx * 2) {
          // Courbe active : point visible
          ds.pointRadius = ds.data.map((_,i) => i === chartIndex ? 8 : 0);
          ds.pointBackgroundColor = ds.borderColor;
          ds.borderWidth = 3;
          ds.borderColor = allObjectives[activeIdx]?.color || ds.borderColor;
        } else {
          // Autres courbes : pas de point, légèrement estompées
          ds.pointRadius = ds.data.map(() => 0);
          ds.borderWidth = 1.5;
        }
      }
    });
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
  // Mid-cap françaises populaires
  {ticker:'SOI.PA',name:'Soitec',type:'Action',sector:'Semi-conducteurs',exchange:'Euronext'},
  {ticker:'ALTEN.PA',name:'Alten',type:'Action',sector:'Tech',exchange:'Euronext'},
  {ticker:'DDOG',name:'Datadog',type:'Action',sector:'Tech',exchange:'NASDAQ'},
  {ticker:'CRWD',name:'CrowdStrike',type:'Action',sector:'Cybersécurité',exchange:'NASDAQ'},
  {ticker:'NET',name:'Cloudflare',type:'Action',sector:'Tech',exchange:'NYSE'},
  {ticker:'SMCP.PA',name:'SMCP',type:'Action',sector:'Luxe',exchange:'Euronext'},
  {ticker:'ERF.PA',name:'Eurofins Scientific',type:'Action',sector:'Santé',exchange:'Euronext'},
  {ticker:'SY1.DE',name:'Symrise',type:'Action',sector:'Chimie',exchange:'XETRA'},
  {ticker:'NOVO-B.CO',name:'Novo Nordisk B',type:'Action',sector:'Santé',exchange:'Copenhague'},
  {ticker:'NESN.SW',name:'Nestlé',type:'Action',sector:'Alimentation',exchange:'Zurich'},
  {ticker:'SHEL.L',name:'Shell',type:'Action',sector:'Énergie',exchange:'LSE'},
  {ticker:'RIO.L',name:'Rio Tinto',type:'Action',sector:'Matières premières',exchange:'LSE'},
  {ticker:'BARC.L',name:'Barclays',type:'Action',sector:'Finance',exchange:'LSE'},
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
      // Pré-remplit le PRU avec le prix actuel (modifiable par l'utilisateur)
      const pruInput = document.getElementById('f-pru');
      if (pruInput && !pruInput.value) {
        pruInput.value = q.price.toFixed(2);
      }
      // Met à jour le total
      updatePosTotal();
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

function updatePosTotal() {
  const qty   = parseFloat(document.getElementById('f-qty')?.value)   || 0;
  const pru   = parseFloat(document.getElementById('f-pru')?.value)   || 0;
  const price = parseFloat(document.getElementById('f-price')?.value) || 0;
  const preview = document.getElementById('pos-total-preview');
  const detailEl = document.getElementById('pos-total-detail');
  const valEl    = document.getElementById('pos-total-val');
  const pnlEl    = document.getElementById('pos-total-pnl');

  if (!preview) return;

  if (qty > 0 && price > 0) {
    preview.style.display = 'block';
    const totalInvesti = qty * pru;
    const valActuelle  = qty * price;
    const pnl = pru > 0 ? valActuelle - totalInvesti : 0;
    const pnlPct = totalInvesti > 0 ? (pnl / totalInvesti * 100).toFixed(1) : null;

    if (detailEl) detailEl.textContent = `${qty} × ${price.toLocaleString('fr-FR', {minimumFractionDigits:2})}€`;
    if (valEl)    valEl.textContent    = `= ${(valActuelle).toLocaleString('fr-FR', {minimumFractionDigits:2})}€`;

    if (pnlEl) {
      if (pru > 0 && pru !== price) {
        const sign = pnl >= 0 ? '+' : '';
        pnlEl.innerHTML = `<span style="color:${pnl>=0?'#1a7f5a':'#cc2f26'}">
          PRU ${pru.toLocaleString('fr-FR', {minimumFractionDigits:2})}€ · Investi ${totalInvesti.toLocaleString('fr-FR', {minimumFractionDigits:2})}€ · P&L ${sign}${pnl.toLocaleString('fr-FR', {minimumFractionDigits:2})}€ (${sign}${pnlPct}%)
        </span>`;
      } else {
        pnlEl.innerHTML = `<span style="color:#8e8e93">PRU = prix actuel · Investissement : ${totalInvesti.toLocaleString('fr-FR', {minimumFractionDigits:2})}€</span>`;
      }
    }
  } else {
    preview.style.display = 'none';
  }
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
  el.style.transform = 'translateY(10px)';
  el.classList.add('active');
  requestAnimationFrame(() => {
    el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
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

// ===== PROFILS PARCOURS CLIENT =====
const OB_PROFILES = {
  debutant: {
    label: 'Débutant 🌱', icon: '🌱',
    risk: 'faible', horizon: 'long',
    preview: "On va tout t'expliquer. 100% ETF monde, zéro jargon, maximum de sécurité.",
    presets: [{capital:0, monthly:50, target:5000, label:'Micro (50€/mois)'}, {capital:500, monthly:100, target:15000, label:'Démarrage'}, {capital:1000, monthly:200, target:30000, label:'Standard'}],
    riskReco: "💡 Profil <strong>Prudent</strong> recommandé — 90% ETF monde IWDA. Pas de stress, rendement régulier.",
    defaultRisk: 'faible',
  },
  curieux: {
    label: 'Curieux 📚', icon: '📚',
    risk: 'faible', horizon: 'long',
    preview: "Tu as des bases. On t'aide à passer à l'action avec un plan ETF + 1-2 actions.",
    presets: [{capital:1000, monthly:100, target:20000, label:'Prudent'}, {capital:2000, monthly:200, target:50000, label:'Sérieux'}, {capital:5000, monthly:300, target:100000, label:'Objectif 100k'}],
    riskReco: "💡 Profil <strong>Équilibré</strong> recommandé — 70% ETF + 30% grandes caps.",
    defaultRisk: 'modere',
  },
  initie: {
    label: 'Initié 📈', icon: '📈',
    risk: 'modere', horizon: 'moyen',
    preview: "Tu connais les ETF. On optimise ton allocation et on t'aide à sélectionner les meilleures actions.",
    presets: [{capital:5000, monthly:300, target:50000, label:'Croissance'}, {capital:10000, monthly:500, target:100000, label:'100k€'}, {capital:20000, monthly:1000, target:250000, label:'Ambitieux'}],
    riskReco: "💡 <strong>Équilibré à Agressif</strong> selon ta tolérance — tu as l'expérience pour gérer la volatilité.",
    defaultRisk: 'modere',
  },
  confirme: {
    label: 'Confirmé 💼', icon: '💼',
    risk: 'eleve', horizon: 'moyen',
    preview: 'Portefeuille actif. Signaux IA, analyse technique, rééquilibrage — toutes les fonctions avancées sont pour toi.',
    presets: [{capital:20000, monthly:1000, target:200000, label:'Patrimoine'}, {capital:50000, monthly:2000, target:500000, label:'Demi-million'}, {capital:100000, monthly:3000, target:1000000, label:'Million'}],
    riskReco: "💡 <strong>Agressif</strong> recommandé si tu acceptes la volatilité. Sinon reste sur Équilibré.",
    defaultRisk: 'eleve',
  },
  gros: {
    label: 'Gros investisseur 🐳', icon: '🐳',
    risk: 'modere', horizon: 'long',
    preview: '50k€+ à structurer. Diversification avancée, multi-objectifs, optimisation fiscale.',
    presets: [{capital:50000, monthly:2000, target:300000, label:'Structuré'}, {capital:100000, monthly:5000, target:750000, label:'Haut patrimoine'}, {capital:200000, monthly:10000, target:2000000, label:'2M€'}],
    riskReco: "💡 <strong>Équilibré</strong> recommandé — à ton niveau le capital protection prime sur la performance brute.",
    defaultRisk: 'modere',
  },
  expert: {
    label: 'Expert / Trader 🏆', icon: '🏆',
    risk: 'eleve', horizon: 'court',
    preview: 'Mode expert activé. Accès à tous les signaux IA, analyse avancée et outils de trading.',
    presets: [{capital:10000, monthly:2000, target:200000, label:'Trading actif'}, {capital:50000, monthly:5000, target:500000, label:'Pro'}, {capital:100000, monthly:10000, target:1000000, label:'Million'}],
    riskReco: "💡 <strong>Agressif</strong> — tu sais ce que tu fais. Toutes les fonctions avancées sont activées.",
    defaultRisk: 'eleve',
  },
};

let obProfileLevel = 'debutant';

function obSelectProfile(level) {
  obProfileLevel = level;
  document.getElementById('ob-profile-level').value = level;
  const p = OB_PROFILES[level];

  // Visuels cartes
  Object.keys(OB_PROFILES).forEach(l => {
    const card = document.getElementById('obp-' + l);
    if (card) {
      card.style.borderColor = l === level ? '#1c1c1e' : '#e5e5ea';
      card.style.background  = l === level ? '#f5f5f5' : '#fff';
      card.style.transform   = l === level ? 'scale(1.02)' : 'scale(1)';
    }
  });

  // Preview adaptatif
  const prev = document.getElementById('ob-profile-preview');
  const prevLabel = document.getElementById('ob-preview-label');
  const prevDesc  = document.getElementById('ob-preview-desc');
  if (prev && p) {
    prev.style.display = 'block';
    if (prevLabel) prevLabel.textContent = p.label + " — Ce qu'on va faire pour toi :";
    if (prevDesc)  prevDesc.textContent  = p.preview;
  }

  // Active bouton suivant
  const btn = document.getElementById('ob-btn-1');
  if (btn) btn.disabled = false;

  // Pré-sélectionne le risque recommandé
  obSelectRisk(p.defaultRisk);
}

function showOnboarding(force) {
  if (!force && localStorage.getItem(OB_KEY)) return;
  obGoals = { long: false, court: false, retraite: false, projet: false };
  obNext(1);
  document.getElementById('onboarding-modal').style.display = 'flex';
}

function obNext(step) {
  // Validation étape 2→3 : budget obligatoire
  if (step === 3) {
    const bankroll = document.getElementById('ob-bankroll')?.value;
    const monthly  = document.getElementById('ob-monthly')?.value;
    const target   = document.getElementById('ob-target')?.value;
    if (!bankroll || !monthly || !target) {
      const err = document.getElementById('ob-budget-error');
      if (err) err.style.display = 'block';
      return;
    }
    const err = document.getElementById('ob-budget-error');
    if (err) err.style.display = 'none';
  }

  // Transition fluide entre étapes
  const currentStep = document.querySelector('.onboard-step[style*="block"]');
  const nextStep = document.getElementById('ob-step-' + step);
  if (!nextStep) return;

  const currentNum = currentStep ? parseInt(currentStep.id.replace('ob-step-','')) : 0;
  const dir = step > currentNum ? 1 : -1;

  if (currentStep && currentStep !== nextStep) {
    currentStep.style.cssText += 'transition:opacity 0.18s ease,transform 0.18s ease;opacity:0;transform:translateX(' + (dir * -24) + 'px)';
    setTimeout(() => {
      document.querySelectorAll('.onboard-step').forEach(s => { s.style.display = 'none'; s.style.opacity = ''; s.style.transform = ''; s.style.transition = ''; });
      nextStep.style.display = 'block';
      nextStep.style.opacity = '0';
      nextStep.style.transform = 'translateX(' + (dir * 24) + 'px)';
      nextStep.style.transition = 'opacity 0.22s ease,transform 0.22s ease';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        nextStep.style.opacity = '1';
        nextStep.style.transform = 'translateX(0)';
      }));
    }, 180);
  } else {
    document.querySelectorAll('.onboard-step').forEach(s => s.style.display = 'none');
    nextStep.style.display = 'block';
  }

  // Étape 2 : presets selon profil
  if (step === 2) {
    const p = OB_PROFILES[obProfileLevel];
    const presetsEl = document.getElementById('ob-budget-presets');
    if (presetsEl && p) {
      presetsEl.innerHTML = p.presets.map(pr =>
        `<button onclick="obApplyPreset(${pr.capital},${pr.monthly},${pr.target})"
          style="background:#f0f0f0;border:none;border-radius:99px;padding:6px 12px;font-size:12px;font-weight:700;color:#1c1c1e;cursor:pointer;white-space:nowrap"
          onmouseover="this.style.background='#1c1c1e';this.style.color='#fff'"
          onmouseout="this.style.background='#f0f0f0';this.style.color='#1c1c1e'">
          ${pr.label}
        </button>`
      ).join('');
    }
  }

  // Étape 3 : reco risque selon profil
  if (step === 3) {
    const p = OB_PROFILES[obProfileLevel];
    const recoEl = document.getElementById('ob-risk-reco');
    if (recoEl && p) { recoEl.innerHTML = p.riskReco; recoEl.style.display = 'block'; }
    if (p) obSelectRisk(p.defaultRisk);
  }

  // Étape 4 : label profil + générer plan
  if (step === 4) {
    const p = OB_PROFILES[obProfileLevel];
    const labelEl = document.getElementById('ob-plan-profile-label');
    if (labelEl && p) labelEl.textContent = p.label;
    obGeneratePlan();
  }
}

function obApplyPreset(capital, monthly, target) {
  const b = document.getElementById('ob-bankroll');
  const m = document.getElementById('ob-monthly');
  const t = document.getElementById('ob-target');
  if (b) b.value = capital;
  if (m) m.value = monthly;
  if (t) t.value = target;
  obCheckBudget();
  obUpdateBudgetPreview();
}

function obUpdateBudgetPreview() {
  const capital = parseFloat(document.getElementById('ob-bankroll')?.value) || 0;
  const monthly = parseFloat(document.getElementById('ob-monthly')?.value)  || 0;
  const target  = parseFloat(document.getElementById('ob-target')?.value)   || 0;
  const preview  = document.getElementById('ob-budget-preview');
  const previewT = document.getElementById('ob-preview-text');
  if (!preview || !previewT) return;
  if (capital > 0 || monthly > 0) {
    const rate = 0.07/12, n = 10*12;
    const fv = capital * Math.pow(1+rate,n) + (monthly > 0 ? monthly*((Math.pow(1+rate,n)-1)/rate) : 0);
    preview.style.display = 'block';
    const onTrack = target > 0 && fv >= target;
    previewT.innerHTML = `En 10 ans : <strong style="color:#1a7f5a">${fmtK(Math.round(fv))}</strong>${target > 0 ? ` · Objectif ${fmtK(target)} : <strong style="color:${onTrack?'#1a7f5a':'#f59e0b'}">${onTrack?'✓ Atteignable en 10 ans':'⚠ Allonge la durée ou augmente le versement'}</strong>` : ''}`;
  } else {
    preview.style.display = 'none';
  }
}

function obToggleGoal(goal) {
  if (!obGoals.hasOwnProperty(goal)) obGoals[goal] = false;
  obGoals[goal] = !obGoals[goal];
  try { localStorage.setItem('iq_ob_goals', JSON.stringify(obGoals)); } catch {}
  const card  = document.getElementById('ob-goal-' + goal);
  const check = document.getElementById('ob-check-' + goal);
  if (obGoals[goal]) {
    if (card)  { card.style.border = '2px solid #1c1c1e'; card.style.background = '#f5f5f5'; }
    if (check) { check.textContent = '✓'; check.style.color = '#1c1c1e'; check.style.fontWeight = '800'; }
  } else {
    if (card)  { card.style.border = '2px solid #e5e5ea'; card.style.background = '#fff'; }
    if (check) { check.textContent = '○'; check.style.fontWeight = '400'; }
  }
  const hEl = document.getElementById('ob-horizon');
  if (hEl) {
    if (obGoals.long || obGoals.retraite) hEl.value = 'long';
    else if (obGoals.court || obGoals.projet) hEl.value = 'moyen';
  }
  // Ne bloque pas le bouton suivant
  const btn = document.getElementById('ob-btn-4');
  if (btn && document.getElementById('ob-risk')?.value) btn.disabled = false;
}

function obSelectRisk(risk) {
  ['faible','modere','eleve'].forEach(r => {
    const card  = document.getElementById('ob-risk-' + r);
    const check = document.getElementById('ob-rcheck-' + r);
    if (card)  { card.style.border = r===risk ? '2px solid #1c1c1e' : '2px solid #e5e5ea'; card.style.background = r===risk ? '#f5f5f5' : '#fff'; }
    if (check) { check.textContent = r===risk ? '✓' : '○'; check.style.fontWeight = r===risk ? '800' : '400'; }
  });
  const rEl = document.getElementById('ob-risk');
  if (rEl) rEl.value = risk;
  // Active bouton dès que le risque est sélectionné
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
  // Tente les deux IDs possibles (ob-btn-3 ou ob-btn-3)
  ['ob-btn-3','ob-btn-2'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !filled;
  });
  const err = document.getElementById('ob-budget-error');
  if (err) err.style.display = filled ? 'none' : 'block';
}

async function obGeneratePlan() {
  // Restaure les goals depuis localStorage si obGoals a été réinitialisé (rechargement de page)
  try {
    const saved = JSON.parse(localStorage.getItem('iq_ob_goals') || 'null');
    if (saved && (saved.long || saved.court)) obGoals = saved;
  } catch {}
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

  // PLAN LONG TERME — uniquement si l'utilisateur a coché "long terme"
  if (obGoals.long) {
    const capitalLong = both ? budgetLong : bankroll;
    const monthlyLong = both ? Math.round(monthly * 0.7) : monthly;
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
  try { localStorage.removeItem('iq_ob_goals'); } catch {}
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
      // Update si objectif existant, sinon insert
      if (allObjectives.length > 0) {
        // Mise à jour du premier objectif existant
        const { error: oue } = await sb.from('objectives').update({
          capital: bankroll, monthly: monthly,
          target: target, years: 10, rate: objChartRate,
          risk: objRisk
        }).eq('id', allObjectives[0].id);
        if (oue) console.warn('[obFinish] update error:', oue.message);
      } else if (allObjectives.length < 3) {
        // Nouvel objectif seulement si moins de 3
        const { error: oie } = await sb.from('objectives').insert({
          user_id: currentUser.id, capital: bankroll, monthly: monthly,
          target: target, years: 10, rate: objChartRate,
          risk: objRisk
        });
        if (oie) console.warn('[obFinish] insert error:', oie.message);
      }
      await loadObjective();
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

  // Tables markdown
  function parseTable(block) {
    const lines = block.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return null;
    const isSep = l => /^[\|\s\-:]+$/.test(l);
    const sepIdx = lines.findIndex(isSep);
    if (sepIdx < 1) return null;
    const parseRow = l => l.split('|').map(c => c.trim()).filter((c,i,a) => i > 0 && i < a.length-1);
    const headers = parseRow(lines[sepIdx - 1]);
    const rows = lines.slice(sepIdx + 1).filter(l => l.includes('|'));
    if (!headers.length) return null;
    const thead = `<tr>${headers.map(h => `<th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid rgba(255,255,255,0.08)">${h}</th>`).join('')}</tr>`;
    const tbody = rows.map(r => {
      const cells = parseRow(r);
      return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05)">${cells.map(c => {
        const isNeg = /^-/.test(c) && c.includes('%') || c.includes('€') && c.startsWith('-');
        const isPos = c.startsWith('+') || (c.includes('%') && !c.startsWith('-'));
        const color = isNeg ? '#f87171' : isPos ? '#4ade80' : 'var(--color-text,#e6edf3)';
        return `<td style="padding:10px 14px;font-size:13px;color:${color};font-weight:${isNeg||isPos?'700':'500'}">${c}</td>`;
      }).join('')}</tr>`;
    }).join('');
    return `<div style="overflow-x:auto;margin:12px 0;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)"><table style="width:100%;border-collapse:collapse"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`;
  }

  // Remplacer les blocs table
  text = text.replace(/((\|[^\n]+\n?){2,})/g, block => {
    if (!block.includes('|')) return block;
    const t = parseTable(block);
    return t || block;
  });

  return text
    // Titres
    .replace(/^### (.+)$/gm, '<div style="font-size:14px;font-weight:800;color:var(--color-text,#fff);margin:14px 0 6px;letter-spacing:-0.02em">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-size:16px;font-weight:800;color:var(--color-text,#fff);margin:16px 0 8px;letter-spacing:-0.03em">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-size:18px;font-weight:900;color:var(--color-text,#fff);margin:16px 0 10px">$1</div>')
    // Bold + italic
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--color-text,#fff);font-weight:700">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Séparateur
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:12px 0">')
    // Alertes ⚠️
    .replace(/^⚠️(.+)$/gm, '<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:10px 14px;margin:8px 0;font-size:13px;color:#fbbf24;display:flex;gap:8px;align-items:flex-start">⚠️<span>$1</span></div>')
    // Listes à puce
    .replace(/^[-•] (.+)$/gm, '<div style="display:flex;gap:8px;margin:5px 0;align-items:flex-start"><span style="color:#3fb950;font-weight:800;flex-shrink:0;margin-top:1px">→</span><span style="font-size:13px;color:var(--color-text-secondary,rgba(255,255,255,0.7))">$1</span></div>')
    // Listes numérotées
    .replace(/^(\d+)\. (.+)$/gm, '<div style="display:flex;gap:8px;margin:5px 0;align-items:flex-start"><span style="background:rgba(63,185,80,0.15);color:#3fb950;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">$1</span><span style="font-size:13px;color:var(--color-text-secondary,rgba(255,255,255,0.7))">$2</span></div>')
    .replace(/\n\n/g, '<div style="height:8px"></div>')
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

function toggleFavorite(ticker, name, sector) {
  // Synchrone et immédiat - plus de loadWatchlist() qui réinitialise
  const isFav = favToggleSync(ticker, name || ticker);
  showToast(isFav ? '★ ' + (name||ticker) + ' ajouté aux favoris !' : 'Retiré des favoris');
  updateFavPill();
  return isFav;
}

function isFavorite(ticker) {
  return watchlist.some(w => w.ticker === ticker);
}

function favToggleSync(ticker, name) {
  // Synchrone — modifie watchlist directement sans recharger depuis Supabase
  const idx = watchlist.findIndex(w => w.ticker === ticker);
  if (idx >= 0) {
    watchlist.splice(idx, 1);
  } else {
    watchlist.push({ ticker, name: name||ticker, sector: '' });
  }
  // Sauvegarde en arrière-plan
  saveWatchlist();
  // Retourne true si maintenant en favori
  return watchlist.some(w => w.ticker === ticker);
}

function removeFavNewsCard(cardId) {
  // Retire juste la carte de l'affichage (l'actu disparaît des favoris visuellement)
  const card = document.getElementById(cardId);
  if (card) {
    card.style.transition = 'opacity 0.2s, transform 0.2s';
    card.style.opacity = '0';
    card.style.transform = 'translateX(30px)';
    setTimeout(() => {
      card.remove();
      const remaining = document.querySelectorAll('[id^="fav-news-"]');
      if (remaining.length === 0) {
        const list = document.getElementById('news-list');
        if (list) list.innerHTML += '<div style="text-align:center;padding:20px;color:#8e8e93">Plus aucune actu</div>';
      }
    }, 200);
  }
}

function removeFavCard(cardId, ticker, name) {
  favToggleSync(ticker, name);
  const card = document.getElementById(cardId);
  if (card) {
    card.style.transition = 'opacity 0.2s, transform 0.2s';
    card.style.opacity = '0';
    card.style.transform = 'translateX(30px)';
    setTimeout(() => {
      card.remove();
      newsTabCache.favoris.html = '';
      const remaining = document.querySelectorAll('[id^="fav-card-"]');
      if (remaining.length === 0) {
        const list = document.getElementById('news-list');
        if (list) list.innerHTML = '<div style="text-align:center;padding:30px;color:#8e8e93"><div style="font-size:32px;margin-bottom:10px">⭐</div><div style="font-size:15px;font-weight:700;color:#1c1c1e">Aucun favori</div></div>';
      }
    }, 200);
  }
  showToast('Retiré des favoris');
  updateFavPill();
}

function toggleNewsItemFav(ticker, name, cardId) {
  const isRealTicker = ticker && !ticker.startsWith('news-') && ticker.length < 20;
  if (!isRealTicker) return;

  const isFav = favToggleSync(ticker, name);

  // Met à jour toutes les étoiles liées à ce ticker dans la page
  // 1. Étoile dans la card (id="star-news-N")
  const card = cardId ? document.getElementById(cardId) : null;
  if (card) {
    const starInCard = card.querySelector('[id^="star-news-"]');
    if (starInCard) {
      starInCard.textContent = isFav ? '★' : '☆';
      starInCard.style.color = isFav ? '#f59e0b' : '#c7c7cc';
      starInCard.title = isFav ? 'Retirer des favoris' : 'Ajouter aux favoris';
    }
    // Animation retrait si on est dans favoris
    if (!isFav && newsFilter === 'favoris') {
      card.style.transition = 'opacity 0.2s, transform 0.2s';
      card.style.opacity = '0';
      card.style.transform = 'translateX(20px)';
      setTimeout(() => { card.remove(); newsTabCache.favoris.html = ''; }, 200);
    }
  }
  // 2. Étoiles dans les autres onglets (classe ent-star-TICKER)
  document.querySelectorAll(`.ent-star-${ticker}`).forEach(b => {
    b.textContent = isFav ? '★' : '☆';
    b.style.color  = isFav ? '#f59e0b' : 'rgba(0,0,0,0.2)';
  });
  // 3. Bouton popular-chip si visible
  const popBtn = document.getElementById('pop-btn-' + ticker);
  if (popBtn) {
    popBtn.textContent = isFav ? '★ Suivi' : '+ Suivre';
    popBtn.style.background = isFav ? '#e8f8f0' : '#f5f5f5';
    popBtn.style.color = isFav ? '#1a7f5a' : '#1c1c1e';
  }

  showToast(isFav ? '★ ' + (name || ticker) + ' ajouté !' : 'Retiré des favoris');
  updateFavPill();
}

function flipStar(btn) {
  const on = btn.textContent === '☆';
  btn.textContent = on ? '★' : '☆';
  btn.style.color = on ? '#f59e0b' : 'rgba(0,0,0,0.15)';
}

function toggleStar(btn, ticker, name) {
  if (!ticker || ticker.startsWith('news-')) return;
  const isFav = favToggleSync(ticker, name || ticker);
  btn.textContent = isFav ? '★' : '☆';
  btn.style.color = isFav ? '#f59e0b' : 'rgba(0,0,0,0.15)';
  showToast(isFav ? '★ ' + (name||ticker) + ' ajouté aux favoris !' : 'Retiré des favoris');
  updateFavPill();
}

function refreshAllStars() {
  // Met à jour toutes les étoiles de la page selon la watchlist actuelle
  document.querySelectorAll('[data-ticker]').forEach(btn => {
    const ticker = btn.getAttribute('data-ticker');
    if (ticker) {
      const fav = isFavorite(ticker);
      btn.textContent = fav ? '★' : '☆';
      btn.style.color = fav ? '#f59e0b' : 'rgba(0,0,0,0.15)';
    }
  });
}

function updateFavPill() {
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
  loadWatchlist().then(() => setTimeout(refreshAllStars, 100));
  const container = document.getElementById('news-page-content');
  if (!container) return;

  loadWatchlist();
  const portfolioCompanies = positions.map(p => ({
    ticker: p.name, name: p.name, sector: p.sector || 'Portefeuille', inPortfolio: true
  }));
  const watchCompanies = watchlist.map(w => ({ ...w, inPortfolio: false }));
  const allTracked = [...portfolioCompanies, ...watchCompanies.filter(w => !portfolioCompanies.find(p => p.ticker === w.ticker))];
  const uniqPos = positions.filter((p,i,a) => a.findIndex(x => x.name === p.name) === i).length;

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

    <!-- FILTER PILLS LIGNE 1 : onglets principaux -->
    <div style="display:flex;gap:6px;overflow-x:auto;padding:14px 0 6px;scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch">
      <button class="filter-pill active" id="news-fil-tous" onclick="setNewsFilter('tous',this)" style="white-space:nowrap;flex-shrink:0">📰 Toutes</button>
      <button class="filter-pill" id="news-fil-signaux" onclick="setNewsFilter('signaux',this)" style="white-space:nowrap;flex-shrink:0;background:linear-gradient(135deg,#cc2f26,#ff5c5c);color:#fff;border-color:#cc2f26;box-shadow:0 0 10px rgba(204,47,38,0.35);font-weight:800">⚡ Signaux</button>
      <button class="filter-pill" id="news-fil-entreprises" onclick="setNewsFilter('entreprises',this)" style="white-space:nowrap;flex-shrink:0">🏢 Entreprises</button>
      <button class="filter-pill" id="news-fil-favoris" onclick="setNewsFilter('favoris',this)" style="white-space:nowrap;flex-shrink:0">⭐ Favoris${watchlist.length > 0 ? ` <span style="background:#f59e0b;color:#fff;border-radius:99px;font-size:10px;font-weight:800;padding:1px 6px;margin-left:2px">${watchlist.length}</span>` : ''}</button>
      <button class="filter-pill" id="news-fil-agenda" onclick="setNewsFilter('agenda',this)" style="white-space:nowrap;flex-shrink:0">📅 Agenda</button>
    </div>

    <!-- FILTER PILLS LIGNE 2 : filtres catégories (visibles seulement sur "Toutes") -->
    <div id="news-cat-filters" style="display:flex;gap:6px;overflow-x:auto;padding-bottom:14px;scrollbar-width:none;-ms-overflow-style:none">
      <span style="font-size:11px;font-weight:700;color:#c7c7cc;text-transform:uppercase;letter-spacing:0.4px;align-self:center;white-space:nowrap;flex-shrink:0">Filtrer :</span>
      <button class="filter-pill" id="news-fil-macro" onclick="setNewsFilter('macro',this)" style="white-space:nowrap;flex-shrink:0;font-size:12px;padding:5px 11px">🌍 Macro</button>
      <button class="filter-pill" id="news-fil-banque" onclick="setNewsFilter('banque',this)" style="white-space:nowrap;flex-shrink:0;font-size:12px;padding:5px 11px">🏦 Banques centrales</button>
      <button class="filter-pill" id="news-fil-marche" onclick="setNewsFilter('marche',this)" style="white-space:nowrap;flex-shrink:0;font-size:12px;padding:5px 11px">📈 Marchés</button>
      <button class="filter-pill" id="news-fil-geo" onclick="setNewsFilter('geo',this)" style="white-space:nowrap;flex-shrink:0;font-size:12px;padding:5px 11px">⚡ Géopolitique</button>
      <button class="filter-pill" id="news-fil-secteur" onclick="setNewsFilter('secteur',this)" style="white-space:nowrap;flex-shrink:0;font-size:12px;padding:5px 11px">🏢 Secteurs</button>
    </div>

    <!-- BLOOMBERG TICKER STRIP -->
    ${allTracked.length > 0 ? `
    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:#8e8e93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">
        Mes valeurs · <span style="font-weight:400;color:#c7c7cc">${watchlist.length} favoris · ${uniqPos} position${uniqPos > 1 ? 's' : ''}</span>
      </div>
      <div style="background:#0f0f10;border-radius:12px;overflow:hidden;position:relative;height:42px">
        <div style="display:flex;overflow:hidden;position:relative;height:42px;align-items:center">
          <div class="bloomberg-ticker" id="bloomberg-strip">${buildBloombergTicker(allTracked)}</div>
        </div>
      </div>
    </div>` : `
    <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:#f9f9f9;border-radius:12px;margin-bottom:14px;border:1.5px dashed #e5e5ea">
      <span style="font-size:20px">🔍</span>
      <div style="font-size:13px;color:#8e8e93;font-weight:500">Recherche une entreprise ci-dessus et clique <strong>+ Suivre</strong> pour la tracker</div>
    </div>`}

    <!-- POPULAR TO ADD (seulement si < 3 suivis) -->
    ${allTracked.length < 3 ? `
    <div style="margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:#8e8e93;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px">Populaires à suivre</div>
      <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none">
        ${POPULAR.filter(p => !allTracked.find(t => t.ticker === p.ticker)).slice(0, 6).map(p => `
          <div style="background:#fff;border-radius:12px;padding:10px 12px;border:1.5px solid #f0f0f0;flex-shrink:0;min-width:130px;cursor:pointer" onclick="openCompany('${p.ticker}','${p.name}','${p.sector}')">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px">
              <div style="width:28px;height:28px;border-radius:8px;background:#1c1c1e;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center">${p.ticker.slice(0,2)}</div>
              <div>
                <div style="font-size:12px;font-weight:800;color:#1c1c1e;line-height:1.2">${p.name}</div>
                <div style="font-size:10px;color:#8e8e93">${p.sector}</div>
              </div>
            </div>
            <button onclick="event.stopPropagation();toggleFavorite('${p.ticker}','${p.name}','${p.sector}')" id="pop-btn-${p.ticker}"
              style="width:100%;background:${isFavorite(p.ticker)?'#e8f8f0':'#f5f5f5'};color:${isFavorite(p.ticker)?'#1a7f5a':'#1c1c1e'};border:none;border-radius:8px;padding:5px 0;font-size:11px;font-weight:700;cursor:pointer">
              ${isFavorite(p.ticker) ? '★ Suivi' : '+ Suivre'}
            </button>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <!-- NEWS HEADER -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="font-size:14px;font-weight:800;color:#1c1c1e" id="news-section-title">Actualités du marché</div>
      <button class="btn-refresh" id="news-refresh-btn" onclick="Object.keys(newsTabCache).forEach(k=>{newsTabCache[k].html='';newsTabCache[k].ts=0;});newsData=[];loadNews(true)">
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
  favoris:     { data: null, ts: 0, html: '' },
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

function renderFavorisActus() {
  const list = document.getElementById('news-list');
  if (!list) return;

  if (watchlist.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:#8e8e93"><div style="font-size:40px;margin-bottom:12px">⭐</div><div style="font-size:16px;font-weight:700;color:#1c1c1e;margin-bottom:8px">Aucune entreprise suivie</div><div style="font-size:13px">Va dans Entreprises et clique sur ☆ pour suivre</div></div>';
    return;
  }

  // Charge les actus des entreprises suivies
  const companies = watchlist.map(w => ({ ticker: w.ticker, name: w.name || w.ticker }));
  
  list.innerHTML = '<div style="font-size:11px;font-weight:700;color:#8e8e93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">⭐ Actus de tes ' + watchlist.length + ' entreprise' + (watchlist.length>1?'s suivies':' suivie') + '</div>'
    + '<div id="fav-actus-content" style="text-align:center;padding:24px;color:#8e8e93"><div style="font-size:24px;margin-bottom:8px">🧠</div><div>Chargement...</div></div>';

  loadEntrepriseNews(companies);
}

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
  const newsEl = document.getElementById('fav-actus-content') || document.getElementById('ent-news-list');
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

    const isDark2 = document.documentElement.getAttribute('data-theme') === 'dark';
    const surf2 = isDark2 ? 'var(--color-surface)' : '#fff';
    const bord2 = isDark2 ? 'var(--color-border)' : '#e4e4e7';
    const txt2 = isDark2 ? 'var(--color-text)' : '#09090b';
    const sub2 = isDark2 ? 'var(--color-text-secondary)' : '#71717a';
    const LCOLORS2 = ['#3fb950','#6366f1','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#ef4444'];

    const impactColorDark = { positif:'#3fb950', negatif:'#f87171', neutre: sub2 };
    const impactBgDark = { positif:isDark2?'rgba(63,185,80,0.12)':'#f0fdf4', negatif:isDark2?'rgba(248,113,113,0.12)':'#fef2f2', neutre:isDark2?'rgba(255,255,255,0.06)':'#f4f4f5' };

    newsEl.innerHTML = articles.map(a => {
      const myPos = positions.find(p => p.name === a.ticker);
      const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(a.entreprise + ' actualité bourse 2026');
      const logoColor = LCOLORS2[(a.ticker||'').charCodeAt(0) % LCOLORS2.length];
      const logoText = (a.ticker||'XX').slice(0,2).toUpperCase();
      const ic = impactColorDark[a.impact] || sub2;
      const ib = impactBgDark[a.impact] || (isDark2?'rgba(255,255,255,0.06)':'#f4f4f5');
      const hoverBg2 = isDark2 ? 'rgba(255,255,255,0.03)' : '#fafafa';
      const isFav = isFavorite(a.ticker);
      return `
      <div style="background:${surf2};border:1px solid ${bord2};border-radius:14px;padding:16px;margin-bottom:10px;transition:all 0.15s"
        onmouseover="this.style.background='${hoverBg2}';this.style.borderColor='${logoColor}40'"
        onmouseout="this.style.background='${surf2}';this.style.borderColor='${bord2}'">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <!-- Logo réel -->
            ${getCompanyLogo(a.ticker, a.entreprise, 40, 11)}
            <div>
              <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:3px">
                <span style="font-size:13px;font-weight:700;color:${txt2}">${a.entreprise}</span>
                <span style="font-size:11px;color:${sub2};background:${isDark2?'rgba(255,255,255,0.08)':'#f4f4f5'};padding:1px 7px;border-radius:4px">${a.ticker}</span>
                ${myPos ? `<span style="background:rgba(63,185,80,0.12);border:1px solid rgba(63,185,80,0.25);color:#3fb950;font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px">📦 Portef.</span>` : ''}
              </div>
              <div style="display:flex;gap:6px;align-items:center">
                <span style="background:${ib};color:${ic};font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px">${a.categorie}</span>
                <span style="font-size:11px;color:${sub2}">${a.date}</span>
              </div>
            </div>
          </div>
          <!-- Étoile -->
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;cursor:pointer"
            onclick="event.stopPropagation();toggleStar(this.querySelector('button'),'${a.ticker}','${a.entreprise}')">
            <span style="font-size:11px;font-weight:700;color:${isFav?'#f59e0b':logoColor}">${a.entreprise}</span>
            <button class="ent-star-${a.ticker}" style="background:none;border:none;cursor:pointer;font-size:20px;padding:0;line-height:1;color:${isFav?'#f59e0b':sub2}">
              ${isFav?'★':'☆'}
            </button>
          </div>
        </div>
        <!-- Titre -->
        <div style="font-size:14px;font-weight:700;color:${ic};line-height:1.4;margin-bottom:6px">${a.titre}</div>
        <!-- Résumé -->
        <div style="font-size:13px;color:${txt2};line-height:1.6;margin-bottom:12px;opacity:0.8">${a.resume}</div>
        <!-- Actions -->
        <div style="display:flex;gap:8px">
          <a href="${searchUrl}" target="_blank" rel="noopener"
            style="flex:1;background:${isDark2?'rgba(255,255,255,0.06)':'#f4f4f5'};color:${sub2};border:1px solid ${bord2};border-radius:10px;padding:9px 12px;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;text-align:center;display:block">
            🔗 Voir les articles
          </a>
          <button onclick="showEntrepriseDetail('${a.ticker}','${a.entreprise}')"
            style="flex:1;background:${isDark2?'var(--color-text)':'#09090b'};color:${isDark2?'var(--color-bg)':'#fff'};border:none;border-radius:10px;padding:9px 12px;font-size:12px;font-weight:700;cursor:pointer">
            📊 Voir la fiche
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
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const surf = isDark ? 'var(--color-surface)' : '#fff';
    const raised = isDark ? 'var(--color-surface-raised)' : '#f9fafb';
    const bord = isDark ? 'var(--color-border)' : '#e4e4e7';
    const txt = isDark ? 'var(--color-text)' : '#09090b';
    const sub = isDark ? 'var(--color-text-secondary)' : '#71717a';
    const metricBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

    // Logo couleur par ticker
    const LCOLORS = ['#3fb950','#6366f1','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#ef4444','#14b8a6','#f97316'];
    const logoColor = LCOLORS[(s.ticker||'').charCodeAt(0) % LCOLORS.length];
    const logoText = (s.ticker||'XX').slice(0,2).toUpperCase();

    // Couleurs signal
    const sigColors = { acheter:'#3fb950', attendre:'#f59e0b', vendre:'#f87171', eviter:'#8e8e93' };
    const sigBgNew = { acheter:isDark?'rgba(63,185,80,0.08)':'#f0fdf4', attendre:isDark?'rgba(245,158,11,0.08)':'#fffbeb', vendre:isDark?'rgba(248,113,113,0.08)':'#fef2f2', eviter:isDark?'rgba(255,255,255,0.04)':'#f9fafb' };
    const sigBorderNew = { acheter:isDark?'rgba(63,185,80,0.2)':'rgba(34,197,94,0.2)', attendre:isDark?'rgba(245,158,11,0.2)':'rgba(245,158,11,0.2)', vendre:isDark?'rgba(248,113,113,0.2)':'rgba(248,113,113,0.2)', eviter:bord };
    const sigLabelNew = { acheter:'ACHETER', attendre:'ATTENDRE', vendre:'VENDRE', eviter:'ÉVITER' };
    const sc = sigColors[s.signal] || '#8e8e93';
    const sb = sigBgNew[s.signal] || raised;
    const sbd = sigBorderNew[s.signal] || bord;

    return `
    <div id="sig-card-${s.ticker}" style="background:${sb};border:1px solid ${sbd};border-left:3px solid ${sc};border-radius:14px;padding:16px;margin-bottom:10px;cursor:pointer;transition:all 0.15s"
      onmouseover="this.style.borderColor='${sc}'" onmouseout="this.style.borderLeftColor='${sc}';this.style.borderColor='${sbd}'"
      onclick="openDecisionFromPos('${s.ticker}','${s.signal==='acheter'?'acheter':s.signal==='vendre'?'vendre':'garder'}')">

      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:12px">
          <!-- Logo -->
          ${getCompanyLogo(s.ticker, s.name, 42, 12)}
          <div>
            <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:3px">
              <span style="font-size:14px;font-weight:700;color:${txt}">${s.name}</span>
              <span style="font-size:11px;color:${sub};background:${isDark?'rgba(255,255,255,0.08)':'#f4f4f5'};padding:1px 7px;border-radius:4px">${s.ticker}</span>
              ${isMine ? `<span style="background:${isDark?'rgba(63,185,80,0.15)':'#f0fdf4'};border:1px solid ${isDark?'rgba(63,185,80,0.3)':'rgba(34,197,94,0.3)'};color:#3fb950;font-size:10px;font-weight:700;padding:1px 7px;border-radius:4px">📦 Portef.</span>` : ''}
            </div>
            <div style="font-size:11px;color:${sub};margin-bottom:4px">${s.type||'Action'} · ${s.secteur||''}</div>
            <div style="display:flex;align-items:center;gap:5px">
              <span style="font-size:10px;font-weight:700;color:${sub}">RISQUE</span>
              ${riskBar(s.risque||3)}
            </div>
          </div>
        </div>
        <!-- Badge signal -->
        <div style="background:${sc};color:#fff;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:800;letter-spacing:0.03em;white-space:nowrap">
          ${sigLabelNew[s.signal]||s.signal.toUpperCase()}
        </div>
      </div>

      <!-- Raison -->
      <div style="font-size:13px;color:${txt};font-weight:400;line-height:1.5;margin-bottom:12px;opacity:0.85">${s.raison}</div>

      <!-- Métriques -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">
        <div style="background:${metricBg};border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;font-weight:700;color:${sub};text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px">HORIZON</div>
          <div style="font-size:12px;font-weight:800;color:${txt}">${s.horizon}</div>
        </div>
        <div style="background:${metricBg};border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;font-weight:700;color:#3fb950;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px">OBJECTIF ⓘ</div>
          <div style="font-size:12px;font-weight:800;color:${s.objectif>0?'#3fb950':sub}">${s.objectif>0?s.objectif+'€':'—'}</div>
        </div>
        <div style="background:${metricBg};border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;font-weight:700;color:#f87171;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px">STOP ⓘ</div>
          <div style="font-size:12px;font-weight:800;color:${s.stop_loss>0?'#f87171':sub}">${s.stop_loss>0?s.stop_loss+'€':'—'}</div>
        </div>
        <div style="background:${metricBg};border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;font-weight:700;color:${sub};text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px">MA PERF.</div>
          <div style="font-size:12px;font-weight:800;color:${isMine&&myPnl?parseFloat(myPnl)>=0?'#3fb950':'#f87171':sub}">${isMine&&myPnl?`${parseFloat(myPnl)>=0?'+':''}${myPnl}%`:'—'}</div>
        </div>
      </div>

      <!-- Footer -->
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:12px;font-weight:600;color:${sc}">Analyser & Investir →</div>
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

  // Reset toutes les pills
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));

  // Style spécial permanent pour Signaux
  const sigBtn = document.getElementById('news-fil-signaux');
  if (sigBtn) {
    sigBtn.style.cssText = filter === 'signaux'
      ? 'white-space:nowrap;flex-shrink:0;background:linear-gradient(135deg,#cc2f26,#ff5c5c);color:#fff;border-color:#cc2f26;box-shadow:0 0 18px rgba(204,47,38,0.7);font-weight:800;transform:scale(1.04)'
      : 'white-space:nowrap;flex-shrink:0;background:linear-gradient(135deg,#cc2f26,#ff5c5c);color:#fff;border-color:#cc2f26;box-shadow:0 0 10px rgba(204,47,38,0.35);font-weight:800';
  }

  if (el) el.classList.add('active');

  // Afficher/masquer les filtres catégories (seulement sur "Toutes")
  const catFilters = document.getElementById('news-cat-filters');
  if (catFilters) {
    const showCats = (filter === 'tous' || ['macro','banque','marche','geo','secteur'].includes(filter));
    catFilters.style.display = showCats ? 'flex' : 'none';
  }

  // Titre dynamique de la section
  const titleMap = {
    tous:'Actualités du marché', signaux:'⚡ Signaux IA', entreprises:'🏢 Actualités entreprises',
    favoris:'⭐ Mes favoris', agenda:'📅 Agenda économique',
    macro:'🌍 Macro-économie', banque:'🏦 Banques centrales', marche:'📈 Marchés', geo:'⚡ Géopolitique', secteur:'🏢 Secteurs'
  };
  const titleEl = document.getElementById('news-section-title');
  if (titleEl) titleEl.textContent = titleMap[filter] || 'Actualités du marché';

  // Scroll doux vers la liste
  setTimeout(() => document.getElementById('news-list')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);

  if (filter === 'signaux') {
    if (isCacheValid('signaux')) { restoreFromCache('signaux'); return; }
    renderSignaux();
  } else if (filter === 'entreprises') {
    if (isCacheValid('entreprises')) { restoreFromCache('entreprises'); return; }
    renderEntreprises();
  } else if (filter === 'favoris') {
    renderFavorisActus();
  } else if (filter === 'agenda') {
    if (isCacheValid('agenda')) { restoreFromCache('agenda'); return; }
    renderAgenda();
  } else {
    // tous / macro / banque / marche / geo / secteur → renderNewsList filtre
    renderNewsList();
  }
}

function renderFavorisNews() {
  const list = document.getElementById('news-list');
  if (!list) return;

  if (watchlist.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:#8e8e93"><div style="font-size:40px;margin-bottom:12px">⭐</div><div style="font-size:16px;font-weight:700;color:#1c1c1e;margin-bottom:8px">Aucune entreprise suivie</div><div style="font-size:13px">Va dans Signaux ou Entreprises et clique sur Suivre</div></div>';
    return;
  }

  list.innerHTML = '<div style="font-size:11px;font-weight:700;color:#8e8e93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px">⭐ ' + watchlist.length + ' entreprise' + (watchlist.length>1?'s':'') + ' suivie' + (watchlist.length>1?'s':'') + '</div>'
    + watchlist.map(w => {
      const pos = positions.find(p => p.name === w.ticker);
      const pnl = pos ? ((pos.price - pos.pru) / pos.pru * 100).toFixed(1) : null;
      return '<div style="background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:10px;border:2px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center">'
        + '<div>'
        + '<div style="font-size:15px;font-weight:800;color:#1c1c1e">' + (w.name||w.ticker) + ' <span style="font-size:12px;color:#8e8e93;font-weight:500">' + w.ticker + '</span></div>'
        + (pos ? '<div style="font-size:13px;color:' + (parseFloat(pnl)>=0?'#1a7f5a':'#cc2f26') + ';font-weight:700;margin-top:2px">' + (parseFloat(pnl)>=0?'+':'') + pnl + '% · ' + fmt(pos.qty*pos.price) + '€</div>' : '<div style="font-size:12px;color:#8e8e93;margin-top:2px">Pas en portefeuille</div>')
        + '</div>'
        + '<button onclick="unfollowCompany(\'' + w.ticker + '\',\'' + (w.name||w.ticker).replace(/\'/g,"") + '\')" style="background:#fff0f0;color:#cc2f26;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer">Retirer</button>'
        + '</div>';
    }).join('');
}


function unfollowCompany(ticker, name) {
  // Retire de la watchlist
  favToggleSync(ticker, name);
  showToast('Ne plus suivre ' + name);
  updateFavPill();
  // Rafraîchit l'affichage
  renderFavorisNews();
  // Met à jour les étoiles dans les autres onglets
  refreshAllStars();
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
  try {
  currentUser = user; isDemo = false;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('demo-banner').style.display = 'none';
  const email = user.email || '';
  document.getElementById('topbar-email').textContent = email.split('@')[0];
  document.getElementById('topbar-avatar').textContent = (email[0]||'U').toUpperCase();
  await loadProfile(); await loadPositions(); await loadObjective();
  try { loadChatHistory(); } catch(e) { console.warn('loadChatHistory:', e); }
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
  initTheme();
  setTimeout(initDevPremiumBtn, 800); // après chargement currentUser
  } catch(e) { console.error('initApp error:', e); alert('Erreur de chargement: ' + e.message); }
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
    profile = {
      bankroll: data.bankroll||5000,
      horizon: data.horizon||'moyen',
      risk: data.risk||'faible',
      notif: data.notif||'daily',
      isPremium: data.is_premium||false,
      premiumSince: data.premium_since||null
    };
    const sb_el = id => document.getElementById(id);
    if (sb_el('s-bankroll')) sb_el('s-bankroll').value = profile.bankroll;
    if (sb_el('s-horizon')) sb_el('s-horizon').value = profile.horizon;
    if (sb_el('s-risk')) sb_el('s-risk').value = profile.risk;
    if (sb_el('s-notif')) sb_el('s-notif').value = profile.notif;
    if (typeof updateSettingsDisplays === 'function') updateSettingsDisplays();
    if (typeof updatePremiumUI === 'function') updatePremiumUI();
  }
}
async function saveProfile() {
  const bEl = document.getElementById('s-bankroll');
  const hEl = document.getElementById('s-horizon');
  const rEl = document.getElementById('s-risk');
  const nEl = document.getElementById('s-notif');
  if (bEl) profile.bankroll = parseFloat(bEl.value)||5000;
  if (hEl) profile.horizon = hEl.value;
  if (rEl) profile.risk = rEl.value;
  if (nEl) profile.notif = nEl.value||'daily';
  if (!isDemo) await sb.from('profiles').upsert({ id:currentUser.id, ...profile });
}
async function loadPositions() {
  const { data } = await sb.from('positions').select('*').eq('user_id',currentUser.id).order('created_at');
  positions = data||[];
}
async function loadObjective() {
  if (isDemo) return;
  try {
    // Sans .order() pour compatibilité max avec toutes les versions de la table
    const { data, error } = await sb.from('objectives').select('*').eq('user_id', currentUser.id);
    if (error) { console.warn('[loadObjective] Supabase error:', error.message); }
    if (data && data.length > 0) {
      allObjectives = data.map((d, i) => ({
        id: d.id,
        label: ('Objectif ' + (i + 1)),
        capital: d.capital || 0,
        monthly: d.monthly || 200,
        target: d.target || 100000,
        years: d.years || 10,
        rate: d.rate || 7,
        risk: d.risk || 'equilibre',
        color: OBJ_COLORS[i % OBJ_COLORS.length],
        validated_at: d.validated_at
      }));
      activeObjId = allObjectives[0].id;
      applyObjData(allObjectives[0]);
      objective = { target: allObjectives[0].target, years: allObjectives[0].years, rate: allObjectives[0].rate, monthly: allObjectives[0].monthly };
      try { localStorage.setItem('iq_validated_objective', JSON.stringify({
        capital: allObjectives[0].capital, monthly: allObjectives[0].monthly,
        target: allObjectives[0].target, years: allObjectives[0].years,
        rate: allObjectives[0].rate, risk: allObjectives[0].risk,
        validatedAt: allObjectives[0].validated_at || new Date().toISOString()
      })); } catch {}
    }
  } catch(e) { console.warn('[loadObjective] error:', e); }
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
    // Recalcule les alertes prix avec les nouveaux cours (remplace les anciennes)
    checkPriceAlerts();
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
  // Vide d'abord TOUTES les anciennes alertes prix
  notifications = notifications.filter(n => n.type !== 'prix');

  // Grouper par ticker pour éviter les doublons (positions avec plusieurs lignes)
  const grouped = {};
  positions.forEach(p => {
    if (!grouped[p.name]) {
      grouped[p.name] = { name: p.name, price: p.price, alert_price: p.alert_price };
    }
    // Garde l'alerte la plus haute (seuil le plus récent)
    if (p.alert_price && (!grouped[p.name].alert_price || p.alert_price > grouped[p.name].alert_price)) {
      grouped[p.name].alert_price = p.alert_price;
      grouped[p.name].price = p.price;
    }
  });

  Object.values(grouped).forEach(g => {
    if (g.alert_price && g.price <= g.alert_price) {
      const notif = {
        titre: `⚠ Alerte prix — ${g.name}`,
        texte: `${g.name} est à ${fmt(g.price)}€, sous ton seuil d'alerte de ${fmt(g.alert_price)}€.`,
        action: `Consulter ${g.name} dans ton portefeuille`,
        impact: 'high',
        heure: 'Maintenant',
        type: 'prix'
      };
      notifications.unshift(notif);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`InvestIQ — Alerte ${g.name}`, { body: notif.texte, icon: '/icons/icon-192.png' });
      }
    }
  });

  if (notifications.length) document.getElementById('notif-dot').classList.add('show');
  renderNotifications();
}

// ===== CHAT MEMORY =====
function loadChatHistory() {
  // Vider l'ancien cache si format v1 (markdown brut)
  const ver = localStorage.getItem('iq_chat_ver');
  if (ver !== '2') { localStorage.removeItem(CACHE_CHAT); localStorage.setItem('iq_chat_ver','2'); }
  try { chatHistory = JSON.parse(localStorage.getItem(CACHE_CHAT)||'[]'); } catch { chatHistory = []; }
  const chat = document.getElementById('ai-chat');
  if (!chat) return;
  if (chatHistory.length > 0) {
    chat.innerHTML = chatHistory.map(m =>
      m.role === 'user'
        ? `<div class="bubble user">${m.content}</div>`
        : `<div class="bubble bot">${formatMD(m.content)}</div>`
    ).join('');
    const qbtns = document.getElementById('qbtns');
    if (qbtns) qbtns.style.display = 'none';
  }
}
function saveChatHistory() {
  try { try { localStorage.setItem(CACHE_CHAT, JSON.stringify(chatHistory.slice(-20))); } catch(e) {} } catch {}
}
function clearChat() {
  chatHistory = [];
  try { localStorage.removeItem(CACHE_CHAT); } catch {}
  const chat = document.getElementById('ai-chat');
  if (chat) chat.innerHTML = '<div class="bubble bot" id="ai-welcome">Conversation effacée. Comment puis-je t\'aider ?</div>';
  const qbtns = document.getElementById('qbtns');
  if (qbtns) qbtns.style.display = 'flex';
  if (typeof buildAgentContext === 'function') { buildAgentContext(); buildAgentSuggestions(); }
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


// ===== ANIMATIONS UTILITAIRES =====
// ===== MOTION DESIGN SYSTEM =====
// Easing functions
const ease = {
  out3: p => 1 - Math.pow(1-p, 3),
  out4: p => 1 - Math.pow(1-p, 4),
  spring: p => {
    const c4 = (2*Math.PI)/3;
    return p===0?0:p===1?1:Math.pow(2,-10*p)*Math.sin((p*10-0.75)*c4)+1;
  }
};

function animateNumber(el, from, to, duration=900, prefix='', suffix='') {
  if (!el) return;
  const start = performance.now();
  const range = to - from;
  function step(now) {
    const p = Math.min((now-start)/duration, 1);
    const e = ease.out4(p);
    const current = from + range * e;
    el.textContent = prefix + fmtK(Math.round(current)) + suffix;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = prefix + fmtK(Math.round(to)) + suffix;
  }
  requestAnimationFrame(step);
}

function animateNumberRaw(el, from, to, duration=800, decimals=1, suffix='') {
  if (!el) return;
  const start = performance.now();
  function step(now) {
    const p = Math.min((now-start)/duration, 1);
    const e = ease.out3(p);
    el.textContent = (from + (to-from)*e).toFixed(decimals) + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function animatePercent(el, to, duration=700) {
  animateNumberRaw(el, 0, to, duration, 1, '%');
}

function animateBar(el, targetPct, duration=900, delay=0) {
  if (!el) return;
  el.style.width = '0%';
  el.style.transition = 'none';
  setTimeout(() => {
    el.style.transition = `width ${duration}ms cubic-bezier(0.16,1,0.3,1)`;
    el.style.width = Math.min(targetPct, 100) + '%';
  }, delay);
}

function fadeInCards(selector, delay=70) {
  const els = document.querySelectorAll(selector);
  els.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    el.style.transition = `opacity 0.3s ease ${i*delay+30}ms, transform 0.3s ease ${i*delay+30}ms`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }));
  });
}

function fadeInEl(el, delay=0) {
  if (!el) return;
  el.style.opacity = '0';
  el.style.transform = 'translateY(8px)';
  setTimeout(() => {
    el.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  }, delay);
}

function staggerFadeIn(els, delay=60) {
  els.forEach((el, i) => { if(el) fadeInEl(el, i*delay); });
}

// Counter avec séparateurs de milliers animé
function animateCounter(el, to, duration=1000) {
  if (!el) return;
  const start = performance.now();
  function step(now) {
    const p = Math.min((now-start)/duration, 1);
    const e = ease.spring(p);
    const v = Math.round(to * e);
    el.textContent = v.toLocaleString('fr-FR');
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = to.toLocaleString('fr-FR');
  }
  requestAnimationFrame(step);
}


// ===== DARK MODE =====
function initTheme() {
  const saved = localStorage.getItem('iq_theme') || 'light';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('iq_theme', theme);
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (theme === 'dark') {
    if (icon) icon.textContent = '☀️';
    if (label) label.textContent = 'Clair';
  } else {
    if (icon) icon.textContent = '🌙';
    if (label) label.textContent = 'Sombre';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  // Petite animation du bouton
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.style.transform = 'scale(0.92)';
    setTimeout(() => btn.style.transform = '', 150);
  }
}


// ===== LOGOS ENTREPRISES =====
function getCompanyLogo(ticker, name, size, radius) {
  size = size || 36; radius = radius || 10;
  const domainMap = {
    'AAPL':'apple.com','MSFT':'microsoft.com','GOOGL':'google.com','GOOG':'google.com',
    'AMZN':'amazon.com','TSLA':'tesla.com','NVDA':'nvidia.com','META':'meta.com',
    'NFLX':'netflix.com','UBER':'uber.com','SPOT':'spotify.com','PYPL':'paypal.com',
    'INTC':'intel.com','AMD':'amd.com','ORCL':'oracle.com','CRM':'salesforce.com',
    'ADBE':'adobe.com','QCOM':'qualcomm.com','ASML':'asml.com',
    'MC.PA':'lvmh.com','OR.PA':'loreal.com','TTE.PA':'totalenergies.com',
    'AI.PA':'airliquide.com','BNP.PA':'bnpparibas.com','SAN.PA':'sanofi.com',
    'AIR.PA':'airbus.com','ACA.PA':'credit-agricole.com','ORA.PA':'orange.com',
    'KER.PA':'kering.com','VIE.PA':'veolia.com','RMS.PA':'hermes.com',
    'IWDA.L':'ishares.com','VWCE.DE':'vanguard.com','CSPX.L':'ishares.com',
    'SWDA.L':'ishares.com','VUSA.L':'vanguard.com','IWDA.AS':'ishares.com',
    'LVMH':'lvmh.com','FDJ.PA':'groupefdj.com','SOI.PA':'soitec.com',
    'PAH3.DE':'porsche.com','VOW3.DE':'volkswagen.com','BMW.DE':'bmw.com',
    'SAP.DE':'sap.com','SIE.DE':'siemens.com','ALV.DE':'allianz.com',
    'BAYN.DE':'bayer.com','MBG.DE':'mercedes-benz.com','NESN.SW':'nestle.com',
    'NOVO-B.CO':'novonordisk.com','SHEL.L':'shell.com','HSBA.L':'hsbc.com',
    'BP.L':'bp.com','GSK.L':'gsk.com','AZN.L':'astrazeneca.com',
    'MCPA':'lvmh.com','MC.PA':'lvmh.com',
    'IWDA.L':'ishares.com','IWDA.AS':'ishares.com','IWDA':'ishares.com',
    'VWCE.DE':'vanguard.com','VWCE':'vanguard.com',
    'CSPX.L':'ishares.com','EUNL.DE':'ishares.com',
    'SOI.PA':'soitec.com','SOITEC':'soitec.com',
    'FDJ.PA':'groupefdj.com','FDJ':'groupefdj.com',
    'AIR.PA':'airbus.com','AIRBUS':'airbus.com',
    'ACA.PA':'credit-agricole.com',
    'GLE.PA':'societegenerale.com',
    'SU.PA':'schneider-electric.com',
    'CAP.PA':'capgemini.com',
    'DSY.PA':'dassaultsystemes.com',
    'HO.PA':'thalesgroup.com',
    'PUB.PA':'publicis.com',
    'SGO.PA':'saint-gobain.com',
    'WLN.PA':'worldline.com',
    'ALO.PA':'alstom.com',
    'LR.PA':'legrand.com',
    'EDF.PA':'edf.fr',
    'ENGI.PA':'engie.com',
  };
  const LCOLORS = ['#3fb950','#6366f1','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#ef4444','#14b8a6','#f97316'];
  const c = LCOLORS[(ticker||'').charCodeAt(0) % LCOLORS.length];
  const init = (ticker||name||'?').replace(/[.\-]/g,'').slice(0,2).toUpperCase();
  const s = size, r = radius;
  const fallback = '<div style="width:'+s+'px;height:'+s+'px;border-radius:'+r+'px;background:'+c+'20;border:1px solid '+c+'40;display:flex;align-items:center;justify-content:center;font-size:'+Math.round(s*0.35)+'px;font-weight:800;color:'+c+';flex-shrink:0">'+init+'</div>';
  // Logos SVG custom pour ETF et tickers sans favicon
  const svgLogos = {
    'IWDA.L': '<svg viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="#00529B"/><text x="18" y="24" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="Arial">iS</text></svg>',
    'IWDA.AS': '<svg viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="#00529B"/><text x="18" y="24" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="Arial">iS</text></svg>',
    'VWCE.DE': '<svg viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="#CC0000"/><text x="18" y="24" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="Arial">VG</text></svg>',
    'MC.PA': '<svg viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="#1a1a1a"/><text x="18" y="24" text-anchor="middle" font-size="10" font-weight="800" fill="#c9a96e" font-family="Arial">LV</text></svg>',
    'LVMH': '<svg viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="#1a1a1a"/><text x="18" y="24" text-anchor="middle" font-size="10" font-weight="800" fill="#c9a96e" font-family="Arial">LV</text></svg>',
    'MCPA': '<svg viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="#1a1a1a"/><text x="18" y="24" text-anchor="middle" font-size="10" font-weight="800" fill="#c9a96e" font-family="Arial">LV</text></svg>',
    'SOI.PA': '<svg viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="#0055A4"/><text x="18" y="24" text-anchor="middle" font-size="10" font-weight="800" fill="#fff" font-family="Arial">SOI</text></svg>',
    'FDJ.PA': '<svg viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="#00843D"/><text x="18" y="24" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="Arial">FDJ</text></svg>',
  };;
  if (svgLogos[ticker]) {
    return '<div style="width:'+s+'px;height:'+s+'px;border-radius:'+r+'px;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center">'+svgLogos[ticker].replace('36 36', s+' '+s).replace('rx="8"','rx="'+r+'"')+'</div>';
  }
  const t = (ticker||'').toUpperCase();
  const base = t.replace(/\.PA$|\.DE$|\.L$|\.AS$|\.MI$|\.SW$/,'');
  const domain = domainMap[ticker] || domainMap[t] || domainMap[base];
  if (!domain) return fallback;
  // Essayer plusieurs sources de logos
  const logoUrl = 'https://icons.duckduckgo.com/ip3/' + domain + '.ico';
  const isDarkLogo = document.documentElement.getAttribute('data-theme') === 'dark';
  const logoBg = isDarkLogo ? '#1a2230' : '#f4f4f5';
  return `<div style="width:${s}px;height:${s}px;border-radius:${r}px;overflow:hidden;flex-shrink:0;background:${logoBg};display:flex;align-items:center;justify-content:center;padding:3px;box-sizing:border-box">
    <img src="${logoUrl}" alt="${init}" style="width:100%;height:100%;object-fit:contain;border-radius:${r-2}px" onerror="_logoFallback(this,'${init}','${c}')">
  </div>`;
}

function _logoFallback(img, text, color) {
  img.style.display = 'none';
  var p = img.parentElement;
  if (p) { p.style.background = color + '20'; p.style.border = '1px solid ' + color + '40'; p.innerHTML = '<span style="font-size:' + Math.round(p.offsetWidth * 0.35 || 13) + 'px;font-weight:800;color:' + color + '">' + text + '</span>'; }
}


function selectIntent(btn, intent) {
  document.querySelectorAll('#d-intents .d-intent-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  btn.setAttribute('data-intent', intent);
}

function setDecisionAmount(val) {
  const num = parseInt(String(val).replace(/[^0-9]/g,''));
  const el = document.getElementById('d-amount-display');
  if (el) el.textContent = num.toLocaleString('fr-FR') + ' €';
  const slider = document.getElementById('d-amount-slider');
  if (slider) slider.value = num;
  if (document.getElementById('d-amount')) document.getElementById('d-amount').value = num;
  document.querySelectorAll('.d-amount-pill').forEach(b => {
    const isActive = parseInt(b.textContent.replace(/[^0-9]/g,'')) === num;
    b.style.background = isActive ? 'rgba(63,185,80,0.1)' : 'var(--color-bg-subtle)';
    b.style.borderColor = isActive ? '#3fb950' : 'var(--color-border)';
    b.style.color = isActive ? '#3fb950' : 'var(--color-text-secondary)';
  });
}

function updateDecisionAmountRaw(val) {
  const num = Math.round(parseInt(val)/50)*50;
  const el = document.getElementById('d-amount-display');
  if (el) el.textContent = num.toLocaleString('fr-FR') + ' €';
  document.querySelectorAll('.d-amount-pill').forEach(b => {
    const isActive = parseInt(b.textContent.replace(/[^0-9]/g,'')) === num;
    b.style.background = isActive ? 'rgba(63,185,80,0.1)' : 'var(--color-bg-subtle)';
    b.style.borderColor = isActive ? '#3fb950' : 'var(--color-border)';
    b.style.color = isActive ? '#3fb950' : 'var(--color-text-secondary)';
  });
}

function runDecision() {
  const intentBtn = document.querySelector('#d-intents .d-intent-btn.active');
  decisionIntention = intentBtn ? intentBtn.getAttribute('data-intent') : 'neutre';
  const amount = parseInt((document.getElementById('d-amount-display')?.textContent||'500').replace(/[^0-9]/g,''))||500;
  if (document.getElementById('d-pct')) document.getElementById('d-pct').value = Math.round(amount/(profile.bankroll||5000)*100);
  if (document.getElementById('d-amount')) document.getElementById('d-amount').value = amount;
  const r = document.getElementById('d-result');
  if (r) r.style.display = 'block';
  analyseDecision();
}

function updateDecisionAmount(val) {
  const amount = Math.round(val * 50);
  const el = document.getElementById('d-amount-display');
  if (el) el.textContent = amount.toLocaleString('fr-FR') + ' €';
}

function initDecisionPage() {
  // Afficher les positions rapides
  const el = document.getElementById('d-quick-pos');
  if (!el) return;
  const dedupMap = {};
  positions.forEach(p => { const k = p.name; if (!dedupMap[k]) dedupMap[k] = p; });
  const dedup = Object.values(dedupMap).slice(0, 8);
  el.innerHTML = dedup.map(p => {
    const pnl = ((p.price - p.pru)/p.pru*100).toFixed(1);
    const color = parseFloat(pnl) >= 0 ? '#3fb950' : '#f87171';
    return `<button onclick="prefillDecision('${p.name}','${p.type||'Action'}')"
      style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:10px;cursor:pointer;transition:all 0.15s;font-family:inherit"
      onmouseover="this.style.borderColor='${color}'" onmouseout="this.style.borderColor='var(--color-border)'">
      ${getCompanyLogo(p.name, p.name, 24, 7)}
      <div style="text-align:left">
        <div style="font-size:12px;font-weight:700;color:var(--color-text)">${p.name}</div>
        <div style="font-size:10px;color:${color}">${parseFloat(pnl)>=0?'+':''}${pnl}%</div>
      </div>
    </button>`;
  }).join('');
}

function prefillDecision(ticker, type) {
  const input = document.getElementById('d-name');
  if (input) { input.value = ticker; input.dispatchEvent(new Event('input')); }
}

// ===== NAV =====
function nav(page) {
  document.querySelectorAll('.sec').forEach(s => { s.classList.remove('active'); });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('sec-'+page);
  const btn = document.getElementById('nav-'+page);
  if (sec) { animatePageIn('sec-'+page); }
  if (btn) btn.classList.add('active');
  // Sync bottom nav mobile
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
  const bnavBtn = document.getElementById('bnav-'+page);
  if (bnavBtn) bnavBtn.classList.add('active');
  closeSidebar();
  const renders = { home:renderHome, portfolio:renderPortfolio, sante:renderSante, objectif: async () => {
  // Essaie d'abord de recharger depuis Supabase
  if (!isDemo && currentUser && allObjectives.length === 0) {
    await loadObjective();
  }
  // Si on a des objectifs en base → affiche le graphique
  if (allObjectives.length > 0) {
    applyObjData(allObjectives.find(o => o.id === activeObjId) || allObjectives[0]);
    showValidatedChart();
    return;
  }
  // Sinon essaie le localStorage
  const hasValidated = await loadValidatedObjectif();
  if (hasValidated) {
    showValidatedChart();
  } else if (document.getElementById('obj-results')?.style.display === 'block') {
    setTimeout(() => buildObjChart(objChartCapital, objChartMonthly, objChartTarget, objChartYears, objChartRate), 100);
  }
}, crise:renderCrise, dca:()=>{updateDCA();setTimeout(initDCAPresets,50);},
    ai:()=>{ loadChatHistory(); initAgent(); setTimeout(()=>{ if(typeof updateAISidebar==='function') updateAISidebar(); if(typeof generateDailyBrief==='function')generateDailyBrief(); if(typeof updatePremiumUI==='function')updatePremiumUI(); }, 200); }, news:()=>{ if(typeof renderNewsPage==='function'){loadWatchlist();renderNewsPage();}else{if(!loadNewsCache())loadNews(false);else renderNewsList();} } };
  if (renders[page]) renders[page]();
  if (page === 'settings') setTimeout(()=>{ if(typeof updateSettingsDisplays==='function') updateSettingsDisplays(); }, 100);
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

  // ── 1. ALERTES PRIX — gérées exclusivement par checkPriceAlerts() ──
  // (pas de duplication ici)

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

  // Remplace complètement les notifications générées — pas d'accumulation
  // On conserve uniquement les notifs "agenda" déjà présentes (car chargées séparément)
  const agendaNotifs = notifications.filter(n => n.type === 'agenda');
  const merged = [...deduped, ...agendaNotifs];
  // Déduplication finale par titre+texte
  const finalSeen = new Set();
  notifications = merged.filter(n => {
    const key = n.titre + '|' + n.texte;
    if (finalSeen.has(key)) return false;
    finalSeen.add(key);
    return true;
  }).slice(0, 10);
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
  const emojis = ['👋','👋','👋','👋','👋'];
  const emoji = emojis[new Date().getDay() % emojis.length];
  const name = isDemo ? 'Toi' : (currentUser?.email||'').split('@')[0];
  const tv = positions.reduce((a,p)=>a+p.qty*p.price, 0);
  const ti = positions.reduce((a,p)=>a+p.qty*p.pru, 0);
  const tpnl = tv - ti;
  const tpct = ti ? tpnl/ti*100 : 0;
  const avgChange = positions.length ? positions.reduce((a,p)=>a+(p.change_pct||0),0)/positions.length : 0;
  const {score} = calcScore();
  const scoreColor = score>=7?'#1a7f5a':score>=5?'#f59e0b':'#cc2f26';
  const targetVal = objChartTarget > 1000 ? objChartTarget : (objective.target || 0);
  const pctObj = targetVal > 0 ? Math.min(tv/targetVal*100, 100) : 0;
  const sorted = [...positions].sort((a,b)=>(b.change_pct||0)-(a.change_pct||0));
  const best = sorted[0], worst = sorted[sorted.length-1];
  const today = new Date().toISOString().split('T')[0];

  document.getElementById('home-greeting').textContent = `${greet} ${name} ! ${emoji}`;
  const subEl = document.getElementById('home-date');
  if (subEl) subEl.textContent = 'Voici la santé de votre portefeuille aujourd\'hui.';

  if (!positions.length) {
    document.getElementById('home-metrics').innerHTML = '';
    document.getElementById('home-score').innerHTML = `
      <div style="background:#0f0f14;border-radius:20px;padding:40px;text-align:center;margin-bottom:12px">
        <div style="font-size:48px;margin-bottom:16px">📈</div>
        <div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:8px;letter-spacing:-0.04em">Commence ton investissement</div>
        <div style="font-size:14px;color:rgba(255,255,255,0.4);margin-bottom:28px;max-width:320px;margin-left:auto;margin-right:auto">Suis ton portefeuille, reçois des signaux IA et atteins tes objectifs</div>
        <div style="display:flex;flex-direction:column;gap:10px;max-width:280px;margin:0 auto">
          <button onclick="nav('ajouter')" style="padding:14px;background:linear-gradient(135deg,#16a34a,#059669);color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(22,163,74,0.35)">➕ Ajouter ma première position</button>
          <button onclick="nav('objectif')" style="padding:13px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.7);border-radius:14px;font-size:14px;font-weight:600;cursor:pointer">🎯 Définir mon objectif</button>
        </div>
      </div>`;
    document.getElementById('home-alerts').innerHTML = '';
    document.getElementById('home-obj').innerHTML = '';
    renderPlatforms();
    return;
  }

  // Générer sparkline SVG
  function sparkline(data, color, width=120, height=40, fill=true) {
    if (!data || data.length < 2) return '';
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v,i) => `${(i/(data.length-1))*width},${height - ((v-min)/range)*(height-6) - 3}`);
    const pathD = 'M' + pts.join(' L');
    const fillD = fill ? `${pathD} L${width},${height} L0,${height} Z` : '';
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs><linearGradient id="sg${color.replace('#','')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      ${fill ? `<path d="${fillD}" fill="url(#sg${color.replace('#','')})"/>` : ''}
      <path d="${pathD}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  // Données sparkline simulées basées sur la perf
  function genSparkData(trend, points=20) {
    const data = [50];
    for (let i = 1; i < points; i++) {
      const v = data[i-1] + (Math.random()-0.5)*3 + trend*0.3;
      data.push(Math.max(20, Math.min(80, v)));
    }
    return data;
  }

  const pnlColor = tpnl >= 0 ? '#4ade80' : '#f87171';
  const pnlBg = tpnl >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)';
  const chgColor = avgChange >= 0 ? '#4ade80' : '#f87171';
  const mainSparkData = genSparkData(avgChange > 0 ? 1 : -1, 30);

  // ── HERO CARD ──
  document.getElementById('home-metrics').innerHTML = `
    <div onclick="nav('portfolio')" class="home-hover-card" style="cursor:pointer;background:linear-gradient(135deg,#0d0d12,#141420);border-radius:20px;padding:24px 28px;margin-bottom:4px;grid-column:1/-1;position:relative;overflow:hidden;border:1px solid rgba(255,255,255,0.06)">
      <div style="position:absolute;top:0;right:0;bottom:0;width:45%;opacity:0.8;pointer-events:none">
        ${sparkline(mainSparkData, tpnl>=0?'#4ade80':'#f87171', 400, 160, true)}
      </div>
      <div style="position:absolute;top:16px;right:20px;background:${pnlBg};border:1px solid ${tpnl>=0?'rgba(74,222,128,0.25)':'rgba(248,113,113,0.25)'};border-radius:10px;padding:8px 14px;text-align:right;pointer-events:none">
        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px">Performance totale</div>
        <div style="font-size:20px;font-weight:800;color:${pnlColor};letter-spacing:-0.04em">${tpnl>=0?'+':''}${tpnl.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} €</div>
        <div style="font-size:12px;color:${pnlColor};opacity:0.7;margin-top:2px">${tpnl>=0?'↑':'↓'} ${Math.abs(tpct).toFixed(1)}%</div>
      </div>
      <div style="position:relative;z-index:2">
        <div style="font-size:10px;font-weight:600;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Valeur totale du portefeuille</div>
        <div style="font-size:clamp(32px,5vw,48px);font-weight:900;color:#fff;letter-spacing:-0.05em;line-height:1;margin-bottom:16px" id="home-tv-counter">—</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
          <div class="a-chip" style="background:rgba(255,255,255,0.08);border-radius:99px;padding:5px 12px;font-size:12px;font-weight:600;color:${chgColor}">${avgChange>=0?'↑':'↓'} ${Math.abs(avgChange).toFixed(1)}% aujourd'hui</div>
          <div class="a-chip" style="background:rgba(255,255,255,0.08);border-radius:99px;padding:5px 12px;font-size:12px;font-weight:600;color:rgba(255,255,255,0.6)">${positions.length} positions</div>
          <div class="a-chip" style="background:rgba(255,255,255,0.08);border-radius:99px;padding:5px 12px;font-size:12px;font-weight:600;color:${scoreColor}">${score.toFixed(1)}/10 santé</div>
          ${targetVal > 0 ? `<div class="a-chip" style="background:rgba(255,255,255,0.08);border-radius:99px;padding:5px 12px;font-size:12px;font-weight:600;color:#a5b4fc">${pctObj.toFixed(0)}% objectif</div>` : ''}
        </div>
        ${targetVal > 0 ? `
        <div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:rgba(255,255,255,0.3);margin-bottom:5px"><span>Progression objectif</span><span>${fmtK(tv)} / ${fmtK(targetVal)}</span></div>
          <div style="background:rgba(255,255,255,0.08);border-radius:99px;height:5px;overflow:hidden">
            <div id="home-prog-bar" style="height:100%;background:linear-gradient(90deg,#16a34a,#4ade80);border-radius:99px;width:0%;transition:width 1.2s cubic-bezier(0.16,1,0.3,1)"></div>
          </div>
        </div>` : ''}
      </div>
    </div>`;

  // ── MÉTRIQUES SECONDAIRES ──
  let html = '';

  // Meilleure + pire performance avec sparkline
  if (best && worst && best !== worst) {
    const bestData = genSparkData(2, 20);
    const worstData = genSparkData(-2, 20);
    html += `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div onclick="nav('portfolio')" style="cursor:pointer;background:#fff;border:1px solid var(--color-border);border-radius:16px;padding:16px;transition:all 0.2s" class="home-hover-card">
        <div style="font-size:9px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">🏆 Meilleure performance</div>
        <div style="font-size:18px;font-weight:800;color:#09090b;letter-spacing:-0.04em;margin-bottom:2px">${best.name}</div>
        <div style="font-size:20px;font-weight:900;color:#16a34a;letter-spacing:-0.04em;margin-bottom:8px">+${(best.change_pct||0).toFixed(2)}%</div>
        <div style="opacity:0.7">${sparkline(bestData,'#4ade80',120,32,true)}</div>
      </div>
      <div onclick="nav('portfolio')" style="cursor:pointer;background:#fff;border:1px solid var(--color-border);border-radius:16px;padding:16px;transition:all 0.2s" class="home-hover-card">
        <div style="font-size:9px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">📉 Plus faible performance</div>
        <div style="font-size:18px;font-weight:800;color:#09090b;letter-spacing:-0.04em;margin-bottom:2px">${worst.name}</div>
        <div style="font-size:20px;font-weight:900;color:#dc2626;letter-spacing:-0.04em;margin-bottom:8px">${(worst.change_pct||0).toFixed(2)}%</div>
        <div style="opacity:0.7">${sparkline(worstData,'#f87171',120,32,true)}</div>
      </div>
    </div>`;
  }

  // Santé + Insight IA côte à côte
  const platforms = {};
  positions.forEach(p=>{ const v=p.qty*p.price; platforms[p.platform||'Autre']=(platforms[p.platform||'Autre']||0)+v; });
  const platformEntries = Object.entries(platforms);

  html += `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
    <!-- Santé -->
    <div onclick="nav('sante')" style="cursor:pointer;background:#fff;border:1px solid var(--color-border);border-radius:16px;padding:16px;display:flex;align-items:center;justify-content:space-between;transition:all 0.2s" onmouseover="this.style.borderColor='${scoreColor}';this.style.transform='translateY(-1px)'" onmouseout="this.style.borderColor='var(--color-border)';this.style.transform='translateY(0)'">
      <div>
        <div style="font-size:9px;font-weight:700;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Santé du portefeuille</div>
        <div style="font-size:32px;font-weight:900;color:${scoreColor};letter-spacing:-0.05em;line-height:1">${score.toFixed(1)}<span style="font-size:16px;color:var(--color-text-tertiary)">/10</span></div>
        <div style="font-size:13px;font-weight:600;color:${scoreColor};margin-top:4px">${score>=7?'Excellent 💪':score>=5?'Correct 👍':'À améliorer ⚠️'}</div>
      </div>
      <div style="width:56px;height:56px;border-radius:50%;background:${score>=7?'#f0fdf4':score>=5?'#fffbeb':'#fef2f2'};border:3px solid ${scoreColor};display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">
        ${score>=7?'💚':score>=5?'🟡':'🔴'}
      </div>
    </div>
    <!-- Insight IA -->
    <div onclick="nav('ai')" style="cursor:pointer;background:linear-gradient(135deg,#0d0d12,#141420);border:1px solid rgba(22,163,74,0.2);border-radius:16px;padding:16px;position:relative;overflow:hidden;transition:all 0.2s" class="home-hover-card">
      <div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;background:radial-gradient(circle,rgba(22,163,74,0.2),transparent);pointer-events:none"></div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
        <div style="width:6px;height:6px;background:#4ade80;border-radius:50%;animation:pulse-dot 2s infinite"></div>
        <div style="font-size:9px;font-weight:700;color:#4ade80;text-transform:uppercase;letter-spacing:0.08em">✦ Insight IA</div>
      </div>
      <div id="home-ai-insight" style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.55;font-weight:400">
        ${positions.length > 0 ? `Ton portef. ${avgChange>=0?'progresse de':'recule de'} <strong style="color:${chgColor}">${avgChange>=0?'+':''}${avgChange.toFixed(1)}%</strong> aujourd'hui. ${score>=7?'Score santé excellent.':'Analyse disponible.'}` : 'Ajoute des positions pour recevoir des insights personnalisés.'}
      </div>
      <div style="margin-top:10px;font-size:12px;font-weight:600;color:#4ade80">Voir l'analyse complète →</div>
    </div>
  </div>`;

  // Répartition par plateforme
  if (platformEntries.length > 0) {
    const colors = ['#16a34a','#6366f1','#f59e0b','#ec4899','#06b6d4'];
    // Donut SVG
    function donutSVG(entries, total, size=80) {
      let offset = 0;
      const r = 28, c = size/2, circum = 2*Math.PI*r;
      const segments = entries.map(([name,val],i) => {
        const pct = val/total;
        const dash = pct * circum;
        const seg = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${colors[i%colors.length]}" stroke-width="8" stroke-dasharray="${dash} ${circum-dash}" stroke-dashoffset="${-offset*circum}" transform="rotate(-90 ${c} ${c})" stroke-linecap="round"/>`;
        offset += pct;
        return seg;
      });
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const textColor = isDark ? '#e8f5e8' : '#09090b';
      const subColor = isDark ? '#4a6a4a' : '#8e8e93';
      const trackColor = isDark ? '#1e2e1e' : '#f0f0f2';
      return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${trackColor}" stroke-width="8"/>
        ${segments.join('')}
        <text x="${c}" y="${c-3}" text-anchor="middle" font-size="9" font-weight="700" fill="${textColor}">${fmtK(total)}</text>
        <text x="${c}" y="${c+8}" text-anchor="middle" font-size="7" fill="${subColor}">Total</text>
      </svg>`;
    }

    html += `
    <div style="background:#fff;border:1px solid var(--color-border);border-radius:16px;padding:16px;margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.08em">Répartition par plateforme</div>
        <button onclick="nav('portfolio')" style="font-size:11px;font-weight:600;color:var(--color-text-secondary);background:none;border:none;cursor:pointer">Détails →</button>
      </div>
      <div style="display:flex;align-items:center;gap:20px">
        ${donutSVG(platformEntries, tv)}
        <div style="flex:1;display:flex;flex-direction:column;gap:8px">
          ${platformEntries.map(([name,val],i) => `
          <div>
            <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:4px">
              <span style="color:#09090b">${name}</span>
              <span style="color:#09090b">${fmtK(val)} <span style="color:var(--color-text-tertiary)">${(val/tv*100).toFixed(1)}%</span></span>
            </div>
            <div style="background:#f0f0f2;border-radius:99px;height:4px;overflow:hidden">
              <div style="height:100%;background:${colors[i%colors.length]};width:${(val/tv*100)}%;border-radius:99px;transition:width 1s cubic-bezier(0.16,1,0.3,1)"></div>
            </div>
          </div>`).join('')}
        </div>
      </div>
      <div style="margin-top:12px;font-size:11px;color:var(--color-text-tertiary)">${platformEntries.length} plateforme${platformEntries.length>1?'s':''} connectée${platformEntries.length>1?'s':''}</div>
    </div>`;
  }

  // Actions rapides
  const actions = [
    { icon:'＋', label:'Ajouter une position', sub:'Ajoutez une action, ETF...', page:'ajouter', color:'#6366f1' },
    { icon:'🤔', label:'Aide à la décision', sub:'Analyse et recommandations', page:'decision', color:'#f59e0b' },
    { icon:'🤖', label:'Agent IA', sub:'Discutez avec votre assistant', page:'ai', color:'#16a34a' },
  ];
  html += `
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:4px">
    ${actions.map(a => `
    <div onclick="nav('${a.page}')" style="cursor:pointer;background:#fff;border:1px solid var(--color-border);border-radius:14px;padding:14px;transition:all 0.2s" class="home-hover-card">
      <div style="font-size:22px;margin-bottom:8px">${a.icon}</div>
      <div style="font-size:13px;font-weight:700;color:#09090b;margin-bottom:3px;letter-spacing:-0.02em">${a.label}</div>
      <div style="font-size:11px;color:var(--color-text-tertiary)">${a.sub}</div>
    </div>`).join('')}
  </div>`;

  document.getElementById('home-score').innerHTML = html;
  document.getElementById('home-alerts').innerHTML = '';
  document.getElementById('home-obj').innerHTML = '';
  // renderPlatforms() supprimé — déjà dans le donut chart

  // Animations
  setTimeout(() => {
    const tvEl = document.getElementById('home-tv-counter');
    if (tvEl) animateNumber(tvEl, 0, tv, 1000);
    const progBar = document.getElementById('home-prog-bar');
    if (progBar) animateBar(progBar, pctObj, 1100, 300);
    const chips = document.querySelectorAll('#home-metrics .a-chip');
    chips.forEach((chip, i) => {
      chip.style.opacity = '0';
      chip.style.transform = 'scale(0.9)';
      chip.style.transition = `opacity 0.25s ease ${i*80+200}ms, transform 0.25s ease ${i*80+200}ms`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        chip.style.opacity = '1';
        chip.style.transform = 'scale(1)';
      }));
    });
  }, 80);
  setTimeout(() => fadeInCards('#home-score > div', 90), 150);

  // Insight IA asynchrone
  setTimeout(async () => {
    if (!positions.length) return;
    const insightEl = document.getElementById('home-ai-insight');
    if (!insightEl) return;
    const tv2 = positions.reduce((a,p)=>a+p.qty*p.price,0);
    const topSectors = {};
    positions.forEach(p => { if(p.sector) topSectors[p.sector]=(topSectors[p.sector]||0)+p.qty*p.price; });
    const topSector = Object.entries(topSectors).sort((a,b)=>b[1]-a[1])[0];
    const topPct = topSector ? (topSector[1]/tv2*100).toFixed(0) : 0;
    if (topSector && topPct > 35) {
      insightEl.innerHTML = `Votre exposition au secteur <strong style="color:#fff">${topSector[0]}</strong> est élevée (<strong style="color:#f59e0b">${topPct}%</strong>). Envisagez une diversification pour réduire le risque.`;
    }
  }, 800);
}



function buildAlertsData() {
  const tv = positions.reduce((a,p) => a + p.qty*p.price, 0);
  if (!tv) return [];

  // Grouper par ticker pour éviter les doublons
  const grouped = {};
  positions.forEach(p => {
    if (!grouped[p.name]) {
      grouped[p.name] = { name: p.name, type: p.type, val: 0, alert_price: p.alert_price, price: p.price };
    }
    grouped[p.name].val += p.qty * p.price;
    // Conserve l'alerte la plus basse définie
    if (p.alert_price && (!grouped[p.name].alert_price || p.alert_price > grouped[p.name].alert_price)) {
      grouped[p.name].alert_price = p.alert_price;
    }
  });

  let alerts = [];
  const seenAlerts = new Set();

  Object.values(grouped).forEach(g => {
    const w = g.val / tv * 100;
    const key = g.name;
    if (seenAlerts.has(key)) return;
    seenAlerts.add(key);

    if (w > 40) alerts.push({type:'err', msg:`⚡ <strong>${g.name}</strong> = ${w.toFixed(0)}% — concentration excessive`});
    else if (w > 25) alerts.push({type:'warn', msg:`<strong>${g.name}</strong> = ${w.toFixed(0)}% — surveille`});
    if (g.alert_price && g.price <= g.alert_price) {
      alerts.push({type:'err', msg:`🔔 <strong>${g.name}</strong> sous ton alerte ${fmt(g.alert_price)}€`});
    }
  });

  const etfPct = positions.filter(p => p.type==='ETF').reduce((a,p) => a+p.qty*p.price, 0) / tv * 100;
  if (etfPct < 30) alerts.push({type:'warn', msg:`Seulement ${etfPct.toFixed(0)}% d'ETF — vise 60–80%`});
  if (!alerts.length) alerts.push({type:'ok', msg:'✅ Portefeuille bien équilibré'});
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
  const finalScore = Math.round(items.reduce((a,i)=>a+i.score,0)/items.length*10)/10;
  return { score:finalScore, items, details:{ diversity:items[0].score, concentration:items[1].score, etfRatio:items[2].score, performance:items[3].score } };
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
  const tv = positions.reduce((a,p)=>a+p.qty*p.price, 0);
  const ti = positions.reduce((a,p)=>a+p.qty*p.pru, 0);
  const tpnl = tv - ti;
  const tpct = ti ? tpnl/ti*100 : 0;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const surfaceBg = isDark ? 'var(--color-surface)' : '#fff';
  const borderCol = isDark ? 'var(--color-border)' : '#e4e4e7';
  const textCol = isDark ? 'var(--color-text)' : '#09090b';
  const subCol = isDark ? 'var(--color-text-secondary)' : '#71717a';

  // Sparkline mini
  function miniSparkline(trend, color, w=80, h=28) {
    const pts = [50];
    for (let i=1;i<16;i++) { pts.push(Math.max(10,Math.min(90, pts[i-1]+(Math.random()-0.5)*4+trend*0.4))); }
    const min=Math.min(...pts), max=Math.max(...pts), range=max-min||1;
    const d = pts.map((v,i)=>`${i/(pts.length-1)*w},${h-((v-min)/range)*(h-4)-2}`);
    const path = 'M'+d.join(' L');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block">
      <defs><linearGradient id="mg${color.replace(/[^a-z0-9]/gi,'')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${path} L${w},${h} L0,${h} Z" fill="url(#mg${color.replace(/[^a-z0-9]/gi,'')})"/>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
  }

  // Donut
  function donutChart(data, total, size=130) {
    const colors = ['#3fb950','#6366f1','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#ef4444'];
    const c = size/2, r = 46, circum = 2*Math.PI*r;
    let offset = 0;
    const segs = data.map(([name,val],i) => {
      const pct = val/total;
      const dash = pct*circum;
      const s = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${colors[i%colors.length]}" stroke-width="10" stroke-dasharray="${dash} ${circum-dash}" stroke-dashoffset="${-offset*circum}" transform="rotate(-90 ${c} ${c})" stroke-linecap="round" style="transition:stroke-dashoffset 0.8s ease"/>`;
      offset += pct;
      return {seg:s, name, val, color:colors[i%colors.length], pct:(pct*100).toFixed(1)};
    });
    const trackColor = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f2';
    const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${trackColor}" stroke-width="10"/>
      ${segs.map(s=>s.seg).join('')}
      <text x="${c}" y="${c-5}" text-anchor="middle" font-size="13" font-weight="800" fill="${textCol}" font-family="-apple-system,sans-serif">${fmtK(total)}</text>
      <text x="${c}" y="${c+10}" text-anchor="middle" font-size="9" fill="${subCol}" font-family="-apple-system,sans-serif">Total</text>
    </svg>`;
    return {svg, segs};
  }

  // Dédupliquer les positions (même ticker + même plateforme = regrouper)
  const dedupMap = {};
  positions.forEach(p => {
    const key = p.name + '|' + (p.platform||'');
    if (!dedupMap[key]) {
      dedupMap[key] = {...p};
    } else {
      dedupMap[key].qty += p.qty;
    }
  });
  const dedupPositions = Object.values(dedupMap);

  // Allocation par position
  const byPos = dedupPositions.map(p=>([p.name, p.qty*p.price])).sort((a,b)=>b[1]-a[1]);
  const top5 = byPos.slice(0,5);
  const rest = byPos.slice(5).reduce((a,b)=>a+b[1],0);
  const donutData = rest > 0 ? [...top5, [`Autres (${byPos.length-5})`, rest]] : top5;
  const {svg: donutSvg, segs} = donutChart(donutData, tv);

  // Métriques topbar
  const metricsHtml = `
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
    ${[
      {label:'Valeur totale', val: fmtK(tv), sub: '', spark: true, trend: 0.3},
      {label:'Investi', val: fmtK(ti), sub: '', spark: false},
      {label:'Plus-value', val: (tpnl>=0?'+':'')+tpnl.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €', sub: '', color: tpnl>=0?'#3fb950':'#f87171', spark: false},
      {label:'Performance', val: (tpct>=0?'+':'')+tpct.toFixed(2)+'%', sub: '', color: tpct>=0?'#3fb950':'#f87171', spark: false},
    ].map(m=>`
    <div style="background:${surfaceBg};border:1px solid ${borderCol};border-radius:14px;padding:14px 16px">
      <div style="font-size:9px;font-weight:600;color:${subCol};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">${m.label}</div>
      ${m.spark ? `<div style="float:right;margin-top:-4px">${miniSparkline(0.3,'#3fb950',70,24)}</div>` : ''}
      <div style="font-size:20px;font-weight:800;color:${m.color||textCol};letter-spacing:-0.04em">${m.val}</div>
    </div>`).join('')}
  </div>`;

  // Tableau des positions
  const sorted = [...dedupPositions].sort((a,b)=>b.qty*b.price - a.qty*a.price);
  const tableHtml = `
  <div style="background:${surfaceBg};border:1px solid ${borderCol};border-radius:16px;overflow:hidden;margin-bottom:20px">
    <!-- Header tableau -->
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 80px 32px;gap:0;padding:10px 16px;border-bottom:1px solid ${borderCol}">
      ${['ACTIF','INVESTI','PRIX MOY.','VALEUR','PERF.','',''].map(h=>`<div style="font-size:10px;font-weight:600;color:${subCol};text-transform:uppercase;letter-spacing:0.06em">${h}</div>`).join('')}
    </div>
    <!-- Lignes positions -->
    ${sorted.map(p => {
      const val = p.qty*p.price;
      const inv = p.qty*p.pru;
      const pnl = val-inv;
      const pct = inv ? pnl/inv*100 : 0;
      const chg = p.change_pct||0;
      const pnlColor = pnl>=0?'#3fb950':'#f87171';
      const chgColor = chg>=0?'#3fb950':'#f87171';
      const initials = p.name.replace(/[^A-Z0-9]/g,'').slice(0,2)||p.name.slice(0,2).toUpperCase();
      const sig = posSignals[p.id];
      const sigColor = sig?.signal==='BUY'?'#3fb950':sig?.signal==='SELL'?'#f87171':'#f59e0b';
      const sigLabel = sig?.signal==='BUY'?'Renforcer':sig?.signal==='SELL'?'Vendre':'Garder';
      const hoverBg = isDark ? 'rgba(255,255,255,0.03)' : '#fafafa';
      return `
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 80px 32px;gap:0;padding:12px 16px;border-bottom:1px solid ${borderCol};transition:background 0.15s;cursor:pointer"
        onmouseover="this.style.background='${hoverBg}'" onmouseout="this.style.background='transparent'"
        onclick="togglePos('${p.id}')">
        <!-- Actif -->
        <div style="display:flex;align-items:center;gap:10px">
          ${getCompanyLogo(p.name, p.fullName||p.name, 36, 10)}
          <div>
            <div style="font-size:13px;font-weight:700;color:${textCol};letter-spacing:-0.02em">${p.name}</div>
            <div style="font-size:11px;color:${subCol};margin-top:1px">${p.fullName||p.type||'Action'} · ${p.qty} part${p.qty>1?'s':''} ${p.platform?`· <span style="color:${subCol}">${p.platform}</span>`:''}</div>
          </div>
        </div>
        <!-- Investi -->
        <div style="display:flex;align-items:center;font-size:13px;color:${textCol}">${inv.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} €</div>
        <!-- Prix moy -->
        <div style="display:flex;align-items:center;font-size:13px;color:${textCol}">${p.pru.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} €</div>
        <!-- Valeur -->
        <div style="display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:13px;font-weight:600;color:${textCol}">${val.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} €</div>
          <div style="font-size:11px;color:${pnlColor}">${pnl>=0?'+':''}${pnl.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} €</div>
        </div>
        <!-- Perf -->
        <div style="display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:13px;font-weight:700;color:${pnlColor}">${pnl>=0?'+':''}${pct.toFixed(2)}%</div>
          <div style="font-size:10px;color:${chgColor}">${chg>=0?'+':''}${chg.toFixed(2)}% auj.</div>
        </div>
        <!-- Sparkline -->
        <div style="display:flex;align-items:center">${miniSparkline(chg>0?1:-1, pnl>=0?'#3fb950':'#f87171')}</div>
        <!-- Menu -->
        <div style="display:flex;align-items:center;justify-content:center">
          <button onclick="event.stopPropagation();showPosMenu('${p.id}')" style="background:none;border:none;cursor:pointer;color:${subCol};font-size:16px;padding:4px;border-radius:6px;transition:background 0.15s" onmouseover="this.style.background='rgba(128,128,128,0.1)'" onmouseout="this.style.background='none'">⋯</button>
        </div>
      </div>`;
    }).join('')}
  </div>`;

  // Section bas — Répartition + Insights IA
  const bottomHtml = `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
    <!-- Donut répartition -->
    <div style="background:${surfaceBg};border:1px solid ${borderCol};border-radius:16px;padding:20px">
      <div style="font-size:14px;font-weight:700;color:${textCol};letter-spacing:-0.03em;margin-bottom:16px">Répartition</div>
      <div style="display:flex;align-items:center;gap:20px">
        ${donutSvg}
        <div style="flex:1;display:flex;flex-direction:column;gap:8px">
          ${segs.map(s=>`
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div style="display:flex;align-items:center;gap:7px">
              <div style="width:8px;height:8px;border-radius:50%;background:${s.color};flex-shrink:0"></div>
              <span style="font-size:12px;font-weight:600;color:${textCol}">${s.name}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="background:${isDark?'rgba(255,255,255,0.08)':'#f4f4f5'};border-radius:4px;height:3px;width:60px;overflow:hidden">
                <div style="height:100%;background:${s.color};width:${s.pct}%;border-radius:4px"></div>
              </div>
              <span style="font-size:11px;color:${subCol};min-width:36px;text-align:right">${s.pct}%</span>
            </div>
          </div>`).join('')}
        </div>
      </div>
      <button onclick="nav('sante')" style="width:100%;margin-top:14px;padding:8px;background:none;border:1px solid ${borderCol};border-radius:8px;font-size:12px;font-weight:600;color:${subCol};cursor:pointer;transition:all 0.15s" onmouseover="this.style.borderColor=textCol" onmouseout="this.style.borderColor=borderCol">Voir la répartition détaillée →</button>
    </div>
    <!-- Insight IA -->
    <div style="background:${isDark?'linear-gradient(135deg,#080c10,#0d1520)':'linear-gradient(135deg,#f0fdf4,#ecfdf5)'};border:1px solid ${isDark?'rgba(63,185,80,0.15)':'rgba(22,163,74,0.2)'};border-radius:16px;padding:20px;position:relative;overflow:hidden">
      <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;background:radial-gradient(circle,rgba(63,185,80,0.15),transparent);pointer-events:none"></div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
        <div style="width:6px;height:6px;background:#3fb950;border-radius:50%;animation:pulse-dot 2s infinite"></div>
        <span style="font-size:10px;font-weight:700;color:#3fb950;text-transform:uppercase;letter-spacing:0.08em">✦ Insights IA</span>
      </div>
      <div id="port-ai-insight" style="font-size:13px;color:${isDark?'rgba(230,237,243,0.8)':'#374151'};line-height:1.6;margin-bottom:14px">
        Analyse de ton portefeuille en cours...
      </div>
      <button onclick="nav('ai')" style="padding:8px 16px;background:#16a34a;border:none;border-radius:8px;font-size:12px;font-weight:600;color:#fff;cursor:pointer">Voir l'analyse complète →</button>
    </div>
  </div>
  <!-- Disclaimer -->
  <div style="text-align:center;padding:12px;font-size:11px;color:${subCol}">
    ⓘ Les données sont fournies à titre indicatif et ne constituent pas un conseil en investissement.
  </div>`;

  // Injecter dans le DOM
  const metricsEl = document.getElementById('port-metrics');
  const gridEl = document.getElementById('pos-grid');
  const allocEl = document.getElementById('alloc-bars');

  if (metricsEl) metricsEl.innerHTML = metricsHtml;
  if (gridEl) gridEl.innerHTML = tableHtml + bottomHtml;
  if (allocEl) allocEl.innerHTML = '';

  // Insight IA
  setTimeout(() => {
    const el = document.getElementById('port-ai-insight');
    if (!el || !positions.length) return;
    const topSectors = {};
    positions.forEach(p => { if(p.sector) topSectors[p.sector]=(topSectors[p.sector]||0)+p.qty*p.price; });
    const top = Object.entries(topSectors).sort((a,b)=>b[1]-a[1])[0];
    const topPct = top ? (top[1]/tv*100).toFixed(0) : null;
    const pnlPositions = positions.filter(p=>p.qty*p.price > p.qty*p.pru).length;
    if (top && topPct > 30) {
      el.innerHTML = `Votre exposition au secteur <strong>${top[0]}</strong> est élevée (<strong style="color:#f59e0b">${topPct}%</strong>). Envisagez une diversification pour réduire le risque.`;
    } else {
      el.innerHTML = `<strong>${pnlPositions}</strong> position${pnlPositions>1?'s':''} en plus-value sur ${positions.length}. Portef. ${tpct>=0?'en hausse':'en baisse'} de <strong style="color:${tpct>=0?'#3fb950':'#f87171'}">${Math.abs(tpct).toFixed(1)}%</strong> au total.`;
    }
  }, 600);

  // Animations
  setTimeout(() => {
    const rows = document.querySelectorAll('#pos-grid [style*="grid-template-columns:2fr"]');
    rows.forEach((row, i) => {
      row.style.opacity = '0';
      row.style.transition = `opacity 0.2s ease ${i*40}ms`;
      requestAnimationFrame(() => requestAnimationFrame(() => { row.style.opacity = '1'; }));
    });
  }, 50);

  // Générer signaux en lot — uniquement si API disponible (évite les 500 en cascade)
  // On tente un seul signal d'abord, si ça échoue on utilise le fallback statique pour tous
  const needSignal = positions.filter(p => !posSignals[p.id]).slice(0, 6);
  if (needSignal.length > 0) {
    generatePosSignal(needSignal[0]).then(() => {
      // Si le 1er réussit (pas de fallback "Analyse en cours"), lancer les suivants
      const sig = posSignals[needSignal[0].id];
      const apiOk = sig && sig.texte !== 'Analyse temporairement indisponible';
      if (apiOk) {
        needSignal.slice(1).forEach((p, i) => setTimeout(() => generatePosSignal(p), (i+1) * 800));
      } else {
        // API KO — applique le fallback statique à tous sans appels supplémentaires
        needSignal.slice(1).forEach(p => {
          const pnl = (p.price - p.pru) / p.pru * 100;
          posSignals[p.id] = {
            action: pnl > 5 ? 'garder' : pnl < -15 ? 'vendre' : 'garder',
            conviction: 'modérée', texte: pnl < -15 ? 'Perte importante — envisage de couper.' : pnl > 15 ? 'Belle performance — sécurise une partie.' : 'Continue à surveiller cette position.',
            horizon_signal: p.type === 'ETF' ? 'Long terme' : '1-3 mois', timing: 'Attendre',
            catalyseurs: ['Analyse indisponible'], risques: ['Volatilité du marché'], prix_cible: 0, stop_loss: 0
          };
        });
        saveSignalsCache();
      }
    });
  }
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

function showPosMenu(id) {
  // Ferme tous les menus ouverts
  document.querySelectorAll('.pos-menu-popup').forEach(m => m.remove());
  const btn = event?.target?.closest('button');
  const pos = positions.find(p => String(p.id) === String(id));
  if (!pos) return;
  const menu = document.createElement('div');
  menu.className = 'pos-menu-popup';
  menu.style.cssText = 'position:fixed;background:var(--color-surface);border:1px solid var(--color-border);border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.15);z-index:500;min-width:180px;overflow:hidden';
  menu.innerHTML = [
    `<button onclick="openEditPos('${id}');document.querySelector('.pos-menu-popup')?.remove()" style="width:100%;padding:12px 16px;background:none;border:none;text-align:left;font-size:13px;font-weight:600;color:var(--color-text);cursor:pointer;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='var(--color-bg-subtle)'" onmouseout="this.style.background='none'">✏️ Modifier</button>`,
    `<button onclick="openDecisionFromPos('${pos.name}','garder');document.querySelector('.pos-menu-popup')?.remove()" style="width:100%;padding:12px 16px;background:none;border:none;text-align:left;font-size:13px;font-weight:600;color:var(--color-text);cursor:pointer;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='var(--color-bg-subtle)'" onmouseout="this.style.background='none'">🤖 Analyser avec l'IA</button>`,
    `<hr style="margin:4px 0;border:none;border-top:1px solid var(--color-border)">`,
    `<button onclick="delPos('${id}');document.querySelector('.pos-menu-popup')?.remove()" style="width:100%;padding:12px 16px;background:none;border:none;text-align:left;font-size:13px;font-weight:600;color:#f87171;cursor:pointer;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='rgba(248,113,113,0.08)'" onmouseout="this.style.background='none'">🗑 Supprimer</button>`,
  ].join('');
  // Positionner près du bouton
  if (btn) {
    const rect = btn.getBoundingClientRect();
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
  } else {
    menu.style.top = '50%'; menu.style.left = '50%';
  }
  document.body.appendChild(menu);
  // Ferme sur clic extérieur
  setTimeout(() => document.addEventListener('click', function h(e) {
    if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', h); }
  }), 10);
}

let decisionIntention = null;
function openDecisionFromPos(name, action) {
  decisionIntention = action;
  // Vider l'ancienne analyse
  document.getElementById('d-result').innerHTML = '';
  nav('decision');
  setTimeout(() => {
    const nameEl = document.getElementById('d-name');
    if (nameEl) nameEl.value = name;
    const hEl = document.getElementById('d-horizon');
    if (hEl) hEl.value = profile.horizon;
    const rEl = document.getElementById('d-risk');
    if (rEl) rEl.value = profile.risk;
    updatePct();
    setDecisionIntent(action);
    document.getElementById('sec-decision')?.scrollTo(0,0);
  }, 50);
}

async function addPos() {
  // Limite 5 positions en gratuit
  if (!isPremiumUser() && positions.length >= 5) {
    showPremiumModal('positions');
    return;
  }
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
  // Dédupliquer les positions
  const dedupMap = {};
  positions.forEach(p => {
    const key = p.name + '|' + (p.platform||'');
    if (!dedupMap[key]) dedupMap[key] = {...p};
    else dedupMap[key].qty += p.qty;
  });
  const dedupPos = Object.values(dedupMap);

  const {score, details} = calcScore();
  const tv = dedupPos.reduce((a,p)=>a+p.qty*p.price,0);
  const ti = dedupPos.reduce((a,p)=>a+p.qty*p.pru,0);
  const tpnl = tv-ti, tpct = ti?tpnl/ti*100:0;
  const isDark = document.documentElement.getAttribute('data-theme')==='dark';
  const surface = isDark?'var(--color-surface)':'#fff';
  const border = isDark?'var(--color-border)':'#e4e4e7';
  const textPrimary = isDark?'var(--color-text)':'#09090b';
  const textSec = isDark?'var(--color-text-secondary)':'#71717a';

  const scoreColor = score>=7?'#3fb950':score>=5?'#f59e0b':'#f87171';
  const scoreLabel = score>=7?'Excellent 💪':score>=5?'Correct 👍':'À améliorer ⚠️';

  // Données score
  const scoreItems = [
    {label:'Diversification', val:details.diversity, color:'#3fb950'},
    {label:'Concentration max', val:details.concentration, color:'#3fb950'},
    {label:'Part ETF', val:details.etfRatio, color:'#3fb950'},
    {label:'Performance', val:details.performance, color: details.performance>=5?'#3fb950':'#f59e0b'},
  ];

  // Calcul composition
  const etfCount = dedupPos.filter(p=>p.type==='ETF').length;
  const etfVal = dedupPos.filter(p=>p.type==='ETF').reduce((a,p)=>a+p.qty*p.price,0);
  const etfPct = tv>0?(etfVal/tv*100).toFixed(0):0;
  const maxPos = dedupPos.length>0?dedupPos.reduce((a,p)=>p.qty*p.price>a.qty*a.price?p:a,dedupPos[0]):null;
  const maxPct = maxPos&&tv>0?(maxPos.qty*maxPos.price/tv*100).toFixed(0):0;
  const nbPos = dedupPos.length;

  // Anneau SVG animé
  const ring = (size, s, color) => {
    const c=size/2, r=(size-12)/2, circ=2*Math.PI*r;
    const pct = s/10;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${isDark?'rgba(255,255,255,0.06)':'#f0f0f2'}" stroke-width="6"/>
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="6"
        stroke-dasharray="${pct*circ} ${circ}" stroke-dashoffset="${circ/4}"
        stroke-linecap="round" style="transition:stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)"/>
    </svg>`;
  };

  // Points d'attention
  const alerts = [];
  dedupPos.forEach(p=>{
    if(p.alert_price && p.price < p.alert_price) alerts.push({icon:'🔴',name:p.name,msg:`sous ton alerte ${p.alert_price.toLocaleString('fr-FR')}€`,tag:'Alerte prix',tagColor:'#f87171',tagBg:isDark?'rgba(248,113,113,0.15)':'#fef2f2'});
  });
  if(maxPos && parseFloat(maxPct)>25) alerts.push({icon:'🟡',name:maxPos.name,msg:`représente ${maxPct}% du portefeuille`,tag:'Concentration élevée',tagColor:'#f59e0b',tagBg:isDark?'rgba(245,158,11,0.15)':'#fffbeb'});
  dedupPos.filter(p=>p.qty*p.price<p.qty*p.pru&&(p.price-p.pru)/p.pru*100<-20).forEach(p=>{
    alerts.push({icon:'🟠',name:p.name,msg:`en forte perte (${((p.price-p.pru)/p.pru*100).toFixed(1)}%)`,tag:'Performance faible',tagColor:'#fb923c',tagBg:isDark?'rgba(251,146,60,0.15)':'#fff7ed'});
  });

  const COLORS = ['#3fb950','#6366f1','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#ef4444','#14b8a6'];

  const html = `
  <!-- SCORE DE SANTÉ -->
  <div style="background:linear-gradient(135deg,${isDark?'#080c10,#0d1520':'#f0fdf4,#ecfdf5'});border:1px solid ${isDark?'rgba(63,185,80,0.2)':' rgba(22,163,74,0.2)'};border-radius:20px;padding:24px;margin-bottom:14px;position:relative;overflow:hidden">
    <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;background:radial-gradient(circle,rgba(63,185,80,0.12),transparent);pointer-events:none"></div>
    <div style="font-size:10px;font-weight:700;color:${isDark?'rgba(255,255,255,0.4)':textSec};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px">Score de santé</div>
    <div style="display:grid;grid-template-columns:auto 1fr auto;gap:24px;align-items:center">
      <!-- Score gauche -->
      <div>
        <div style="font-size:56px;font-weight:900;color:${scoreColor};letter-spacing:-0.05em;line-height:1">${score.toFixed(1)}</div>
        <div style="font-size:16px;color:${isDark?'rgba(255,255,255,0.4)':textSec};font-weight:400;margin-bottom:8px">/10</div>
        <div style="font-size:14px;font-weight:700;color:${scoreColor}">${scoreLabel}</div>
        <div style="margin-top:10px;display:flex;align-items:center;gap:7px;background:${isDark?'rgba(63,185,80,0.1)':'rgba(22,163,74,0.08)'};border-radius:10px;padding:8px 12px;border:1px solid ${isDark?'rgba(63,185,80,0.2)':'rgba(22,163,74,0.2)'}">
          <span style="font-size:13px">✓</span>
          <span style="font-size:11px;color:${isDark?'rgba(255,255,255,0.6)':textSec};font-weight:500">${score>=7?'Votre portefeuille est en excellente santé générale.':score>=5?'Quelques améliorations possibles.':'Des actions correctives recommandées.'}</span>
        </div>
      </div>
      <!-- Barres score -->
      <div style="display:flex;flex-direction:column;gap:12px">
        ${scoreItems.map(item=>`
        <div>
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:5px">
            <span style="color:${isDark?'rgba(255,255,255,0.8)':textPrimary}">${item.label}</span>
            <span style="color:${item.color}">${item.val}/10</span>
          </div>
          <div style="background:${isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)'};border-radius:99px;height:6px;overflow:hidden">
            <div style="height:100%;background:${item.color};width:${item.val*10}%;border-radius:99px;transition:width 1s cubic-bezier(0.16,1,0.3,1)"></div>
          </div>
        </div>`).join('')}
      </div>
      <!-- Anneau -->
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:100px;height:100px">
        ${ring(100, score, scoreColor)}
        <div style="position:absolute;font-size:28px">💚</div>
      </div>
    </div>
  </div>

  <!-- COMPOSITION -->
  <div style="background:${surface};border:1px solid ${border};border-radius:20px;padding:20px;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <span style="font-size:16px">🥧</span>
      <span style="font-size:15px;font-weight:700;color:${textPrimary};letter-spacing:-0.03em">Composition du portefeuille</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div style="background:${isDark?'var(--color-surface-raised)':'#f9fafb'};border:1px solid ${border};border-radius:14px;padding:16px;text-align:center">
        <div style="font-size:10px;font-weight:600;color:${textSec};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">ETF</div>
        <div style="font-size:28px;font-weight:900;color:${parseFloat(etfPct)>=60?'#3fb950':'#f59e0b'};letter-spacing:-0.04em">${etfPct}%</div>
        <div style="font-size:11px;color:${textSec};margin-top:4px">Idéal : 60%+</div>
      </div>
      <div style="background:${isDark?'var(--color-surface-raised)':'#f9fafb'};border:1px solid ${border};border-radius:14px;padding:16px;text-align:center">
        <div style="font-size:10px;font-weight:600;color:${textSec};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Concentration max</div>
        <div style="font-size:28px;font-weight:900;color:${parseFloat(maxPct)>25?'#f87171':'#3fb950'};letter-spacing:-0.04em">${maxPct}%</div>
        <div style="font-size:11px;color:${textSec};margin-top:4px">${maxPos?maxPos.name:''} · Max : 25%</div>
      </div>
      <div style="background:${isDark?'var(--color-surface-raised)':'#f9fafb'};border:1px solid ${border};border-radius:14px;padding:16px;text-align:center">
        <div style="font-size:10px;font-weight:600;color:${textSec};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Nb. positions</div>
        <div style="font-size:28px;font-weight:900;color:${textPrimary};letter-spacing:-0.04em">${nbPos}</div>
        <div style="font-size:11px;color:${textSec};margin-top:4px">Min conseillé : 8</div>
      </div>
      <div style="background:${isDark?'var(--color-surface-raised)':'#f9fafb'};border:1px solid ${border};border-radius:14px;padding:16px;text-align:center">
        <div style="font-size:10px;font-weight:600;color:${textSec};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Performance</div>
        <div style="font-size:28px;font-weight:900;color:${tpct>=0?'#3fb950':'#f87171'};letter-spacing:-0.04em">${tpct>=0?'+':''}${tpct.toFixed(1)}%</div>
        <div style="font-size:11px;color:${textSec};margin-top:4px">${tpnl>=0?'+':''}${tpnl.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
      </div>
    </div>

    <!-- Barres allocation -->
    <div style="display:flex;flex-direction:column;gap:8px">
      ${[...dedupPos].sort((a,b)=>b.qty*b.price-a.qty*a.price).map((p,i)=>{
        const pct = tv>0?(p.qty*p.price/tv*100):0;
        const pnl = p.qty*p.price-p.qty*p.pru;
        const initials = p.name.replace(/[^A-Z0-9]/g,'').slice(0,2)||p.name.slice(0,2).toUpperCase();
        return `
        <div style="display:flex;align-items:center;gap:10px">
          ${getCompanyLogo(p.name, p.name, 28, 8)}
          <div style="font-size:12px;font-weight:600;color:${textPrimary};min-width:80px">${p.name}</div>
          <div style="flex:1;background:${isDark?'rgba(255,255,255,0.06)':'#f0f0f2'};border-radius:99px;height:5px;overflow:hidden">
            <div style="height:100%;background:${COLORS[i%COLORS.length]};width:${pct}%;border-radius:99px;transition:width 1s ease"></div>
          </div>
          <div style="font-size:11px;font-weight:600;color:${textSec};min-width:42px;text-align:right">${pct.toFixed(1)}%</div>
          <div style="font-size:11px;color:${pnl>=0?'#3fb950':'#f87171'};min-width:70px;text-align:right">${pnl>=0?'+':''}${pnl.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
        </div>`}).join('')}
    </div>
  </div>

  <!-- CONSEILS IA -->
  <div style="background:${surface};border:1px solid ${border};border-radius:20px;padding:20px;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <span style="font-size:16px">🔮</span>
      <span style="font-size:15px;font-weight:700;color:${textPrimary};letter-spacing:-0.03em">Conseils personnalisés</span>
      <span style="background:rgba(63,185,80,0.12);border:1px solid rgba(63,185,80,0.25);border-radius:99px;padding:2px 8px;font-size:10px;font-weight:700;color:#3fb950">✦ IA</span>
    </div>
    <div style="display:flex;gap:16px;align-items:flex-start">
      <div style="flex-shrink:0;width:80px;height:80px;position:relative">
        <div style="width:80px;height:80px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,0.3),rgba(6,182,212,0.2));display:flex;align-items:center;justify-content:center;font-size:32px;border:1px solid rgba(99,102,241,0.2)">🌐</div>
        <div style="position:absolute;inset:0;border-radius:50%;animation:pulse-green 3s infinite;border:1px solid rgba(63,185,80,0.3)"></div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:10px">
        ${[
          {icon:'🛡️', title:'Bonne diversification globale', sub:'Votre portefeuille est bien diversifié sur plusieurs classes d\'actifs.', ok:true},
          {icon:'⭐', title:'Réduire la concentration', sub:`Envisagez de réduire l'exposition à ${maxPos?maxPos.name:'votre position principale'} (${maxPct}%) pour limiter le risque.`, ok:parseFloat(maxPct)<=25},
          {icon:'📈', title:'Améliorer la performance', sub:'Certaines positions sous-performent le marché. L\'IA peut vous aider.', ok:tpct>=0},
        ].map(c=>`
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:12px;background:${isDark?'var(--color-surface-raised)':'#f9fafb'};border-radius:12px;border:1px solid ${border}">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <span style="font-size:18px;flex-shrink:0;margin-top:1px">${c.icon}</span>
            <div>
              <div style="font-size:13px;font-weight:700;color:${textPrimary};margin-bottom:3px">${c.title}</div>
              <div style="font-size:12px;color:${textSec};line-height:1.5">${c.sub}</div>
            </div>
          </div>
          <div style="font-size:16px;flex-shrink:0;color:${c.ok?'#3fb950':textSec}">${c.ok?'✓':'›'}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>

  ${alerts.length > 0 ? `
  <!-- POINTS D'ATTENTION -->
  <div style="background:${surface};border:1px solid ${border};border-radius:20px;padding:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:16px">🔔</span>
        <span style="font-size:15px;font-weight:700;color:${textPrimary};letter-spacing:-0.03em">Points d'attention</span>
      </div>
      <button style="font-size:12px;font-weight:600;color:${textSec};background:none;border:none;cursor:pointer">Tout voir</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${alerts.map(a=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:${isDark?'var(--color-surface-raised)':'#f9fafb'};border-radius:12px;border:1px solid ${border}">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:50%;background:${a.tagBg};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${a.icon}</div>
          <div>
            <span style="font-size:13px;font-weight:700;color:${textPrimary}">${a.name}</span>
            <span style="font-size:12px;color:${textSec}"> ${a.msg}</span>
          </div>
        </div>
        <span style="background:${a.tagBg};color:${a.tagColor};font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;white-space:nowrap">${a.tag}</span>
      </div>`).join('')}
    </div>
  </div>` : ''}`;

  const el = document.getElementById('sante-content');
  if (el) el.innerHTML = html;
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
  // Limite max objectifs
  if (allObjectives.length >= 3) {
    // Affiche le message dans le wizard lui-même
    document.getElementById('obj-wizard').style.display = 'none';
    document.getElementById('obj-results').style.display = 'block';
    renderMultiObjChart();
    // Bandeau rouge persistant en haut de la section objectif
    const existing = document.getElementById('obj-max-banner');
    if (!existing) {
      const banner = document.createElement('div');
      banner.id = 'obj-max-banner';
      banner.style.cssText = 'background:#fff0f0;border:2px solid #cc2f26;border-radius:14px;padding:14px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:12px';
      banner.innerHTML = `<div>
        <div style="font-size:14px;font-weight:800;color:#cc2f26">⚠ Maximum 3 objectifs atteint</div>
        <div style="font-size:13px;color:#7f1d1d;margin-top:3px">Supprime un objectif existant (bouton ×) pour en créer un nouveau.</div>
      </div>
      <button onclick="document.getElementById('obj-max-banner').remove()" style="background:#cc2f26;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0">OK</button>`;
      const resultsEl = document.getElementById('obj-results');
      if (resultsEl) resultsEl.insertBefore(banner, resultsEl.firstChild);
    }
    return;
  }

  // ── Feedback visuel immédiat ──
  const genBtn = document.querySelector('.btn-obj-generate');
  if (genBtn) {
    genBtn.disabled = true;
    genBtn.innerHTML = '<svg class="spinning" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:middle"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Sauvegarde en cours...';
  }

  // Overlay de progression dans le wizard
  const wizardEl = document.getElementById('obj-wizard');
  const stepCards = wizardEl?.querySelectorAll('.obj-step-card');
  stepCards?.forEach(c => c.style.opacity = '0.4');

  // Injecte un bandeau de progression
  let progressEl = document.getElementById('obj-gen-progress');
  if (!progressEl) {
    progressEl = document.createElement('div');
    progressEl.id = 'obj-gen-progress';
    progressEl.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1c1c1e;color:#fff;border-radius:14px;padding:14px 20px;font-size:14px;font-weight:700;z-index:9999;display:flex;align-items:center;gap:10px;box-shadow:0 8px 30px rgba(0,0,0,0.3);min-width:260px;justify-content:center';
    document.body.appendChild(progressEl);
  }

  function setProgress(msg) {
    if (progressEl) progressEl.innerHTML = `<svg class="spinning" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a7f5a" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>${msg}</span>`;
  }
  function setProgressDone(msg) {
    if (progressEl) progressEl.innerHTML = `<span style="color:#4ade80;font-size:18px">✓</span><span>${msg}</span>`;
    setTimeout(() => { progressEl?.remove(); progressEl = null; }, 2000);
  }

  setProgress('Enregistrement...');

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

  // Save objective — variables globales
  objective = { target, years, rate: riskRates[objRisk], monthly };
  objChartCapital = capital;
  objChartMonthly = monthly;
  objChartTarget  = target;
  objChartYears   = years;
  objChartRate    = riskRates[objRisk];

  if (!isDemo && currentUser) {
    try {
      // Cherche si un objectif identique existe déjà
      const existing = allObjectives.find(o => o.target === target && o.monthly === monthly);
      if (existing) {
        const { error: ue } = await sb.from('objectives').update({
          capital, monthly, target, years,
          rate: riskRates[objRisk], risk: objRisk
        }).eq('id', existing.id);
        if (ue) console.warn('[generateObjPlan] update error:', ue.message);
      } else {
        const { data: ins, error: ie } = await sb.from('objectives').insert({
          user_id: currentUser.id, capital, monthly, target, years,
          rate: riskRates[objRisk], risk: objRisk
        }).select().single();
        if (ie) console.warn('[generateObjPlan] insert error:', ie.message);
        else console.log('[generateObjPlan] insert OK:', ins?.id);
      }
      // Recharge les objectifs pour mettre à jour allObjectives + onglets
      setProgress('Chargement du plan...');
      await loadObjective();
    } catch(e) { console.warn('[generateObjPlan] save error:', e); }
  }

  // localStorage fallback
  try { localStorage.setItem('iq_validated_objective', JSON.stringify({
    capital, monthly, target, years,
    rate: riskRates[objRisk], risk: objRisk,
    validatedAt: new Date().toISOString()
  })); } catch {}

  // Show results section — reset feedback
  stepCards?.forEach(c => c.style.opacity = '1');
  if (genBtn) { genBtn.disabled = false; genBtn.innerHTML = '🤖 Générer mon plan'; }
  setProgress('Génération du plan IA...');
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
  setTimeout(() => { if (allObjectives.length > 0) { renderMultiObjChart(); } else { buildObjChart(capital, monthly, target, years, riskRates[objRisk]); } }, 100);
  // Projection table in background
  renderProjectionTable(capital, monthly, target, years, riskRates[objRisk]);
  // Done
  setProgressDone('Objectif créé !');
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
  const tv = positions.reduce((a,p)=>a+p.qty*p.price, 0);
  const monthly = objChartMonthly || 200;
  const years = objChartYears || 10;
  const capital = objChartCapital || tv;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const surface = isDark ? 'var(--color-surface)' : '#fff';
  const raised = isDark ? 'var(--color-surface-raised)' : '#f9fafb';
  const border = isDark ? 'var(--color-border)' : '#e4e4e7';
  const text = isDark ? 'var(--color-text)' : '#09090b';
  const sub = isDark ? 'var(--color-text-secondary)' : '#71717a';

  if (!tv) {
    document.getElementById('crise-content').innerHTML = `<div style="text-align:center;padding:40px;color:${sub}">Ajoute des positions pour simuler des scénarios.</div>`;
    return;
  }

  function calcProjection(rate, y, c, m) {
    const r = rate/100/12;
    if (r === 0) return c + m*y*12;
    return Math.round(c * Math.pow(1+r, y*12) + m * (Math.pow(1+r, y*12)-1)/r);
  }

  // Mini sparkline SVG
  function spark(trend, color, w=80, h=40) {
    const pts = [50];
    for (let i=1;i<20;i++) pts.push(Math.max(5,Math.min(95, pts[i-1]+(Math.random()-0.5)*5+trend*0.8)));
    const min=Math.min(...pts), max=Math.max(...pts), range=max-min||1;
    const d = pts.map((v,i)=>`${i/(pts.length-1)*w},${h-((v-min)/range)*(h-4)-2}`);
    const path = 'M'+d.join(' L');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs><linearGradient id="cg${color.replace(/[^a-z0-9]/gi,'')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${path} L${w},${h} L0,${h} Z" fill="url(#cg${color.replace(/[^a-z0-9]/gi,'')})"/>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
  }

  const scenarios = [
    { label:'Pessimiste', icon:'📉', rate:-3, color:'#f87171', riskLabel:'RISQUE ÉLEVÉ', riskColor:'#f87171', riskBg:isDark?'rgba(248,113,113,0.15)':'#fef2f2', desc:'Récession globale, inflation persistante', trend:-2 },
    { label:'Réaliste', icon:'📊', rate:7, color:'#f59e0b', riskLabel:'RISQUE MODÉRÉ', riskColor:'#f59e0b', riskBg:isDark?'rgba(245,158,11,0.15)':'#fffbeb', desc:'Ralentissement économique (PIB faible)', trend:0.5, active:true },
    { label:'Optimiste', icon:'📈', rate:12, color:'#3fb950', riskLabel:'RISQUE FAIBLE', riskColor:'#3fb950', riskBg:isDark?'rgba(63,185,80,0.15)':'#f0fdf4', desc:'Rebond de l\'économie, bull run léger', trend:2 },
  ];

  const shocks = [
    {label:'-10%', pct:-10, color:'#f97316', desc:'Correction normale'},
    {label:'-20%', pct:-20, color:'#ef4444', desc:'Marché baissier'},
    {label:'-30%', pct:-30, color:'#dc2626', desc:'Crise modérée'},
    {label:'-40%', pct:-40, color:'#b91c1c', desc:'Crise sévère'},
    {label:'-50%', pct:-50, color:'#991b1b', desc:'Crash 2008'},
    {label:'-60%', pct:-60, color:'#7f1d1d', desc:'Crise extrême'},
  ];

  const strategies = [
    {icon:'🌍', title:'Diversification géographique', sub:'Réduire l\'exposition à une seule région et augmenter la diversification mondiale.', priority:'Priorité élevée', priorityColor:'#f87171', priorityBg:isDark?'rgba(248,113,113,0.12)':'#fef2f2'},
    {icon:'🛡️', title:'Renforcement prudentiel', sub:'Augmenter la part de cash ou d\'actifs peu corrélés (obligations, or, matières premières).', priority:'Priorité moyenne', priorityColor:'#6366f1', priorityBg:isDark?'rgba(99,102,241,0.12)':'#eff6ff'},
    {icon:'📅', title:'DCA — Investissement régulier', sub:'Investir de manière régulière réduit le risque et permet de profiter des rebonds.', priority:'Priorité moyenne', priorityColor:'#6366f1', priorityBg:isDark?'rgba(99,102,241,0.12)':'#eff6ff'},
    {icon:'🔒', title:'Fonds de précaution', sub:'Garder 3 à 6 mois de dépenses en liquidités avant d\'investir en bourse.', priority:'Priorité élevée', priorityColor:'#f87171', priorityBg:isDark?'rgba(248,113,113,0.12)':'#fef2f2'},
  ];

  const html = `
  <!-- STRUCTURES DE SCÉNARIOS -->
  <div style="background:${surface};border:1px solid ${border};border-radius:20px;padding:22px;margin-bottom:14px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;background:${isDark?'rgba(99,102,241,0.15)':'#eff6ff'};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px">📊</div>
        <div>
          <div style="font-size:15px;font-weight:700;color:${text};letter-spacing:-0.03em">Structures de scénarios</div>
          <div style="font-size:12px;color:${sub};display:flex;align-items:center;gap:5px">Basé sur le MSCI World et l'historique 20 ans <span style="font-size:14px">ⓘ</span></div>
        </div>
      </div>
      <button style="display:flex;align-items:center;gap:6px;padding:7px 12px;background:${raised};border:1px solid ${border};border-radius:8px;font-size:12px;font-weight:600;color:${sub};cursor:pointer">
        ⓘ Méthodologie
      </button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px;margin-bottom:16px">
      ${scenarios.map(s => {
        const proj = calcProjection(s.rate, years, capital, monthly);
        const invested = capital + monthly*12*years;
        const gain = proj - invested;
        const gainPct = invested ? ((proj/invested-1)*100).toFixed(1) : 0;
        const borderStyle = s.active ? `2px solid ${s.color}` : `1px solid ${border}`;
        const boxShadow = s.active ? `0 0 24px ${s.color}25` : 'none';
        return `
        <div style="background:${raised};border:${borderStyle};border-radius:16px;padding:16px;position:relative;overflow:hidden;box-shadow:${boxShadow}">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <div style="width:36px;height:36px;background:${s.color}20;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px">${s.icon}</div>
            <div>
              <div style="font-size:14px;font-weight:700;color:${text}">${s.label}</div>
              <div style="font-size:11px;color:${sub};line-height:1.3">${s.desc}</div>
            </div>
          </div>
          <div style="background:${s.riskBg};border-radius:6px;padding:4px 10px;display:inline-block;margin-bottom:12px">
            <span style="font-size:10px;font-weight:800;color:${s.riskColor};letter-spacing:0.06em">${s.riskLabel}</span>
          </div>
          <div style="font-size:10px;font-weight:600;color:${sub};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Rendement annuel</div>
          <div style="font-size:32px;font-weight:900;color:${s.color};letter-spacing:-0.05em;line-height:1;margin-bottom:12px">${s.rate>0?'+':''}${s.rate}%</div>
          <div style="margin-bottom:10px">${spark(s.trend, s.color)}</div>
          <div style="font-size:11px;color:${sub};margin-bottom:4px">Valeur projetée dans ${years} ans</div>
          <div style="font-size:20px;font-weight:800;color:${text};letter-spacing:-0.04em">${fmtK(proj)} k€</div>
          <div style="font-size:12px;font-weight:700;color:${s.color};margin-top:3px">${gain>=0?'+':''}${fmtK(gain)} k€ (${gain>=0?'+':''}${gainPct}%)</div>
        </div>`;
      }).join('')}
    </div>

    <div style="padding:12px 14px;background:${isDark?'rgba(245,158,11,0.08)':'#fffbeb'};border:1px solid ${isDark?'rgba(245,158,11,0.2)':'#fde68a'};border-radius:10px;font-size:12px;color:${sub};display:flex;align-items:center;gap:8px">
      <span>💡</span>
      <span>Le scénario <strong style="color:#f59e0b">Réaliste à 7%/an</strong> correspond au rendement historique moyen du MSCI World sur 20 ans (dividendes réinvestis).</span>
    </div>
  </div>

  <!-- CHOCS DE MARCHÉ -->
  <div style="background:${surface};border:1px solid ${border};border-radius:20px;padding:22px;margin-bottom:14px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;background:${isDark?'rgba(239,68,68,0.15)':'#fef2f2'};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px">⚡</div>
        <div>
          <div style="font-size:15px;font-weight:700;color:${text};letter-spacing:-0.03em">Chocs de marché</div>
          <div style="font-size:12px;color:${sub}">Impact d'une baisse brutale sur ton portefeuille actuel (${fmtK(tv)} k€)</div>
        </div>
      </div>
      <button style="display:flex;align-items:center;gap:6px;padding:7px 12px;background:${raised};border:1px solid ${border};border-radius:8px;font-size:12px;font-weight:600;color:${sub};cursor:pointer">
        Afficher en % ▾
      </button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px;margin-bottom:16px">
      ${shocks.map(s => {
        const newVal = tv * (1 + s.pct/100);
        const loss = newVal - tv;
        return `
        <div style="background:${raised};border:1px solid ${border};border-radius:14px;padding:16px;transition:border-color 0.15s"
          onmouseover="this.style.borderColor='${s.color}'" onmouseout="this.style.borderColor='${border}'">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <span style="font-size:16px;font-weight:900;color:${s.color}">${s.label}</span>
            <span style="font-size:11px;color:${sub}">${s.desc}</span>
          </div>
          <div style="font-size:20px;font-weight:800;color:${text};letter-spacing:-0.04em;margin-bottom:4px">${fmtK(newVal)} k€</div>
          <div style="font-size:13px;font-weight:700;color:${s.color};margin-bottom:10px">${fmtK(loss)} k€ de perte</div>
          <div style="background:${isDark?'rgba(255,255,255,0.06)':'#f0f0f2'};border-radius:99px;height:5px;overflow:hidden">
            <div style="height:100%;background:${s.color};width:${100+s.pct}%;border-radius:99px;transition:width 0.8s ease"></div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div style="padding:12px 14px;background:${isDark?'rgba(248,113,113,0.08)':'#fef2f2'};border:1px solid ${isDark?'rgba(248,113,113,0.2)':'#fecaca'};border-radius:10px;font-size:12px;color:${isDark?'rgba(248,113,113,0.9)':'#991b1b'};display:flex;align-items:center;gap:8px">
      <span>⚠️</span>
      <span>Ces simulations sont basées sur des baisses extrêmes. En réalité, les actifs réagissent différemment selon leur type et leur horizon.</span>
    </div>
  </div>

  <!-- STRATÉGIES DE RÉSILIENCE -->
  <div style="background:${surface};border:1px solid ${border};border-radius:20px;padding:22px;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <div style="width:36px;height:36px;background:${isDark?'rgba(99,102,241,0.15)':'#eff6ff'};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px">🛡️</div>
      <div>
        <div style="font-size:15px;font-weight:700;color:${text};letter-spacing:-0.03em">Stratégies de résilience</div>
        <div style="font-size:12px;color:${sub}">Actions recommandées pour protéger et renforcer ton portefeuille en période de crise.</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
      ${strategies.map(s=>`
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;background:${raised};border:1px solid ${border};border-radius:12px;transition:border-color 0.15s;cursor:pointer"
        onmouseover="this.style.borderColor='${s.priorityColor}40'" onmouseout="this.style.borderColor='${border}'">
        <div style="display:flex;align-items:center;gap:12px;flex:1">
          <div style="width:38px;height:38px;border-radius:10px;background:${isDark?'rgba(255,255,255,0.06)':'#f4f4f5'};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${s.icon}</div>
          <div>
            <div style="font-size:13px;font-weight:700;color:${text};margin-bottom:3px">${s.title}</div>
            <div style="font-size:12px;color:${sub};line-height:1.4">${s.sub}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span style="background:${s.priorityBg};color:${s.priorityColor};font-size:11px;font-weight:700;padding:4px 10px;border-radius:8px;white-space:nowrap">${s.priority}</span>
          <span style="color:${sub};font-size:16px">›</span>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <!-- DISCLAIMER -->
  <div style="text-align:center;padding:14px;font-size:12px;color:${sub}">
    ⓘ Les performances passées ne préjugent pas des performances futures.
  </div>`;

  document.getElementById('crise-content').innerHTML = html;
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
  if (!force && loadNewsCache()) { renderNewsList(); return; }
  const ico = document.getElementById('news-ico');
  const btn = document.getElementById('news-refresh-btn');
  if (ico) ico.classList.add('spinning');
  if (btn) btn.disabled = true;

  // Skeleton loader
  const list = document.getElementById('news-list');
  if (list) list.innerHTML = [1,2,3,4,5,6,7,8].map(() => `
    <div style="background:#fff;border-radius:16px;padding:16px;margin-bottom:10px;border:1.5px solid #f0f0f0;overflow:hidden">
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div class="skeleton" style="width:70px;height:20px;border-radius:8px"></div>
        <div class="skeleton" style="width:55px;height:20px;border-radius:8px"></div>
        <div class="skeleton" style="width:45px;height:20px;border-radius:8px;margin-left:auto"></div>
      </div>
      <div class="skeleton" style="height:18px;border-radius:6px;margin-bottom:8px"></div>
      <div class="skeleton" style="height:14px;border-radius:6px;width:85%;margin-bottom:5px"></div>
      <div class="skeleton" style="height:14px;border-radius:6px;width:65%"></div>
    </div>`).join('');

  const today = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const myAssets = positions.map(p => p.name).join(', ') || 'IWDA, VWCE';
  const prompt = `Tu es analyste financier senior. Nous sommes le ${today}.
Génère 8 actualités économiques et financières importantes et récentes, diversifiées (macro, banques centrales, marchés, géopolitique, secteurs).
Mets en priorité les actus pertinentes pour ces actifs : ${myAssets}.
Retourne UNIQUEMENT un tableau JSON valide (sans backticks, sans commentaires) :
[{"titre":"Titre accrocheur max 10 mots","resume":"2 phrases concrètes et précises","categorie":"macro|banque|marche|geo|secteur","impact":"élevé|moyen|faible","heure":"Il y a 2h|Ce matin|Hier soir|Cette semaine","signal":"acheter|attendre|éviter|neutre","reco_texte":"Conseil actionnable en 2-3 phrases pour débutant, adapté au signal","actifs_cibles":["TICKER1","TICKER2"]}]`;

  const raw = await callClaude(prompt, 'Tu es analyste financier. Retourne uniquement du JSON valide sans texte autour ni backticks.');
  try {
    const s = raw.replace(/```json|```/g, '').trim();
    newsData = JSON.parse(s.slice(s.indexOf('['), s.lastIndexOf(']') + 1));
  } catch { newsData = fallbackNews(); }

  saveNewsCache();
  if (ico) ico.classList.remove('spinning');
  if (btn) btn.disabled = false;
  renderNewsList();
  addNewsNotifications();
}

function addNewsNotifications() {
  newsData.filter(n => n.impact === 'élevé').forEach(n => {
    notifications.unshift({ titre: n.titre, texte: n.resume, action: n.reco_texte, impact: 'high', heure: n.heure });
  });
  if (notifications.length) { renderNotifications(); document.getElementById('notif-dot').classList.add('show'); }
}

function fallbackNews() {
  return [
    { titre:"BCE : taux inchangés à 2,5%", resume:"La BCE maintient ses taux directeurs lors de sa réunion de mai. Christine Lagarde signale une vigilance persistante sur l'inflation.", categorie:"banque", impact:"élevé", heure:"Ce matin", signal:"attendre", reco_texte:"Continue ton DCA normalement. Pas de changement de cap à prévoir pour les ETF obligataires.", actifs_cibles:["IWDA","VWCE"] },
    { titre:"Inflation zone euro : 2,2% en avril", resume:"L'inflation ralentit légèrement en zone euro, proche de la cible des 2% de la BCE. Les données de mai seront décisives.", categorie:"macro", impact:"moyen", heure:"Hier", signal:"acheter", reco_texte:"Bon signal pour renforcer les ETF monde. L'environnement macro est favorable aux actions.", actifs_cibles:["IWDA","VWCE"] },
    { titre:"S&P 500 : nouveau record historique", resume:"L'indice américain franchit un nouveau sommet porté par les valeurs technologiques. NVIDIA et Microsoft tirent la hausse.", categorie:"marche", impact:"moyen", heure:"Hier soir", signal:"neutre", reco_texte:"Pas d'action urgente. Si tu as déjà des ETF monde, tu profites de la hausse automatiquement.", actifs_cibles:["IWDA","NVDA","MSFT"] },
    { titre:"Tensions commerciales USA-Chine relancées", resume:"Washington annonce de nouveaux droits de douane sur les semi-conducteurs chinois. Pékin menace de représailles.", categorie:"geo", impact:"élevé", heure:"Ce matin", signal:"éviter", reco_texte:"Évite les ETF exposés à la Chine à court terme. Diversifie sur des ETF monde pour limiter le risque géopolitique.", actifs_cibles:["IWDA"] },
    { titre:"LVMH : résultats T1 inférieurs aux attentes", resume:"Le chiffre d'affaires de LVMH recule de 3% en Asie. Le titre chute de 4% à l'ouverture de Paris.", categorie:"secteur", impact:"moyen", heure:"Ce matin", signal:"attendre", reco_texte:"Si tu détiens LVMH, garde et surveille. Le luxe reste solide long terme malgré la faiblesse asiatique.", actifs_cibles:["MC.PA"] },
    { titre:"Fed : Powell exclut une baisse des taux avant l'automne", resume:"Jerome Powell réaffirme la prudence de la Fed face à une inflation américaine encore trop haute. Taux maintenus à 4,25-4,5%.", categorie:"banque", impact:"élevé", heure:"Hier soir", signal:"attendre", reco_texte:"L'environnement de taux élevés favorise les obligations court terme. Pour tes ETF actions, reste en DCA.", actifs_cibles:["IWDA","VWCE"] },
    { titre:"TotalEnergies : dividende relevé de 7%", resume:"Le géant pétrolier annonce une hausse de son dividende et un programme de rachat d'actions de 2 milliards d'euros.", categorie:"secteur", impact:"moyen", heure:"Ce matin", signal:"acheter", reco_texte:"Signal positif pour les actionnaires. TotalEnergies offre un rendement dividende attractif en période de volatilité.", actifs_cibles:["TTE.PA"] },
    { titre:"Emploi US : 180 000 créations en avril", resume:"Le marché du travail américain reste solide avec 180 000 créations d'emplois. Le taux de chômage stable à 4,1%.", categorie:"macro", impact:"faible", heure:"Vendredi dernier", signal:"neutre", reco_texte:"Un marché du travail solide soutient la consommation et donc les bénéfices des entreprises. Pas d'action immédiate.", actifs_cibles:["IWDA","VWCE"] },
  ];
}

function filterNews(cat, el) {
  newsFilter = cat;
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderNewsList();
}

function suggestedPct(signal, risk, horizon) {
  const base = { acheter:{faible:5,modere:10,eleve:20}, attendre:{faible:2,modere:4,eleve:5}, 'éviter':{faible:0,modere:0,eleve:0}, neutre:{faible:3,modere:7,eleve:10} };
  let p = ((base[signal] || base.neutre)[risk]) || 5;
  if (horizon === 'long') p = Math.min(p * 1.5, 40);
  if (horizon === 'court') p = Math.max(p * 0.5, 1);
  return Math.round(p);
}

// ===== RENDER TOUTES LES ACTUS (version améliorée) =====
function renderNewsList() {
  const list = document.getElementById('news-list');
  if (!list) return;

  // Si on est sur un sous-filtre géré ailleurs → déléguer
  if (newsFilter === 'favoris') { renderFavorisNews(); return; }
  if (newsFilter === 'signaux') { if (isCacheValid('signaux')) { restoreFromCache('signaux'); } else { renderSignaux(); } return; }
  if (newsFilter === 'entreprises') { if (isCacheValid('entreprises')) { restoreFromCache('entreprises'); } else { renderEntreprises(); } return; }
  if (newsFilter === 'agenda') { if (isCacheValid('agenda')) { restoreFromCache('agenda'); } else { renderAgenda(); } return; }

  // Filtrage "Toutes" ou par catégorie
  let filtered = newsFilter === 'tous' ? newsData : newsData.filter(n => n.categorie === newsFilter);

  if (!filtered.length) {
    list.innerHTML = `<div style="text-align:center;padding:40px;color:#8e8e93">
      <div style="font-size:32px;margin-bottom:10px">📭</div>
      <div style="font-size:15px;font-weight:700;color:#1c1c1e;margin-bottom:6px">Aucune actualité</div>
      <div style="font-size:13px">Actualise pour charger les dernières infos.</div>
    </div>`;
    return;
  }

  const tagCls = { macro:'pill-dark', banque:'pill-amber', marche:'pill-blue', geo:'pill-red', secteur:'pill-green' };
  const tagLbl = { macro:'🌍 Macro', banque:'🏦 Banque centrale', marche:'📈 Marchés', geo:'⚡ Géopolitique', secteur:'🏢 Secteurs' };
  const impCls = { 'élevé':'pill-red', 'moyen':'pill-amber', 'faible':'pill-green' };
  // Barre latérale colorée selon signal
  const sigBorderColor = { acheter:'#1a7f5a', attendre:'#f59e0b', 'éviter':'#cc2f26', neutre:'#c7c7cc' };
  const sigBg          = { acheter:'#f0faf6', attendre:'#fffbf0', 'éviter':'#fff5f5', neutre:'#fafafa' };
  const sigCls         = { acheter:'signal-buy', attendre:'signal-wait', 'éviter':'signal-avoid', neutre:'signal-neutral' };
  const sigLbl         = { acheter:'↑ Opportunité', attendre:'⏸ Attendre', 'éviter':'↓ Éviter', neutre:'→ Neutre' };
  const sigIcon        = { acheter:'📈', attendre:'⏸️', 'éviter':'🚫', neutre:'➡️' };

  list.innerHTML = filtered.map((n, i) => {
    const pct   = suggestedPct(n.signal, profile.risk, profile.horizon);
    const amt   = Math.round((profile.bankroll || 5000) * pct / 100);
    const first = (n.actifs_cibles || [])[0] || '';
    const border = sigBorderColor[n.signal] || '#c7c7cc';
    const bg     = sigBg[n.signal] || '#fafafa';

    // Pills des actifs cibles — cliquables + badge portefeuille
    const assets = (n.actifs_cibles || []).map(a => {
      const inPortf = positions.find(p => p.name === a);
      const isFav   = isFavorite(a);
      const style   = inPortf
        ? 'background:#1c1c1e;color:#fff;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:3px'
        : 'background:#f0f0f0;color:#3c3c43;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:3px';
      return `<span style="${style}" onclick="event.stopPropagation();openCompany('${a}','${a}','')">
        ${inPortf ? '📦 ' : ''}${a}${isFav ? ' ★' : ''}
      </span>`;
    }).join('');

    // Étoile favori sur le premier ticker valide
    const starTicker = (n.actifs_cibles || []).find(t => t && t.length < 15 && !t.includes(' ')) || '';
    const starName   = starTicker;
    const isFav      = starTicker ? isFavorite(starTicker) : false;
    const starHtml   = starTicker ? `
      <button id="star-news-${i}"
        onclick="event.stopPropagation();toggleNewsItemFav('${starTicker}','${starName}','news-item-${i}')"
        style="background:none;border:none;cursor:pointer;font-size:22px;padding:2px 6px;line-height:1;color:${isFav?'#f59e0b':'#d0d0d0'};transition:all 0.2s;flex-shrink:0;transform:${isFav?'scale(1.1)':'scale(1)'}"
        title="${isFav ? 'Retiré des favoris' : 'Ajouter aux favoris'}">${isFav ? '★' : '☆'}</button>` : '';

    // Bouton analyser
    const analyseBtn = n.signal !== 'éviter' && first
      ? `<button onclick="event.stopPropagation();openDecision('${first}','${n.signal}')"
           style="background:#1c1c1e;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">
           🤔 Analyser
         </button>`
      : '';

    // Badge portefeuille si actu concerne une de mes positions
    const inMyPortfolio = (n.actifs_cibles || []).some(a => positions.find(p => p.name === a));

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const surf = isDark ? 'var(--color-surface)' : '#fff';
    const bord = isDark ? 'var(--color-border)' : '#e4e4e7';
    const txt = isDark ? 'var(--color-text)' : '#09090b';
    const sub2 = isDark ? 'var(--color-text-secondary)' : '#71717a';
    const hoverBg = isDark ? 'rgba(255,255,255,0.03)' : '#fafafa';

    // Impact sur portefeuille simulé
    const hasPortPos = (n.actifs_cibles||[]).some(a => positions.find(p=>p.name===a));
    const impactPct = hasPortPos ? ((Math.random()-0.4)*3).toFixed(2) : null;
    const impactColor = impactPct >= 0 ? '#3fb950' : '#f87171';

    // Logo company (initiales colorées)
    const logoColors = ['#3fb950','#6366f1','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#ef4444','#14b8a6'];
    const logoColor = logoColors[first ? first.charCodeAt(0) % logoColors.length : i % logoColors.length];
    const logoText = first ? first.slice(0,2).toUpperCase() : (n.categorie||'AC').slice(0,2).toUpperCase();

    // Recommandation IA courte
    const recoMap = {
      'acheter':'Conserver / Renforcer', 'renforcer':'Conserver / Renforcer',
      'garder':'Conserver', 'surveiller':'Surveiller',
      'vendre':"Réduire l'exposition", 'éviter':"Réduire l'exposition",
      'neutre':'Opportunité'
    };
    const recoLabel = recoMap[n.signal] || 'Analyser';
    const recoColors = {
      'acheter':'#3fb950','renforcer':'#3fb950','garder':'#3fb950',
      'surveiller':'#f59e0b','vendre':'#f87171','éviter':'#f87171','neutre':'#6366f1'
    };
    const recoColor = recoColors[n.signal] || '#6366f1';
    const recoSubMap = {
      'acheter':"Potentiel de croissance à moyen terme.",
      'renforcer':"Signal fort — bon point d'entrée.",
      'garder':"Position à maintenir.",
      'surveiller':"Risque sur les marges à court terme.",
      'vendre':"Volatilité élevée attendue.",
      'éviter':"Signal négatif — prudence.",
      'neutre':"Renforcement de l'avantage concurrentiel."
    };
    const recoSub = recoSubMap[n.signal] || "Voir l'analyse complète.";
    const impactBorderColor = n.impact === 'élevé' ? '#f87171' : (n.impact === 'moyen' ? '#f59e0b' : bord);

    return `
    <div class="news-item" id="news-item-${i}"
      style="background:${surf};border-radius:14px;margin-bottom:10px;border:1px solid ${bord};${n.impact==='élevé'?`border-left:3px solid #f87171`:''};overflow:hidden;transition:all 0.15s;cursor:pointer"
      onmouseover="this.style.background='${hoverBg}';this.style.borderColor='${isDark?'rgba(255,255,255,0.15)':'#d1d5db'}'"
      onmouseout="this.style.background='${surf}';this.style.borderColor='${bord}'">
      <div style="display:flex;align-items:flex-start;gap:14px;padding:16px" onclick="toggleNews(${i})">
        <!-- Logo -->
        <div style="width:44px;height:44px;border-radius:12px;background:${logoColor}20;border:1px solid ${logoColor}40;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:${logoColor};flex-shrink:0">${logoText}</div>
        <!-- Contenu principal -->
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
            <span style="font-size:11px;font-weight:600;color:${sub2}">${tagLbl[n.categorie]||n.categorie}</span>
            <span style="color:${sub2};font-size:10px">·</span>
            <span style="font-size:11px;color:${sub2}">${n.heure}</span>
            ${n.impact==='élevé'?`<span style="background:rgba(248,113,113,0.15);border:1px solid rgba(248,113,113,0.3);color:#f87171;font-size:10px;font-weight:700;padding:1px 7px;border-radius:4px">Impact élevé</span>`:''}
            ${inMyPortfolio?`<span style="background:rgba(63,185,80,0.12);border:1px solid rgba(63,185,80,0.25);color:#3fb950;font-size:10px;font-weight:700;padding:1px 7px;border-radius:4px">Mon portef.</span>`:''}
          </div>
          <div style="font-size:14px;font-weight:700;color:${txt};line-height:1.4;margin-bottom:6px;letter-spacing:-0.02em">${n.titre}</div>
          <div style="font-size:12px;color:${sub2};line-height:1.5;margin-bottom:8px">${n.resume}</div>
          ${first?`<div style="display:flex;gap:5px;flex-wrap:wrap">
            ${(n.actifs_cibles||[]).slice(0,3).map(a=>`<span style="background:${isDark?'rgba(255,255,255,0.07)':'#f4f4f5'};border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600;color:${sub2}">${a}</span>`).join('')}
          </div>`:''}
        </div>
        <!-- Impact portef -->
        ${impactPct ? `
        <div style="flex-shrink:0;text-align:center;min-width:80px">
          <div style="font-size:10px;font-weight:600;color:${sub2};margin-bottom:4px;white-space:nowrap">Impact portef.</div>
          <div style="font-size:18px;font-weight:800;color:${impactColor};letter-spacing:-0.03em">${impactPct>=0?'+':''}${impactPct}%</div>
          <div style="font-size:10px;color:${sub2};margin-top:2px">≈ ${fmtK(Math.abs(impactPct/100 * positions.reduce((a,p)=>a+p.qty*p.price,0)))} k€</div>
        </div>` : ''}
        <!-- Recommandation IA -->
        <div style="flex-shrink:0;min-width:120px;border-left:1px solid ${bord};padding-left:14px">
          <div style="font-size:10px;font-weight:600;color:${sub2};margin-bottom:5px">Recommandation IA</div>
          <div style="font-size:13px;font-weight:700;color:${recoColor};margin-bottom:4px">${recoLabel}</div>
          <div style="font-size:11px;color:${sub2};line-height:1.4;margin-bottom:8px">${recoSub}</div>
          ${analyseBtn ? `<button onclick="event.stopPropagation();openDecision('${first}','${n.signal}')" style="padding:5px 12px;background:#16a34a;border:none;border-radius:6px;font-size:11px;font-weight:700;color:#fff;cursor:pointer">Voir →</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('') + `
  <div style="text-align:center;padding:12px 0 4px;color:#c7c7cc;font-size:11px;font-weight:500">
    ⚠️ Actualités générées par IA à titre informatif · Pas des conseils financiers réglementés
  </div>`;
}

function toggleNews(i) {
  const r = document.getElementById('nreco-' + i);
  const b = document.getElementById('nexp-' + i);
  if (!r || !b) return;
  const isOpen = r.classList.contains('open');
  r.classList.toggle('open', !isOpen);
  b.textContent = isOpen ? '▾ Recommandation IA' : '▴ Masquer';
  if (!isOpen) {
    const card = r.closest ? r.closest('[id^="news-item-"]') : null;
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ===== DECISION =====
function openDecision(ticker,signal){
  const pct=signal==='éviter'?0:suggestedPct(signal,profile.risk,profile.horizon);
  const amt=Math.round(profile.bankroll*pct/100);
  // Vider l'ancienne analyse à chaque nouveau ticker
  document.getElementById('d-result').innerHTML = '';
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
  // Vérif limite gratuit
  if (!isPremiumUser()) {
    const used = getTotalCount('decision');
    if (used >= 3) {
      showPremiumModal('decision');
      return;
    }
    incrementTotalCount('decision');
  }
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
let dcaChartInstance = null;

function dcaPreset(m, y, r, s, btn) {
  document.getElementById('dca-m').value = m;
  document.getElementById('dca-y').value = y;
  document.getElementById('dca-r').value = r;
  document.getElementById('dca-s').value = s;
  // Marquer la carte active
  document.querySelectorAll('.dca-preset-card,.dca-preset-tab').forEach(b => {
    b.classList.remove('active');
    b.style.background = 'transparent';
    const l = b.querySelector('div:first-child');
    if (l) l.style.color = 'var(--color-text-secondary)';
  });
  if (btn) {
    btn.classList.add('active');
    btn.style.background = 'rgba(63,185,80,0.08)';
    const l = btn.querySelector('div:first-child');
    if (l) l.style.color = '#3fb950';
  }
  updateDCA();
}

// Pré-calcule et affiche le résultat final sur chaque carte preset au chargement
function initDCAPresets() {
  const presets = [
    { m:200,  y:10, r:7,  s:0 },
    { m:200,  y:10, r:4,  s:0 },
    { m:300,  y:10, r:9,  s:0 },
    { m:1000, y:10, r:7,  s:0 },
    { m:2000, y:10, r:9,  s:0 },
    { m:5000, y:10, r:11, s:0 },
  ];
  presets.forEach((p, i) => {
    const rate = p.r / 100 / 12;
    const n    = p.y * 12;
    const total = p.s * Math.pow(1+rate,n) + (rate>0 ? p.m*((Math.pow(1+rate,n)-1)/rate) : p.m*n);
    const el = document.getElementById('pre-res-' + i);
    if (el) el.textContent = '→ ' + fmtK(Math.round(total));
  });
}

function updateDCA() {
  const m    = parseFloat(document.getElementById('dca-m').value);
  const y    = parseInt(document.getElementById('dca-y').value);
  const rAnn = parseFloat(document.getElementById('dca-r').value);
  const s    = parseFloat(document.getElementById('dca-s').value);
  const rate = rAnn / 100 / 12;
  const n    = y * 12;

  // Labels
  document.getElementById('dca-m-o').textContent = m.toLocaleString('fr-FR') + ' €';
  document.getElementById('dca-y-o').textContent = y + ' an' + (y > 1 ? 's' : '');
  document.getElementById('dca-r-o').textContent = rAnn.toFixed(1) + ' %';
  document.getElementById('dca-s-o').textContent = s.toLocaleString('fr-FR') + ' €';

  // Calcul final
  const total    = s * Math.pow(1 + rate, n) + (rate > 0 ? m * ((Math.pow(1 + rate, n) - 1) / rate) : m * n);
  const invested = s + m * n;
  const gain     = total - invested;
  const mult     = invested > 0 ? total / invested : 1;

  // Métriques
  const _mEl=document.getElementById('dca-metrics'); if(_mEl) _mEl.innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Capital final estimé</div>
      <div class="metric-val green">${fmtK(Math.round(total))}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Total investi</div>
      <div class="metric-val">${fmtK(Math.round(invested))}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Intérêts composés</div>
      <div class="metric-val green">+${fmtK(Math.round(gain))}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Multiplicateur</div>
      <div class="metric-val">×${mult.toFixed(2)}</div>
    </div>`;

  // Message tip + warning si rendement irréaliste
  const tipEl = document.getElementById('dca-tip');
  if (tipEl) {
    const gainPct = invested > 0 ? ((gain / invested) * 100).toFixed(0) : 0;
    let warningHtml = '';
    if (rAnn > 12) {
      warningHtml = `
      <div style="background:#fff0f0;border-radius:12px;padding:12px 14px;margin-bottom:10px;border-left:4px solid #cc2f26">
        <div style="font-size:13px;font-weight:800;color:#cc2f26;margin-bottom:6px">⚠️ Rendement irréaliste — ${rAnn}%/an</div>
        <div style="font-size:12px;color:#7f1d1d;line-height:1.6">
          Un rendement de <strong>${rAnn}%/an</strong> n'est <strong>pas réaliste</strong> sur le long terme sans prise de risque extrême.
          <br>Repères réels : ETF monde <strong>~7%/an</strong> · Portefeuille équilibré <strong>~8-9%/an</strong> · Actions agressif <strong>10-12%/an max</strong>
          <br>Au-delà, c'est de la spéculation ou du levier — risque de perte totale.
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
          <button onclick="document.getElementById('dca-r').value=7;updateDCA()" style="background:#fff;border:1.5px solid #cc2f26;color:#cc2f26;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer">→ Passer à 7% (ETF monde)</button>
          <button onclick="document.getElementById('dca-r').value=9;updateDCA()" style="background:#fff;border:1.5px solid #f59e0b;color:#92400e;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer">→ Passer à 9% (agressif réaliste)</button>
        </div>
      </div>`;
    } else if (rAnn > 9) {
      warningHtml = `
      <div style="background:#fff9e6;border-radius:12px;padding:10px 14px;margin-bottom:10px;border-left:3px solid #f59e0b">
        <div style="font-size:12px;font-weight:700;color:#92400e">⚡ Rendement ambitieux — ${rAnn}%/an</div>
        <div style="font-size:12px;color:#78350f;margin-top:3px">Atteignable avec un portefeuille d'actions growth bien sélectionné, mais implique une forte volatilité. Pas garanti.</div>
      </div>`;
    }
    tipEl.innerHTML = warningHtml + `<div class="alert alert-ok" style="margin-top:0;margin-bottom:0">
      <span>✓</span>
      <div>${m > 0 ? m.toLocaleString('fr-FR') + ' €/mois' : ''}${m > 0 && s > 0 ? ' + ' : ''}${s > 0 ? s.toLocaleString('fr-FR') + '€ de départ' : ''} pendant ${y} an${y>1?'s':''} génère <strong>${fmtK(Math.round(gain))}</strong> en intérêts composés (+${gainPct}%).
      </div>
    </div>`;
  }

  // Graphique
  const canvas = document.getElementById('dca-chart');
  if (canvas) {
    const step   = Math.max(1, Math.floor(n / 60));
    const labels = [];
    const valData = [];
    const invData = [];
    for (let mo = 0; mo <= n; mo += step) {
      const yr = mo / 12;
      labels.push(yr === 0 ? "Auj." : yr % 1 === 0 ? yr + 'a' : '');
      const fv = s * Math.pow(1 + rate, mo) + (rate > 0 ? m * ((Math.pow(1 + rate, mo) - 1) / rate) : m * mo);
      valData.push(Math.round(fv));
      invData.push(Math.round(s + m * mo));
    }

    if (dcaChartInstance) dcaChartInstance.destroy();
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 220);
    grad.addColorStop(0, 'rgba(74,222,128,0.25)');
    grad.addColorStop(0.6, 'rgba(74,222,128,0.08)');
    grad.addColorStop(1, 'rgba(74,222,128,0)');

    dcaChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Capital projeté',
            data: valData,
            borderColor: '#1c1c1e',
            backgroundColor: grad,
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 5,
          },
          {
            label: 'Capital investi',
            data: invData,
            borderColor: '#c7c7cc',
            borderWidth: 1.5,
            borderDash: [5, 4],
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
              label: ctx => ctx.dataset.label + ' : ' + fmtK(ctx.raw)
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10, weight: '600' }, color: '#8e8e93', maxRotation: 0 } },
          y: { grid: { color: '#f5f5f5' }, ticks: { font: { size: 10, weight: '600' }, color: '#8e8e93', callback: v => fmtK(v) } }
        }
      }
    });
  }

  // Tableau annuel
  const tableEl = document.getElementById('dca-table');
  if (tableEl) {
    const milestones = [];
    for (let i = 1; i <= y; i++) {
      if (y <= 10 || i % Math.ceil(y / 10) === 0 || i === 1 || i === y) milestones.push(i);
    }
    const uniqueMilestones = [...new Set(milestones)];

    let rows = '';
    for (const yr of uniqueMilestones) {
      const mo  = yr * 12;
      const fv  = s * Math.pow(1 + rate, mo) + (rate > 0 ? m * ((Math.pow(1 + rate, mo) - 1) / rate) : m * mo);
      const inv = s + m * mo;
      const g   = fv - inv;
      const pct = inv > 0 ? ((g / inv) * 100).toFixed(1) : '0.0';
      rows += `<tr style="border-bottom:1px solid rgba(255,255,255,0.06);transition:background 0.1s" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
        <td style="padding:8px 6px;font-weight:700;color:#1c1c1e;font-size:13px">Année ${yr}</td>
        <td style="padding:8px 6px;font-weight:800;color:#1a7f5a;font-size:13px">${fmtK(Math.round(fv))}</td>
        <td style="padding:8px 6px;color:#8e8e93;font-size:12px">${fmtK(Math.round(inv))}</td>
        <td style="padding:8px 6px;color:#1a7f5a;font-weight:700;font-size:12px">+${fmtK(Math.round(g))}</td>
        <td stytd style="padding:13px 12px">
          <span style="background:rgba(74,222,128,0.12);color:#4ade80;font-weight:700;padding:4px 12px;border-radius:99px;font-size:12px;border:1px solid rgba(74,222,128,0.2)">+${pct}%</span>
        </td>
      </tr>`;
    }

    tableEl.innerHTML = `
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:2px solid #f0f0f0">
            <th style="text-align:left;padding:8px 6px;font-size:11px;color:#8e8e93;font-weight:700;text-transform:uppercase">Année</th>
            <th style="text-align:left;padding:8px 6px;font-size:11px;color:#8e8e93;font-weight:700;text-transform:uppercase">Capital</th>
            <th style="text-align:left;padding:8px 6px;font-size:11px;color:#8e8e93;font-weight:700;text-transform:uppercase">Investi</th>
            <th style="text-align:left;padding:8px 6px;font-size:11px;color:#8e8e93;font-weight:700;text-transform:uppercase">Gains</th>
            <th style="text-align:left;padding:8px 6px;font-size:11px;color:#8e8e93;font-weight:700;text-transform:uppercase">Perf.</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }
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

// ===== AGENT IA =====
function sq(q) { document.getElementById('ai-in').value = q; sendAI(); }
function sqIdx(i) { const s = window._agentSuggestions?.[i]; if (s) sq(s.q); }

function buildAgentContext() {
  // Barre de contexte — résumé de la situation actuelle
  const bar = document.getElementById('agent-context-bar');
  if (!bar) return;
  const tv = positions.reduce((a,p) => a+p.qty*p.price, 0);
  const ti = positions.reduce((a,p) => a+p.qty*p.pru, 0);
  const pnl = tv - ti;
  const pct = ti > 0 ? (pnl/ti*100).toFixed(1) : 0;
  const chips = [];
  if (tv > 0) chips.push(`<span style="background:#e8f8f0;color:#1a7f5a;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700">💼 ${fmtK(tv)} · ${pnl>=0?'+':''}${pct}%</span>`);
  if (objChartTarget > 0) chips.push(`<span style="background:#f0f0f0;color:#1c1c1e;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700">🎯 Objectif ${fmtK(objChartTarget)}</span>`);
  if (profile.risk) chips.push(`<span style="background:#f0f0f0;color:#1c1c1e;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700">⚖️ Profil ${profile.risk}</span>`);
  chips.push(`<span style="background:#f0f0f0;color:#8e8e93;padding:5px 10px;border-radius:8px;font-size:12px">🧠 Mémoire active</span>`);
  bar.innerHTML = chips.join('');
}

function buildAgentSuggestions() {
  // Questions contextuelles intelligentes selon la situation
  const el = document.getElementById('agent-suggestions');
  if (!el) return;

  const tv = positions.reduce((a,p) => a+p.qty*p.price, 0);
  const pnl = tv - positions.reduce((a,p) => a+p.qty*p.pru, 0);
  const avgChg = positions.length ? positions.reduce((a,p)=>a+(p.change_pct||0),0)/positions.length : 0;
  const pctObj = objChartTarget > 0 ? (tv/objChartTarget*100) : 0;

  // Suggestions dynamiques selon le contexte
  const suggestions = [];

  if (positions.length === 0) {
    suggestions.push({ label: '🚀 Par où commencer ?', q: 'Je débute en bourse, par où commencer avec mon profil ?' });
    suggestions.push({ label: '💡 Quel ETF acheter ?', q: 'Quel ETF monde me recommandes-tu pour débuter ?' });
    suggestions.push({ label: '🏦 Quelle plateforme ?', q: 'Trade Republic ou XTB, laquelle me conseilles-tu ?' });
  } else {
    if (avgChg < -2) suggestions.push({ label: '📉 Marché en baisse — quoi faire ?', q: `Mon portefeuille baisse de ${Math.abs(avgChg).toFixed(1)}% aujourd'hui. Je fais quoi ?` });
    if (pnl < 0) suggestions.push({ label: '⚠️ Mes pertes — que faire ?', q: `J'ai une perte de ${fmtK(Math.abs(pnl))} sur mon portefeuille. Dois-je couper ou tenir ?` });
    if (pctObj > 0 && pctObj < 50) suggestions.push({ label: '🎯 Accélérer vers mon objectif', q: `Je suis à ${pctObj.toFixed(0)}% de mon objectif. Comment accélérer ?` });
    suggestions.push({ label: '📊 Analyse mon portefeuille', q: 'Analyse mon portefeuille et dis-moi ce que tu en penses.' });
    suggestions.push({ label: '🔄 Dois-je rééquilibrer ?', q: 'Mon portefeuille est-il bien équilibré ou dois-je rééquilibrer ?' });
  }

  // Questions générales toujours utiles
  suggestions.push({ label: '📅 Plan ce mois-ci', q: 'Que dois-je faire avec mon argent ce mois-ci ?' });
  suggestions.push({ label: '🧮 Simuler un scénario', q: 'Si j\'investis 200€ de plus par mois, quel impact sur mon objectif ?' });

  // Stocke les questions dans un objet global pour éviter les problèmes d'échappement
  window._agentSuggestions = suggestions.slice(0,5);
  el.innerHTML = `<div style="font-size:11px;font-weight:700;color:#8e8e93;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px">💬 Questions rapides</div>
  <div style="display:flex;gap:6px;flex-wrap:wrap">
    ${suggestions.slice(0,5).map((s, i) => `
    <button onclick="sqIdx(${i})"
      style="background:#fff;border:1.5px solid #e5e5ea;border-radius:99px;padding:7px 13px;font-size:12px;font-weight:600;color:#1c1c1e;cursor:pointer;transition:all 0.15s;white-space:nowrap"
      onmouseover="this.style.borderColor='#1c1c1e'" onmouseout="this.style.borderColor='#e5e5ea'">
      ${s.label}
    </button>`).join('')}
  </div>`;
}

function getFullContext() {
  // Contexte complet pour l'agent
  const tv = positions.reduce((a,p) => a+p.qty*p.price, 0);
  const ti = positions.reduce((a,p) => a+p.qty*p.pru, 0);
  const pnl = tv - ti;
  const pct = ti > 0 ? (pnl/ti*100).toFixed(1) : 0;
  const avgChg = positions.length ? positions.reduce((a,p)=>a+(p.change_pct||0),0)/positions.length : 0;

  let ctx = `=== CONTEXTE UTILISATEUR ===
Portefeuille : ${positions.length} positions · Valeur ${fmtK(tv)} · P&L ${pnl>=0?'+':''}${fmtK(pnl)} (${pct}%) · Variation aujourd'hui : ${avgChg>=0?'+':''}${avgChg.toFixed(1)}%
Profil : horizon ${profile.horizon || 'moyen'} · risque ${profile.risk || 'faible'} · bankroll ${profile.bankroll || 5000}€
`;

  if (positions.length) {
    ctx += `Positions : ${positions.map(p => {
      const known = AC_DB.find(c => c.ticker.toUpperCase() === p.name.toUpperCase());
      const fullName = known ? `${p.name} (${known.name})` : p.name;
      const ppnl = ((p.price-p.pru)/p.pru*100).toFixed(1);
      return `${fullName} ${p.qty}parts PRU${p.pru}€ actuel${p.price}€ (${ppnl>=0?'+':''}${ppnl}%)`;
    }).join(' | ')}
`;
  }

  if (objChartTarget > 0) {
    const pctObj = (tv/objChartTarget*100).toFixed(1);
    ctx += `Objectif : ${fmtK(objChartTarget)} en ${objChartYears}ans · ${objChartMonthly}€/mois · ${pctObj}% atteint · profil ${objRisk}
`;
  }

  if (allObjectives.length > 1) {
    ctx += `Objectifs multiples : ${allObjectives.map(o => `${o.label} (${fmtK(o.target)}, ${o.monthly}€/mois, ${o.years}ans)`).join(' | ')}
`;
  }

  return ctx;
}

function detectIntent(q) {
  // Détecte si l'utilisateur veut effectuer une action
  const lower = q.toLowerCase();
  if (lower.match(/ajoute?|achète?|add/)) return 'ajouter';
  if (lower.match(/supprime?|retire?|enlève?|delete/)) return 'supprimer';
  if (lower.match(/alerte?|notif/)) return 'alerte';
  if (lower.match(/objectif|goal/)) return 'objectif';
  if (lower.match(/simul|si j.investis|si j.ajoute|et si/)) return 'simulation';
  if (lower.match(/analyse|bilan|état|comment va/)) return 'analyse';
  return 'question';
}

async function sendAI() {
  // Vérif limite gratuit
  if (!isPremiumUser()) {
    const count = getDailyCount('ai');
    if (count >= 1) {
      showPremiumModal('agent_ia');
      return;
    }
  }
  const inp = document.getElementById('ai-in');
  const q = inp.value.trim();
  if (!q) return;
  inp.value = '';

  const chat = document.getElementById('ai-chat');
  const sendBtn = document.getElementById('ai-send-btn');
  if (sendBtn) sendBtn.disabled = true;

  chatHistory.push({ role: 'user', content: q });
  chat.innerHTML += `<div class="bubble user" style="background:linear-gradient(135deg,#16a34a,#059669);color:#fff;border-radius:16px 16px 4px 16px;padding:12px 18px;margin-left:auto;max-width:80%;font-size:14px;font-weight:500;width:fit-content">${q}</div><div class="bubble bot" id="ai-loading" style="display:flex;align-items:center;gap:8px"><svg class="spinning" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span style="color:#8e8e93">Réflexion...</span></div>`;
  chat.scrollTop = chat.scrollHeight;

  const intent = detectIntent(q);
  const ctx = getFullContext();
  const histCtx = chatHistory.slice(-8).map(m => `${m.role==='user'?'Utilisateur':'Assistant'}: ${m.content}`).join('\n');

  let systemPrompt = `Tu es un agent IA financier personnel expert et pédagogue, intégré dans l'app InvestIQ.
Tu as accès au contexte complet de l'utilisateur ci-dessous.
Réponds TOUJOURS en français. Sois concis, direct et actionnable.
Si l'utilisateur demande une ACTION (ajouter position, créer alerte, modifier objectif), réponds avec le plan d'action ET ajoute à la fin une ligne JSON spéciale :
[ACTION:{"type":"ajouter_position","ticker":"AAPL","qty":5,"prix":180}] ou [ACTION:{"type":"alerte","ticker":"LVMH","prix":650}] ou [ACTION:{"type":"simuler","monthly_add":200}]
Pour les SIMULATIONS, calcule toi-même et montre le résultat chiffré.
Tu ne fournis pas de conseils financiers réglementés.`;

  const fullPrompt = `${ctx}\n=== HISTORIQUE ===\n${histCtx}\n\n=== QUESTION ===\n${q}`;

  try {
    const r = await callClaude(fullPrompt, systemPrompt);
    chatHistory.push({ role: 'assistant', content: r });
    if (!isPremiumUser()) incrementDailyCount('ai');
    saveChatHistory();

    // Détecte et parse les actions
    const actionMatch = r.match(/\[ACTION:(.*?)\]/s);
    let displayR = r.replace(/\[ACTION:.*?\]/s, '').trim();

    const loadingEl = document.getElementById('ai-loading');
    if (loadingEl) loadingEl.outerHTML = `<div class="bubble bot" style="background:var(--color-surface-raised);border:1px solid var(--color-border);border-radius:16px;padding:18px 20px;max-width:100%;line-height:1.6">${formatMD(displayR)}</div>`;

    // Affiche le bouton d'action si détecté
    if (actionMatch) {
      try {
        const action = JSON.parse(actionMatch[1]);
        renderAgentAction(action, chat);
      } catch(e) {}
    }

    // Rafraîchit les suggestions
    buildAgentSuggestions();
  } catch(e) {
    const loadingEl = document.getElementById('ai-loading');
    if (loadingEl) loadingEl.outerHTML = `<div class="bubble bot" style="color:#cc2f26">Erreur — réessaie.</div>`;
  }

  if (sendBtn) sendBtn.disabled = false;
  chat.scrollTop = chat.scrollHeight;
}

function renderAgentAction(action, chat) {
  // Affiche un bouton d'action confirmable dans le chat
  const labels = {
    ajouter_position: `➕ Ajouter ${action.qty} ${action.ticker} à ${action.prix}€`,
    alerte: `🔔 Créer alerte ${action.ticker} à ${action.prix}€`,
    simuler: `📊 Voir la simulation`,
    objectif: `🎯 Modifier l'objectif`,
  };
  const label = labels[action.type] || "✓ Confirmer l'action";
  const actionHtml = `
  <div class="bubble bot" style="padding:0">
    <div style="background:#f0faf6;border-radius:12px;padding:12px 14px;border-left:3px solid #1a7f5a">
      <div style="font-size:12px;font-weight:700;color:#1a7f5a;margin-bottom:8px">⚡ Action suggérée</div>
      <button onclick="executeAgentAction(${JSON.stringify(action).replace(/"/g,'&quot;')})"
        style="background:#1a7f5a;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;width:100%">
        ${label}
      </button>
      <div style="font-size:11px;color:#8e8e93;margin-top:6px;text-align:center">Clique pour exécuter · Tu peux vérifier avant de valider</div>
    </div>
  </div>`;
  chat.innerHTML += actionHtml;
}

function executeAgentAction(action) {
  switch(action.type) {
    case 'ajouter_position':
      nav('ajouter');
      setTimeout(async () => {
        // Cherche le nom réel dans la base locale
        const known = AC_DB.find(c => c.ticker.toUpperCase() === (action.ticker||'').toUpperCase());
        const company = {
          ticker: action.ticker,
          name: known ? known.name : action.ticker,
          type: known ? known.type : (action.type_actif || 'Action'),
          sector: known ? known.sector : (action.secteur || ''),
          exchange: known ? known.exchange : ''
        };
        await acSelect(company);
        // Attend que le prix live soit chargé (max 2s)
        await new Promise(r => setTimeout(r, 1200));
        if (action.qty) document.getElementById('f-qty').value = action.qty;
        if (action.prix) {
          const priceEl = document.getElementById('f-price');
          const pruEl   = document.getElementById('f-pru');
          // Ne remplace que si pas déjà rempli par le live
          if (priceEl && (!priceEl.value || priceEl.value === '')) priceEl.value = action.prix;
          if (pruEl   && (!pruEl.value   || pruEl.value   === '')) pruEl.value   = action.prix;
        }
        showToast('✅ Formulaire pré-rempli — vérifie et valide !');
      }, 200);
      break;
    case 'alerte':
      nav('portfolio');
      showToast(`🔔 Va dans ta position ${action.ticker} → Modifier → Alerte prix : ${action.prix}€`);
      break;
    case 'simuler':
      nav('dca');
      if (action.monthly_add) {
        setTimeout(() => {
          const mEl = document.getElementById('dca-m');
          if (mEl) { mEl.value = (objChartMonthly||200) + action.monthly_add; updateDCA(); }
        }, 200);
      }
      break;
    case 'objectif':
      nav('objectif');
      break;
  }
}

function initAgent() {
  buildAgentContext();
  buildAgentSuggestions();

  // Date du briefing
  const dateEl = document.getElementById('agent-brief-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long'});
  }

  // Message de bienvenue personnalisé
  const welcome = document.getElementById('ai-welcome');
  if (welcome && positions.length > 0) {
    const tv = positions.reduce((a,p) => a+p.qty*p.price, 0);
    const pnl = tv - positions.reduce((a,p) => a+p.qty*p.pru, 0);
    const color = pnl >= 0 ? '#1a7f5a' : '#cc2f26';
    welcome.innerHTML = `Bonjour ! Ton portefeuille est à <strong style="color:${color}">${fmtK(tv)}</strong> (${pnl>=0?'+':''}${fmtK(pnl)}). Je connais toutes tes positions, tes objectifs et ton profil. Que veux-tu faire ?`;
  }

  // Génère le briefing (avec cache 6h)
  const BRIEF_KEY = 'iq_daily_brief';
  const cached = (() => { try { const c = JSON.parse(localStorage.getItem(BRIEF_KEY)||'null'); return c && Date.now()-c.ts < 6*3600000 ? c : null; } catch { return null; } })();
  if (cached) {
    renderDailyBrief(cached.items);
  } else {
    generateDailyBrief();
  }
}

async function generateDailyBrief() {
  // Cache 24h — premium uniquement
  if (!isPremiumUser()) {
    const briefEl = document.getElementById('agent-brief-content');
    if (briefEl) briefEl.innerHTML = '<div style="padding:10px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.15);border-radius:10px;font-size:13px;color:#fbbf24;display:flex;align-items:center;gap:8px"><span>✦</span><span>Briefing quotidien disponible en <strong>Premium</strong></span></div>';
    return;
  }
  const cached = getCachedResponse('briefing', CACHE_TTL.briefing);
  if (cached) {
    const briefEl = document.getElementById('agent-brief-content');
    if (briefEl) briefEl.innerHTML = cached;
    const dateEl = document.getElementById('agent-brief-date');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long'});
    return;
  }

  const el = document.getElementById('agent-brief-content');
  const btn = document.getElementById('brief-refresh-btn');
  if (!el) return;
  if (btn) btn.disabled = true;

  el.innerHTML = `<div style="display:flex;align-items:center;gap:8px;color:rgba(255,255,255,0.3);font-size:13px">
    <svg class="spinning" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
    Analyse de ton portefeuille...
  </div>`;

  const tv = positions.reduce((a,p)=>a+p.qty*p.price,0);
  const ti = positions.reduce((a,p)=>a+p.qty*p.pru,0);
  const pnl = tv - ti;
  const avgChg = positions.length ? positions.reduce((a,p)=>a+(p.change_pct||0),0)/positions.length : 0;
  const pctObj = objChartTarget > 0 ? (tv/objChartTarget*100).toFixed(1) : null;
  const sorted = [...positions].sort((a,b)=>(b.change_pct||0)-(a.change_pct||0));
  const best = sorted[0], worst = sorted[sorted.length-1];

  if (!positions.length) {
    renderDailyBrief([
      { icon:'👋', text:'Bienvenue ! Ajoute tes premières positions pour recevoir un briefing personnalisé.', color:'#a5b4fc', type:'info' }
    ]);
    if (btn) btn.disabled = false;
    return;
  }

  const prompt = `Tu es un conseiller financier IA. Génère un briefing ULTRA court pour ce portefeuille.
Valeur: ${fmtK(tv)} · P&L: ${pnl>=0?'+':''}${fmtK(pnl)} · Variation auj: ${avgChg>=0?'+':''}${avgChg.toFixed(1)}%
Positions: ${positions.slice(0,6).map(p=>`${p.name}(${(p.change_pct||0).toFixed(1)}%)`).join(', ')}
${pctObj ? `Objectif: ${pctObj}% atteint` : ''}

Génère exactement 3 points courts. Format JSON UNIQUEMENT:
[
  {"icon":"📈","text":"Une observation courte (max 12 mots)","color":"#4ade80","type":"perf"},
  {"icon":"⚡","text":"Une alerte ou opportunité courte","color":"#fbbf24","type":"alert"},
  {"icon":"💡","text":"Un conseil actionnable court","color":"#a5b4fc","type":"tip"}
]
Sois TRÈS concis. Max 12 mots par point. Utilise les vraies données.`;

  try {
    const raw = await callClaude(prompt, 'Réponds UNIQUEMENT en JSON valide.');
    const clean = raw.replace(/\`\`\`json|\`\`\`/g,'').trim();
    const items = JSON.parse(clean.slice(clean.indexOf('['), clean.lastIndexOf(']')+1));
    try { localStorage.setItem('iq_daily_brief', JSON.stringify({items, ts:Date.now()})); } catch {}
    renderDailyBrief(items);
  } catch(e) {
    // Fallback calculé localement
    const items = [
      { icon: avgChg>=0?'📈':'📉', text: `Portef. ${avgChg>=0?'en hausse':'en baisse'} de ${Math.abs(avgChg).toFixed(1)}% aujourd'hui`, color: avgChg>=0?'#4ade80':'#f87171', type:'perf' },
      { icon: best?'🏆':'—', text: best ? `${best.name} meilleure perf. (+${(best.change_pct||0).toFixed(1)}%)` : 'Pas de données', color:'#fbbf24', type:'alert' },
      { icon: '💡', text: pctObj ? `${pctObj}% de l'objectif atteint · Continue le DCA` : 'Définis un objectif pour suivre ta progression', color:'#a5b4fc', type:'tip' }
    ];
    try { localStorage.setItem('iq_daily_brief', JSON.stringify({items, ts:Date.now()})); } catch {}
    renderDailyBrief(items);
  }
  if (btn) btn.disabled = false;
}

function renderDailyBrief(items) {
  const el = document.getElementById('agent-brief-content');
  if (!el || !items?.length) return;
  el.innerHTML = items.map(item => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(255,255,255,0.05);border-radius:10px;border-left:3px solid ${item.color}">
      <span style="font-size:18px;flex-shrink:0">${item.icon}</span>
      <span style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.85);line-height:1.4">${item.text}</span>
      <button onclick="sq('${item.text.replace(/'/g,"\'")} — explique-moi en détail')"
        style="margin-left:auto;background:rgba(255,255,255,0.08);border:none;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);cursor:pointer;flex-shrink:0;white-space:nowrap">
        → Détails
      </button>
    </div>`).join('');
}


// ===== DCA DONUT =====
function updateDCADonut() {
  const m=parseFloat(document.getElementById('dca-m')?.value)||200;
  const y=parseInt(document.getElementById('dca-y')?.value)||10;
  const r=parseFloat(document.getElementById('dca-r')?.value)||7;
  const s=parseFloat(document.getElementById('dca-s')?.value)||0;
  const rate=r/100/12,n=y*12;
  const total=s*Math.pow(1+rate,n)+(rate>0?m*((Math.pow(1+rate,n)-1)/rate):m*n);
  const invested=s+m*n;
  const gain=total-invested;
  const gainPct=invested>0?Math.round(gain/invested*100):0;
  const g=id=>document.getElementById(id);
  if(g('dca-hero-total')) g('dca-hero-total').textContent=fmtK(Math.round(total));
  if(g('dca-hero-gain'))  g('dca-hero-gain').textContent='+'+fmtK(Math.round(gain));
  if(g('dca-hero-inv'))   g('dca-hero-inv').textContent=fmtK(Math.round(invested));
  if(g('dca-hero-mult'))  g('dca-hero-mult').textContent='×'+(invested>0?(total/invested).toFixed(2):'1.00');
  const circle=g('dca-donut-circle');
  if(circle){const c=2*Math.PI*36;circle.setAttribute('stroke-dasharray',Math.min(gainPct/100,1)*c*0.75+' '+c);}
  if(g('dca-donut-pct')) g('dca-donut-pct').textContent=gainPct+'%';
  // Labels sliders
  if(g('dca-m-o')) g('dca-m-o').textContent=m.toLocaleString('fr-FR')+' €';
  if(g('dca-y-o')) g('dca-y-o').textContent=y;
  if(g('dca-r-o')) g('dca-r-o').textContent=r.toFixed(1)+' %';
  if(g('dca-s-o')) g('dca-s-o').textContent=s.toLocaleString('fr-FR')+' €';
}


// ===== AGENT IA SIDEBAR =====
function updateAISidebar() {
  if (!positions || positions.length === 0) return;
  let totalPnl = 0, totalVal = 0;
  positions.forEach(p => {
    const val = (p.price || p.pru) * p.qty;
    const cost = p.pru * p.qty;
    totalPnl += val - cost;
    totalVal += val;
  });
  const pct = totalVal > 0 ? (totalPnl / (totalVal - totalPnl) * 100).toFixed(1) : 0;
  const pnlEl = document.getElementById('ai-side-pnl');
  const pctEl = document.getElementById('ai-side-pnl-pct');
  const impactEl = document.getElementById('ai-side-impact');
  const impactBar = document.getElementById('ai-side-impact-bar');
  const riskEl = document.getElementById('ai-side-risk');
  const riskDot = document.getElementById('ai-side-risk-dot');
  if (pnlEl) {
    const sign = totalPnl >= 0 ? '+' : '';
    pnlEl.textContent = sign + Math.round(totalPnl).toLocaleString('fr-FR') + ' €';
    pnlEl.style.color = totalPnl >= 0 ? '#4ade80' : '#f87171';
  }
  if (pctEl) pctEl.textContent = '(' + (totalPnl >= 0 ? '+' : '') + pct + '%)';
  const absPct = Math.abs(parseFloat(pct));
  const risk = absPct > 15 ? 'Élevé' : absPct > 5 ? 'Modéré' : 'Faible';
  const riskColor = absPct > 15 ? '#f87171' : absPct > 5 ? '#fbbf24' : '#4ade80';
  const barW = Math.min(absPct * 3, 100);
  if (impactEl) { impactEl.textContent = risk; impactEl.style.color = riskColor; }
  if (impactBar) { impactBar.style.width = barW + '%'; impactBar.style.background = `linear-gradient(90deg,${riskColor},${riskColor}cc)`; }
  if (riskEl) { riskEl.textContent = risk; riskEl.style.color = riskColor; }
  if (riskDot) riskDot.style.background = riskColor;
}


// ===== SETTINGS REDESIGN =====

function openSettingsPanel(type) {
  const panel = document.getElementById('settings-panel');
  const overlay = document.getElementById('settings-overlay');
  const title = document.getElementById('panel-title');
  const body = document.getElementById('panel-content');
  if (!panel) return;

  const panels = {
    compte: {
      label: 'Compte & Sécurité',
      html: `
        <div style="display:flex;flex-direction:column;gap:20px">
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Email</div>
            <div style="font-size:14px;color:var(--color-text);padding:12px 16px;background:var(--color-bg-subtle);border-radius:10px;border:1px solid var(--color-border)">${currentUser?.email || '—'}</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Nouveau mot de passe</div>
            <input type="password" id="new-pass" placeholder="Min. 6 caractères" style="width:100%;padding:12px 16px;background:var(--color-bg-subtle);border:1px solid var(--color-border);border-radius:10px;font-size:14px;color:var(--color-text);outline:none;box-sizing:border-box">
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Confirmer</div>
            <input type="password" id="new-pass2" placeholder="••••••••" style="width:100%;padding:12px 16px;background:var(--color-bg-subtle);border:1px solid var(--color-border);border-radius:10px;font-size:14px;color:var(--color-text);outline:none;box-sizing:border-box">
          </div>
          <button onclick="changePassword()" style="width:100%;padding:13px;background:#16a34a;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">Changer le mot de passe</button>
          <div id="pass-msg" style="display:none;font-size:13px;font-weight:600;text-align:center"></div>
          <hr style="border:none;border-top:1px solid var(--color-border)">
          <button onclick="logout()" style="width:100%;padding:13px;background:rgba(248,113,113,0.1);color:#f87171;border:1px solid rgba(248,113,113,0.2);border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">Se déconnecter</button>
        </div>`
    },
    ia: {
      label: 'Préférences d\'analyse IA',
      html: `
        <div style="display:flex;flex-direction:column;gap:20px">
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Bankroll (€)</div>
            <input type="number" id="s-bankroll" value="${profile.bankroll||5000}" step="100" style="width:100%;padding:12px 16px;background:var(--color-bg-subtle);border:1px solid var(--color-border);border-radius:10px;font-size:14px;color:var(--color-text);outline:none;box-sizing:border-box">
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Horizon d\'investissement</div>
            <select id="s-horizon" style="width:100%;padding:12px 16px;background:var(--color-bg-subtle);border:1px solid var(--color-border);border-radius:10px;font-size:14px;color:var(--color-text);outline:none;box-sizing:border-box">
              <option value="court" ${profile.horizon==='court'?'selected':''}>Court terme (&lt;3 ans)</option>
              <option value="moyen" ${profile.horizon==='moyen'||!profile.horizon?'selected':''}>Moyen terme (3–7 ans)</option>
              <option value="long" ${profile.horizon==='long'?'selected':''}>Long terme (&gt;7 ans)</option>
            </select>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Tolérance au risque</div>
            <select id="s-risk" style="width:100%;padding:12px 16px;background:var(--color-bg-subtle);border:1px solid var(--color-border);border-radius:10px;font-size:14px;color:var(--color-text);outline:none;box-sizing:border-box">
              <option value="faible" ${profile.risk==='faible'?'selected':''}>Faible</option>
              <option value="modere" ${profile.risk==='modere'||!profile.risk?'selected':''}>Modérée</option>
              <option value="eleve" ${profile.risk==='eleve'?'selected':''}>Élevée</option>
            </select>
          </div>
          <button onclick="saveSettings();updateSettingsDisplays();showToast('Préférences sauvegardées ✓')" style="width:100%;padding:13px;background:#16a34a;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">Sauvegarder</button>
          <div id="settings-msg" style="display:none;font-size:13px;color:#4ade80;font-weight:700;text-align:center">✓ Sauvegardé</div>
        </div>`
    },
    notifs: {
      label: 'Notifications & Alertes',
      html: `
        <div style="display:flex;flex-direction:column;gap:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;background:var(--color-bg-subtle);border-radius:12px;border:1px solid var(--color-border)">
            <div>
              <div style="font-size:14px;font-weight:600;color:var(--color-text)">Alertes de prix</div>
              <div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px">Notifie quand un actif dépasse ton seuil</div>
            </div>
            <div style="width:44px;height:24px;background:#16a34a;border-radius:99px;position:relative;cursor:pointer">
              <div style="position:absolute;right:2px;top:2px;width:20px;height:20px;background:#fff;border-radius:50%"></div>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;background:var(--color-bg-subtle);border-radius:12px;border:1px solid var(--color-border)">
            <div>
              <div style="font-size:14px;font-weight:600;color:var(--color-text)">Signaux IA</div>
              <div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px">Recommandations quotidiennes de l'IA</div>
            </div>
            <div style="width:44px;height:24px;background:#16a34a;border-radius:99px;position:relative;cursor:pointer">
              <div style="position:absolute;right:2px;top:2px;width:20px;height:20px;background:#fff;border-radius:50%"></div>
            </div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Fréquence des résumés</div>
            <select id="s-notif" style="width:100%;padding:12px 16px;background:var(--color-bg-subtle);border:1px solid var(--color-border);border-radius:10px;font-size:14px;color:var(--color-text);outline:none;box-sizing:border-box">
              <option value="daily">Quotidiens</option>
              <option value="weekly">Hebdomadaires</option>
              <option value="off">Désactivés</option>
            </select>
          </div>
          <button onclick="saveSettings();showToast('Notifications sauvegardées ✓')" style="width:100%;padding:13px;background:#16a34a;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">Sauvegarder</button>
        </div>`
    },
    interface: {
      label: 'Interface & Affichage',
      html: `
        <div style="display:flex;flex-direction:column;gap:16px">
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px">Thème</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <button onclick="applyTheme('dark')" style="padding:14px;background:var(--color-bg-subtle);border:1px solid var(--color-border);border-radius:12px;cursor:pointer;text-align:center">
                <div style="font-size:20px;margin-bottom:6px">🌙</div>
                <div style="font-size:13px;font-weight:700;color:var(--color-text)">Sombre</div>
              </button>
              <button onclick="applyTheme('light')" style="padding:14px;background:var(--color-bg-subtle);border:1px solid var(--color-border);border-radius:12px;cursor:pointer;text-align:center">
                <div style="font-size:20px;margin-bottom:6px">☀️</div>
                <div style="font-size:13px;font-weight:700;color:var(--color-text)">Clair</div>
              </button>
            </div>
          </div>
        </div>`
    },
    data: {
      label: 'Données & Confidentialité',
      html: `
        <div style="display:flex;flex-direction:column;gap:16px">
          <div style="padding:16px;background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.15);border-radius:12px;display:flex;align-items:center;gap:10px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div style="font-size:13px;color:#4ade80;font-weight:600">Tes données sont chiffrées et sécurisées</div>
          </div>
          <button onclick="exportPDF()" style="width:100%;padding:13px;background:var(--color-bg-subtle);color:var(--color-text);border:1px solid var(--color-border);border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;text-align:left;padding-left:16px">📄 Exporter mon portefeuille en PDF</button>
          <button onclick="loadDemo();nav('portfolio')" style="width:100%;padding:13px;background:var(--color-bg-subtle);color:var(--color-text);border:1px solid var(--color-border);border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;text-align:left;padding-left:16px">👀 Mode démo — données fictives</button>
          <hr style="border:none;border-top:1px solid var(--color-border)">
          <button style="width:100%;padding:13px;background:rgba(248,113,113,0.06);color:#f87171;border:1px solid rgba(248,113,113,0.15);border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">🗑 Supprimer mon compte</button>
        </div>`
    },
    aide: {
      label: 'Aide & Support',
      html: `
        <div style="display:flex;flex-direction:column;gap:12px">
          <button onclick="showOnboarding(true);closeSettingsPanel()" style="width:100%;padding:16px;background:var(--color-bg-subtle);color:var(--color-text);border:1px solid var(--color-border);border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;text-align:left;display:flex;align-items:center;gap:12px">
            <span style="font-size:20px">📋</span><div><div style="font-weight:700">Revoir le tutoriel</div><div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px">Guide de démarrage InvestIQ</div></div>
          </button>
          <button onclick="nav('ai');closeSettingsPanel()" style="width:100%;padding:16px;background:var(--color-bg-subtle);color:var(--color-text);border:1px solid var(--color-border);border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;text-align:left;display:flex;align-items:center;gap:12px">
            <span style="font-size:20px">🤖</span><div><div style="font-weight:700">Parler à l'Agent IA</div><div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px">Pose tes questions directement</div></div>
          </button>
          <hr style="border:none;border-top:1px solid var(--color-border);margin:4px 0">
          <button onclick="logout()" style="width:100%;padding:13px;background:rgba(248,113,113,0.06);color:#f87171;border:1px solid rgba(248,113,113,0.15);border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">Se déconnecter</button>
        </div>`
    }
  };

  const p = panels[type];
  if (!p) return;
  title.textContent = p.label;
  body.innerHTML = p.html;
  panel.style.display = 'block';
  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeSettingsPanel() {
  const panel = document.getElementById('settings-panel');
  const overlay = document.getElementById('settings-overlay');
  if (panel) panel.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('iq_theme', t);
  updateSettingsDisplays();
}

function updateSettingsDisplays() {
  const emailEl = document.getElementById('set-email-display');
  const riskEl = document.getElementById('set-risk-display');
  const horizonEl = document.getElementById('set-horizon-display');
  const notifEl = document.getElementById('set-notif-display');
  const themeEl = document.getElementById('set-theme-display');
  if (emailEl && currentUser) emailEl.textContent = currentUser.email;
  if (riskEl) riskEl.textContent = 'Profil : ' + (profile.risk === 'eleve' ? 'Agressif' : profile.risk === 'faible' ? 'Prudent' : 'Équilibré');
  if (horizonEl) horizonEl.textContent = 'Horizon : ' + (profile.horizon === 'long' ? '10+ ans' : profile.horizon === 'court' ? '<3 ans' : '3-7 ans');
  if (notifEl) notifEl.textContent = profile.notif === 'off' ? 'Désactivées' : profile.notif === 'weekly' ? 'Hebdomadaires' : 'Quotidiennes';
  const theme = localStorage.getItem('iq_theme') || 'dark';
  if (themeEl) themeEl.textContent = theme === 'dark' ? 'Thème sombre' : 'Thème clair';
}


// ===================================================
// SYSTÈME FREEMIUM
// ===================================================

function isPremiumUser() {
  // Override dev : localStorage key 'iq_dev_premium' prend le dessus
  const devOverride = localStorage.getItem('iq_dev_premium');
  if (devOverride !== null) return devOverride === 'true';
  return profile?.isPremium === true || isDemo;
}

// Bouton dev uniquement — toggle rapide free/premium sans toucher Supabase
function toggleDevPremium() {
  if (!currentUser || currentUser.email !== DEV_EMAIL) return;
  const current = isPremiumUser();
  const next = !current;
  localStorage.setItem('iq_dev_premium', String(next));
  profile.isPremium = next;
  updatePremiumUI();
  // Mettre à jour le bouton et le badge
  const btn = document.getElementById('dev-premium-btn');
  const title = document.getElementById('sidebar-plan-title');
  const badge = document.getElementById('sidebar-plan-badge');
  if (next) {
    if (btn) { btn.textContent = '🔓 Passer en Gratuit'; btn.style.background = '#f59e0b'; }
    if (title) { title.textContent = '✦ Mode Premium'; title.style.color = '#4ade80'; }
    if (badge) { badge.textContent = '✦ Premium activé (dev)'; badge.style.color = '#4ade80'; }
    showToast('✦ Premium activé — mode dev');
  } else {
    if (btn) { btn.textContent = '🔒 Passer en Premium'; btn.style.background = '#16a34a'; }
    if (title) { title.textContent = 'Passez à Premium'; title.style.color = '#fff'; }
    if (badge) { badge.textContent = 'Compte gratuit (dev)'; badge.style.color = 'rgba(255,255,255,0.4)'; }
    showToast('Mode gratuit activé — mode dev');
  }
}

// Initialise le bouton dev au chargement — visible uniquement pour le compte dev
const DEV_EMAIL = 'maxencedemacedo@gmail.com';

function initDevPremiumBtn() {
  const btn = document.getElementById('dev-premium-btn');
  const title = document.getElementById('sidebar-plan-title');
  const badge = document.getElementById('sidebar-plan-badge');

  // Masque le bouton pour tout le monde sauf le compte dev
  if (!currentUser || currentUser.email !== DEV_EMAIL) {
    if (btn) { btn.textContent = 'Découvrir'; btn.style.background = '#16a34a'; btn.onclick = null; btn.style.cursor = 'default'; }
    return;
  }

  // Compte dev — affiche le toggle
  const isPrem = isPremiumUser();
  if (btn) {
    btn.textContent = isPrem ? '🔓 Passer en Gratuit' : '🔒 Passer en Premium';
    btn.style.background = isPrem ? '#f59e0b' : '#16a34a';
  }
  if (isPrem) {
    if (title) { title.textContent = '✦ Mode Premium'; title.style.color = '#4ade80'; }
    if (badge) { badge.textContent = '✦ Premium activé (dev)'; badge.style.color = '#4ade80'; }
  }
}

// --- Compteurs journaliers (reset chaque jour) ---
function getDailyCount(key) {
  const today = new Date().toISOString().slice(0,10);
  try {
    const data = JSON.parse(localStorage.getItem('iq_limit_' + key) || '{}');
    return data.date === today ? (data.count || 0) : 0;
  } catch { return 0; }
}

function incrementDailyCount(key) {
  const today = new Date().toISOString().slice(0,10);
  const count = getDailyCount(key) + 1;
  localStorage.setItem('iq_limit_' + key, JSON.stringify({ date: today, count }));
}

// --- Compteurs totaux (pas de reset) ---
function getTotalCount(key) {
  try { return parseInt(localStorage.getItem('iq_total_' + key) || '0'); } catch { return 0; }
}

function incrementTotalCount(key) {
  localStorage.setItem('iq_total_' + key, String(getTotalCount(key) + 1));
}

// --- Modal Premium ---
function showPremiumModal(source) {
  const messages = {
    agent_ia: { title: 'Limite atteinte', desc: 'Tu as utilisé ton message IA gratuit du jour.', detail: 'Passe à Premium pour des conversations IA illimitées avec ton copilote financier personnel.' },
    decision: { title: '3 analyses utilisées', desc: 'Tu as utilisé tes 3 analyses gratuites.', detail: 'Passe à Premium pour des analyses illimitées sur chaque actif de ton portefeuille.' },
    positions: { title: 'Limite de 5 positions', desc: 'La version gratuite est limitée à 5 positions.', detail: 'Passe à Premium pour un portefeuille illimité et des analyses IA sur chaque position.' },
  };
  const m = messages[source] || { title: 'Fonctionnalité Premium', desc: 'Cette fonctionnalité est réservée aux membres Premium.', detail: "Passe à Premium pour débloquer toutes les fonctionnalités IA d'InvestIQ." };

  // Créer ou réutiliser le modal
  let modal = document.getElementById('premium-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'premium-modal';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px" onclick="if(event.target===this)closePremiumModal()">
      <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:24px;padding:0;max-width:420px;width:100%;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.4)">

        <!-- Header premium -->
        <div style="background:linear-gradient(135deg,#0d0d18,#111120);padding:32px 28px 24px;text-align:center;position:relative">
          <div style="position:absolute;top:-40px;left:50%;transform:translateX(-50%);width:200px;height:120px;background:radial-gradient(circle,rgba(63,185,80,0.15),transparent);pointer-events:none"></div>
          <div style="width:56px;height:56px;background:linear-gradient(135deg,rgba(63,185,80,0.2),rgba(22,163,74,0.1));border:1px solid rgba(63,185,80,0.3);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:26px">✦</div>
          <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:8px">${m.title}</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.5)">${m.desc}</div>
        </div>

        <!-- Body -->
        <div style="padding:24px 28px">
          <div style="background:rgba(63,185,80,0.06);border:1px solid rgba(63,185,80,0.12);border-radius:12px;padding:14px 16px;margin-bottom:20px">
            <div style="font-size:13px;color:var(--color-text-secondary);line-height:1.6">${m.detail}</div>
          </div>

          <!-- Features premium -->
          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px">
            ${[
              ['🤖', 'Agent IA illimité', 'Conversations sans limite avec ton copilote'],
              ['🎯', 'Analyses illimitées', 'Analyse chaque actif sans restriction'],
              ['📊', 'Briefing quotidien', 'Résumé IA de ton portefeuille chaque matin'],
              ['⚡', 'Signaux IA avancés', 'Alertes intelligentes et recommandations'],
              ['💼', 'Positions illimitées', 'Portefeuille sans limite de taille'],
            ].map(([icon, title, desc]) => `
              <div style="display:flex;align-items:center;gap:12px">
                <div style="width:32px;height:32px;background:rgba(63,185,80,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">${icon}</div>
                <div>
                  <div style="font-size:13px;font-weight:700;color:var(--color-text)">${title}</div>
                  <div style="font-size:11px;color:var(--color-text-tertiary)">${desc}</div>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- CTA -->
          <button onclick="closePremiumModal();nav('settings')" style="width:100%;padding:15px;background:linear-gradient(135deg,#16a34a,#059669);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;box-shadow:0 4px 20px rgba(22,163,74,0.3)">
            ✦ Passer à Premium
          </button>
          <button onclick="closePremiumModal()" style="width:100%;padding:12px;background:transparent;color:var(--color-text-secondary);border:none;font-size:13px;font-weight:600;cursor:pointer">
            Continuer en gratuit
          </button>
        </div>
      </div>
    </div>`;
  modal.style.display = 'block';
}

function closePremiumModal() {
  const modal = document.getElementById('premium-modal');
  if (modal) modal.style.display = 'none';
}

// --- Mise à jour UI selon plan ---
function updatePremiumUI() {
  const premium = isPremiumUser();

  // Badge dans la sidebar
  const badge = document.getElementById('sidebar-plan-badge');
  if (badge) {
    badge.textContent = premium ? '✦ Premium' : 'Compte gratuit';
    badge.style.color = premium ? '#4ade80' : 'rgba(255,255,255,0.4)';
  }

  // Compteur messages IA restants (gratuit)
  if (!premium) {
    const aiLeft = Math.max(0, 1 - getDailyCount('ai'));
    const decLeft = Math.max(0, 3 - getTotalCount('decision'));
    const posLeft = Math.max(0, 5 - (positions?.length || 0));

    // Badge dans Agent IA
    const aiBadge = document.getElementById('ai-free-counter');
    if (aiBadge) {
      aiBadge.style.display = 'flex';
      aiBadge.textContent = aiLeft + ' message gratuit restant aujourd\'hui';
      aiBadge.style.color = aiLeft === 0 ? '#f87171' : '#fbbf24';
    }
  } else {
    const aiBadge = document.getElementById('ai-free-counter');
    if (aiBadge) aiBadge.style.display = 'none';
  }
}

// --- Cache API ---
function getCachedResponse(key, maxAgeMs) {
  try {
    const cached = JSON.parse(localStorage.getItem('iq_cache_' + key) || 'null');
    if (!cached) return null;
    if (Date.now() - cached.ts > maxAgeMs) return null;
    return cached.data;
  } catch { return null; }
}

function setCachedResponse(key, data) {
  try {
    localStorage.setItem('iq_cache_' + key, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

const CACHE_TTL = {
  briefing: 24 * 60 * 60 * 1000,   // 24h
  signaux:   6 * 60 * 60 * 1000,    // 6h
  sante:     2 * 60 * 60 * 1000,    // 2h
};
