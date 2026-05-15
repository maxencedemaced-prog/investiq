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
  {ticker:'IWDA', name:'iShares MSCI World', sector:'ETF'},
  {ticker:'VWCE', name:'Vanguard FTSE All-World', sector:'ETF'},
];

function loadWatchlist() {
  try {
    watchlist = JSON.parse(localStorage.getItem(CACHE_WATCHLIST) || '[]');
  } catch { watchlist = []; }
}

function saveWatchlist() {
  try { localStorage.setItem(CACHE_WATCHLIST, JSON.stringify(watchlist)); } catch {}
}

function toggleFavorite(ticker, name, sector) {
  const idx = watchlist.findIndex(w => w.ticker === ticker);
  if (idx >= 0) {
    watchlist.splice(idx, 1);
  } else {
    watchlist.push({ ticker, name, sector: sector || 'Autre' });
  }
  saveWatchlist();
  renderNewsPage();
}

function isFavorite(ticker) {
  return watchlist.some(w => w.ticker === ticker);
}

function renderNewsPage() {
  loadWatchlist();
  const container = document.getElementById('news-page-content');
  if (!container) return;

  // Get all companies to track (portfolio + watchlist)
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
      <button class="filter-pill" id="news-fil-favoris" onclick="setNewsFilter('favoris',this)">
        ⭐ Mes favoris ${allTracked.length > 0 ? `<span class="pill-count">${allTracked.length}</span>` : ''}
      </button>
      <button class="filter-pill" id="news-fil-macro" onclick="setNewsFilter('macro',this)">Macro</button>
      <button class="filter-pill" id="news-fil-banque" onclick="setNewsFilter('banque',this)">Banques centrales</button>
      <button class="filter-pill" id="news-fil-marche" onclick="setNewsFilter('marche',this)">Marchés</button>
    </div>

    <!-- WATCHLIST COMPANIES -->
    ${allTracked.length > 0 ? `
    <div class="watchlist-strip">
      ${allTracked.map(c => `
        <div class="watchlist-chip ${c.inPortfolio ? 'in-portfolio' : ''}" onclick="openCompany('${c.ticker}','${c.name}','${c.sector}')">
          <div class="wchip-avatar">${c.ticker.slice(0,2).toUpperCase()}</div>
          <div>
            <div class="wchip-name">${c.ticker}</div>
            <div class="wchip-sector">${c.sector}</div>
          </div>
          ${c.inPortfolio ? '<span class="wchip-badge">Portf.</span>' : `<button class="wchip-remove" onclick="event.stopPropagation();toggleFavorite('${c.ticker}','${c.name}','${c.sector}')">×</button>`}
        </div>`).join('')}
    </div>` : ''}

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
      <button class="btn-refresh" id="news-refresh-btn" onclick="loadNews(true)">
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

function setNewsFilter(filter, el) {
  newsFilter = filter;
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderNewsList();
}

function renderNewsList() {
  const list = document.getElementById('news-list');
  if (!list) return;
  let filtered = newsData;
  if (newsFilter === 'favoris') {
    // Show news related to watchlist + portfolio companies
    const trackedTickers = [
      ...positions.map(p => p.name.toLowerCase()),
      ...watchlist.map(w => w.ticker.toLowerCase())
    ];
    filtered = newsData.filter(n => {
      const targets = (n.actifs_cibles || []).map(a => a.toLowerCase());
      return targets.some(t => trackedTickers.some(tk => t.includes(tk) || tk.includes(t)));
    });
    if (!filtered.length) {
      list.innerHTML = `<div class="empty-news-msg">
        <div style="font-size:32px;margin-bottom:10px">⭐</div>
        <div style="font-size:15px;font-weight:700;color:#1c1c1e;margin-bottom:6px">Aucune actualité pour tes favoris</div>
        <div style="font-size:13px;color:#8e8e93">Ajoute des entreprises à suivre ou actualise les news.</div>
      </div>`;
      return;
    }
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
    return `<div class="news-item">
      <div class="news-item-head" onclick="toggleNews(${i})">
        <div class="news-meta">
          <span class="pill ${tagCls[n.categorie]||'pill-gray'}">${tagLbl[n.categorie]||n.categorie}</span>
          <span class="pill ${impCls[n.impact]||'pill-gray'}">Impact ${n.impact}</span>
          <span class="news-time">${n.heure}</span>
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
    const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketChange`);
    const data = await res.json();
    const q = data.quoteResponse?.result?.[0];
    if (q) {
      const priceEl = document.getElementById('co-price');
      const changeEl = document.getElementById('co-change');
      if (priceEl) { priceEl.textContent = q.regularMarketPrice ? q.regularMarketPrice.toFixed(2) + ' €' : '—'; }
      if (changeEl) {
        const chg = q.regularMarketChangePercent || 0;
        changeEl.textContent = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
        changeEl.className = 'metric-val ' + (chg >= 0 ? 'green' : 'red');
      }
    }
  } catch { /* CORS — skip */ }
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
    const formatted = r
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p style="margin-top:10px">')
      .replace(/\n/g, '<br>');
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
