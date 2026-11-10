// app-positions.js — Positions : ajout, modification, import, partage, transactions, parcours de bienvenue.
// Partie de l'appli Kapitaro, découpée en 6 fichiers chargés dans cet ordre par index.html : app-objectif.js, app-positions.js, app-marches.js, app-coeur.js, app-ecrans.js, app.js.
// Les fonctions et variables sont partagées entre ces fichiers (app-objectif.js, app-marches.js, app-coeur.js, app-ecrans.js, app.js).

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
        showLocalNotification('Kapitaro — Agenda', notif.texte);
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

// Pause when tab hidden, resume when visible (économise CPU/mémoire → moins de risque que Chrome décharge l'onglet)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    startSmartRefresh();
    if (typeof showPriceTicker === 'function') showPriceTicker(); // relance le ticker
  } else {
    if (priceInterval) clearInterval(priceInterval);
    if (tickerInterval) { clearInterval(tickerInterval); tickerInterval = null; }
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
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&crypto=1`);
    const data = await res.json();
    if ((document.getElementById('f-search')?.value || '').trim().toLowerCase() !== String(query).trim().toLowerCase()) return;   // l’utilisateur a continué à taper : on n’écrase pas ses résultats
    const results = (data.results || []).filter(acMatchesCat);
    if (!results.length) {
      drop.innerHTML = `<div class="ac-no-result">
        <div style="font-size:13px;font-weight:600;color:#8e8e93">Aucun résultat pour "${_escHtml(query)}"</div>
        ${acManualBtn(query)}
      </div>`;
      return;
    }
    drop.innerHTML = results.map(r => `
      <div class="ac-item" onclick="acSelect(${JSON.stringify(r).replace(/"/g,'&quot;')})">
        ${getCompanyLogo(r.ticker, r.name, 36, 10)}
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
      ${acManualBtn(query)}
    </div>`;
  }
}


// ===== AUTO REFRESH PRICES =====
// Simple manual refresh only - no auto loop


// Quantité affichée : « 31,1 g » pour un métal au gramme, « unité(s) » pour une crypto, « part(s) » sinon
function qtyLabel(p) {
  if (/^X(AU|AG|PT)-G$/.test(String(p.name || ''))) return p.qty + ' g';
  const cm = String(p.name || '').match(/^CUR-([A-Z]{3})$/);
  if (cm) return p.qty + ' ' + cm[1];
  return p.qty + ' ' + (p.type === 'Crypto' ? 'unité' : 'part') + (p.qty > 1 ? 's' : '');
}
// Cryptos : suivies (cours, valeur) mais JAMAIS analysées. apos() = positions analysables (sans cryptos).
function isCrypto(p) { return !!p && p.type === 'Crypto'; }
function isTrackOnly(p) { return !!p && (p.type === 'Crypto' || p.type === 'Devise'); }   // suivies, jamais analysées
function apos() { return positions.filter(p => !isTrackOnly(p)); }

// ETC matières premières proposés dans l'appli (cotés en euros, sans levier)
const ETC_TICKERS = ['4GLD.DE', 'BRNT.PA', 'CRUD.MI', 'NGASP.PA', 'COPAP.PA'];
// Nom lisible d'une crypto (« SUI20947-USD » -> « Sui (SUI) »)
function cryptoLabel(t) {
  const k = String(t || '').toUpperCase();
  if (!/-(EUR|USD|G)$/.test(k) && !/^CUR-/.test(k) && !ETC_TICKERS.includes(k)) return '';
  const e = AC_DB.find(c => (c.type === 'Crypto' || c.type === 'Matière première' || c.type === 'Devise') && c.ticker.toUpperCase() === k);
  return e ? e.name : '';
}

// ═══ CATÉGORIES de l'ajout de position : Tout · Actions · ETF · Cryptos · Matières premières · Devises ═══
(function kpInjectCats() {
  try {
    if (document.getElementById('kp-cats-css')) return;
    const st = document.createElement('style'); st.id = 'kp-cats-css';
    st.textContent = '.ac-cats{display:flex;gap:8px;overflow-x:auto;margin:0 0 16px;padding:2px 2px 6px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.ac-cats::-webkit-scrollbar{display:none}'
      + '.ac-cat{flex-shrink:0;display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:999px;border:1.5px solid var(--color-border,#e4e4e7);background:var(--color-surface,#fff);color:var(--color-text,#09090b);font:inherit;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .15s}'
      + '.ac-cat:hover{border-color:#16a34a}.ac-cat.on{background:var(--color-text,#09090b);color:var(--color-surface,#fff);border-color:var(--color-text,#09090b)}'
      + '.ac-cat-hint{display:none;margin:0 0 14px;padding:10px 12px;border-radius:12px;font-size:12.5px;line-height:1.5}[hidden]{display:none!important}';
    document.head.appendChild(st);
  } catch (e) {}
})();

let acCat = 'all';
const AC_CATS = {
  all: { label: 'Rechercher un titre *', ph: 'Ex : Apple, LVMH, IWDA, bitcoin, or…', empty: 'Recherche un titre ci-dessus', sub: 'Le prix et le secteur se rempliront automatiquement — par nom ou par code (ex : AAPL, MC.PA, IWDA.L)', hint: '' },
  Action: { label: 'Rechercher une action *', ph: 'Ex : Apple, NVIDIA, LVMH, Air Liquide…', empty: 'Recherche une action ci-dessus', sub: 'Par nom ou par code (ex : AAPL, MC.PA)', hint: '' },
  ETF: { label: 'Rechercher un ETF *', ph: 'Ex : MSCI World, S&P 500, IWDA, VWCE…', empty: 'Recherche un ETF ci-dessus', sub: 'Par nom ou par code (ex : IWDA.L, VWCE.DE)', hint: '' },
  Crypto: { label: 'Rechercher une cryptomonnaie *', ph: 'Ex : Bitcoin, Ethereum, Solana…', empty: 'Recherche une cryptomonnaie ci-dessus', sub: '357 cryptos disponibles, avec le cours en euros', hint: '🪙 Suivi du cours uniquement : Kapitaro n’analyse pas les cryptomonnaies.', warn: true },
  'Matière première': { label: 'Rechercher une matière première *', ph: 'Ex : or, argent, platine…', empty: 'Recherche une matière première ci-dessus', sub: 'Or, argent, platine au gramme, ou un ETC (or, pétrole, gaz, cuivre)', hint: '🥇 L’or, l’argent et le platine physiques se saisissent en grammes. Le pétrole, le gaz et le cuivre se détiennent via des ETC (produits cotés) : ils sont dans cet onglet. Leur cours se suit dans Actualités › Matières premières.' },
  Devise: { label: 'Rechercher une devise *', ph: 'Ex : dollar, livre, franc suisse, dirham…', empty: 'Recherche une devise ci-dessus', sub: '32 devises, valeur en euros au taux du jour', hint: '💱 Suivi du taux de change uniquement : Kapitaro n’analyse pas les devises.' },
};
// Recherche tolérante : sans accents, et « euro/usd » ou « usd/eur » retrouvent le dollar
function kpNorm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
function kpFxCode(q) {
  const s = kpNorm(q);
  const m = s.match(/^(?:euros?|eur)\s*[\/\-: ]?\s*([a-z]{3})$/) || s.match(/^([a-z]{3})\s*[\/\-: ]?\s*(?:euros?|eur)$/);
  return m ? m[1].toUpperCase() : '';
}
function acMatchesCat(r) { return acCat === 'all' || (r && r.type === acCat); }
function acManualBtn(q) {
  if (acCat === 'Devise') return '<div style="font-size:12px;color:#8e8e93;margin-top:6px;line-height:1.5">Choisis une devise étrangère (dollar, livre, franc suisse…) : l’euro est la devise de référence de Kapitaro.</div>';
  if (acCat !== 'all' && acCat !== 'Action' && acCat !== 'ETF') return '';
  return '<button class="ac-manual-btn" onclick="acSelectManual(\'' + jsArg(q.toUpperCase()) + '\')">Utiliser "' + _escHtml(q.toUpperCase()) + '" comme ticker →</button>';
}
function acChipHTML(c) {
  const nm = c.name.replace(/\s*\(.*\)$/, '');
  const sub = (c.type === 'Action' || c.type === 'ETF') ? c.ticker + ' · ' + c.type : c.type;
  return '<div onclick="acSelect(' + JSON.stringify(c).replace(/"/g, '&quot;') + ')" class="home-hover-card" style="cursor:pointer;background:#fff;border:1.5px solid #f0f0f0;border-radius:12px;padding:10px 12px;display:flex;align-items:center;gap:8px;transition:all 0.15s">'
    + getCompanyLogo(c.ticker, c.name, 28, 8)
    + '<div style="min-width:0"><div style="font-size:12px;font-weight:700;color:#1c1c1e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + _escHtml(nm) + '</div><div style="font-size:10px;color:#8e8e93">' + _escHtml(sub) + '</div></div></div>';
}
function acRenderPopular() {
  const wrap = document.getElementById('ac-popular');
  if (!wrap) return;
  const grid = wrap.querySelector('[data-pop="default"]'), dyn = document.getElementById('ac-pop-dyn');
  if (!dyn) return;
  const lists = {
    all: ['IWDA.L', 'VWCE.DE', 'AAPL', 'NVDA', 'MC.PA', 'BTC-EUR', 'XAU-G', 'CUR-USD'],
    Action: ['AAPL', 'MSFT', 'NVDA', 'MC.PA', 'TSLA', 'AI.PA', 'OR.PA', 'TTE.PA'],
    ETF: ['IWDA.L', 'VWCE.DE', 'CSPX.L', 'VUSA.L'],
    Crypto: ['BTC-EUR', 'ETH-EUR', 'SOL-EUR', 'XRP-EUR', 'BNB-EUR', 'ADA-EUR', 'DOGE-EUR', 'LINK-EUR'],
    'Matière première': ['XAU-G', 'XAG-G', 'XPT-G', '4GLD.DE', 'BRNT.PA', 'CRUD.MI', 'NGASP.PA', 'COPAP.PA'],
    Devise: ['CUR-USD', 'CUR-GBP', 'CUR-CHF', 'CUR-JPY', 'CUR-CAD', 'CUR-MAD', 'CUR-TND', 'CUR-AED'],
  }[acCat] || [];
  if (grid) grid.style.display = 'none';
  dyn.style.display = 'grid';
  dyn.innerHTML = lists.map(t => AC_DB.find(c => c.ticker === t)).filter(Boolean).map(acChipHTML).join('');
}
// Efface la sélection (formulaire, avertissements) sans toucher au texte tapé
function acResetSelection() {
  acSelected = null;
  document.getElementById('crypto-warn')?.remove();
  const sel = document.getElementById('ac-selected'); if (sel) sel.style.display = 'none';
  const ff = document.getElementById('f-fields'); if (ff) ff.style.display = 'none';
  const es = document.getElementById('f-empty-state'); if (es) es.style.display = 'block';
  const nm = document.getElementById('f-name'); if (nm) nm.value = '';
  ['f-qty', 'f-pru', 'f-price', 'f-sector', 'f-alert'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}
function setAcCat(cat) {
  if (acSelected) acClear();   // l'ancien formulaire ne doit pas rester affiché sous un autre onglet
  acCat = AC_CATS[cat] ? cat : 'all';
  const c = AC_CATS[acCat];
  document.querySelectorAll('#ac-cats .ac-cat').forEach(b => b.classList.toggle('on', b.dataset.cat === acCat));
  const lab = document.getElementById('ac-label'); if (lab) lab.textContent = c.label;
  const inp = document.getElementById('f-search'); if (inp) inp.placeholder = c.ph;
  const t = document.getElementById('ac-empty-title'); if (t) t.textContent = c.empty;
  const sub = document.getElementById('ac-empty-sub'); if (sub) sub.textContent = c.sub;
  const hint = document.getElementById('ac-cat-hint');
  if (hint) {
    hint.textContent = c.hint; hint.style.display = c.hint ? 'block' : 'none';
    hint.style.background = c.warn ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.1)';
    hint.style.border = '1px solid ' + (c.warn ? 'rgba(245,158,11,0.4)' : 'rgba(59,130,246,0.35)');
    hint.style.color = c.warn ? '#92400e' : '#1e40af';
  }
  acRenderPopular();
  const drop = document.getElementById('ac-drop'); if (drop) drop.style.display = 'none';
  if (inp && !acSelected && inp.value.trim().length >= 2) acSearch(inp.value.trim());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { try { acRenderPopular(); } catch (e) {} }); else { try { acRenderPopular(); } catch (e) {} }

// ═══ « Aide à la décision » : pas d'analyse des cryptos ni des devises, et jamais d'actif inventé ═══
function decisionTrackOnlyKind(text) {
  const t = String(text || '').trim().toLowerCase();
  if (t.length < 2) return '';
  if (/bitcoin|ethereum|\bcrypto/.test(t)) return 'Crypto';   // y compris les ETF/ETP adossés à des cryptos
  if (/^(devise|devises|forex)$/.test(t)) return 'Devise';
  if (AC_DB.some(c => c.type !== 'Crypto' && c.type !== 'Devise' && c.ticker.toLowerCase().split('.')[0] === t)) return '';   // un vrai titre porte ce nom : on ne bloque pas
  for (const c of [...AC_DB.filter(x => x.type === 'Devise'), ...AC_DB.filter(x => x.type === 'Crypto')]) {
    const sym = c.ticker.replace(/^CUR-/, '').replace(/\d{3,}-(EUR|USD)$/, '').replace(/-(EUR|USD)$/, '').toLowerCase();
    const nm = c.name.replace(/\s*\(.*\)$/, '').toLowerCase();
    if (t === sym || t === nm || t === c.ticker.toLowerCase()) return c.type;
  }
  return '';
}
function setDecisionNotice(kind) {
  const el = document.getElementById('d-notice');
  if (!el) return;
  const msg = kind === 'Crypto' ? '🪙 Pas d’analyse pour les cryptomonnaies : Kapitaro les suit (cours, valeur) sans donner d’avis.'
    : kind === 'Devise' ? '💱 Pas d’analyse pour les devises : Kapitaro suit leur valeur sans donner d’avis.'
    : kind === 'unknown' ? '⚠️ Je ne trouve pas cet actif. Choisis un titre dans la liste proposée.' : '';
  el.textContent = msg; el.style.display = msg ? 'block' : 'none';
}

// ===== AUTOCOMPLETE ADD POSITION =====
const AC_DB = [
  // ===== CRYPTOMONNAIES (357 ; prix en euros, convertis depuis le dollar si besoin) =====
  {ticker:"BTC-EUR",name:"Bitcoin (BTC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ETH-EUR",name:"Ethereum (ETH)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"USDT-EUR",name:"Tether (USDT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BNB-EUR",name:"BNB (BNB)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"XRP-EUR",name:"XRP (XRP)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"USDC-EUR",name:"USDC (USDC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SOL-EUR",name:"Solana (SOL)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"TRX-EUR",name:"TRON (TRX)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"FIGRHELOC-USD",name:"Figure Heloc (FIGR_HELOC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ZEC-EUR",name:"Zcash (ZEC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"HYPE32196-USD",name:"Hyperliquid (HYPE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"DOGE-EUR",name:"Dogecoin (DOGE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"LINK-EUR",name:"Chainlink (LINK)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ADA-EUR",name:"Cardano (ADA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"XMR-EUR",name:"Monero (XMR)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"WBT-USD",name:"WhiteBIT Coin (WBT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"USDS33039-USD",name:"USDS (USDS)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"RAIN38341-USD",name:"Rain (RAIN)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"XLM-EUR",name:"Stellar (XLM)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"NEAR-USD",name:"NEAR Protocol (NEAR)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BCH-EUR",name:"Bitcoin Cash (BCH)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"UNI7083-USD",name:"Uniswap (UNI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"LTC-EUR",name:"Litecoin (LTC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SUI20947-USD",name:"Sui (SUI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"CC37263-USD",name:"Canton (CC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"USDE29470-USD",name:"Ethena USDe (USDE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"AVAX-EUR",name:"Avalanche (AVAX)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"DAI-EUR",name:"Dai (DAI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"HBAR-EUR",name:"Hedera (HBAR)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"GRAM-USD",name:"Gram (prev. Toncoin) (GRAM)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"QNT-EUR",name:"Quant (QNT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SHIB-EUR",name:"Shiba Inu (SHIB)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"TAO22974-USD",name:"Bittensor (TAO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"CRO-EUR",name:"Cronos (CRO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"XAUT-USD",name:"Tether Gold (XAUT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"USDG33793-USD",name:"Global Dollar (USDG)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BTW39158-USD",name:"Bitway (BTW)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"PUMP36507-USD",name:"Pump.fun (PUMP)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"PYUSD-USD",name:"PayPal USD (PYUSD)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"AAVE-EUR",name:"Aave (AAVE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"OKB-USD",name:"OKB (OKB)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ENA-USD",name:"Ethena (ENA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"RLUSD-USD",name:"Ripple USD (RLUSD)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ONDO-USD",name:"Ondo (ONDO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"M35491-USD",name:"MemeCore (M)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"USDY29256-USD",name:"Ondo US Dollar Yield (USDY)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"WLD-USD",name:"Worldcoin (WLD)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SKY33038-USD",name:"Sky (SKY)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"MNT27075-USD",name:"Mantle (MNT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"DOT-EUR",name:"Polkadot (DOT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ASTER36341-USD",name:"Aster (ASTER)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"PEPE24478-USD",name:"Pepe (PEPE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"MORPHO34104-USD",name:"Morpho (MORPHO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ICP-EUR",name:"Internet Computer (ICP)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"USDF35721-USD",name:"Falcon USD (USDF)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"PAXG-USD",name:"PAX Gold (PAXG)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"WLFI33251-USD",name:"World Liberty Financial (WLFI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"U39120-USD",name:"United Stables (U)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"USDD-USD",name:"USDD (USDD)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"VVV35509-USD",name:"Venice Token (VVV)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ETC-EUR",name:"Ethereum Classic (ETC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BGB-USD",name:"Bitget Token (BGB)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ARB11841-USD",name:"Arbitrum (ARB)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BFUSD-USD",name:"BFUSD (BFUSD)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"USDGO-USD",name:"USDGO (USDGO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ZRO26997-USD",name:"LayerZero (ZRO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"KAS-USD",name:"Kaspa (KAS)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ALGO-EUR",name:"Algorand (ALGO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"JST-USD",name:"JUST (JST)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"RENDER-USD",name:"Render (RENDER)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"LIT39125-USD",name:"Lighter (LIT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ATOM-EUR",name:"Cosmos Hub (ATOM)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"FIL-EUR",name:"Filecoin (FIL)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"AERO29270-USD",name:"Aerodrome Finance (AERO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"NEXO-USD",name:"NEXO (NEXO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"CAKE-EUR",name:"PancakeSwap (CAKE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"NIGHT39064-USD",name:"Midnight (NIGHT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"DASH-EUR",name:"Dash (DASH)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"INJ-USD",name:"Injective (INJ)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"VET-EUR",name:"VeChain (VET)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ETHFI-USD",name:"Ether.fi (ETHFI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"STABLE38892-USD",name:"​​Stable (STABLE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"STX4847-USD",name:"Stacks (STX)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"AKE-USD",name:"Akedo (AKE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"APT21794-USD",name:"Aptos (APT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"GHO-USD",name:"GHO (GHO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"OUSD40671-USD",name:"Open USD (OUSD)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"XDC-EUR",name:"XDC Network (XDC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"FLR-USD",name:"Flare (FLR)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"PYTH-USD",name:"Pyth Network (PYTH)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"PENGU34466-USD",name:"Pudgy Penguins (PENGU)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"FET-EUR",name:"Artificial Superintelligence Alliance (FET)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"CRV-EUR",name:"Curve DAO (CRV)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"TRUMP35336-USD",name:"Official Trump (TRUMP)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BDX-EUR",name:"Beldex (BDX)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"VIRTUAL-USD",name:"Virtuals Protocol (VIRTUAL)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"RAY-EUR",name:"Raydium (RAY)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"USD0-USD",name:"Usual USD (USD0)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"KAU24382-USD",name:"Kinesis Gold (KAU)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"YLDS-USD",name:"YLDS (YLDS)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SEI-USD",name:"Sei (SEI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"TUSD-EUR",name:"TrueUSD (TUSD)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"GRASS32956-USD",name:"Grass (GRASS)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"EURC-USD",name:"EURC (EURC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"TIA-USD",name:"Celestia (TIA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"A7A5-USD",name:"A7A5 (A7A5)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"XPL-USD",name:"Plasma (XPL)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"PENDLE-USD",name:"Pendle (PENDLE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"STRK22691-USD",name:"Starknet (STRK)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SPX28081-USD",name:"SPX6900 (SPX)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"DRV35014-USD",name:"Derive (DRV)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BSV-EUR",name:"Bitcoin SV (BSV)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"LDO-USD",name:"Lido DAO (LDO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"FF38482-USD",name:"Falcon Finance (FF)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"MON30495-USD",name:"Monad (MON)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"XTZ-EUR",name:"Tezos (XTZ)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"PIEVERSE-USD",name:"Pieverse (PIEVERSE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BONK-USD",name:"Bonk (BONK)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"HASH19960-USD",name:"Provenance Blockchain (HASH)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"KITE-USD",name:"Kite (KITE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"UB38339-USD",name:"Unibase (UB)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"USDAI-USD",name:"USDai (USDAI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"GRT6719-USD",name:"The Graph (GRT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"FDUSD-USD",name:"First Digital USD (FDUSD)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"DCR-EUR",name:"Decred (DCR)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"GNO-EUR",name:"Gnosis (GNO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"OP-USD",name:"Optimism (OP)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"JTO-USD",name:"Jito (JTO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BP39686-USD",name:"Backpack (BP)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"AR-EUR",name:"Arweave (AR)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SYRUP-USD",name:"Maple Finance (SYRUP)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ENS-USD",name:"Ethereum Name Service (ENS)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"LUNC-EUR",name:"Terra Luna Classic (LUNC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"CFX-USD",name:"Conflux (CFX)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"FLOKI-USD",name:"FLOKI (FLOKI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"IOTA-EUR",name:"IOTA (IOTA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"APEPE27048-USD",name:"Ape and Pepe (APEPE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"PONS-USD",name:"Pons (PONS)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"JASMY-USD",name:"JasmyCoin (JASMY)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ZBCN-USD",name:"Zebec Network (ZBCN)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"WIF-USD",name:"dogwifhat (WIF)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"RUNE-EUR",name:"THORChain (RUNE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"KAIA-USD",name:"Kaia (KAIA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"COMP5692-USD",name:"Compound (COMP)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"USELESS36828-USD",name:"Useless Coin (USELESS)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"TWT-EUR",name:"Trust Wallet (TWT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"NFT9816-USD",name:"AINFT (NFT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"2Z-USD",name:"DoubleZero (2Z)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"AKT-USD",name:"Akash Network (AKT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"THETA-EUR",name:"Theta Network (THETA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"AXS-EUR",name:"Axie Infinity (AXS)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"CRVUSD-USD",name:"crvUSD (CRVUSD)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"KMNO-USD",name:"Kamino (KMNO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SHFL-USD",name:"Shuffle (SHFL)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"AUSD32864-USD",name:"AUSD (AUSD)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"CARDS38283-USD",name:"Collector Crypt (CARDS)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"FRAX-USD",name:"Legacy Frax Dollar (FRAX)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"CVX-USD",name:"Convex Finance (CVX)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SAND-EUR",name:"The Sandbox (SAND)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ZAMA-USD",name:"Zama (ZAMA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"MANA-EUR",name:"Decentraland (MANA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"TRAC-USD",name:"OriginTrail (TRAC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"XCN18679-USD",name:"Onyxcoin (XCN)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"FARTCOIN-USD",name:"Fartcoin (FARTCOIN)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"EURCV-USD",name:"EUR CoinVertible (EURCV)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"USAT-USD",name:"USAT (USAT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"NEO-EUR",name:"NEO (NEO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"CHZ-EUR",name:"Chiliz (CHZ)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"B-USD",name:"BUILDon (B)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BORG-USD",name:"SwissBorg (BORG)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"NPC27960-USD",name:"Non-Playable Coin (NPC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"APE18876-USD",name:"ApeCoin (APE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SENT38868-USD",name:"Sentient (SENT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"MET38353-USD",name:"Meteora (MET)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"VSN37322-USD",name:"Vision (VSN)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"XEC-USD",name:"eCash (XEC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"A36462-USD",name:"Vaulta (A)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"COCO39131-USD",name:"coco (COCO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"CASHCAT-USD",name:"Cash Cat (CASHCAT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"EDGE39720-USD",name:"edgeX (EDGE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SUPER8290-USD",name:"SuperVerse (SUPER)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"RAIL-USD",name:"Railgun (RAIL)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BTSE-USD",name:"BTSE Token (BTSE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BAT-EUR",name:"Basic Attention (BAT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"FLUID-USD",name:"Fluid (FLUID)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"AIOZ-USD",name:"AIOZ Network (AIOZ)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SFP-USD",name:"SafePal (SFP)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ATH30083-USD",name:"Aethir (ATH)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"1INCH-EUR",name:"1INCH (1INCH)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"GUSD38330-USD",name:"GUSD (GUSD)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SNX-EUR",name:"Synthetix (SNX)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"H-USD",name:"Humanity (H)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"GEOD-USD",name:"Geodnet (GEOD)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"DGAI-USD",name:"DGrid AI (DGAI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"EGLD-EUR",name:"MultiversX (EGLD)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ZK24091-USD",name:"ZKsync (ZK)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ULTIMA-USD",name:"Ultima (ULTIMA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SN51-USD",name:"lium (SN51)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"JPYC40123-USD",name:"JPY Coin (JPYC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SN64-USD",name:"Chutes (SN64)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ZEN-EUR",name:"Horizen (ZEN)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SKR39377-USD",name:"Seeker (SKR)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"GLM-EUR",name:"Golem (GLM)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"GALA-USD",name:"GALA (GALA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"OZO-USD",name:"Ozone Chain (OZO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"DYDX-USD",name:"dYdX (DYDX)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"PLUME-USD",name:"Plume (PLUME)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ORCA-USD",name:"Orca (ORCA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"RLB-USD",name:"Rollbit Coin (RLB)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BC35067-USD",name:"BCGame Coin (BC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SOON36542-USD",name:"SOON (SOON)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"PEAQ-USD",name:"peaq (PEAQ)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"AI40925-USD",name:"Artificial Inu (AI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"DBR31528-USD",name:"deBridge (DBR)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"MARSCOIN-USD",name:"MarsCoin (MARSCOIN)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"RSR-EUR",name:"Reserve Rights (RSR)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"PROM-USD",name:"Prom (PROM)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"FORM23635-USD",name:"Four (FORM)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ZRX-EUR",name:"0x Protocol (ZRX)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"HNT-EUR",name:"Helium (HNT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"FRXUSD-USD",name:"Frax USD (FRXUSD)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"QTUM-EUR",name:"Qtum (QTUM)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SOSO-USD",name:"SoSoValue (SOSO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"PROS39682-USD",name:"Pharos (PROS)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BGBTC-USD",name:"Bitget Wrapped BTC (BGBTC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"CHIP39870-USD",name:"USD.AI (CHIP)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"VELO-USD",name:"Velo (VELO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"PURR34332-USD",name:"Purr (PURR)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"Q38236-USD",name:"Quack AI (Q)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"KSM-EUR",name:"Kusama (KSM)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"DOG30933-USD",name:"Dog (Bitcoin) (DOG)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ORDI-USD",name:"ORDI (ORDI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"WEMIX-USD",name:"WEMIX (WEMIX)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ARKM-USD",name:"Arkham (ARKM)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"W-USD",name:"Wormhole (W)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"WAL36119-USD",name:"Walrus (WAL)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"GAS-EUR",name:"Gas (GAS)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"KNTQ-USD",name:"Kinetiq (KNTQ)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"YFI-EUR",name:"yearn.finance (YFI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"RED21707-USD",name:"RedStone (RED)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SN4-USD",name:"Targon (SN4)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"COW19269-USD",name:"CoW Protocol (COW)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"QUBIC-USD",name:"Qubic (QUBIC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"OMI19075-USD",name:"ECOMI (OMI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"GMX11857-USD",name:"GMX (GMX)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"FUN-EUR",name:"FUNToken (FUN)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"TAG34958-USD",name:"TAGGER (TAG)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"LPT-USD",name:"Livepeer (LPT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SPK36569-USD",name:"Spark (SPK)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ZANO-EUR",name:"Zano (ZANO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ZETA-USD",name:"ZetaChain (ZETA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"GGBR-USD",name:"Goldfish Gold (GGBR)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"KAITO-USD",name:"KAITO (KAITO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BULLA36769-USD",name:"BULLA (BULLA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"41861-USD",name:"牛来 (Niu Lai) (牛来)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"NMR-EUR",name:"Numeraire (NMR)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"O40092-USD",name:"o1.exchange (O)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"RIF-USD",name:"Rootstock Infrastructure Framework (RIF)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ZIG-USD",name:"ZIG Finance (ZIG)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"HOT2682-USD",name:"Holo (HOT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ORBIO42040-USD",name:"Orbio.so (ORBIO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"DGB-EUR",name:"DigiByte (DGB)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"USDSUI-USD",name:"USDsui (USDSUI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"TFUEL-EUR",name:"Theta Fuel (TFUEL)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BERA-USD",name:"Berachain (BERA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"DIEM-USD",name:"Diem (DIEM)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BABYDOGE-USD",name:"Baby Doge Coin (BABYDOGE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"DOLA-USD",name:"DOLA (DOLA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ESP39548-USD",name:"Espresso (ESP)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ONE37166-USD",name:"ONEchain (ONE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BANANAS31-USD",name:"Banana For Scale (BANANAS31)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"FT38544-USD",name:"Flying Tulip (FT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ADI38185-USD",name:"ADI (ADI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"DATA35626-USD",name:"Data Network (DATA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"KAVA-EUR",name:"Kava (KAVA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"GAL11877-USD",name:"GAL (migrated to Gravity - G) (GAL)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"MUBARAK-USD",name:"Mubarak (MUBARAK)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SUSHI-EUR",name:"Sushi (SUSHI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"NXPC-USD",name:"Nexpace (NXPC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"TURBO-USD",name:"Turbo (TURBO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"NOS-USD",name:"Nosana (NOS)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"UAI38841-USD",name:"UnifAI Network (UAI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BOME-USD",name:"BOOK OF MEME (BOME)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"IO29835-USD",name:"io.net (IO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"LINEA-USD",name:"Linea (LINEA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ARC34926-USD",name:"AI Rig Complex (ARC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ZIL-EUR",name:"Zilliqa (ZIL)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BONER-USD",name:"Boner Coin (BONER)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"XAUM-USD",name:"Matrixdock Gold (XAUM)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"XPR-USD",name:"XPR Network (XPR)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"MERL-USD",name:"Merlin Chain (MERL)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BIO34812-USD",name:"Bio Protocol (BIO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ROSE-EUR",name:"Oasis (ROSE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ALLO-USD",name:"Allora (ALLO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BABY32198-USD",name:"Babylon (BABY)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"VTHO-EUR",name:"VeThor (VTHO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ENJ-EUR",name:"Enjin Coin (ENJ)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"AXL17799-USD",name:"Axelar (AXL)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ASTR-USD",name:"Astar (ASTR)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"POD42398-USD",name:"Dolphin (POD)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"DEXE-USD",name:"DeXe (DEXE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ANSEM-USD",name:"The Black Bull (ANSEM)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"CKB-EUR",name:"Nervos Network (CKB)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BAN33881-USD",name:"Comedian (BAN)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"NILA-USD",name:"MindWaveDAO (NILA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"0G-USD",name:"0G (0G)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"QRL-EUR",name:"Quantum Resistant Ledger (QRL)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"PHA-EUR",name:"PHALA (PHA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"METAL21769-USD",name:"Metal Blockchain (METAL)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ARRR-EUR",name:"Pirate Chain (ARRR)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"CELO-EUR",name:"Celo (CELO)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ORE32782-USD",name:"ORE (ORE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"GPS-USD",name:"GoPlus Security (GPS)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SN44-USD",name:"Score (SN44)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ELF-USD",name:"aelf (ELF)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"CTC-EUR",name:"Creditcoin (CTC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"COAI38489-USD",name:"ChainOpera AI (COAI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BLUR-USD",name:"Blur (BLUR)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"HUMA-USD",name:"Huma Finance (HUMA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"LCX-USD",name:"LCX (LCX)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ANVL-USD",name:"Anvil (ANVL)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ONT-EUR",name:"Ontology (ONT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SN120-USD",name:"affine (SN120)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"AB-USD",name:"AB (AB)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"CFG-USD",name:"Centrifuge (CFG)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"MEGA38770-USD",name:"MegaETH (MEGA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"UNP-USD",name:"Unipoly (UNP)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"PC36834-USD",name:"Pentagon Chain (PC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"LSK-EUR",name:"Lisk (LSK)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ALT29073-USD",name:"AltLayer (ALT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"XVS-USD",name:"Venus (XVS)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ID21846-USD",name:"SPACE ID (ID)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SNEK25264-USD",name:"Snek (SNEK)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"FONQ-USD",name:"FONQ (FONQ)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"AMP-EUR",name:"Amp (AMP)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"POLYX-USD",name:"Polymesh (POLYX)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SN53-USD",name:"EfficientFrontier (SN53)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ARX39970-USD",name:"Arcium (ARX)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"DUSD36762-USD",name:"StandX DUSD (DUSD)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"JELLYJELLY-USD",name:"Jelly-My-Jelly (JELLYJELLY)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"PNUT-USD",name:"Peanut the Squirrel (PNUT)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ACU36492-USD",name:"Acurast (ACU)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"FLOW-EUR",name:"Flow (FLOW)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"BIM-USD",name:"BIM (BIM)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"TOSHI27750-USD",name:"Toshi (TOSHI)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"XVG-EUR",name:"Verge (XVG)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"RAVE38967-USD",name:"RaveDAO (RAVE)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"RON14101-USD",name:"Ronin (RON)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"AZTEC-USD",name:"Aztec (AZTEC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"DUSK-USD",name:"DUSK (DUSK)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"WIN-EUR",name:"WINkLink (WIN)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"SC-EUR",name:"Siacoin (SC)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"ALCH-USD",name:"Alchemist AI (ALCH)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"NOCK-USD",name:"Nockchain (NOCK)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"NIL35702-USD",name:"Nillion (NIL)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"AURORA14803-USD",name:"Aurora (AURORA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  {ticker:"USDA35965-USD",name:"USDa (USDA)",type:'Crypto',sector:'Crypto',exchange:'Cryptomonnaie'},
  // ===== MÉTAUX PHYSIQUES (cours au gramme, en euros) =====
  {ticker:"4GLD.DE",name:"Xetra-Gold (ETC or physique)",type:'Matière première',sector:'Matières premières',exchange:'XETRA'},
  {ticker:"BRNT.PA",name:"WisdomTree Brent Crude Oil (ETC pétrole Brent)",type:'Matière première',sector:'Matières premières',exchange:"Euronext Paris",alias:"petrole petrol oil brent crude baril"},
  {ticker:"CRUD.MI",name:"WisdomTree WTI Crude Oil (ETC pétrole WTI)",type:'Matière première',sector:'Matières premières',exchange:"Borsa Italiana",alias:"petrole petrol oil wti crude baril"},
  {ticker:"NGASP.PA",name:"WisdomTree Natural Gas (ETC gaz naturel)",type:'Matière première',sector:'Matières premières',exchange:"Euronext Paris",alias:"gaz gas naturel natural"},
  {ticker:"COPAP.PA",name:"WisdomTree Copper (ETC cuivre)",type:'Matière première',sector:'Matières premières',exchange:"Euronext Paris",alias:"cuivre copper"},
  {ticker:"XAU-G",name:"Or physique (au gramme)",type:'Matière première',sector:'Matières premières',exchange:'Cours au gramme'},
  {ticker:"XAG-G",name:"Argent physique (au gramme)",type:'Matière première',sector:'Matières premières',exchange:'Cours au gramme'},
  {ticker:"XPT-G",name:"Platine physique (au gramme)",type:'Matière première',sector:'Matières premières',exchange:'Cours au gramme'},
  // ===== DEVISES (suivi du taux de change, valeur en euros) =====
  {ticker:"CUR-USD",name:"Dollar américain (USD)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-GBP",name:"Livre sterling (GBP)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-CHF",name:"Franc suisse (CHF)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-JPY",name:"Yen japonais (JPY)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-CAD",name:"Dollar canadien (CAD)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-AUD",name:"Dollar australien (AUD)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-NZD",name:"Dollar néo-zélandais (NZD)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-SEK",name:"Couronne suédoise (SEK)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-NOK",name:"Couronne norvégienne (NOK)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-DKK",name:"Couronne danoise (DKK)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-PLN",name:"Zloty polonais (PLN)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-CZK",name:"Couronne tchèque (CZK)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-HUF",name:"Forint hongrois (HUF)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-RON",name:"Leu roumain (RON)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-TRY",name:"Livre turque (TRY)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-CNY",name:"Yuan chinois (CNY)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-HKD",name:"Dollar de Hong Kong (HKD)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-SGD",name:"Dollar de Singapour (SGD)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-INR",name:"Roupie indienne (INR)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-BRL",name:"Réal brésilien (BRL)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-MXN",name:"Peso mexicain (MXN)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-ZAR",name:"Rand sud-africain (ZAR)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-MAD",name:"Dirham marocain (MAD)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-TND",name:"Dinar tunisien (TND)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-AED",name:"Dirham des Émirats (AED)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-SAR",name:"Riyal saoudien (SAR)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-ILS",name:"Shekel israélien (ILS)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-KRW",name:"Won sud-coréen (KRW)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-THB",name:"Baht thaïlandais (THB)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-DZD",name:"Dinar algérien (DZD)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-XOF",name:"Franc CFA (Afrique de l’Ouest) (XOF)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
  {ticker:"CUR-XPF",name:"Franc Pacifique (CFP) (XPF)",type:'Devise',sector:'Devises',exchange:'Taux de change'},
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
  {ticker:'AGGH.AS',name:'iShares Core Global Aggregate Bond',type:'ETF',sector:'Obligations',exchange:'AMS'},
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

// Autocomplétion du champ « Quel actif ? » (Aide à la décision) : même base que le formulaire d'ajout,
// mais le choix remplit seulement le champ d'analyse
let _decAcTimer = null;
function decisionAcSearch(query) {
  const drop = document.getElementById('d-ac-drop');
  if (!drop) return;
  clearTimeout(_decAcTimer);
  const q = (query || '').trim().toLowerCase();
  if (q.length < 2) { drop.style.display = 'none'; return; }
  const item = r => `<div class="ac-item" onclick="decisionAcPick('${jsArg(r.ticker)}','${jsArg(r.name)}')">
      ${getCompanyLogo(r.ticker, r.name, 36, 10)}
      <div class="ac-item-info">
        <div class="ac-item-name">${_escHtml(r.name)}</div>
        <div class="ac-item-meta">${_escHtml([r.ticker, r.type, r.sector, r.exchange].filter(Boolean).join(' · '))}</div>
      </div>
      <div class="ac-item-type ${r.type==='ETF'?'etf':''}">${_escHtml(r.type || '')}</div>
    </div>`;
  const local = AC_DB.filter(c => c.type !== 'Crypto' && (c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))).slice(0, 7);
  drop.style.display = 'block';
  if (local.length) { drop.innerHTML = local.map(item).join(''); return; }
  drop.innerHTML = '<div class="ac-no-result"><div style="font-size:13px;color:#8e8e93;font-weight:600">Recherche en cours...</div></div>';
  _decAcTimer = setTimeout(async () => {
    try {
      const results = ((await (await fetch('/api/search?q=' + encodeURIComponent(query.trim()))).json()).results || []);
      if (document.getElementById('d-name')?.value.trim().toLowerCase() !== q) return;   // l'utilisateur a continué à taper
      drop.innerHTML = results.length ? results.map(item).join('')
        : `<div class="ac-no-result"><div style="font-size:13px;font-weight:600;color:#8e8e93">Aucun résultat pour « ${_escHtml(query)} » : tu peux quand même lancer l'analyse avec ce nom.</div></div>`;
    } catch { drop.style.display = 'none'; }
  }, 300);
}
// Entrée : prend la 1re suggestion affichée, sinon lance l'analyse · Échap : ferme la liste
function decisionNameKey(e) {
  const drop = document.getElementById('d-ac-drop');
  if (e.key === 'Escape') { if (drop) drop.style.display = 'none'; return; }
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const first = drop && drop.style.display !== 'none' ? drop.querySelector('.ac-item') : null;
  if (first) first.click();
  else analyseDecision();
}

function decisionAcPick(ticker, name) {
  setDecisionAsset(ticker, name);
  const drop = document.getElementById('d-ac-drop');
  if (drop) drop.style.display = 'none';
  try { updateDecisionCTA(); } catch(e) {}
}

// Le champ affiche un nom lisible (« LVMH ») ; le symbole (MC.PA), utilisé pour l'analyse et les prix, reste en coulisse
function setDecisionAsset(ticker, name) {
  const input = document.getElementById('d-name');
  if (!input) return;
  const nice = displayName(ticker);
  const label = (nice && nice !== ticker) ? nice : (name || ticker);
  input.value = label;
  input.dataset.ticker = ticker;
  input.dataset.label = label;
}
// Symbole à analyser : celui choisi dans les suggestions, sinon le texte tapé tel quel
function getDecisionTicker() {
  const input = document.getElementById('d-name');
  const v = (input?.value || '').trim();
  return (input?.dataset.ticker && v === input.dataset.label) ? input.dataset.ticker : v;
}

function acSearch(query) {
  if (acSelected) acResetSelection();   // on retape une recherche : l'ancien choix disparaît
  const drop = document.getElementById('ac-drop');
  const clearBtn = document.getElementById('ac-clear');
  if (!query || query.length < 2) {
    drop.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
    return;
  }
  if (clearBtn) clearBtn.style.display = 'block';
  const q = query.toLowerCase();
  const qn = kpNorm(query), qd = kpFxCode(query);
  const results = AC_DB.filter(c =>
    kpNorm(c.ticker + ' ' + c.name + ' ' + c.sector + ' ' + (c.alias || '')).includes(qn) ||
    (qd && c.ticker === 'CUR-' + qd)
  ).filter(acMatchesCat).slice(0, 7);

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
      ${getCompanyLogo(r.ticker, r.name, 36, 10)}
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
      ${getCompanyLogo(company.ticker, company.name, 36, 10)}
      <div>
        <div style="font-size:14px;font-weight:800;color:#1c1c1e">${company.name}</div>
        <div style="font-size:12px;color:#8e8e93;font-weight:500">${company.ticker} · ${company.type} · ${company.sector}</div>
      </div>
      <button type="button" onclick="openChart('${jsArg(company.ticker)}','${jsArg(company.name)}',0)" style="margin-left:8px;padding:6px 11px;background:#fff7ed;border:1px solid #fed7aa;border-radius:9px;font-size:12px;font-weight:700;color:#c2410c;cursor:pointer;white-space:nowrap">📈 Graphique</button>
    </div>`;

  // Crypto : rappel de risque
  try {
    document.getElementById('crypto-warn')?.remove();
    if (company.type === 'Crypto') {
      const w = document.createElement('div');
      w.id = 'crypto-warn';
      w.style.cssText = 'margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.4);color:#92400e;font-size:12px;line-height:1.5';
      w.textContent = '⚠️ Les cryptomonnaies sont très volatiles et peu régulées : tu peux perdre tout ou partie de ta mise. Kapitaro t’aide à suivre ce que tu détiens déjà, il ne conseille pas d’en acheter.';
      badge.insertAdjacentElement('afterend', w);
    } else if (company.type === 'Matière première' || company.type === 'Devise') {
      const w = document.createElement('div');
      w.id = 'crypto-warn';
      w.style.cssText = 'margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.35);color:#1e40af;font-size:12px;line-height:1.5';
      w.textContent = company.type === 'Devise'
        ? 'ℹ️ Indique le montant que tu détiens dans cette devise (par exemple 2 000 pour 2 000 $). Le cours est le taux de change face à l’euro. Kapitaro suit la valeur, sans l’analyser.'
        : ETC_TICKERS.includes(company.ticker)
          ? 'ℹ️ Cet ETC suit des contrats à terme : sa performance peut s’écarter du cours affiché dans Actualités, et il convient mal à un placement long terme. Produit risqué : tu peux perdre une partie importante de ta mise.'
          : 'ℹ️ Indique la quantité en grammes (1 once = 31,1 g). Le prix affiché est le cours mondial du métal, hors prime des pièces et lingots.';
      badge.insertAdjacentElement('afterend', w);
    }
  } catch (e) {}

  // Show form fields
  document.getElementById('f-fields').style.display = 'block';
  kpApplyMainPlatform();
  try { updateAddButtons(); } catch(e) {}
  try { updateAddPreview(); } catch(e) {}
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
        priceInput.value = kpPriceStr(q.price);
        priceInput.placeholder = kpPriceStr(q.price);
        priceInput.style.color = '#1c1c1e';
      }
      if (liveLabel) liveLabel.style.display = 'inline';
      // Pré-remplit le PRU avec le prix actuel (modifiable par l'utilisateur)
      const pruInput = document.getElementById('f-pru');
      if (pruInput && !pruInput.value) {
        pruInput.value = kpPriceStr(q.price);
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
  document.getElementById('crypto-warn')?.remove();
  { const _pf = document.getElementById('f-platform'); if (_pf) delete _pf.dataset.touched; }
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
    document.querySelectorAll('#ac-drop, #d-ac-drop').forEach(d => d.style.display = 'none');
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
  const text = `Mon portefeuille Kapitaro 📊\n\nValeur : ${fmtK(tv)}\nPlus-value : ${tpnl>=0?'+':''}${fmtK(tpnl)} (${tpnl>=0?'+':''}${tpct.toFixed(1).replace(".", ",")} %)\n\nPositions : ${positions.map(p=>p.name).join(', ')}\n\n🔗 kapitaro.fr`;
  if (navigator.share) {
    navigator.share({ title: 'Mon portefeuille Kapitaro', text, url: 'https://kapitaro.fr' })
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

// Petite fenêtre d'explication réutilisable (ex. boutons « ⓘ Méthodologie »)
function showInfoPopup(title, bodyHtml) {
  document.getElementById('info-popup')?.remove();
  const el = document.createElement('div');
  el.id = 'info-popup';
  el.style.cssText = 'position:fixed;inset:0;z-index:10005;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,0.4)';
  el.onclick = e => { if (e.target === el) el.remove(); };
  el.innerHTML = `
    <div style="max-width:420px;width:100%;max-height:80vh;overflow:auto;background:var(--color-surface,#fff);color:var(--color-text,#1c1c1e);border:1px solid var(--color-border,#e4e4e7);border-radius:18px;padding:20px 20px 16px;box-shadow:0 24px 60px rgba(0,0,0,0.35)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px">
        <div style="font-size:16px;font-weight:800;letter-spacing:-0.02em">${title}</div>
        <button onclick="document.getElementById('info-popup')?.remove()" style="background:none;border:none;font-size:20px;line-height:1;color:var(--color-text-secondary,#71717a);cursor:pointer;padding:0;flex-shrink:0">×</button>
      </div>
      <div style="font-size:13px;line-height:1.6;color:var(--color-text-secondary,#71717a)">${bodyHtml}</div>
    </div>`;
  document.body.appendChild(el);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('info-popup')?.remove(); });

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// Texte inséré comme argument '...' d'un onclick="..." : protège apostrophes (L'Oréal), guillemets et antislash
function jsArg(s) { return _escHtml(String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")); }

// Boutons « Analyser » / « Ajouter » d'une carte de recommandation (le clic ne se propage pas à la carte)
function recoActionsHTML(ticker, name, amount, type, dark) {
  const a = `'${jsArg(ticker)}','${jsArg(name)}',${Number(amount) || 0}`;
  const base = 'padding:6px 11px;border-radius:8px;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap';
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:9px">
    <button type="button" onclick="event.stopPropagation();openActionFromObjectif(${a})" style="${base};background:${dark ? 'rgba(255,255,255,0.08)' : '#f4f4f5'};border:1px solid ${dark ? 'rgba(255,255,255,0.14)' : '#e4e4e7'};color:${dark ? 'rgba(255,255,255,0.85)' : '#3f3f46'}">🔍 Analyser</button>
    <button type="button" class="kp-line-add" onclick="event.stopPropagation();addToPortfolioFromDecision('${jsArg(ticker)}',${Number(amount) || 0},'${jsArg(name)}','${jsArg(type || '')}')" style="${base};background:#16a34a;border:1px solid #16a34a;color:#fff">➕ Ajouter au portefeuille</button>
  </div>`;
}

// ===== ANALYTICS (table Supabase "events") =====
// Base légère pour un futur tableau de bord (conversion, rétention, usage). Silencieux en cas d'échec :
// ne doit jamais bloquer ni ralentir une action réelle de l'utilisateur.
// Notification locale : sur Android et dans l'app installée, le navigateur interdit new Notification() ;
// on passe par le service worker, avec repli silencieux si rien n'est possible.
function showLocalNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  // Appli ouverte à l'écran : la liste de la cloche suffit (sinon chaque ouverture renvoyait les mêmes notifications au téléphone)
  if (!document.hidden) return;
  // Jamais deux fois la même notification dans la journée
  try {
    const day = new Date().toISOString().slice(0, 10), key = 'kp_local_notif_' + day;
    const sent = JSON.parse(localStorage.getItem(key) || '[]'), sig = title + '|' + body;
    if (sent.includes(sig)) return;
    sent.push(sig); localStorage.setItem(key, JSON.stringify(sent.slice(-30)));
    Object.keys(localStorage).filter(k => k.startsWith('kp_local_notif_') && k !== key).forEach(k => localStorage.removeItem(k));
  } catch (e) {}
  const opts = { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' };
  const reg = navigator.serviceWorker && navigator.serviceWorker.getRegistration ? navigator.serviceWorker.getRegistration() : Promise.resolve(null);
  reg.then(r => { if (r && r.showNotification) return r.showNotification(title, opts); new Notification(title, opts); })
    .catch(() => { try { new Notification(title, opts); } catch (e) {} });
}
function trackEvent(type, meta) {
  if (isDemo || !currentUser) return Promise.resolve();
  try {
    return sb.from('events').insert({ user_id: currentUser.id, type, meta: meta || null }).then(({ error }) => {
      if (error) console.warn('[trackEvent]', type, error.message);
    }, () => {});
  } catch (e) { console.warn('[trackEvent]', type, e.message); return Promise.resolve(); }
}

// Temps passé dans l'app : un signal toutes les 2 minutes tant que l'app est à l'écran (onglet visible).
// Temps estimé côté tableau de bord = nombre de signaux × 2 min.
const HEARTBEAT_MIN = 2;
let _heartbeatTimer = null;
function startHeartbeat() {
  if (_heartbeatTimer) return;
  _heartbeatTimer = setInterval(() => {
    if (document.visibilityState === 'visible') trackEvent('heartbeat');
  }, HEARTBEAT_MIN * 60 * 1000);
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
  try {
    const toolLvl = (level === 'debutant' || level === 'curieux') ? 1 : (level === 'initie') ? 2 : 3;
    localStorage.setItem('kp_level', String(toolLvl));
    try { localStorage.setItem(kpAskedKey(), '1'); } catch {}
    if (typeof currentUser !== 'undefined' && currentUser && typeof isDemo !== 'undefined' && !isDemo) { currentUser.user_metadata = Object.assign({}, currentUser.user_metadata || {}, { level: toolLvl }); if (typeof sb !== 'undefined') sb.auth.updateUser({ data: { level: toolLvl } }).catch(() => {}); }
    if (typeof applyUserLevel === 'function') applyUserLevel();
  } catch (e) {}
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

  // (le profil est désormais choisi via le curseur actions/ETF à l'étape 3)
}

// Le drapeau "questionnaire fait" est propre à chaque compte : avant, une clé unique par
// navigateur faisait sauter le questionnaire à tout nouveau compte créé au même endroit.
function obKey() { return OB_KEY + (currentUser?.id ? '_' + currentUser.id : ''); }

function showOnboarding(force) {
  if (document.getElementById('onboarding-modal') && document.getElementById('onboarding-modal').style.display === 'flex') return;
  if (!force) {
    if (localStorage.getItem(obKey())) return;
    // Compte existant qui a déjà des positions (antérieur à ce changement) : pas de questionnaire.
    // On ne regarde PAS les objectifs : la base crée un objectif par défaut à l'inscription.
    if (!isDemo && positions.length > 0) return;
  }
  obGoals = { long: false, court: false, retraite: false, projet: false };
  obNext(1);
  const skipBtn = document.getElementById('ob-btn-skip');
  if (skipBtn) skipBtn.textContent = isDemo ? 'Démo' : 'Passer';
  document.getElementById('onboarding-modal').style.display = 'flex';
  try { const ms = document.getElementById('ob-main-platform'); if (ms) ms.innerHTML = kpMainPlatformOptionsHTML(kpMainPlatform()); } catch (e) {}
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
    // Défaut du curseur selon le profil suggéré par le parcours
    renderAllocSlider('ob-alloc-container', 'ob', obDefaultStockPct(), false);
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

// Part d'actions proposée par défaut selon le niveau choisi à l'étape 1
function obDefaultStockPct() {
  const p = OB_PROFILES[obProfileLevel];
  // Débutant ('faible') : 0 % d'actions, comme promis à l'étape 1 (« 100% ETF monde »)
  return p && p.defaultRisk === 'eleve' ? 60 : p && p.defaultRisk === 'faible' ? 0 : 30;
}

// Valeur dans 10 ans, capitalisation mensuelle (même formule que la page Objectif)
function obProjection10y(capital, monthly, ratePct, years) {
  const r = ratePct / 100 / 12, n = Math.round((years || 10) * 12);
  return Math.round(capital * Math.pow(1 + r, n) + (r > 0 ? monthly * ((Math.pow(1 + r, n) - 1) / r) : monthly * n));
}

function obUpdateBudgetPreview() {
  const capital = parseFloat(document.getElementById('ob-bankroll')?.value) || 0;
  const monthly = parseFloat(document.getElementById('ob-monthly')?.value)  || 0;
  const target  = parseFloat(document.getElementById('ob-target')?.value)   || 0;
  const preview  = document.getElementById('ob-budget-preview');
  const previewT = document.getElementById('ob-preview-text');
  if (!preview || !previewT) return;
  if (capital > 0 || monthly > 0) {
    // Rendement du profil proposé à l'étape suivante : les chiffres restent les mêmes jusqu'à la page Objectif
    const r = riskFromStockPct(obDefaultStockPct());
    const years = Math.min(60, Math.max(1, parseInt(document.getElementById('ob-years')?.value) || 10));
    const fv = obProjection10y(capital, monthly, r.rate, years);
    const lbl = document.getElementById('ob-projection-label');
    if (lbl) lbl.textContent = `Projection à ${r.rate} %/an (profil ${r.label.toLowerCase()})`;
    preview.style.display = 'block';
    const onTrack = target > 0 && fv >= target;
    let fix = '';
    if (target > 0 && !onTrack) {
      const ny = calcNeededYears(capital, monthly, target, r.rate);
      const rr = r.rate / 100 / 12, nn = years * 12, grow = Math.pow(1 + rr, nn);
      const needM = rr > 0 ? Math.max(0, (target - capital * grow) * rr / (grow - 1)) : Math.max(0, (target - capital) / nn);
      fix = '<div style="font-size:12px;font-weight:600;color:#78350f;margin-top:6px;line-height:1.5">' + (ny ? 'Il faudrait environ <strong>' + ny + ' ans</strong> à ce rythme' : 'Pas atteignable en 60 ans à ce rythme') + ' ou <strong>' + fmtI(Math.round(needM)) + ' €/mois</strong> sur ' + years + ' ans.' + (ny && ny !== years ? ' <button type="button" onclick="obSetYears(' + ny + ')" style="margin-left:4px;background:#f59e0b;color:#fff;border:none;border-radius:8px;padding:3px 9px;font-size:11px;font-weight:800;cursor:pointer">Passer à ' + ny + ' ans</button>' : '') + '</div>';
    }
    previewT.innerHTML = `En ${years} ans : <strong style="color:#1a7f5a">${fmtK(Math.round(fv))}</strong>${target > 0 ? ` · Objectif ${fmtK(target)} : <strong style="color:${onTrack?'#1a7f5a':'#f59e0b'}">${onTrack?'✓ Atteignable en ' + years + ' ans':'⚠ Pas atteint en ' + years + ' ans'}</strong>` : ''}` + fix;
  } else {
    preview.style.display = 'none';
  }
}

function obSetYears(n) {
  const e = document.getElementById('ob-years'); if (e) e.value = n;
  obUpdateBudgetPreview();
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
  const hidden = document.getElementById('ob-risk'); if (hidden) hidden.value = risk;
  if (!document.getElementById('ob-rcheck-faible')) return; // cartes supprimées → no-op
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
  localStorage.setItem(obKey(), '1');
  await obFinishSilent();

  // Ouvre aide décision avec tout pré-rempli
  decisionIntention = 'acheter';
  nav('decision');
  setTimeout(() => {
    setDecisionAsset(ticker, name);
    updateDecisionAmount(Math.max(50, Math.round(amount)));
    selectIntent('acheter');
    // Lance l'analyse automatiquement
    setTimeout(() => analyseDecision(), 200);
  }, 150);
}

async function obFinishSilent() {
  const bankroll = parseFloat(document.getElementById('ob-bankroll')?.value) || 1000;
  const monthly  = parseFloat(document.getElementById('ob-monthly')?.value)  || 200;
  const alloc    = readAllocSlider('ob');
  const risk     = alloc.risk;
  const horizon  = document.getElementById('ob-horizon')?.value || 'long';
  objStockPct = alloc.stockPct;
  objGlide = alloc.glide;
  objRisk = alloc.risk;
  objChartRate = alloc.rate;
  profile.bankroll = bankroll;
  profile.risk     = kpTolerance(risk);
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
  // Lit la répartition depuis le curseur actions/ETF (source de vérité)
  const alloc = (typeof readAllocSlider==='function') ? readAllocSlider('ob') : { risk:'equilibre', stockPct:30, glide:false, rate:7 };
  const risk = alloc.risk;
  objStockPct = alloc.stockPct; objGlide = alloc.glide; objRisk = alloc.risk; objChartRate = alloc.rate;
  const planEl   = document.getElementById('ob-plan-content');

  const budgetCourt = Math.round(bankroll * 0.3);
  const budgetLong  = bankroll - budgetCourt;

  // Répartition = celle du curseur : un seul ETF Monde comme socle (deux ETF Monde feraient doublon) + la part d'actions choisie
  const etfAlloc = [`${alloc.etfPct ?? (100 - alloc.stockPct)}% ETF Monde (IWDA) — ton socle diversifié`];
  if (alloc.stockPct > 0) etfAlloc.push(`${alloc.stockPct}% actions — la sélection est dans ton plan`);

  const both = obGoals.long && obGoals.court;

  let html = '';

  // PLAN LONG TERME — uniquement si l'utilisateur a coché "long terme"
  if (obGoals.long) {
    const capitalLong = both ? budgetLong : bankroll;
    const monthlyLong = both ? Math.round(monthly * 0.7) : monthly;
    // Même calcul que la page Objectif (rendement du profil choisi, capitalisation mensuelle) pour afficher le même chiffre
    const proj = obProjection10y(capitalLong, monthlyLong, alloc.rate);
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
          <div><div style="font-size:11px;color:#8e8e93;font-weight:700">DANS 10 ANS</div><div style="font-size:13px;font-weight:800;color:#1a7f5a">~${fmtK(proj)}</div><div style="font-size:10px;color:#8e8e93">à ${alloc.rate} %/an</div></div>
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
      <div style="font-size:12px;font-weight:800;color:#92400e;margin-bottom:4px">💼 Idées complémentaires — moyen terme (12 mois+)</div>
      <div style="font-size:12px;color:#92400e;margin-bottom:12px">Capital : ${fmtK(capitalCourt)} · ${monthlyTrade}€/mois · Objectif +5 à 15%/an</div>
      <div id="ob-action-recs" style="text-align:center;padding:16px;color:#8e8e93">
        <div style="font-size:20px;margin-bottom:6px">🧠</div>
        <div style="font-size:13px">Analyse du marché en cours...</div>
      </div>
    </div>`;
  }

  html += `<div id="ob-ai-advice" style="text-align:center;padding:12px;color:#8e8e93;font-size:13px">💬 Analyse IA en cours...</div>`;
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
    const advice = await callClaude(prompt, undefined, undefined, undefined, OBJ_AI);
    const el = document.getElementById('ob-ai-advice');
    if (el) el.innerHTML = isAIQuotaMessage(advice) ? aiFailureHTML(advice) : `<div style="background:#f9f9f9;border-radius:12px;padding:12px 14px;font-size:13px;color:#3c3c43;line-height:1.6">💬 ${advice}</div>`;
  } catch(e) {}
}

async function obFinish(action) {
  localStorage.setItem(obKey(), '1');
  try { localStorage.removeItem('iq_ob_goals'); } catch {}
  document.getElementById('onboarding-modal').style.display = 'none';

  // Si "Voir un exemple" → pas de sauvegarde, juste charger la démo
  if (action === 'demo') {
    await loadDemo();
    return;
  }

  // "Passer" : vrai compte, portefeuille vierge, aucune donnée fictive injectée
  if (action === 'skip') {
    nav('home');
    return;
  }

  const bankroll = parseFloat(document.getElementById('ob-bankroll')?.value) || 0;
  const monthly  = parseFloat(document.getElementById('ob-monthly')?.value)  || 0;
  const target   = parseFloat(document.getElementById('ob-target')?.value)   || 50000;
  const years    = Math.min(60, Math.max(1, parseInt(document.getElementById('ob-years')?.value) || 10));
  const horizon  = document.getElementById('ob-horizon')?.value || 'long';

  // Lit la répartition depuis le curseur actions/ETF et la FIGE en constantes locales
  // (les globales peuvent être écrasées par un rechargement async pendant la modal de remplacement)
  const alloc = (typeof readAllocSlider==='function') ? readAllocSlider('ob') : { risk:'equilibre', stockPct:30, glide:false, rate:7 };
  const risk = alloc.risk;
  const CHOSEN = { stockPct: alloc.stockPct, glide: alloc.glide, risk: alloc.risk, rate: alloc.rate };
  objStockPct  = CHOSEN.stockPct;
  objGlide     = CHOSEN.glide;
  objRisk      = CHOSEN.risk;
  objChartRate = CHOSEN.rate;

  // Ne sauvegarde que si les champs ont été remplis
  if (bankroll === 0 && monthly === 0) {
    nav(action);
    return;
  }

  profile.bankroll = bankroll;
  profile.risk     = kpTolerance(risk);
  profile.horizon  = horizon === 'mixte' ? 'moyen' : horizon;

  if (document.getElementById('s-bankroll')) document.getElementById('s-bankroll').value = bankroll;
  if (document.getElementById('s-risk'))     document.getElementById('s-risk').value     = risk;
  if (document.getElementById('s-horizon'))  document.getElementById('s-horizon').value  = horizon === 'mixte' ? 'moyen' : horizon;

  // Applique les variables objectif
  objChartCapital = bankroll;
  objChartMonthly = monthly;
  objChartTarget  = target;
  objChartYears   = years;
  // objRisk, objChartRate, objStockPct, objGlide déjà définis par le curseur (readAllocSlider)

  await saveProfile();

  // Fonction de création du nouvel objectif (insert, jamais écrasement)
  const createNew = async () => {
    // Ré-applique le choix figé (immunisé contre tout écrasement async pendant la modal)
    objStockPct = CHOSEN.stockPct; objGlide = CHOSEN.glide; objRisk = CHOSEN.risk; objChartRate = CHOSEN.rate;
    if (!isDemo && currentUser) {
      try {
        const { error } = await sb.from('objectives').insert({
          user_id: currentUser.id, capital: bankroll, monthly: monthly,
          target: target, years: years, rate: CHOSEN.rate, risk: CHOSEN.risk,
          stock_pct: CHOSEN.stockPct, glide: CHOSEN.glide
        });
        if (error) {
          console.error('[obFinish] insert error:', error.message);
          showToast('⚠️ Sauvegarde partielle : ' + (error.message||'').slice(0,50));
        }
        await loadObjective();
        // Activer le tout dernier objectif créé
        if (allObjectives.length) {
          const last = allObjectives[allObjectives.length-1];
          activeObjId = last.id;
          // Restaure la répartition CHOISIE (prioritaire sur la base) + sauvegarde locale
          last.stock_pct = CHOSEN.stockPct; last.glide = CHOSEN.glide; last.risk = CHOSEN.risk; last.rate = CHOSEN.rate;
          saveAllocLocal(last.id, CHOSEN.stockPct, CHOSEN.glide);
          applyObjData(last);
        }
      } catch(e) {}
    } else {
      // Mode démo : ajout local
      const id = 'local_' + Date.now();
      allObjectives.push({ id, label:'Objectif ' + (allObjectives.length+1), capital:bankroll, monthly, target, years, rate:CHOSEN.rate, risk:CHOSEN.risk, stock_pct:CHOSEN.stockPct, glide:CHOSEN.glide, color:OBJ_COLORS[allObjectives.length % OBJ_COLORS.length] });
      activeObjId = id;
      saveAllocLocal(id, CHOSEN.stockPct, CHOSEN.glide);
    }
    nav('objectif');
    setTimeout(() => {
      const tv = positions.reduce((a,p)=>a+p.qty*p.price,0);
      try { renderObjLegend(tv); } catch(e) {}
      if (typeof renderMultiObjChart==='function') renderMultiObjChart();
    }, 100);
    try { if (typeof tabSeenSet === 'function' && !tabSeenSet().has('objectif')) { tabMarkSeen('objectif'); updateNavDots(); setTimeout(() => showTabHint('objectif'), 800); } } catch (e) {}
  };

  // Si déjà 3 objectifs → modal de remplacement, sinon création directe
  if (allObjectives.length >= 3) {
    nav('objectif');
    setTimeout(() => showReplaceObjectiveModal(
      { capital:bankroll, monthly, target, years, rate:objChartRate, risk:objRisk, label:'Nouvel objectif' },
      createNew
    ), 200);
    return;
  }
  // localStorage fallback (avant création pour cohérence)
  try { localStorage.setItem('iq_validated_objective', JSON.stringify({
    capital: bankroll, monthly: monthly, target: target,
    years: 10, rate: objChartRate, risk: objRisk,
    validatedAt: new Date().toISOString()
  })); } catch {}

  await createNew();
}


// ===== MARKDOWN FORMATTER =====
function formatMD(text) {
  if (text) text = String(text).replace(/```[a-z]*\n?/g, '').replace(/```/g, ''); // retire les blocs de code résiduels
  if (!text) return '';
  // Le texte vient de l'IA (qui a pu lire des actus, un PDF…) : aucun HTML ne doit s'exécuter, seul le markdown ci-dessous est mis en forme
  text = _escHtml(text);

  // ── Parse les tableaux markdown en HTML ──
  function parseTable(block) {
    const lines = block.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return null;
    const isSep = l => /^[\|\s\-:]+$/.test(l);
    // Cherche la ligne séparateur
    const sepIdx = lines.findIndex(isSep);
    if (sepIdx < 1) return null;
    const parseRow = l => l.split('|').map(c => c.trim()).filter((c,i,a) => i > 0 && i < a.length-1);
    const headers = parseRow(lines[sepIdx - 1]);
    const rows    = lines.slice(sepIdx + 1).filter(l => l.includes('|')).map(parseRow);
    if (!headers.length) return null;

    const thHtml = headers.map(h =>
      `<th style="padding:8px 10px;font-size:11px;font-weight:700;color:#8e8e93;text-transform:uppercase;letter-spacing:0.4px;text-align:left;border-bottom:2px solid #f0f0f0;white-space:nowrap">${h}</th>`
    ).join('');

    const trHtml = rows.map((row, ri) =>
      `<tr style="background:${ri%2===0?'#fff':'#fafafa'}">` +
      row.map((cell, ci) => {
        // Mise en valeur : ticker (tout caps court), montant (€), pourcentage
        const isTicker  = /^[A-Z]{2,6}(\.[A-Z]{1,3})?$/.test(cell.replace(/\*\*/g,''));
        const isAmount  = /\d+[€%]|\d+ €/.test(cell);
        const bold      = cell.includes('**');
        const clean     = cell.replace(/\*\*/g,'').replace(/\*/g,'');
        let style = `padding:8px 10px;font-size:13px;border-bottom:1px solid #f5f5f5;`;
        if (ci === 0 && isTicker) style += 'font-weight:800;color:#1c1c1e;font-family:monospace;font-size:12px;';
        else if (bold || isAmount) style += 'font-weight:800;color:#1a7f5a;';
        else style += 'color:#3c3c43;font-weight:500;';
        return `<td style="${style}">${clean}</td>`;
      }).join('') +
      `</tr>`
    ).join('');

    return `<div style="overflow-x:auto;margin:10px 0 14px;border-radius:12px;border:1.5px solid #f0f0f0;overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#f9f9f9">${thHtml}</tr></thead>
        <tbody>${trHtml}</tbody>
      </table>
    </div>`;
  }

  // Découpe le texte en blocs, repère les blocs tableau
  const lines = text.split('\n');
  const result = [];
  let tableBuffer = [];
  let inTable = false;

  for (const line of lines) {
    const isTableLine = /^\s*\|/.test(line) || /^[\|\s\-:]+$/.test(line);
    if (isTableLine) {
      inTable = true;
      tableBuffer.push(line);
    } else {
      if (inTable && tableBuffer.length) {
        const tableHtml = parseTable(tableBuffer.join('\n'));
        result.push(tableHtml || tableBuffer.join('<br>'));
        tableBuffer = [];
        inTable = false;
      }
      result.push(line);
    }
  }
  if (tableBuffer.length) {
    const tableHtml = parseTable(tableBuffer.join('\n'));
    result.push(tableHtml || tableBuffer.join('<br>'));
  }

  return result.join('\n')
    .replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #f0f0f0;margin:12px 0">')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#1c1c1e;font-weight:800">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^(?:&gt;){1,2}\s*(.+)$/gm, '<div style="background:#f0faf6;border-left:3px solid #1a7f5a;border-radius:0 8px 8px 0;padding:8px 12px;margin:8px 0;font-size:13px;color:#065f46;font-weight:600">$1</div>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<div style="font-size:15px;font-weight:800;color:#1c1c1e;margin:18px 0 8px;letter-spacing:-0.2px;display:flex;align-items:center;gap:8px">$1</div>')
    .replace(/^[-•]\s+(.+)$/gm, '<div style="display:flex;gap:8px;margin:5px 0;font-size:13px"><span style="color:#1a7f5a;font-weight:800;flex-shrink:0;margin-top:1px">→</span><span style="color:#3c3c43">$1</span></div>')
    .replace(/^(\d+)\.\s+(.+)$/gm, '<div style="display:flex;gap:10px;margin:6px 0;align-items:flex-start"><span style="background:#1c1c1e;color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;margin-top:1px">$1</span><span style="font-size:13px;color:#3c3c43">$2</span></div>')
    .replace(/\n\n/g, '<div style="height:8px"></div>')
    .replace(/\n/g, '<br>');
}

