// app-marches.js — Marchés : liste de suivi, agenda, entreprises, signaux, matières premières, devises, recherche.
// Partie de l'appli Kapitaro, découpée en 6 fichiers chargés dans cet ordre par index.html : app-objectif.js, app-positions.js, app-marches.js, app-coeur.js, app-ecrans.js, app.js.
// Les fonctions et variables sont partagées entre ces fichiers (app-objectif.js, app-positions.js, app-coeur.js, app-ecrans.js, app.js).

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
  {ticker:'IWDA.AS', name:'iShares MSCI World', sector:'ETF'},
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
    const chgStr = chg !== null ? (up?'+':'') + chg.toFixed(2).replace(".", ",") + ' %' : '';
    const priceStr = price ? fmt(price) + '€' : '';
    const sep = '<span style="color:rgba(255,255,255,0.1);margin:0 4px;font-size:10px">|</span>';
    const tickerEl = document.createElement('span');
    tickerEl.setAttribute('style', 'display:inline-flex;align-items:center;gap:6px;padding:0 18px;height:42px;cursor:pointer;flex-shrink:0');
    tickerEl.setAttribute('onmouseover', "this.style.background='rgba(255,255,255,0.07)'");
    tickerEl.setAttribute('onmouseout', "this.style.background='transparent'");
    tickerEl.setAttribute('onclick', "setNewsFilter('entreprises',document.getElementById('news-fil-entreprises'));setTimeout(function(){openCompany('" + c.ticker + "','" + (c.name||c.ticker) + "','')},100)");
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

function renderNewsPage(auto=false) {
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
      <button class="filter-pill" id="news-fil-matieres" onclick="setNewsFilter('matieres',this)" style="white-space:nowrap;flex-shrink:0">🛢️ Matières premières</button>
      <button class="filter-pill" id="news-fil-forex" onclick="setNewsFilter('forex',this)" style="white-space:nowrap;flex-shrink:0">💱 Forex</button>
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
          <div style="background:#fff;border-radius:12px;padding:10px 12px;border:1.5px solid #f0f0f0;flex-shrink:0;min-width:130px;cursor:pointer" onclick="openCompany('${jsArg(p.ticker)}','${jsArg(p.name)}','${jsArg(p.sector)}')">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px">
              <div style="width:28px;height:28px;border-radius:8px;background:#1c1c1e;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center">${p.ticker.slice(0,2)}</div>
              <div>
                <div style="font-size:12px;font-weight:800;color:#1c1c1e;line-height:1.2">${p.name}</div>
                <div style="font-size:10px;color:#8e8e93">${p.sector}</div>
              </div>
            </div>
            <button onclick="event.stopPropagation();toggleFavorite('${jsArg(p.ticker)}','${jsArg(p.name)}','${jsArg(p.sector)}')" id="pop-btn-${p.ticker}"
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

  // Load news — évite un appel IA silencieux quand la page se restaure toute seule
  // (ex: rechargement de l'onglet par Chrome) : on ne consomme des tokens que si
  // l'utilisateur clique réellement sur "Actualités" ou sur "Charger".
  if (loadNewsCache()) renderNewsList();
  else if (auto) renderNewsLoadPrompt();
  else loadNews(false);
}

function renderNewsLoadPrompt() {
  const list = document.getElementById('news-list');
  if (!list) return;
  list.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#8e8e93">
    <div style="font-size:28px;margin-bottom:8px">📰</div>
    <div style="font-size:13px;margin-bottom:14px">Actualités pas encore chargées pour aujourd'hui</div>
    <button onclick="loadNews(false)" style="background:#1c1c1e;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer">Charger les actualités</button>
  </div>`;
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

  // Uniquement des événements réels : si la source est indisponible, on le dit (jamais de calendrier inventé)
  let unavailable = false;
  try {
    const res = await fetch('/api/agenda');
    if (!res.ok) throw new Error('API ' + res.status);
    const data = await res.json();
    agendaEvents = data.events || [];
    unavailable = !!data.unavailable || !agendaEvents.length;
  } catch(e) {
    agendaEvents = [];
    unavailable = true;
  }
  if (unavailable) {
    list.innerHTML = `<div style="text-align:center;padding:30px 16px;color:var(--color-text-secondary,#8e8e93)">
      <div style="font-size:28px;margin-bottom:8px">📅</div>
      <div style="font-size:14px;font-weight:700;color:var(--color-text,#1c1c1e);margin-bottom:4px">Calendrier économique momentanément indisponible</div>
      <div style="font-size:12.5px;line-height:1.5">Les annonces à venir (Fed, BCE, inflation, emploi) s'afficheront ici dès que la source répond. Réessaie un peu plus tard.</div>
    </div>`;
    return;
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
      <div id="evt-impact-${evt.id}" style="font-size:13px;color:#1c1c1e;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:6px" onclick="loadEventImpact('${evt.id}','${evt.titre.replace(/'/g,"\\'")}','${evt.impact}')">
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
      <div id="evt-impact-${evt.id}" style="font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px" onclick="loadEventImpact('${evt.id}','${evt.titre.replace(/'/g,"\\'")}','${evt.impact}')">
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
    if (isAIQuotaMessage(resp)) { el.innerHTML = aiFailureHTML(resp); return; }
    el.innerHTML = '<div style="background:rgba(255,255,255,0.9);border-radius:10px;padding:10px 12px;margin-top:6px;font-size:12px;color:#1c1c1e;line-height:1.6">' + resp.split('\n').join('<br>') + '</div>';
  } catch(e) {
    el.innerHTML = '<span style="color:#cc2f26;font-size:12px">Impossible de charger l\'analyse</span>';
  }
}

// ===== ONGLET ENTREPRISES =====
let entrepriseSearchTimeout = null;

async function renderFavorisActus() {
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

  await loadEntrepriseNews(companies, 'fav-actus-content');
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
  const myCompanies = [...new Set(apos().map(p => p.name))].map(n => ({ ticker: n, name: n }));
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
    <div id="ent-news-list">${kpSkelCards(Math.min(allCompanies.length, 4))}</div>`;

  // Charge les actualités (l'onglet a pu changer entre-temps : on ne met alors rien en cache)
  await loadEntrepriseNews(allCompanies, 'ent-news-list');
  if (newsFilter === 'entreprises') saveToCache('entreprises');
}

async function loadEntrepriseNews(companies, targetId = 'ent-news-list') {
  const newsEl = document.getElementById(targetId);
  if (!newsEl) return;
  if (!currentUser) { newsEl.innerHTML = aiLockedStateHTML("Connecte-toi pour voir les actualités IA par entreprise."); return; }

  const capped = companies.slice(0, 12); // aligné sur ce que renderEntreprises() prépare déjà en amont

  try {
    // Génère un résumé du contexte connu sur ces entreprises via l'IA
    const companiesList = capped.map(c=>c.name).join(', ');
    const _dc = await fetchContextBlock(capped.map(c => ({ t: c.ticker, name: c.name })));
    const prompt = `Analyste financier. Pour CHACUNE de ces entreprises, réponds avec une entrée : ${companiesList}.

${_dc.text}

RÈGLE : le titre et le résumé de chaque entrée doivent reprendre UNIQUEMENT les titres de presse fournis ci-dessus pour cette entreprise (reformule, n'ajoute aucun détail) ; categorie et impact se déduisent de ces titres. Sans titre fourni pour une entreprise, utilise categorie "Profil" (résumé général et intemporel).

Réponds UNIQUEMENT en JSON valide, sans markdown, avec une entrée PAR entreprise listée (ne saute aucune entreprise) :
[{"ticker":"AAPL","entreprise":"Apple","titre":"Titre court","resume":"2 phrases max","impact":"positif","categorie":"Résultats"}]
impact: positif/negatif/neutre. categorie: Résultats/Produit/Direction/Marché/Réglementation/Profil.
Si tu n'as pas d'actualité récente et datée fiable sur une entreprise, utilise categorie "Profil" et fais un résumé général et intemporel (activité, position sur son marché) — mais n'invente jamais un évènement précis, un chiffre ou une date récente dont tu n'es pas sûr.`;

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

    const entCard = a => {
      const myPos = apos().find(p => p.name === a.ticker);
      const myPnl = myPos ? ((myPos.price - myPos.pru) / myPos.pru * 100).toFixed(1) : null;
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
                ${myPos ? `<span style="background:rgba(63,185,80,0.12);border:1px solid rgba(63,185,80,0.25);color:#3fb950;font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px">📦 ${myPnl>=0?'+':''}${myPnl}% · ${fmt(myPos.qty*myPos.price)}€</span>` : ''}
              </div>
              <div style="display:flex;gap:6px;align-items:center">
                <span style="background:${ib};color:${ic};font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px">${a.categorie}</span>
              </div>
            </div>
          </div>
          <!-- Étoile -->
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;cursor:pointer"
            onclick="event.stopPropagation();toggleStar(this.querySelector('button'),'${jsArg(a.ticker)}','${jsArg(a.entreprise)}')">
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
          <button onclick="openCompany('${jsArg(a.ticker)}','${jsArg(a.entreprise)}','')"
            style="flex:1;background:${isDark2?'var(--color-text)':'#09090b'};color:${isDark2?'var(--color-bg)':'#fff'};border:none;border-radius:10px;padding:9px 12px;font-size:12px;font-weight:700;cursor:pointer">
            📊 Voir la fiche
          </button>
        </div>
      </div>`;
    };

    // Chaque entreprise s'affiche dès que sa carte est écrite
    const cardsEl = document.createElement('div'), skelEl = document.createElement('div');
    skelEl.innerHTML = kpSkelCards(Math.min(capped.length, 4));
    newsEl.innerHTML = '';
    newsEl.append(cardsEl, skelEl);
    let shownCards = 0;
    const addCards = text => {
      const items = parseJSONArrayLenient(text);
      while (shownCards < items.length) {
        const a = items[shownCards++];
        if (!a || !a.ticker || !a.titre) continue;
        cardsEl.insertAdjacentHTML('beforeend', entCard(a));
        if (shownCards + skelEl.children.length > capped.length) skelEl.lastElementChild?.remove();
      }
    };
    const raw = await callClaudeStream(prompt, `Tu es analyste financier. Tu réponds pour chaque entreprise demandée. Tu peux donner un profil général quand tu n'as pas d'actualité datée fiable, mais tu n'inventes jamais un fait précis, un chiffre ou une date récente que tu ne connais pas avec certitude. Réponds UNIQUEMENT en JSON valide.`, 4096, HAIKU_MODEL, null, addCards);
    if (callClaudeFailed(raw)) {
      throw new Error('callClaude a échoué : ' + raw);
    }
    addCards(raw);
    skelEl.remove();
    if (!cardsEl.children.length) {
      newsEl.innerHTML = '<p style="color:#c7c7cc;font-size:13px;text-align:center;padding:20px">Pas d\'information fiable disponible pour l\'instant.</p>';
      return;
    }
    newsEl.insertAdjacentHTML('beforeend', `
    <div style="text-align:center;padding:12px;color:#8e8e93;font-size:12px">
      ⚠️ Actualités générées par IA à titre informatif · Vérifiez via les liens fournis
    </div>`);

  } catch(e) {
    console.error('[loadEntrepriseNews] échec :', e.message);
    if (aiJustHitQuota()) { newsEl.innerHTML = `<div style="padding:8px 0">${aiFailureHTML(aiQuotaMessage())}</div>`; return; }
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
      const results = (data.results || []).slice(0, 6);
      const safeQuery = query.replace(/'/g,"\\'");
      if (!results.length) {
        drop.style.display = 'block';
        drop.innerHTML = `
          <div style="padding:12px 14px;font-size:12px;color:#8e8e93">Aucune entreprise cotée trouvée pour "${query}".</div>
          <div onclick="searchEntrepriseNews('${safeQuery}','${safeQuery}');document.getElementById('ent-search-results').style.display='none'"
               style="padding:12px 14px;cursor:pointer;border-top:1px solid #f0f0f0;color:#1c1c1e;font-weight:600;font-size:13px"
               onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='#fff'">
            🔍 Chercher "${query}" quand même →
          </div>`;
        return;
      }
      drop.style.display = 'block';
      drop.innerHTML = results.map(r => `
        <div onclick="searchEntrepriseNews('${r.ticker}','${(r.name||r.ticker).replace(/'/g,"\\'")}');document.getElementById('ent-search-results').style.display='none';document.getElementById('ent-search').value='${(r.name||r.ticker).replace(/'/g,"\\'")}'"
             style="padding:12px 14px;cursor:pointer;border-bottom:1px solid #f0f0f0"
             onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='#fff'">
          <div style="font-size:13px;font-weight:700;color:#1c1c1e">${r.name || r.ticker}</div>
          <div style="font-size:12px;color:#8e8e93">${r.ticker} · ${r.exchange || ''}</div>
        </div>`).join('');
    } catch(e) { console.error('[searchEntreprise] échec :', e.message); drop.style.display = 'none'; }
  }, 400);
}

async function searchEntrepriseNews(ticker, name) {
  const newsEl = document.getElementById('ent-news-list');
  if (!newsEl) return;
  newsEl.innerHTML = `<div style="text-align:center;padding:20px;color:#8e8e93"><div style="font-size:20px;margin-bottom:6px">🧠</div><div>Recherche des actualités de ${name}...</div></div>`;
  await loadEntrepriseNews([{ ticker, name }], 'ent-news-list');
}

function addToWatchlistBtn(ticker, name) {
  toggleFavorite(ticker, name, '');
  showToast('⭐ ' + name + ' ajouté aux favoris !');
}

function removeFromWatchlist(ticker, name) {
  toggleFavorite(ticker, name, '');
  showToast('Retiré des favoris');
}


// Valeurs à découvrir : présélection propre aux signaux, notée sur le risque et la variété des secteurs.
// La hausse passée n'entre pas dans la note et n'est pas montrée à l'IA pour ce choix. Le plan du mois garde sa propre présélection.
function sigOppoCandidates(md, heldTickers) {
  const held = new Set(heldTickers.map(t => kpTickerOf(t)));
  const groups = {};
  PLAN_UNIVERSE.forEach(u => {
    const m = md[u[0]];
    if (!m || held.has(u[0]) || m.dd < -50 || m.vol > 50 || m.price < 1) return;
    (groups[u[2]] = groups[u[2]] || []).push({ u, m, score: 0.6 * (m.dd || 0) - 0.4 * (m.vol || 0) });
  });
  Object.values(groups).forEach(g => g.sort((a, b) => b.score - a.score));
  const sectors = Object.keys(groups).sort((a, b) => groups[b][0].score - groups[a][0].score);
  const out = [];
  while (out.length < 40 && sectors.some(k => groups[k].length)) {
    for (const k of sectors) { if (out.length >= 40) break; const x = groups[k].shift(); if (x) out.push(x); }
  }
  return out;
}
// Médiane sur 1 an des actions suivies : le repère affiché à côté de chaque chiffre
function sigMarketMedian() {
  const md = _sigMarket.data;
  if (!md) return null;
  const v = PLAN_UNIVERSE.map(u => md[u[0]] && md[u[0]].p1y).filter(x => Number.isFinite(x)).sort((a, b) => a - b);
  return v.length >= 12 ? { value: v[Math.floor(v.length / 2)], count: v.length } : null;
}
// Signal Prudence sur une ligne détenue : affiché dans les notifications de l'appli, une seule fois par ligne
const _sellNotified = new Set();
function kpAddSellNotif(ticker, name, raison, ts) {
  if (_sellNotified.has(ticker)) return;
  _sellNotified.add(ticker);
  notifications.unshift({ titre: '⚠️ Signal Prudence · ' + (name || ticker), texte: (raison ? raison + ' ' : '') + 'Information éducative, pas un conseil.', action: 'Voir les signaux', impact: 'high', heure: ts ? kpAgo(ts) : 'Maintenant', type: 'signal' });
  document.getElementById('notif-dot')?.classList.add('show');
  try { renderNotifications(); } catch (e) {}
}
async function kpLoadSellSignals() {
  if (isDemo || !currentUser) return;
  try {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await sb.from('events').select('meta, created_at').eq('user_id', currentUser.id).eq('type', 'sell_signal').gte('created_at', since).order('created_at', { ascending: true });
    (data || []).forEach(e => { if (e.meta && e.meta.ticker) kpAddSellNotif(e.meta.ticker, e.meta.name, e.meta.raison, Date.parse(e.created_at)); });
  } catch (e) { console.warn('[signaux]', e); }
}
// Notification touchée : ouvre directement l'onglet Signaux
function kpOpenFromNotif() {
  if (new URLSearchParams(location.search).get('open') !== 'signaux') return;
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  kpOpenSignaux();
}
function kpOpenSignaux() {
  nav('news');
  setTimeout(() => setNewsFilter('signaux', document.getElementById('news-fil-signaux')), 300);
}
// Fiabilité des signaux passés (valeurs à découvrir partagées) : bilan calculé côté serveur (api/feed.js, ?kind=signals_track).
// null = encart masqué (démo, hors zone Europe, erreur) ; { evaluated: 0 } = rien encore évalué.
const KP_TRACK_MIN = 20;   // en dessous : « Pas encore assez de recul », jamais de pourcentage
async function kpSignalTrack() {
  if (PLAN_REGION !== 'EU' || isDemo || !currentUser) return null;
  try {
    const { data } = await sb.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return null;
    const r = await fetch('/api/feed?kind=signals_track', { headers: { Authorization: 'Bearer ' + token } });
    if (r.status === 503) return { evaluated: 0 };
    if (!r.ok) return null;
    const j = await r.json();
    return Number.isFinite(j.evaluated) ? j : { evaluated: 0 };
  } catch (e) { return null; }
}
function kpSignalTrackHTML(t) {
  const n = Math.max(0, Math.round(Number(t && t.evaluated) || 0));
  const num = x => Math.max(0, Math.round(Number(x) || 0));
  const plural = (k, one, many) => k + ' ' + (k === 1 ? one : many);
  const day = s => { const d = new Date(s); return s && !isNaN(d) ? d.toLocaleDateString('fr-FR') : ''; };
  const pts = x => Number.isFinite(x) ? (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(1).replace('.', ',') + ' pt' : '—';
  const line = s => `<div style="font-size:12px;color:var(--color-text);line-height:1.5;margin-top:4px">${s}</div>`;
  const small = s => `<div style="font-size:11px;color:var(--color-text-secondary);line-height:1.45;margin-top:6px">${s}</div>`;
  const rule = `Règle : chaque signal est jugé à la fin de son horizon (ex. 4 semaines). Un signal Favorable est juste si l’action a fait mieux que son indice (CAC 40, Euro Stoxx 50 ou S&P 500) ; un Signal Prudence ou Risqué est juste si elle a fait moins bien. Les signaux Neutres ne sont pas comptés.`;
  const legal = `Les performances passées ne préjugent pas des performances futures. Ce n’est pas un conseil en investissement.`;
  let body;
  if (n < KP_TRACK_MIN) {
    body = `<div data-track="peu" style="font-size:13px;font-weight:700;color:var(--color-text);margin-top:4px">Pas encore assez de recul (${plural(n, 'signal évalué', 'signaux évalués')})</div>`
      + small(`Le taux de signaux justes s’affichera à partir de ${KP_TRACK_MIN} signaux évalués.${num(t && t.pending) ? ' ' + plural(num(t.pending), 'signal est', 'signaux sont') + ' en cours.' : ''}`);
  } else {
    const justes = Math.min(n, num(t.justes)), faux = n - justes, rate = Math.round(justes / n * 100);
    const g = (label, x) => x && num(x.n) ? line(`${label} : ${num(x.justes)} juste${num(x.justes) > 1 ? 's' : ''} sur ${num(x.n)} · écart moyen avec l’indice ${pts(x.avgExcess)}`) : '';
    const from = day(t.from), to = day(t.to);
    const extra = [num(t.neutre && t.neutre.n) ? plural(num(t.neutre.n), 'signal Neutre non compté', 'signaux Neutres non comptés') : '', num(t.indispo) ? plural(num(t.indispo), 'signal écarté faute de cours', 'signaux écartés faute de cours') : '', num(t.pending) ? plural(num(t.pending), 'signal en cours', 'signaux en cours') : ''].filter(Boolean).join(' · ');
    body = `<div data-track="taux" style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-top:4px"><span style="font-size:24px;font-weight:800;color:var(--color-text)">${rate} %</span><span style="font-size:12.5px;color:var(--color-text)">de signaux justes : ${justes} sur ${n}, ${plural(faux, 'faux', 'faux')}</span></div>`
      + (from && to ? small(`Période : du ${from} (premier signal) au ${to} (dernière échéance).`) : '')
      + g('↑ Favorable', t.favorable) + g('↓ Prudence et Risqué', t.prudence)
      + small(`Repère : en choisissant au hasard, on serait autour de 50 %.${extra ? ' ' + extra + '.' : ''}`);
  }
  return `<div data-sig-track style="border:1px solid var(--color-border);background:var(--color-surface-raised);border-radius:12px;padding:12px 14px;margin:14px 0 4px">
    <div style="font-size:12px;font-weight:800;color:var(--color-text)">📊 Fiabilité des signaux passés <span style="font-size:11px;color:#8e8e93;font-weight:400">valeurs à découvrir</span></div>
    ${body}${small(rule)}${small('⚠️ ' + legal)}
  </div>`;
}

let _sigRun = null;   // analyse en cours : on la retrouve si l'utilisateur quitte l'onglet puis revient
let _sigMarket = { ts: 0, data: null };   // cours de tout l'univers, gardés 15 min
async function renderSignaux() {
  const list = document.getElementById('news-list');
  if (!list) return;
  if (!currentUser) { list.innerHTML = aiLockedStateHTML("Connecte-toi pour débloquer les signaux IA sur tes positions et les opportunités du marché."); return; }
  if (!isPremiumUser()) { list.innerHTML = premiumLockedStateHTML('Signaux IA', "Signal acheter/garder/vendre sur tes positions + les meilleures opportunités du marché détectées chaque jour par l'IA."); return; }
  if (_sigRun && !_sigRun.done) { list.innerHTML = ''; list.appendChild(_sigRun.root); return; }

  // Affiché tout de suite : on voit que le clic a marché, les cartes remplaceront les emplacements gris une par une
  const root = document.createElement('div');
  const run = _sigRun = { root, done: false };
  list.innerHTML = '';
  list.appendChild(root);
  const myTickers = [...new Set(apos().map(p => p.name))];
  const oppoCount = 9;
  const secTitle = t => `<div style="font-size:12px;font-weight:800;color:var(--color-text);margin:16px 0 8px">${t}</div>`;
  root.innerHTML = `
    <div style="font-size:11px;color:#8e8e93;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">⚡ Signaux IA — ${new Date().toLocaleDateString('fr-FR')}</div>
    <div data-sig="status" style="font-size:13px;font-weight:600;color:var(--color-text-secondary)">🧠 L'IA analyse les données de marché...</div>
    <div data-sig="note" style="font-size:11.5px;color:var(--color-text-secondary);line-height:1.45;margin-top:4px">Une forte hausse passée ne prédit pas l'avenir.</div>
    ${myTickers.length ? secTitle(`📦 Mes positions <span style="font-size:11px;color:#8e8e93;font-weight:400">${myTickers.length} actifs</span>`) + `<div data-sig="mine"></div><div data-sig="mine-skel">${kpSkelCards(myTickers.length)}</div>` : ''}
    ${secTitle('🔭 Valeurs à découvrir <span style="font-size:11px;color:#8e8e93;font-weight:400">choisies sur le risque et la variété des secteurs, pas sur la hausse passée</span>')}
    <div data-sig="oppo"></div><div data-sig="oppo-skel">${kpSkelCards(oppoCount)}</div>
    <div data-sig="track"></div>`;
  const part = k => root.querySelector(`[data-sig="${k}"]`);
  // Fiabilité des signaux passés : chargée en même temps que les cartes, sans les retarder
  const trackDone = kpSignalTrack().then(t => { const box = part('track'); if (box) { if (t) box.innerHTML = kpSignalTrackHTML(t); else box.remove(); } }).catch(() => { part('track')?.remove(); });

  // Constants
  const sigColor = { acheter:'#1a7f5a', attendre:'#f59e0b', vendre:'#cc2f26', eviter:'#8e8e93' };
  const sigBg    = { acheter:'#e8f8f0', attendre:'#fff9e6', vendre:'#fff0f0', eviter:'#f5f5f5' };
  const sigIcon  = { acheter:'↑', attendre:'⏸', vendre:'↓', eviter:'✕' };
  const sigLabel = { acheter:'FAVORABLE', attendre:'NEUTRE', vendre:'PRUDENCE', eviter:'RISQUÉ' };   // vocabulaire pédagogique, pas d'ordre d'achat ou de vente

  function riskBar(n) {
    const colors = ['#1a7f5a','#1a7f5a','#f59e0b','#f59e0b','#cc2f26'];
    const labels = ['','Très faible','Faible','Moyen','Élevé','Très élevé'];
    return `<div style="display:flex;align-items:center;gap:4px">
      ${[1,2,3,4,5].map(i => `<div style="width:14px;height:6px;border-radius:2px;background:${i<=n?colors[n-1]:'#e5e5ea'}"></div>`).join('')}
      <span style="font-size:10px;color:#8e8e93;margin-left:2px">${labels[n]||''}</span>
    </div>`;
  }

  function signalCard(s, isMine) {
    const myPos = apos().find(p => p.name === s.ticker);
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
    const sigLabelNew = { acheter:'FAVORABLE', attendre:'NEUTRE', vendre:'PRUDENCE', eviter:'RISQUÉ' };
    const sc = sigColors[s.signal] || '#8e8e93';
    const sb = sigBgNew[s.signal] || raised;
    const sbd = sigBorderNew[s.signal] || bord;

    return `
    <div id="sig-card-${s.ticker}" style="background:${sb};border:1px solid ${sbd};border-left:3px solid ${sc};border-radius:14px;padding:16px;margin-bottom:10px;cursor:pointer;transition:all 0.15s"
      onmouseover="this.style.borderColor='${sc}'" onmouseout="this.style.borderLeftColor='${sc}';this.style.borderColor='${sbd}'"
      onclick="openDecisionFromPos('${jsArg(s.ticker)}','${s.signal==='acheter'?'acheter':s.signal==='vendre'?'vendre':'garder'}')">

      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:12px">
          <!-- Logo -->
          ${getCompanyLogo(s.ticker, s.name, 42, 12)}
          <div>
            <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:3px">
              <span style="font-size:14px;font-weight:700;color:${txt}">${_escHtml(s.name || s.ticker)}</span>
              <span style="font-size:11px;color:${sub};background:${isDark?'rgba(255,255,255,0.08)':'#f4f4f5'};padding:1px 7px;border-radius:4px">${s.ticker}</span>
              ${isMine ? `<span style="background:${isDark?'rgba(63,185,80,0.15)':'#f0fdf4'};border:1px solid ${isDark?'rgba(63,185,80,0.3)':'rgba(34,197,94,0.3)'};color:#3fb950;font-size:10px;font-weight:700;padding:1px 7px;border-radius:4px">📦 Portef.</span>` : ''}
            </div>
            <div style="font-size:11px;color:${sub};margin-bottom:4px">${_escHtml(s.type||'Action')}${s.secteur ? ' · ' + _escHtml(s.secteur) : ''}</div>
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
      <div style="font-size:13px;color:${txt};font-weight:400;line-height:1.5;margin-bottom:12px;opacity:0.85">${_escHtml(s.raison || '')}</div>

      <!-- Métriques -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">
        <div style="background:${metricBg};border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;font-weight:700;color:${sub};text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px">HORIZON</div>
          <div style="font-size:12px;font-weight:800;color:${txt}">${_escHtml(s.horizon || '—')}</div>
        </div>
        <div style="background:${metricBg};border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;font-weight:700;color:${sub};text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px">SUR 1 AN</div>
          <div style="font-size:12px;font-weight:800;color:${s.p1y>0?'#3fb950':s.p1y<0?'#f87171':sub}">${kpSigned(s.p1y)}</div>
          <div data-sigmed style="font-size:9.5px;font-weight:600;color:${sub};margin-top:2px;line-height:1.25"></div>
        </div>
        <div style="background:${metricBg};border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;font-weight:700;color:${sub};text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px">BAISSE MAX</div>
          <div style="font-size:12px;font-weight:800;color:${s.dd<0?'#f87171':sub}">${kpSigned(s.dd)}</div>
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

  // Chaque carte part vers onCard dès qu'elle est écrite ; un actif sans réponse reçoit une carte « indisponible »
  async function fetchSignaux(tickers, onCard) {
    const date = new Date().toLocaleDateString('fr-FR');
    const _dc = await fetchContextBlock(tickers.map(t => ({ t, name: (PLAN_UNIVERSE.find(u => u[0] === t) || [])[1] || t })));
    const fallback = (t, raison) => ({ ticker: t, name: (PLAN_UNIVERSE.find(u => u[0] === t) || [])[1] || t, signal: 'attendre', conviction: 'faible', risque: 3, horizon: '2-4 semaines', raison, type: t.includes('.') ? 'ETF' : 'Action', secteur: '' });
    const withData = x => { const m = _dc.data && _dc.data[kpTickerOf(x.ticker)]; return { ...x, p1y: m ? m.p1y : null, dd: m ? m.dd : null }; };
    if (!_dc.ok) { tickers.forEach(t => onCard(withData(fallback(t, 'Données de marché indisponibles')))); return; }
    const prompt = `Analyste financier, le ${date}. Donne un signal pédagogique pour ces actifs : ${tickers.join(', ')}.

${_dc.text}

RÈGLES : base chaque signal UNIQUEMENT sur les données ci-dessus (historique, tendance, actualités) ; "raison" = max 12 mots avec un chiffre réel des données ; INTERDIT de justifier un signal favorable par la seule hausse passée ou le momentum (la performance passée ne prédit pas l'avenir) ; un signal "acheter" exige un profil de risque cohérent (volatilité, baisse max) et aucune actualité négative, sinon "attendre" ; en cas de doute, "attendre" ; ne donne aucun objectif de cours ni stop (Kapitaro n'en fournit pas) ; si un actif n'a aucune donnée, signal "attendre", conviction "faible" et raison "Données indisponibles".
Réponds UNIQUEMENT avec ce JSON (rien d'autre), ticker écrit exactement comme demandé :
[{"ticker":"AAPL","name":"Apple","signal":"attendre","conviction":"modérée","risque":2,"horizon":"2-4 semaines","raison":"baisse max 1 an −14 %","type":"Action","secteur":"Tech"}]
Valeurs signal: acheter, attendre, vendre, eviter. risque: 1 a 5.`;
    const wanted = new Set(tickers), shown = new Set();
    const addAll = text => parseJSONArrayLenient(text).forEach(x => {
      if (!x || !x.signal || !wanted.has(x.ticker) || shown.has(x.ticker)) return;
      shown.add(x.ticker);
      onCard(withData(x));
    });
    const raw = await callClaudeStream(prompt, 'Tu es analyste. Réponds UNIQUEMENT avec du JSON valide. Aucun texte avant ou après.', 2048, undefined, null, addAll);
    addAll(raw);
    if (aiJustHitQuota()) throw new Error('quota');   // limite gratuite : on l'explique au lieu de faux signaux de repli
    tickers.filter(t => !shown.has(t)).forEach(t => onCard(withData(fallback(t, 'Analyse temporairement indisponible'))));
  }

  const date = new Date().toLocaleDateString('fr-FR');

  
  // L'IA choisit elle-même les meilleures opportunités du jour
  async function getOppoTickers() {
    const exclude = myTickers.join(', ');
    let cands = [];
    try {
      if (!_sigMarket.data || Date.now() - _sigMarket.ts > 15 * 60000) _sigMarket = { ts: Date.now(), data: await fetchPlanMarketData() };
      if (Object.keys(_sigMarket.data).length >= 12) cands = sigOppoCandidates(_sigMarket.data, myTickers);
    } catch (e) { _sigMarket = { ts: 0, data: null }; }
    if (cands.length < 9) return ['NVDA','ASML','MSFT','TTE.PA','SAN.PA','NOVN.SW','SAP.DE','AAPL','BNP.PA'].filter(t => !myTickers.includes(t)).slice(0, 9);
    const rows = cands.map(c => c.u[0] + ' | ' + c.u[1] + ' | ' + c.u[2] + ' | ' + c.u[3] + ' | baisse max 1 an ' + kpSigned(c.m.dd) + ' | volatilité ' + String(c.m.vol).replace('.', ',') + ' %').join('\n');
    const prompt = `Analyste financier, le ${date}. Sélectionne 9 valeurs à étudier aujourd'hui, UNIQUEMENT parmi cette liste (ticker | nom | secteur | zone | risque) :
${rows}

Mix demandé : 2 valeurs américaines, 2 françaises, 2 européennes hors France et 3 autres au choix, chacune d'un secteur différent autant que possible, pour montrer des entreprises variées. Le choix ne doit pas dépendre d'une hausse passée. Exclus : ${exclude || 'aucun'}.
Réponds UNIQUEMENT : ["TICKER1","TICKER2",...]`;
    try {
      const raw = await callClaude(prompt, 'Réponds UNIQUEMENT avec un tableau JSON de tickers. Rien d autre.', 300, HAIKU_MODEL);
      const clean = raw.replace(/```json|```/g,'').trim();
      const s = clean.indexOf('['), e = clean.lastIndexOf(']');
      if (s === -1 || e === -1) throw new Error('no array');
      const tickers = JSON.parse(clean.slice(s, e+1));
      const okSet = new Set(cands.map(c => c.u[0]));
      const picked = [...new Set(tickers)].filter(t => okSet.has(t) && !myTickers.includes(t)).slice(0, 9);
      if (picked.length) return picked;
      throw new Error('aucun ticker valide');
    } catch(e) {
      return cands.slice(0, 9).map(c => c.u[0]);   // repli : les premières valeurs, déjà variées par secteur
    }
  }
  // Les deux parties avancent en même temps, chaque carte s'affiche dès qu'elle est prête
  let total = myTickers.length + oppoCount, ready = 0;
  const setStatus = () => { const st = part('status'); if (st) st.textContent = `🧠 L'IA analyse le marché... ${ready}/${total}`; };
  let sharedMedian = null;
  const fillMedian = () => {
    const med = sharedMedian || sigMarketMedian();
    if (!med) return;
    root.querySelectorAll('[data-sigmed]').forEach(e => { e.textContent = 'médiane ' + kpSigned(med.value); });
    const note = part('note');
    if (note) note.textContent = `Médiane : la moitié des ${med.count} actions suivies par Kapitaro ont fait moins que ${kpSigned(med.value)} sur 1 an, l'autre moitié plus. Une forte hausse passée ne prédit pas l'avenir. Chiffres en devise locale.`;
  };
  const addCard = (box, skel, s, isMine) => {
    box.insertAdjacentHTML('beforeend', signalCard(s, isMine));
    skel.lastElementChild?.remove();
    ready++;
    setStatus();
    fillMedian();
  };
  const failBlock = () => `<div style="text-align:center;padding:16px;color:#8e8e93;font-size:13px">Analyse indisponible pour l'instant.</div>`;
  const results = await Promise.allSettled([
    (async () => {   // toutes les lignes, par paquets de 12 pour que chaque réponse reste complète
      for (let i = 0; i < myTickers.length; i += 12) {
        await fetchSignaux(myTickers.slice(i, i + 12), s => { addCard(part('mine'), part('mine-skel'), s, true); if (s.signal === 'vendre') kpAddSellNotif(s.ticker, s.name, s.raison); });
      }
    })(),
    (async () => {
      // Valeurs à découvrir déjà calculées pour tout le monde : affichage immédiat (sans celles que je détiens)
      const shared = await kpSharedFeed('signals');
      if (shared) {
        const held = new Set(myTickers.map(t => kpTickerOf(t)));
        const picks = shared.items.filter(x => x && x.ticker && x.signal && !held.has(x.ticker)).slice(0, 9);
        if (picks.length >= 6) {
          sharedMedian = shared.median && Number.isFinite(shared.median.value) ? shared.median : null;
          total = myTickers.length + picks.length;
          const sk = part('oppo-skel');
          while (sk.children.length > picks.length) sk.lastElementChild.remove();
          picks.forEach(x => addCard(part('oppo'), sk, x, false));
          return;
        }
      }
      const oppoTickers = await getOppoTickers();
      fillMedian();
      total = myTickers.length + oppoTickers.length;
      setStatus();
      const skel = part('oppo-skel');
      while (skel.children.length > oppoTickers.length) skel.lastElementChild.remove();
      await fetchSignaux(oppoTickers, s => addCard(part('oppo'), skel, s, false));
    })(),
  ]);
  await trackDone;
  run.done = true;
  if (aiJustHitQuota()) { root.innerHTML = `<div style="padding:8px 0">${aiFailureHTML(aiQuotaMessage())}</div>`; return; }
  part('status')?.remove();
  if (results[0].status === 'rejected') part('mine-skel').outerHTML = failBlock();
  else part('mine-skel')?.remove();
  if (results[1].status === 'rejected') part('oppo-skel').outerHTML = failBlock();
  else part('oppo-skel')?.remove();
  if (results.some(r => r.status === 'rejected')) {
    root.insertAdjacentHTML('beforeend', `<div style="text-align:center"><button onclick="renderSignaux()" style="margin-top:4px;background:#1c1c1e;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer">🔄 Réessayer</button></div>`);
    return;
  }
  root.insertAdjacentHTML('beforeend', `<div style="padding:10px 14px;background:var(--color-surface-raised);border-radius:12px;font-size:12px;color:#8e8e93;text-align:center;margin-top:8px">
      ⚠️ Signaux éducatifs générés par IA, pas des conseils financiers réglementés. Les performances passées ne préjugent pas des performances futures.
    </div>`);
  // Mis en cache même si l'utilisateur a changé d'onglet entre-temps
  newsTabCache.signaux.html = root.innerHTML;
  newsTabCache.signaux.ts = Date.now();
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
    favoris:'⭐ Mes favoris', agenda:'📅 Agenda économique', matieres:'🛢️ Matières premières', forex:'💱 Forex',
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
  } else if (filter === 'matieres') {
    renderMatieres();
  } else if (filter === 'forex') {
    renderForex();
  } else {
    // tous / macro / banque / marche / geo / secteur → renderNewsList filtre
    renderNewsList();
  }
}




// ===== MATIÈRES PREMIÈRES (onglet de l'Actualité) =====
// Cours en direct convertis en euros + repère des gros mouvements + vrais titres d'actualité (liens vers la source).
const MATIERES = [
  { sym: 'BZ=F', nom: 'Pétrole Brent', emoji: '🛢️', unite: 'baril', seuil: 3 },
  { sym: 'CL=F', nom: 'Pétrole WTI', emoji: '🛢️', unite: 'baril', seuil: 3 },
  { sym: 'GC=F', nom: 'Or', emoji: '🥇', unite: 'once', gramme: true, seuil: 1.5 },
  { sym: 'SI=F', nom: 'Argent', emoji: '🥈', unite: 'once', gramme: true, seuil: 3 },
  { sym: 'PL=F', nom: 'Platine', emoji: '⚪', unite: 'once', gramme: true, seuil: 3 },
  { sym: 'NG=F', nom: 'Gaz naturel', emoji: '🔥', unite: 'MMBtu', seuil: 4 },
  { sym: 'HG=F', nom: 'Cuivre', emoji: '🟠', unite: 'livre', seuil: 2.5 },
];

function kpAgo(ts) {
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return 'il y a ' + Math.max(1, m) + ' min';
  const h = Math.round(m / 60);
  if (h < 24) return 'il y a ' + h + ' h';
  const d = Math.round(h / 24);
  return 'il y a ' + d + ' j';
}

function startMatieresTimer() {
  clearInterval(window._matTimer);
  window._matTimer = setInterval(() => {
    const visible = document.getElementById('sec-news')?.classList.contains('active');
    if (newsFilter !== 'matieres' || !visible) { clearInterval(window._matTimer); return; }
    renderMatieres(true);
  }, 120000);
}

async function renderMatieres(silent) {
  const list = document.getElementById('news-list');
  if (!list) return;
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const surf = dark ? 'var(--color-surface-raised, #151a24)' : '#fff';
  const bord = dark ? 'var(--color-border, rgba(255,255,255,0.12))' : '#f0f0f0';
  const txt = dark ? 'var(--color-text, #fff)' : '#1c1c1e';
  const sub = dark ? 'var(--color-text-secondary, rgba(255,255,255,0.6))' : '#8e8e93';
  if (!silent) list.innerHTML = '<div style="text-align:center;padding:30px;color:' + sub + '"><div style="font-size:28px;margin-bottom:8px">🛢️</div><div style="font-size:13px">Chargement des cours…</div></div>';

  let quotes = {}, news = [], newsDown = false;
  try {
    const [pr, nw] = await Promise.all([
      fetch('/api/prices?symbols=' + encodeURIComponent(MATIERES.map(m => m.sym).join(','))).then(r => r.json()).catch(() => ({})),
      fetch('/api/commodity-news').then(r => r.json()).catch(() => ({ unavailable: true })),
    ]);
    (pr.quotes || []).forEach(q => { if (q && q.price) quotes[q.symbol] = q; });
    window._matQuotes = quotes;
    news = nw.news || []; newsDown = !!nw.unavailable || !news.length;
  } catch (e) {}
  if (newsFilter !== 'matieres') return;   // l'utilisateur a changé d'onglet pendant le chargement

  const cards = MATIERES.map(m => {
    const q = quotes[m.sym];
    if (!q) return '<div style="background:' + surf + ';border:1.5px solid ' + bord + ';border-radius:14px;padding:12px"><div style="font-size:13px;font-weight:800;color:' + txt + '">' + m.emoji + ' ' + m.nom + '</div><div style="font-size:12px;color:' + sub + ';margin-top:6px">Cours indisponible</div></div>';
    const chg = q.changePct || 0, big = Math.abs(chg) >= m.seuil, up = chg >= 0;
    const col = up ? '#16a34a' : '#dc2626';
    const pct = (up ? '+' : '−') + Math.abs(chg).toFixed(1).replace('.', ',') + ' %';
    return '<div style="background:' + surf + ';border:1.5px solid ' + (big ? col : bord) + ';border-radius:14px;padding:12px' + (big ? ';box-shadow:0 0 0 3px ' + col + '22' : '') + '">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><div style="font-size:13px;font-weight:800;color:' + txt + '">' + m.emoji + ' ' + m.nom + '</div>'
      + '<div style="font-size:12px;font-weight:800;color:' + col + '">' + pct + '</div></div>'
      + '<div style="font-size:20px;font-weight:900;color:' + txt + ';letter-spacing:-0.03em;margin-top:6px">' + fmt(q.price) + ' €</div>'
      + '<div style="font-size:11px;color:' + sub + '">par ' + m.unite + (m.gramme ? ' · ' + fmt(q.price / 31.1034768) + ' €/g' : '') + '</div>'
      + (big ? '<div style="margin-top:8px;font-size:11.5px;font-weight:800;color:' + col + '">⚡ Gros mouvement aujourd’hui</div><button type="button" onclick="kpCommodityAnalysis(\'' + m.sym + '\')" style="margin-top:6px;width:100%;padding:7px;border-radius:9px;border:1px solid ' + bord + ';background:transparent;color:' + txt + ';font-size:12px;font-weight:700;cursor:pointer">💬 Comprendre</button>' : '<button type="button" onclick="kpCommodityAnalysis(\'' + m.sym + '\')" style="margin-top:8px;padding:0;background:none;border:none;font:inherit;font-size:12px;font-weight:700;color:#16a34a;cursor:pointer">Analyser →</button>')
      + '</div>';
  }).join('');

  const articles = newsDown
    ? '<div style="padding:16px;border-radius:14px;border:1px dashed ' + bord + ';color:' + sub + ';font-size:13px;text-align:center">Les actualités sont momentanément indisponibles. Réessaie dans quelques minutes.</div>'
    : news.map(n => '<a href="' + _escHtml(n.link) + '" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;background:' + surf + ';border:1.5px solid ' + bord + ';border-radius:14px;padding:12px 14px;margin-bottom:8px">'
      + '<div style="font-size:14px;font-weight:700;color:' + txt + ';line-height:1.4">' + _escHtml(n.title) + '</div>'
      + '<div style="font-size:11.5px;color:' + sub + ';margin-top:5px">' + _escHtml(n.source) + (n.ts ? ' · ' + kpAgo(n.ts) : '') + ' · ouvrir l’article ↗</div></a>').join('');

  list.innerHTML = '<div style="font-size:12px;color:' + sub + ';margin-bottom:12px;line-height:1.5">Cours en direct, convertis en euros, mis à jour toutes les 2 minutes. Information uniquement : Kapitaro ne dit ni d’acheter ni de vendre.</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:18px">' + cards + '</div>'
    + '<div style="font-size:12px;font-weight:800;color:' + sub + ';text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">À la une</div>'
    + articles
    + (newsDown ? '' : '<div style="font-size:10.5px;color:' + sub + ';margin-top:4px">Titres et articles © Investing.com, ouverts depuis leur site d’origine.</div>');
  startMatieresTimer();
}

// ===== FOREX (onglet de l'Actualité) =====
// Suivi seulement : taux en direct et titres de presse. Aucune analyse ni avis sur les devises (décision produit du 05/10).
const FOREX = [
  { sym: 'CUR-USD', nom: 'Dollar américain', code: 'USD', mark: '$' },
  { sym: 'CUR-GBP', nom: 'Livre sterling', code: 'GBP', mark: '£' },
  { sym: 'CUR-CHF', nom: 'Franc suisse', code: 'CHF', mark: 'CHF' },
  { sym: 'CUR-JPY', nom: 'Yen japonais', code: 'JPY', mark: '¥' },
  { sym: 'CUR-CAD', nom: 'Dollar canadien', code: 'CAD', mark: '$ CA' },
  { sym: 'CUR-AUD', nom: 'Dollar australien', code: 'AUD', mark: '$ AU' },
  { sym: 'CUR-CNY', nom: 'Yuan chinois', code: 'CNY', mark: '¥ CN' },
  { sym: 'CUR-SEK', nom: 'Couronne suédoise', code: 'SEK', mark: 'kr' },
];
async function renderForex(silent) {
  const list = document.getElementById('news-list');
  if (!list) return;
  if (!silent) list.innerHTML = kpSkelCards(3);
  let quotes = {}, news = [];
  const [pr, nw] = await Promise.all([
    fetch('/api/prices?symbols=' + encodeURIComponent(FOREX.map(m => m.sym).join(','))).then(r => r.json()).catch(() => ({})),
    fetch('/api/commodity-news?kind=forex').then(r => r.json()).catch(() => ({ news: [] })),
  ]);
  (pr.quotes || []).forEach(q => { if (q && q.price) quotes[q.symbol] = q; });
  news = nw.news || [];
  if (newsFilter !== 'forex') return;   // l'utilisateur a changé d'onglet pendant le chargement
  const num = (v, d) => Number(v).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const card = 'background:var(--color-surface);border:1px solid var(--color-border);border-radius:14px;padding:12px';
  const cards = FOREX.map(m => {
    const q = quotes[m.sym];
    if (!q) return `<div style="${card}"><div style="font-size:13px;font-weight:800;color:var(--color-text)">${m.nom}</div><div style="font-size:12px;color:var(--color-text-secondary);margin-top:6px">Cours indisponible</div></div>`;
    const chg = q.changePct || 0, col = chg >= 0 ? '#16a34a' : '#dc2626';
    return `<div style="${card}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><div style="font-size:13px;font-weight:800;color:var(--color-text)">${m.nom}</div><div style="font-size:12px;font-weight:800;color:${col};white-space:nowrap">${chg >= 0 ? '+' : '−'}${num(Math.abs(chg), 2)} %</div></div>
      <div style="font-size:19px;font-weight:900;color:var(--color-text);letter-spacing:-0.03em;margin-top:6px">1 € = ${num(1 / q.price, m.code === 'JPY' ? 1 : 3)} ${m.mark}</div>
      <div style="font-size:11px;color:var(--color-text-secondary)">1 ${m.code} = ${num(q.price, 4)} €</div>
    </div>`;
  }).join('');
  const articles = news.length
    ? news.map(n => `<a href="${_escHtml(n.link)}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;background:var(--color-surface);border:1px solid var(--color-border);border-radius:14px;padding:12px 14px;margin-bottom:8px">
        <div style="font-size:14px;font-weight:700;color:var(--color-text);line-height:1.4">${_escHtml(n.title)}</div>
        <div style="font-size:11.5px;color:var(--color-text-secondary);margin-top:5px">${_escHtml(n.source)}${n.ts ? ' · ' + kpAgo(n.ts) : ''} · ouvrir l'article ↗</div></a>`).join('')
      + `<div style="font-size:10.5px;color:var(--color-text-secondary);margin-top:4px">Titres et articles © Investing.com, ouverts depuis leur site d'origine.</div>`
    : '<div style="padding:16px;border-radius:14px;border:1px dashed var(--color-border);color:var(--color-text-secondary);font-size:13px;text-align:center">Les actualités sont momentanément indisponibles. Réessaie dans quelques minutes.</div>';
  list.innerHTML = `<div style="font-size:12px;color:var(--color-text-secondary);margin-bottom:12px;line-height:1.5">Taux en direct, mis à jour toutes les 2 minutes. La variation indique l'évolution de chaque devise face à l'euro aujourd'hui. Information uniquement : Kapitaro ne fournit ni analyse ni avis sur les devises.</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;margin-bottom:18px">${cards}</div>
    <div style="font-size:12px;font-weight:800;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">À la une</div>
    ${articles}`;
  clearInterval(window._fxTimer);
  window._fxTimer = setInterval(() => {
    const visible = document.getElementById('sec-news')?.classList.contains('active');
    if (newsFilter !== 'forex' || !visible) { clearInterval(window._fxTimer); return; }
    renderForex(true);
  }, 120000);
}

// ===== COMPANY DETAIL PAGE =====
// ═══ Page d'un actif de l'Actualité : crypto/devise = information seulement, texte inconnu = pas d'analyse inventée ═══
function companyTrackOnlyKind(ticker, name, type) {
  if (type === 'Crypto' || type === 'Devise') return type;
  const k = String(ticker || '').toUpperCase();
  const known = AC_DB.find(c => c.ticker.toUpperCase() === k);
  if (known) return (known.type === 'Crypto' || known.type === 'Devise') ? known.type : '';
  if (/^[A-Z0-9]{2,20}-(EUR|USD)$/.test(k)) return 'Crypto';   // paire crypto de Yahoo absente de notre liste
  const byName = decisionTrackOnlyKind(name) || decisionTrackOnlyKind(ticker);
  if (byName) return byName;
  if (/bitcoin|ethereum|crypto/i.test(String(name || '') + ' ' + String(ticker || ''))) return 'Crypto';
  return '';
}

// Texte tapé dans la recherche d'Actualités : un vrai symbole, un titre connu de Yahoo, ou rien (introuvable)
async function resolveCustomCompany(text) {
  const t = String(text || '').trim();
  let failed = 0;
  try {
    const r = await fetch('/api/prices?symbols=' + encodeURIComponent(t.toUpperCase()));
    const d = await r.json(); const q = d.quotes && d.quotes[0];
    if (q && q.price > 0) return { company: { ticker: t.toUpperCase(), name: t.toUpperCase(), sector: '', type: 'Action' } };
  } catch (e) { failed++; }
  try {
    const r = await fetch('/api/search?q=' + encodeURIComponent(t) + '&crypto=1');
    const d = await r.json(); const x = (d.results || [])[0];
    if (x) return { company: x };
  } catch (e) { failed++; }
  if (failed === 2) return { company: { ticker: t.toUpperCase(), name: t.toUpperCase(), sector: '', type: 'Action' } };   // réseau en panne : on ne bloque pas à tort
  return { unknown: true };
}

function renderCompanyHeader(name, sub) {
  return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
    <button class="btn-secondary" style="padding:8px 14px;font-size:13px" onclick="renderNewsPage()">← Retour</button>
    <div style="flex:1"><div style="font-size:22px;font-weight:800;color:#1c1c1e;letter-spacing:-0.5px">${_escHtml(name)}</div>
    <div style="font-size:13px;color:#8e8e93;font-weight:500">${_escHtml(sub)}</div></div>
  </div>`;
}

function renderTrackOnlyCompany(ticker, name, kind) {
  activeCompany = { ticker, name, sector: kind };
  const main = document.getElementById('news-page-content');
  if (!main) return;
  const crypto = kind === 'Crypto';
  const inPf = positions.find(p => p.name === ticker);
  main.innerHTML = renderCompanyHeader(name, ticker + ' · ' + (crypto ? 'Cryptomonnaie' : 'Devise')) + `
    <div class="metrics-grid">
      <div class="metric-card"><div class="metric-label">Cours</div><div class="metric-val" id="co-price">—</div></div>
      <div class="metric-card"><div class="metric-label">Variation aujourd'hui</div><div class="metric-val" id="co-change">—</div></div>
      <div class="metric-card"><div class="metric-label">Dans mon portf.</div><div class="metric-val" style="font-size:16px">${inPf ? '✓ Oui' : '—'}</div></div>
    </div>
    <div class="card"><div class="card-head"><div class="card-title">📈 Graphique du cours</div></div><div id="co-chart"></div></div>
    <div class="card">
      <div style="padding:6px 2px">
        <div style="font-size:15px;font-weight:800;color:#1c1c1e;margin-bottom:6px">${crypto ? '🪙' : '💱'} Analyse indisponible</div>
        <div style="font-size:13px;color:#3c3c43;line-height:1.6;margin-bottom:14px">${crypto
          ? 'Analyse indisponible pour les cryptomonnaies : ce sont des actifs trop risqués. Kapitaro te permet seulement de suivre leur cours dans ton portefeuille, sans avis ni analyse.'
          : 'Analyse indisponible pour les devises. Kapitaro te permet seulement de suivre leur valeur dans ton portefeuille, sans avis ni analyse.'}</div>
        <button class="btn-primary" style="font-size:13px;padding:10px 16px" onclick="addCompanyToPortfolio('${jsArg(ticker)}','${jsArg(name)}','${kind}')">➕ Ajouter au portefeuille</button>
      </div>
    </div>`;
  fetchCompanyPrice(ticker);
  try { kpChartMount(document.getElementById('co-chart'), ticker, name, { pru: ((positions.find(p => p.name === ticker)) || {}).pru }); } catch (e) {}
}

function renderUnknownCompany(ticker) {
  activeCompany = { ticker, name: ticker, sector: '' };
  const main = document.getElementById('news-page-content');
  if (!main) return;
  main.innerHTML = renderCompanyHeader(ticker, 'Actif introuvable') + `
    <div class="card">
      <div style="padding:6px 2px">
        <div style="font-size:15px;font-weight:800;color:#1c1c1e;margin-bottom:6px">🔎 Actif introuvable</div>
        <div style="font-size:13px;color:#3c3c43;line-height:1.6;margin-bottom:14px">Kapitaro ne trouve « ${_escHtml(ticker)} » dans ses sources de cours (actions, ETF, cryptos, matières premières, devises). Il ne peut donc ni suivre son cours ni l’analyser : aucune analyse n’est générée pour un actif non vérifié.</div>
        <div style="font-size:12.5px;color:#8e8e93;margin-bottom:10px">Tu le détiens quand même ? Ajoute-le à la main (tu saisis toi-même le prix) :</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-primary" style="font-size:13px;padding:10px 16px" onclick="addCompanyToPortfolio('${jsArg(ticker)}','${jsArg(ticker)}','Crypto')">🪙 C’est une crypto</button>
          <button class="btn-secondary" style="font-size:13px;padding:10px 16px" onclick="addCompanyToPortfolio('${jsArg(ticker)}','${jsArg(ticker)}','Action')">🏢 Action ou ETF</button>
        </div>
      </div>
    </div>`;
}

async function addCompanyToPortfolio(ticker, name, type) {
  nav('ajouter');
  await new Promise(r => setTimeout(r, 150));
  try { acClear(); } catch (e) {}
  const known = AC_DB.find(c => c.ticker.toUpperCase() === String(ticker).toUpperCase());
  const company = known || { ticker, name: name || ticker, type: type || 'Action', sector: type === 'Crypto' ? 'Crypto' : type === 'Devise' ? 'Devises' : '', exchange: '' };
  if (type === 'Crypto' || type === 'Devise') { try { setAcCat(type); } catch (e) {} }
  await acSelect(company);
}

async function openCompany(ticker, name, sector) {
  activeCompany = { ticker, name, sector };
  const main = document.getElementById('news-page-content');
  if (!main) return;
  // Crypto ou devise : information seulement. Texte inconnu : aucune analyse inventée.
  let kind = companyTrackOnlyKind(ticker, name);
  if (!kind && sector === 'Recherche personnalisée') {
    main.innerHTML = renderCompanyHeader(name || ticker, 'Recherche en cours…');
    const r = await resolveCustomCompany(ticker);
    if (r.unknown) { renderUnknownCompany(ticker); return; }
    ticker = r.company.ticker; name = r.company.name || ticker; sector = r.company.sector || '';
    kind = companyTrackOnlyKind(ticker, name, r.company.type);
  }
  if (kind) { renderTrackOnlyCompany(ticker, name, kind); return; }
  activeCompany = { ticker, name, sector };

  main.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <button class="btn-secondary" style="padding:8px 14px;font-size:13px" onclick="renderNewsPage()">← Retour</button>
      <div style="flex:1">
        <div style="font-size:22px;font-weight:800;color:#1c1c1e;letter-spacing:-0.5px">${name}</div>
        <div style="font-size:13px;color:#8e8e93;font-weight:500">${ticker} · ${sector}</div>
      </div>
      <button class="btn-follow ${isFavorite(ticker)?'following':''}" id="fav-btn-${ticker}" onclick="toggleFavorite('${jsArg(ticker)}','${jsArg(name)}','${jsArg(sector)}');updateFavBtn('${jsArg(ticker)}')">
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

    <!-- GRAPHIQUE -->
    <div class="card"><div class="card-head"><div class="card-title">📈 Graphique</div></div><div id="co-chart"></div></div>

    <!-- AI ANALYSIS -->
    <div class="card">
      <div class="card-head"><div class="card-title"><div class="card-icon dark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>Analyse IA complète</div></div>
      <div id="co-analysis" style="font-size:14px;color:#8e8e93;font-weight:500">
        <div style="display:flex;align-items:center;gap:10px;color:#8e8e93"><svg class="spinning" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Génération de l'analyse en cours...</div>
      </div>
    </div>

    <!-- COMPANY NEWS -->
    <div class="card">
      <div class="card-head"><div class="card-title"><div class="card-icon dark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg>Contexte — ${name}</div></div>
      <div id="co-news" style="font-size:14px;color:#8e8e93">
        <div style="display:flex;align-items:center;gap:10px;color:#8e8e93"><svg class="spinning" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Chargement...</div>
      </div>
    </div>
  `;

  // Fetch price and analysis in parallel
  fetchCompanyPrice(ticker);
  try { kpChartMount(document.getElementById('co-chart'), ticker, name, { pru: ((positions.find(p => p.name === ticker)) || {}).pru }); } catch (e) {}
  loadCompanyDetail(ticker, name, sector);
}

function updateFavBtn(ticker) {
  const btn = document.getElementById('fav-btn-' + ticker);
  if (btn) btn.outerHTML = `<button class="btn-follow ${isFavorite(ticker)?'following':''}" id="fav-btn-${ticker}" onclick="toggleFavorite('${jsArg(ticker)}','${jsArg(activeCompany?.name||ticker)}','${jsArg(activeCompany?.sector||'')}');updateFavBtn('${jsArg(ticker)}')">${isFavorite(ticker)?'★ Suivi':'☆ Suivre'}</button>`;
}

async function fetchCompanyPrice(ticker) {
  try {
    const res = await fetch(`/api/prices?symbols=${encodeURIComponent(ticker)}`);
    const data = await res.json();
    const q = data.quotes?.[0];
    if (q) {
      const priceEl = document.getElementById('co-price');
      const changeEl = document.getElementById('co-change');
      if (priceEl) { priceEl.textContent = q.price ? fmt(q.price) + ' €' : '—'; }
      if (changeEl) {
        const chg = q.changePct || 0;
        changeEl.textContent = (chg >= 0 ? '+' : '') + chg.toFixed(2).replace(".", ",") + ' %';
        changeEl.className = 'metric-val ' + (chg >= 0 ? 'green' : 'red');
      }
    }
  } catch { /* skip */ }
}

async function loadCompanyDetail(ticker, name, sector) {
  const inPortfolio = positions.find(p => p.name === ticker);
  const portfolioCtx = inPortfolio ? `Je détiens ${inPortfolio.qty} parts à PRU ${inPortfolio.pru}€, prix actuel ${inPortfolio.price}€.` : '';
  const _dc = await fetchContextBlock([{ t: ticker, name }]);
  const prompt = `Analyse ${name} (${ticker}) pour un investisseur débutant prudent.
Profil : ${HL[profile.horizon]}, risque ${RL[profile.risk]}. ${portfolioCtx}

${_dc.text}

Réponds UNIQUEMENT en JSON valide, sans backticks :
{
  "presentation": "ce que fait l'entreprise, 2-3 phrases simples",
  "points_forts": ["raison 1", "raison 2", "raison 3"],
  "points_risque": ["risque 1", "risque 2", "risque 3"],
  "signal": "acheter|garder|eviter",
  "verdict": "recommandation finale adaptée au profil débutant prudent, 2-3 phrases",
  "contexte": [{"titre":"...","resume":"1-2 phrases","impact":"positif|négatif|neutre"}]
}
contexte : 3 à 5 points tirés UNIQUEMENT des actualités récentes fournies ci-dessus (un point par titre pertinent) ; s'il n'y en a aucune, retourne un tableau vide. points_forts / points_risque : appuie-toi sur les chiffres fournis (performance, baisse max, volatilité, et PER / marge / dividende s'ils sont fournis), sans inventer aucun résultat d'entreprise.
Sois pédagogue, concis et direct. Utilise des termes simples.`;

  const raw = await callClaude(prompt, `Tu es analyste financier pédagogue. Tu ne réponds qu'à partir de ce que tu sais réellement — jamais en inventant des faits, des chiffres ou des évènements récents que tu ne connais pas avec certitude. Retourne uniquement du JSON valide.`, 3072);

  let data = null;
  try {
    const s = raw.replace(/```json|```/g, '').trim();
    data = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
  } catch (e) {
    console.error('[loadCompanyDetail] JSON invalide :', e.message, '| début de la réponse :', (raw || '').slice(0, 200));
  }

  const analysisEl = document.getElementById('co-analysis');
  const newsEl = document.getElementById('co-news');
  const signalEl = document.getElementById('co-signal');

  if (!data) {
    if (isAIQuotaMessage(raw)) {
      if (analysisEl) analysisEl.innerHTML = aiFailureHTML(raw);
      if (newsEl) newsEl.innerHTML = '';
      if (signalEl) signalEl.innerHTML = '';
      return;
    }
    if (analysisEl) analysisEl.innerHTML = '<p style="color:#c7c7cc;font-size:13px">Analyse indisponible. Réessaie dans quelques secondes.</p>';
    if (newsEl) newsEl.innerHTML = '<p style="color:#c7c7cc;font-size:13px">Contexte indisponible.</p>';
    return;
  }

  // Analyse
  if (analysisEl) {
    const bullets = (arr) => (arr||[]).map(x => `<li style="margin-bottom:4px">${x}</li>`).join('');
    analysisEl.innerHTML = `
      <div style="font-size:13px;color:#3c3c43;line-height:1.7;font-weight:500">
        <p style="margin-bottom:12px">${data.presentation || ''}</p>
        <p style="font-weight:700;color:#1c1c1e;margin-bottom:6px">Points forts</p>
        <ul style="margin:0 0 12px 18px;padding:0">${bullets(data.points_forts)}</ul>
        <p style="font-weight:700;color:#1c1c1e;margin-bottom:6px">Points de risque</p>
        <ul style="margin:0 0 12px 18px;padding:0">${bullets(data.points_risque)}</ul>
        <p style="font-weight:700;color:#1c1c1e;margin-bottom:6px">Verdict</p>
        <p>${data.verdict || ''}</p>
      </div>
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-primary" style="font-size:13px;padding:10px 16px" onclick="openDecision('${jsArg(ticker)}','acheter')">Analyser pour investir →</button>
        <button class="btn-secondary" style="font-size:13px;padding:10px 16px" onclick="toggleFavorite('${jsArg(ticker)}','${jsArg(activeCompany?.name||ticker)}','${jsArg(activeCompany?.sector||'')}');updateFavBtn('${jsArg(ticker)}')">${isFavorite(ticker)?'★ Suivi':'☆ Suivre'}</button>
      </div>`;
  }

  // Signal — lu directement dans le JSON, plus de détection par mots-clés dans du texte libre
  if (signalEl) {
    if (data.signal === 'acheter') { signalEl.textContent = '↑ Acheter'; signalEl.className = 'metric-val green'; }
    else if (data.signal === 'eviter') { signalEl.textContent = '↓ Éviter'; signalEl.className = 'metric-val red'; }
    else { signalEl.textContent = '→ Garder'; signalEl.className = 'metric-val'; }
  }

  // Contexte (ex-fetchCompanyNews, même rendu qu'avant)
  if (newsEl) {
    const items = data.contexte || [];
    if (!items.length) {
      newsEl.innerHTML = '<p style="color:#c7c7cc;font-size:13px">Pas de contexte fiable disponible pour ce ticker.</p>';
    } else {
      const disclaimer = `<div style="font-size:11px;color:#a0a0a5;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #f0f0f0">ⓘ Contexte général tiré des connaissances de l'IA — pas un flux d'actualité en temps réel, peut être incomplet ou daté.</div>`;
      newsEl.innerHTML = disclaimer + items.map(item => {
        const color = item.impact === 'positif' ? '#1a7f5a' : item.impact === 'négatif' ? '#cc2f26' : '#8e8e93';
        const bg = item.impact === 'positif' ? '#e8f8f0' : item.impact === 'négatif' ? '#fff0f0' : '#f5f5f5';
        return `<div style="padding:12px 0;border-bottom:1px solid #f5f5f5">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
            <span style="font-size:11px;font-weight:700;padding:2px 9px;border-radius:99px;background:${bg};color:${color}">${item.impact}</span>
          </div>
          <div style="font-size:14px;font-weight:700;color:#1c1c1e;margin-bottom:3px">${item.titre}</div>
          <div style="font-size:13px;color:#8e8e93;line-height:1.4">${item.resume}</div>
        </div>`;
      }).join('');
    }
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

  const qn = kpNorm(query);
  AC_DB.filter(c => (c.type === 'Crypto' || c.type === 'Devise') && kpNorm(c.ticker + ' ' + c.name).includes(qn)).slice(0, 3)
    .forEach(c => { if (!results.find(r => r.ticker === c.ticker)) results.push({ ticker: c.ticker, name: c.name, sector: c.type === 'Crypto' ? 'Cryptomonnaie' : 'Devise' }); });

  // Add custom entry if not found
  if (!results.find(r => r.ticker.toLowerCase() === q)) {
    results.push({ ticker: query.toUpperCase(), name: query.toUpperCase(), sector: 'Recherche personnalisée', custom: true });
  }

  if (drop) {
    drop.style.display = 'block';
    drop.innerHTML = results.map(r => `
      <div class="search-result-item" onclick="openCompany('${jsArg(r.ticker)}','${jsArg(r.name)}','${jsArg(r.sector)}');clearSearch()">
        <div class="sr-avatar">${r.ticker.slice(0,2).toUpperCase()}</div>
        <div>
          <div class="sr-name">${r.name}</div>
          <div class="sr-ticker">${r.ticker} · ${r.sector}</div>
        </div>
        <button ${companyTrackOnlyKind(r.ticker, r.name) ? 'hidden ' : ''}class="btn-follow sm ${isFavorite(r.ticker)?'following':''}" onclick="event.stopPropagation();toggleFavorite('${jsArg(r.ticker)}','${jsArg(r.name)}','${jsArg(r.sector)}')" style="margin-left:auto">
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


