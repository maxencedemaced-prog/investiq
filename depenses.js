// depenses.js — « Mes dépenses » : audit des abonnements et dépenses à partir d'un relevé (CSV) ou d'une saisie rapide.
// Le fichier est lu et analysé DANS LE NAVIGATEUR : il n'est jamais envoyé ni enregistré. Seul le résultat (libellés
// regroupés + montants mensuels) est mémorisé sur l'appareil. L'IA (facultative) ne reçoit que des libellés de
// commerçants inconnus, sans aucun montant.
// Dépend d'app.js : currentUser, isDemo, callClaude, callClaudeFailed, HAIKU_MODEL, showToast, fmtI, _escHtml, nav.

// ── Catégories : tier = essentiel (vital) · confort (optimisable) · nonvital · excl (hors analyse) ──
const DEP_CATS = {
  logement:     { label: 'Logement',                 tier: 'essentiel', ic: '🏠' },
  energie:      { label: 'Énergie & eau',            tier: 'essentiel', ic: '💡' },
  assurance:    { label: 'Assurances & mutuelle',    tier: 'essentiel', ic: '🛡️' },
  telecom:      { label: 'Téléphone & internet',     tier: 'essentiel', ic: '📱' },
  transport:    { label: 'Transport',                tier: 'essentiel', ic: '🚆' },
  alimentation: { label: 'Courses alimentaires',     tier: 'essentiel', ic: '🛒' },
  sante:        { label: 'Santé',                    tier: 'essentiel', ic: '⚕️' },
  impots:       { label: 'Impôts & taxes',           tier: 'essentiel', ic: '🏛️' },
  sport:        { label: 'Salle de sport',           tier: 'essentiel', ic: '🏋️' },
  streaming:    { label: 'Streaming vidéo',          tier: 'streaming', ic: '🎬' },
  musique:      { label: 'Musique',                  tier: 'confort',   ic: '🎧' },
  apps:         { label: 'Applications & cloud',     tier: 'confort',   ic: '☁️' },
  presse:       { label: 'Presse & médias',          tier: 'confort',   ic: '📰' },
  restauration: { label: 'Restaurants & cafés',      tier: 'confort',   ic: '🍽️' },
  livraison:    { label: 'Livraison de repas',       tier: 'nonvital',  ic: '🛵' },
  jeux_video:   { label: 'Jeux vidéo',               tier: 'nonvital',  ic: '🎮' },
  jeux_argent:  { label: "Jeux d'argent & paris",    tier: 'nonvital',  ic: '🎲' },
  shopping:     { label: 'Achats en ligne & shopping', tier: 'nonvital', ic: '🛍️' },
  tabac:        { label: 'Tabac',                    tier: 'nonvital',  ic: '🚬' },
  credit:       { label: 'Crédits & prêts',          tier: 'essentiel', ic: '🏦' },
  frais:        { label: 'Frais bancaires',          tier: 'confort',   ic: '🏦' },
  voyage:       { label: 'Voyages & hôtels',         tier: 'confort',   ic: '✈️' },
  loisirs:      { label: 'Sorties & loisirs',        tier: 'confort',   ic: '🎟️' },
  autre:        { label: 'Autres dépenses',          tier: 'autre',     ic: '•' },
  epargne:      { label: 'Épargne (virements)',      tier: 'excl',      ic: '🏦' },
  virement:     { label: 'Virements & retraits',     tier: 'excl',      ic: '↔️' },
};
const DEP_SUBSCRIPTION_CATS = ['streaming', 'musique', 'apps', 'presse', 'sport', 'jeux_video', 'telecom', 'frais'];

// Règles de reconnaissance (le premier motif qui correspond gagne — du plus précis au plus général)
const DEP_RULES = [
  [/LOYER|FONCIA|NEXITY|CREDIT IMMO|PRET IMMO|SYNDIC|COPROPRIETE|COPRO\b/, 'logement'],
  [/PRET PERSONNEL|PRET ETUDIANT|PRET AUTO|ECHEANCE PRET|REMBOURSEMENT (DE )?PRET|CETELEM|COFIDIS|FRANFINANCE|SOFINCO|CREDIT CONSO|CREDIT AUTO|\bPRET\b/, 'credit'],
  [/LIVRET|EPARGNE|\bPEA\b|\bCTO\b|ASSURANCE VIE|TRADE REPUBLIC|BOURSORAMA INVEST|DEGIRO|SCALABLE|BITPANDA|BINANCE|COINBASE|KRAKEN/, 'epargne'],
  [/CASINO (SHOP|PROXI|VIVAL|SPAR|SUPERMARCHE)|GEANT CASINO|CARREFOUR|LECLERC|AUCHAN|LIDL|ALDI|INTERMARCHE|MONOPRIX|FRANPRIX|PICARD|BIOCOOP|NATURALIA|SUPER U|HYPER U|U EXPRESS|COURSES U|DIA FRANCE|COCCIMARKET|\bMARCHE\b/, 'alimentation'],
  [/UBER[ *.]*EATS|DELIVEROO|JUST[ *]*EAT|DOMINO/, 'livraison'],
  [/FDJ|FRANCAISE DES JEUX|PARIONS|WINAMAX|BETCLIC|UNIBET|\bPMU\b|ZEBET|POKERSTARS|PARTYPOKER|BWIN|BETWAY|VBET|GENYBET|BETSSON|NETBET|TIERCE|EUROMILLIONS|\bLOTO\b|BARRIERE|PARTOUCHE|CASINO DE|CASINO JEUX/, 'jeux_argent'],
  [/AMAZON PRIME|PRIME VIDEO|AMZN PRIME|NETFLIX|DISNEY|CANAL ?\+|CANAL PLUS|MYCANAL|APPLE TV|PARAMOUNT|\bOCS\b|CRUNCHYROLL|HBO|\bMAX\b|SALTO|YOUTUBE PREMIUM|GOOGLE YOUTUBE|WAKANIM|ADN ANIME|MOLOTOV|RAKUTEN TV/, 'streaming'],
  [/SPOTIFY|DEEZER|APPLE MUSIC|TIDAL|YOUTUBE MUSIC|AMAZON MUSIC|QOBUZ|NAPSTER/, 'musique'],
  [/\bSTEAM\b|PLAYSTATION|\bPSN\b|SONY INTERACTIVE|XBOX|NINTENDO|EPIC GAMES|BLIZZARD|RIOT GAMES|UBISOFT|\bEA \*|GAME PASS|TWITCH|SUPERCELL|KING\.COM/, 'jeux_video'],
  [/ICLOUD|GOOGLE ONE|GOOGLE STORAGE|DROPBOX|MICROSOFT|OFFICE 365|ADOBE|OPENAI|CHATGPT|ANTHROPIC|NOTION|CANVA|NORDVPN|EXPRESSVPN|PROTON|1PASSWORD|LASTPASS|GITHUB|APPLE\.COM\/BILL|GOOGLE \*/, 'apps'],
  [/LE MONDE|LE FIGARO|MEDIAPART|LIBERATION|LES ECHOS|L EQUIPE|OUEST FRANCE|COURRIER INTERNATIONAL|PRESSE|ABONNEMENT MAGAZINE|KIOSQUE|CAIRN|BLINKIST/, 'presse'],
  [/BASIC[- ]?FIT|FITNESS|NEONESS|KEEP COOL|ORANGE BLEUE|CMG SPORTS|ON AIR|MOVIDA|SALLE DE SPORT|GYM|CROSSFIT|DECATHLON PASS/, 'sport'],
  [/YOU ?PRICE|REGLO|SYMPA|AUCHAN TELECOM|CIC MOBILE|CREDIT MUTUEL MOBILE|BANQUE POSTALE MOBILE|JOE MOBILE|CORIOLIS|ORANGE|\bSFR\b|BOUYGUES|BOUYGTEL|FREE MOBILE|\bFREE\b|FREEBOX|SOSH|RED BY SFR|B&YOU|B AND YOU|LA POSTE MOBILE|PRIXTEL|NRJ MOBILE|COUCOU|LEBARA|LYCAMOBILE|CDISCOUNT MOBILE/, 'telecom'],
  [/EDF|ENGIE|TOTALENERGIES|TOTAL ENERGIES|\bENI\b|VATTENFALL|OHM ENERGIE|MINT ENERGIE|VEOLIA|SUEZ|EAU DE|SAUR|ILEK|PLANETE OUI|ENERCOOP/, 'energie'],
  [/MAIF|MACIF|\bMMA\b|\bAXA\b|GROUPAMA|MATMUT|ALLIANZ|GENERALI|DIRECT ASSURANCE|LEMONADE|ASSURANCE|MUTUELLE|\bALAN\b|HARMONIE|MGEN|MAAF|GMF|\bAPRIL\b|SWISS ?LIFE|HISCOX|ASSUR/, 'assurance'],
  [/NAVIGO|RATP|SNCF|OUIGO|TRAINLINE|BLABLACAR|AUTOROUTE|VINCI AUTOROUTE|SANEF|APRR|TOTAL ACCESS|\bESSO\b|\bSHELL\b|\bBP\b|STATION|CARBURANT|PEAGE|VELIB|\bLIME\b|\bDOTT\b|\bTIER\b|\bBOLT\b|UBER|\bG7\b|\bTAXI|PARKING|INDIGO|EASYPARK|FLOWBIRD/, 'transport'],
  [/PHARMACIE|DOCTOLIB|MEDECIN|DENTISTE|OPTIQUE|OPTICIEN|LABORATOIRE|KINE|HOPITAL|CLINIQUE|AMELI|CPAM|LUNETTES/, 'sante'],
  [/DGFIP|IMPOT|TRESOR PUBLIC|DIRECTION GENERALE DES FINANCES|TAXE|AMENDE|ANTAI/, 'impots'],
  [/MCDO|MC DONALD|MCDONALD|BURGER KING|\bKFC\b|\bQUICK\b|STARBUCKS|SUBWAY|\bPAUL\b|BRIOCHE DOREE|FIVE GUYS|O TACOS|RESTAURANT|RESTO|BRASSERIE|CAFE |BOULANGERIE|PIZZ|SUSHI|KEBAB|BAR |\bPUB\b|TAVERNE|BISTRO|TRATTORIA|CREPERIE|GRILL|SNACK|BURGER|TACOS|\bWOK\b|RAMEN|THAI|BUBBLE|GLACIER|PATISSERIE|TRAITEUR|CANTINE|CROUS|SERVICEDISTR|DISTRIBUTEUR AUTO|VENDING|FOODTRUCK|COMPTOIR|AUBERGE|ROTISSERIE|COFFEE|SALON DE THE|LOUNGE|CABARET/, 'restauration'],
  [/AIRBNB|BOOKING|RYANAIR|EASYJET|AIR FRANCE|\bHOTEL\b|EXPEDIA|VOLOTEA|TRANSAVIA|LUFTHANSA|VUELING|CAMPING|GITES? DE FRANCE|ABRITEL|HOSTEL/, 'voyage'],
  [/CINEMA|\bUGC\b|PATHE|GAUMONT|\bMK2\b|BOWLING|LASER GAME|THEATRE|CONCERT|TICKETMASTER|BILLETTERIE|KARAOKE|ESCAPE GAME|MUSEE|PARC (ASTERIX|DISNEY)|FUTUROSCOPE|DISCOTHEQUE|NIGHT CLUB|BILLARD/, 'loisirs'],
  [/AMAZON|AMZN|ZALANDO|SHEIN|TEMU|ALIEXPRESS|VINTED|CDISCOUNT|FNAC|DARTY|BOULANGER|ASOS|H ?& ?M\b|ZARA|KIABI|IKEA|LEROY MERLIN|CASTORAMA|WISH|VEEPEE|BACK ?MARKET|EBAY/, 'shopping'],
  [/TABAC|BURALISTE|CIGARETTE|VAPE|E-CIG/, 'tabac'],
  [/COTISATION MENSUELLE|COTISATION CARTE|COTIS CARTE|FRAIS (DE )?(TENUE|COMPTE|BANC)|AGIOS|COMMISSION/, 'frais'],
  [/^(VIR|VIREMENT)\b|RETRAIT|\bDAB\b|CHEQUE|\bCHQ\b|REMISE/, 'virement'],
];

// Abonnements courants pour la saisie rapide (prix indicatifs, à corriger par l'utilisateur)
const DEP_PRESETS = [
  { key: 'netflix',  label: 'Netflix',                 cat: 'streaming',   price: 13.49 },
  { key: 'disney',   label: 'Disney+',                 cat: 'streaming',   price: 9.99 },
  { key: 'prime',    label: 'Amazon Prime / Prime Video', cat: 'streaming', price: 6.99 },
  { key: 'canal',    label: 'Canal+ / OCS / autre TV', cat: 'streaming',   price: 20 },
  { key: 'spotify',  label: 'Spotify / Deezer / Apple Music', cat: 'musique', price: 11.99 },
  { key: 'youtube',  label: 'YouTube Premium',         cat: 'streaming',   price: 12.99 },
  { key: 'sport',    label: 'Salle de sport',          cat: 'sport',       price: 30 },
  { key: 'gaming',   label: 'Abonnement jeux (Game Pass, PS Plus…)', cat: 'jeux_video', price: 12 },
  { key: 'cloud',    label: 'Cloud / applications (iCloud, ChatGPT…)', cat: 'apps', price: 5 },
  { key: 'presse',   label: 'Presse / médias en ligne', cat: 'presse',     price: 10 },
  { key: 'delivery', label: 'Livraison de repas (Uber Eats…)', cat: 'livraison', price: 40 },
  { key: 'paris',    label: "Jeux d'argent / paris",   cat: 'jeux_argent', price: 30 },
  { key: 'tabac',    label: 'Tabac',                   cat: 'tabac',       price: 100 },
];

const DEP_INVEST_RATE = 7;      // % par an, hypothèse de simulation
const DEP_INVEST_YEARS = 10;
let depState = null;            // { ts, months, items:[{key,label,cat,monthly,recurring}], off:[keys], source, warn }

// ── Utilitaires ──
const depKeyStore = () => 'iq_depenses_' + (currentUser?.id || 'demo');
function depLoad() {
  try {
    const s = JSON.parse(localStorage.getItem(depKeyStore()) || 'null');
    if (s && Array.isArray(s.items)) {
      if (!s.cut) { s.cut = {}; (s.off || []).forEach(k => { s.cut[k] = 100; }); }   // ancien format « J'arrête »
      return s;
    }
  } catch {}
  return null;
}
function depSave() { try { if (depState) localStorage.setItem(depKeyStore(), JSON.stringify(depState)); } catch {} }
const depFmt = n => (Math.round(n * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
const depFmt0 = n => Math.round(n).toLocaleString('fr-FR') + ' €';
function depProject(monthly, years, ratePct) {
  if (typeof bilanProject === 'function') return bilanProject(0, monthly, ratePct, years);
  const i = Math.pow(1 + ratePct / 100, 1 / 12) - 1, n = years * 12;
  return Math.round(monthly * ((Math.pow(1 + i, n) - 1) / i));
}
const depNormalize = s => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

// Libellé propre + clé de regroupement (« CARTE 12/09 NETFLIX.COM 1234 » → « NETFLIX.COM »)
function depClean(raw) {
  let s = depNormalize(raw);
  s = s.replace(/\b(CARTE|CB|PAIEMENT|PAIEMT|PRLV|PRELEVEMENT|SEPA|VIR|VIREMENT|ACHAT|FACTURE|FACT|REF|MANDAT|ECH|ECHEANCE|TPE|PAYPAL|SUMUP|X\d{3,4})\b/g, ' ')
       .replace(/\b\d{1,2}[\/.]\d{1,2}([\/.]\d{2,4})?\b/g, ' ')
       .replace(/[*#]/g, ' ')
       .replace(/\d{5,}/g, ' ')
       .replace(/\b\d{4}\b/g, ' ')
       .replace(/\s+/g, ' ').trim();
  return s || depNormalize(raw);
}
const depGroupKey = clean => clean.split(' ').slice(0, 3).join(' ');
const depTitle = s => s.toLowerCase().replace(/(^|[\s\-'.])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).slice(0, 34);

// Retourne [catégorie, texte reconnu]. Pour les enseignes/abonnements on regroupe sur le nom de marque
// (« WINAMAX » et « WINAMAX FR » = même poste) ; pour restaurants, transport… chaque commerçant reste distinct.
const DEP_MERGE_CATS = ['streaming', 'musique', 'jeux_video', 'jeux_argent', 'apps', 'presse', 'sport', 'telecom', 'energie', 'assurance', 'livraison', 'alimentation', 'credit', 'logement'];
function depMatch(rawNorm) {
  for (const [re, cat] of DEP_RULES) { const m = rawNorm.match(re); if (m) return [cat, m[0].trim()]; }
  return ['autre', ''];
}
function depCategorize(rawNorm) { return depMatch(rawNorm)[0]; }
// Types d'éléments qu'on arrête ou garde (abonnements) — les autres se diminuent avec un curseur
const DEP_BINARY_CATS = ['streaming', 'musique', 'apps', 'presse', 'jeux_video', 'sport', 'telecom', 'frais'];
const depIsBinary = i => DEP_BINARY_CATS.includes(i.cat) || i.sub === true;

// ── Lecture du CSV ──
function depParseCSV(text) {
  text = text.replace(/^﻿/, '');
  const head = text.split(/\r?\n/).slice(0, 15).join('\n');
  const count = d => (head.match(new RegExp(d === '\t' ? '\t' : '\\' + d, 'g')) || []).length;
  const delim = [';', '\t', ','].map(d => [d, count(d)]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let cur = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === delim) { cur.push(f); f = ''; }
    else if (c === '\n') { cur.push(f); rows.push(cur); cur = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f.length || cur.length) { cur.push(f); rows.push(cur); }
  return rows.filter(r => r.some(x => String(x).trim() !== ''));
}
function depNum(s) {
  if (s == null || s instanceof Date) return NaN;
  if (typeof s === 'number') return s;
  let t = String(s).replace(/[€\s ]/g, '').replace(/[A-Za-z]/g, '');
  if (!t) return NaN;
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); else t = t.replace(/,/g, '');
  return parseFloat(t);
}
function depDate(s) {
  if (s instanceof Date) return isNaN(s) ? null : s;      // cellules de date d'un fichier Excel
  const t = String(s || '').trim();
  let m = t.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return new Date(y, +m[2] - 1, +m[1]); }
  m = t.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return null;
}
function depMapColumns(rows) {
  const n = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const h = rows[i].map(n);
    const di = h.findIndex(x => /^date/.test(x));
    const li = h.findIndex(x => /libelle|label|intitule|description|detail|objet/.test(x));
    const ai = h.findIndex(x => /^(montant|amount|somme)/.test(x));
    const dbi = h.findIndex(x => /debit/.test(x));
    const cri = h.findIndex(x => /credit/.test(x));
    if (di >= 0 && li >= 0 && (ai >= 0 || dbi >= 0)) return { start: i + 1, di, li, ai, dbi, cri };
  }
  // Repli : on devine les colonnes d'après le contenu (fichier sans en-tête reconnu)
  const sample = rows.slice(0, 40), w = Math.max(...sample.map(r => r.length));
  let di = -1, ai = -1, li = -1, bestText = 0;
  for (let c = 0; c < w; c++) {
    const vals = sample.map(r => r[c]).filter(v => v != null && String(v).trim() !== '');
    if (!vals.length) continue;
    if (di < 0 && vals.filter(v => depDate(v)).length >= vals.length * 0.6) { di = c; continue; }
    const nums = vals.filter(v => !isNaN(depNum(v)) && /\d/.test(v)).length;
    if (ai < 0 && nums >= vals.length * 0.6 && c !== di) { ai = c; continue; }
    const avg = vals.reduce((a, v) => a + String(v).length, 0) / vals.length;
    if (avg > bestText && c !== di && c !== ai) { bestText = avg; li = c; }
  }
  if (di >= 0 && ai >= 0 && li >= 0) {
    const first = rows.findIndex(r => depDate(r[di]));
    return { start: Math.max(0, first), di, li, ai, dbi: -1, cri: -1 };
  }
  return null;
}

// rows → { tx:[{date,label,amount}], warn }
function depExtractExpenses(rows) {
  const map = depMapColumns(rows);
  if (!map) return { tx: [], warn: 'Format non reconnu' };
  const tx = []; let hasNeg = false, hasPos = false;
  for (let i = map.start; i < rows.length; i++) {
    const r = rows[i];
    const date = depDate(r[map.di]);
    if (!date) continue;
    const label = String(r[map.li] || '').trim();
    let amount = NaN;
    if (map.dbi >= 0 || map.cri >= 0) {
      const d = depNum(r[map.dbi]), c = depNum(r[map.cri]);
      if (!isNaN(d) && d !== 0) amount = -Math.abs(d);
      else if (!isNaN(c) && c !== 0) amount = Math.abs(c);
    } else amount = depNum(r[map.ai]);
    if (isNaN(amount) || !label) continue;
    if (amount < 0) hasNeg = true; else if (amount > 0) hasPos = true;
    tx.push({ date, label, amount });
  }
  let warn = '';
  let expenses;
  if (hasNeg) expenses = tx.filter(t => t.amount < 0).map(t => ({ ...t, amount: -t.amount }));
  else { expenses = tx.filter(t => t.amount > 0); if (hasPos) warn = "Je n'ai pas pu distinguer les débits des crédits : tout a été compté comme dépense."; }
  return { tx: expenses, warn };
}

// Transactions → postes regroupés avec montant mensuel moyen
function depBuildItems(tx) {
  const times = tx.map(t => t.date.getTime());
  const spanDays = (Math.max(...times) - Math.min(...times)) / 86400000 + 1;
  const months = Math.max(1, Math.round(spanDays / 30.4));
  const groups = new Map(), txs = [];
  tx.forEach(t => {
    const raw = depNormalize(t.label);
    const clean = depClean(t.label);
    const [cat, token] = depMatch(raw);
    // enseigne connue → clé = nom de marque ; sinon les 3 premiers mots du libellé
    const key = (DEP_MERGE_CATS.includes(cat) && token.length >= 3) ? token : depGroupKey(clean);
    let g = groups.get(key);
    if (!g) { g = { key, label: depTitle(depGroupKey(clean)), cat, total: 0, count: 0, first: t.date.getTime(), last: t.date.getTime(), amounts: [] }; groups.set(key, g); }
    g.total += t.amount; g.count++; g.amounts.push(t.amount);
    g.first = Math.min(g.first, t.date.getTime()); g.last = Math.max(g.last, t.date.getTime());
    const dd = t.date;
    txs.push({ d: `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`, l: String(t.label).replace(/\s+/g, ' ').slice(0, 90), a: Math.round(t.amount * 100) / 100, k: key });
  });
  return { months, txs, items: [...groups.values()].map(g => {
    const avg = g.total / g.count;
    const stable = g.amounts.every(a => Math.abs(a - avg) <= avg * 0.12);
    const recurring = g.count >= 2 && (g.last - g.first) / 86400000 >= 25 && stable;
    return { key: g.key, label: g.label, cat: g.cat, monthly: Math.round(g.total / months * 100) / 100, recurring };
  }).filter(i => i.monthly > 0) };
}

// ── Niveaux : essentiel / confort / non vital (1 seul streaming vidéo conservé) ──
function depTiers(items) {
  const streams = items.filter(i => i.cat === 'streaming').sort((a, b) => a.monthly - b.monthly);
  const keepKey = streams.length ? streams[0].key : null;
  const out = new Map();
  items.forEach(i => {
    const c = DEP_CATS[i.cat] || DEP_CATS.autre;
    let tier = c.tier;
    if (tier === 'streaming') tier = i.key === keepKey ? 'essentiel' : 'nonvital';
    out.set(i.key, tier);
  });
  return { tiers: out, keepStreamKey: keepKey, streamCount: streams.length };
}
function depAnalyze() {
  const items = depState.items.filter(i => (DEP_CATS[i.cat] || {}).tier !== 'excl');
  const { tiers, keepStreamKey, streamCount } = depTiers(items);
  const sum = t => items.filter(i => tiers.get(i.key) === t).reduce((a, i) => a + i.monthly, 0);
  const total = items.reduce((a, i) => a + i.monthly, 0);
  const questionable = items.filter(i => ['confort', 'nonvital'].includes(tiers.get(i.key))).sort((a, b) => b.monthly - a.monthly);
  return { items, tiers, keepStreamKey, streamCount, total, essentiel: sum('essentiel'), confort: sum('confort'), nonvital: sum('nonvital'), autre: sum('autre'), questionable };
}

// Charges fixes estimées (pour le Bilan) : abonnements, énergie, assurances, transport… hors logement, courses et loisirs ponctuels
function depChargesFixes() {
  const s = depState || depLoad(); if (!s) return null;
  const keep = ['energie', 'assurance', 'telecom', 'transport', 'sport', 'impots', 'streaming', 'musique', 'apps', 'presse', 'jeux_video'];
  const cut = s.cut || {};
  const tmp = { ...s }; const prev = depState; depState = tmp;
  const a = depAnalyze(); depState = prev;
  const v = a.items.filter(i => keep.includes(i.cat) && (a.tiers.get(i.key) !== 'nonvital' || i.cat === 'jeux_video' || i.cat === 'streaming'))
    .reduce((t, i) => t + i.monthly * (1 - (cut[i.key] || 0) / 100), 0);
  return Math.round(v);
}
function depChargesHint() {
  if (!(depState || depLoad())) return '';
  const v = depChargesFixes();
  if (!v) return '';
  return `<button type="button" onclick="depUseChargesInBilan(${v})" style="background:none;border:none;color:#16a34a;font:inherit;font-size:13px;font-weight:700;text-decoration:underline;cursor:pointer;padding:0;text-align:left;line-height:1.4">📊 Utiliser mes dépenses analysées : ≈ ${v.toLocaleString('fr-FR')} €/mois (abonnements, énergie, assurances…)</button>`;
}
function depUseChargesInBilan(v) {
  const el = document.getElementById('b-charges');
  if (!el) return;
  el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  if (typeof showToast === 'function') showToast('✓ Charges fixes remplies depuis tes dépenses');
}

// ── Entrées utilisateur ──
// ── Lecteurs de fichiers : CSV, Excel, PDF, OFX/QFX, QIF (tout est lu localement) ──
const DEP_LIBS = {
  xlsx:  { src: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', ready: () => window.XLSX },
  pdfjs: { src: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', ready: () => window.pdfjsLib,
           after: () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; } },
};
// Bibliothèques chargées à la demande (uniquement pour lire un PDF ou un Excel)
function depEnsureLib(name) {
  const lib = DEP_LIBS[name];
  if (lib.ready()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = lib.src;
    s.onload = () => { try { lib.after && lib.after(); } catch {} lib.ready() ? resolve() : reject(new Error('lecteur')); };
    s.onerror = () => reject(new Error('Impossible de charger le lecteur (connexion ?)'));
    document.head.appendChild(s);
  });
}
const depIsCredit = label => /SALAIRE|PAIE\b|REMBOURSEMENT|VIREMENT RECU|VIR(EMENT)? (SEPA )?RECU|VIR INST RECU|DEPOT|REMISE CHEQUE|ALLOCATION|\bCAF\b|POLE EMPLOI|FRANCE TRAVAIL|CPAM|PENSION|RETRAITE|INTERETS|AVOIR/.test(depNormalize(label));

// Excel / ODS → lignes (dates lues comme de vraies dates, montants comme nombres)
async function depReadSheet(buf) {
  await depEnsureLib('xlsx');
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  let best = { tx: [], warn: '' };
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' });
    const r = depExtractExpenses(rows.filter(row => row.some(x => String(x).trim() !== '')));
    if (r.tx.length > best.tx.length) best = r;
  }
  return best;
}

// OFX / QFX (export « comptable » de nombreuses banques)
function depReadOFX(text) {
  const tx = [];
  text.split(/<STMTTRN>/i).slice(1).forEach(b => {
    const get = tag => { const m = b.match(new RegExp('<' + tag + '>([^<\\r\\n]*)', 'i')); return m ? m[1].trim() : ''; };
    const dt = get('DTPOSTED').match(/^(\d{4})(\d{2})(\d{2})/);
    const amt = parseFloat(get('TRNAMT').replace(',', '.'));
    const label = [get('NAME'), get('MEMO')].filter(Boolean).join(' ');
    if (dt && !isNaN(amt) && amt < 0 && label) tx.push({ date: new Date(+dt[1], +dt[2] - 1, +dt[3]), label, amount: -amt });
  });
  return { tx, warn: '' };
}
// QIF
function depReadQIF(text) {
  const tx = []; let cur = {};
  text.split(/\r?\n/).forEach(l => {
    const c = l[0], v = l.slice(1).trim();
    if (c === 'D') cur.date = depDate(v.replace(/'/g, '/20'));
    else if (c === 'T' || c === 'U') cur.amt = depNum(v);
    else if (c === 'P' || c === 'M') cur.label = cur.label || v;
    else if (c === '^') { if (cur.date && cur.amt < 0 && cur.label) tx.push({ date: cur.date, label: cur.label, amount: -cur.amt }); cur = {}; }
  });
  return { tx, warn: '' };
}

// PDF : on reconstitue les lignes du relevé à partir de la position du texte, puis on lit date / libellé / montant
async function depReadPdf(buf) {
  await depEnsureLib('pdfjs');
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const content = await (await pdf.getPage(p)).getTextContent();
    const items = content.items.filter(i => String(i.str).trim() !== '')
      .map(i => ({ str: String(i.str).trim(), x: i.transform[4], y: i.transform[5], w: i.width || 0 }))
      .sort((a, b) => b.y - a.y || a.x - b.x);
    let cur = null;
    items.forEach(it => {
      if (!cur || Math.abs(it.y - cur.y) > 3) { cur = { y: it.y, items: [] }; lines.push(cur); }
      cur.items.push(it);
    });
  }
  lines.forEach(l => { l.items.sort((a, b) => a.x - b.x); l.text = l.items.map(i => i.str).join(' '); });
  return depParsePdfLines(lines);
}
const DEP_AMT = /^[-+−]?\s?\d{1,3}(?:[  .]\d{3})*,\d{2}\s?€?$|^[-+−]?\d+,\d{2}\s?€?$/;
const DEP_DATE_START = /^(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?(?=\s|$)/;
function depParsePdfLines(lines) {
  const head = lines.slice(0, 60).map(l => l.text).join(' ');
  const yMatch = head.match(/\b(20\d{2})\b/);
  const defYear = yMatch ? +yMatch[1] : new Date().getFullYear();
  let cols = null;                 // positions des colonnes Débit / Crédit / Solde / Montant
  const expenses = []; let guessed = 0, last = null, stated = null;
  const center = it => it.x + it.w / 2;
  lines.forEach(l => {
    const up = depNormalize(l.text);
    // en-tête de tableau
    const hdr = {};
    l.items.forEach(it => {
      const t = depNormalize(it.str);
      if (/^DEBIT/.test(t)) hdr.debit = center(it);
      else if (/^CREDIT/.test(t)) hdr.credit = center(it);
      else if (/^SOLDE/.test(t)) hdr.solde = center(it);
      else if (/^MONTANT/.test(t)) hdr.montant = center(it);
    });
    if ((hdr.debit != null && hdr.credit != null) || hdr.montant != null) { cols = hdr; last = null; return; }

    const dm = l.text.match(DEP_DATE_START);
    if (!dm) {
      // « Total des débits / mouvements » annoncé par le relevé : sert de contrôle de lecture
      if (stated == null && /TOTAL/.test(up) && /DEBIT|MOUVEMENT|OPERATION/.test(up) && !(/CREDIT/.test(up) && !/DEBIT/.test(up))) {
        const ns = l.items.filter(i => DEP_AMT.test(i.str));
        if (ns.length) {
          let pick = ns[0];
          if (cols && cols.debit != null) pick = ns.slice().sort((p, q) => Math.abs(center(p) - cols.debit) - Math.abs(center(q) - cols.debit))[0];
          const v = Math.abs(depNum(pick.str.replace('−', '-')));
          if (v > 0) stated = v;
        }
        return;
      }
      // suite de libellé sur la ligne suivante (sans date ni montant)
      if (last && !l.items.some(i => DEP_AMT.test(i.str)) && !/TOTAL|SOLDE|PAGE|RELEVE|IBAN|BIC|DATE|NOUVEAU|ANCIEN|CREDIT|DEBIT/.test(up) && last.label.length < 80) last.label += ' ' + l.text;
      return;
    }
    last = null;
    const year = dm[3] ? (+dm[3] < 100 ? 2000 + +dm[3] : +dm[3]) : defYear;
    if (+dm[2] > 12 || +dm[1] > 31) return;
    const date = new Date(year, +dm[2] - 1, +dm[1]);
    // montants de la ligne
    const nums = l.items.filter(i => DEP_AMT.test(i.str));
    if (!nums.length) return;
    const label = l.items.filter(i => !DEP_AMT.test(i.str)).map(i => i.str).join(' ').replace(/^(\d{1,2}[\/.]\d{1,2}([\/.]\d{2,4})?\s*){1,2}/, '').trim();
    if (!label) return;
    let value = null, kind = 'unknown';
    if (cols) {
      let best = null;
      nums.forEach(n => {
        let bd = Infinity, bk = null;
        Object.entries(cols).forEach(([k, x]) => { const d = Math.abs(center(n) - x); if (d < bd) { bd = d; bk = k; } });
        if (bk && bk !== 'solde' && (!best || bd < best.d)) best = { n, k: bk, d: bd };
      });
      if (best) { value = best.n; kind = best.k; }
    }
    if (!value) value = nums[0];
    const amount = Math.abs(depNum(value.str.replace('−', '-')));
    if (!amount) return;
    let isExpense;
    if (kind === 'debit') isExpense = true;
    else if (kind === 'credit') isExpense = false;
    else if (/^[-−]/.test(value.str)) isExpense = true;
    else if (/^\+/.test(value.str)) isExpense = false;
    else { isExpense = !depIsCredit(label); guessed++; }
    if (isExpense) { last = { date, label, amount }; expenses.push(last); }
  });
  const warn = expenses.length ? (guessed ? "Lecture d'un PDF : je n'ai pas pu distinguer tous les débits des crédits, vérifie les totaux." : "Lecture d'un PDF : vérifie que les totaux te semblent justes.") : '';
  const read = Math.round(expenses.reduce((t, e) => t + e.amount, 0) * 100) / 100;
  return { tx: expenses, warn, check: stated != null ? { stated, read } : null };
}

// Point d'entrée : reconnaît le format d'après le contenu (et l'extension)
async function depReadAny(file) {
  const buf = await file.arrayBuffer();
  const head = new Uint8Array(buf.slice(0, 8));
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;             // %PDF
  const isZip = head[0] === 0x50 && head[1] === 0x4B;                                                       // xlsx / ods
  const isOle = head[0] === 0xD0 && head[1] === 0xCF;                                                       // xls
  if (isPdf || /\.pdf$/i.test(file.name)) return depReadPdf(buf);
  if (isZip || isOle || /\.(xlsx?|ods)$/i.test(file.name)) return depReadSheet(buf);
  if (/\.(png|jpe?g|heic|webp|gif)$/i.test(file.name) || String(file.type).startsWith('image/')) throw new Error('image');
  let text; try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { text = new TextDecoder('windows-1252').decode(buf); }
  if (/<OFX>|OFXHEADER|<STMTTRN>/i.test(text.slice(0, 4000)) || /\.(ofx|qfx)$/i.test(file.name)) return depReadOFX(text);
  if (/^!Type:/m.test(text.slice(0, 500)) || /\.qif$/i.test(file.name)) return depReadQIF(text);
  return depExtractExpenses(depParseCSV(text));
}

async function depOnFile(input) {
  const files = [...(input.files || [])];
  input.value = '';
  if (!files.length || !depRequirePremium()) return;
  const msg = document.getElementById('dep-import-msg');
  const say = (t, err) => { if (msg) { msg.style.color = err ? '#dc2626' : 'var(--color-text-secondary)'; msg.textContent = t; } };
  say(files.some(f => /\.(pdf|xlsx?|ods)$/i.test(f.name)) ? 'Chargement du lecteur, lecture du fichier…' : 'Lecture du fichier…');
  const useAi = !!document.getElementById('dep-ai-opt')?.checked && !isDemo;
  try {
    let allTx = [], warn = '', check = null;
    for (const f of files) {
      const r = await depReadAny(f);
      allTx = allTx.concat(r.tx); warn = warn || r.warn;
      if (files.length === 1 && r.check) check = r.check;
    }
    if (!allTx.length) { say("Je n'ai trouvé aucune dépense dans ce fichier. Il faut au minimum une date, un libellé et un montant. Essaie l'export CSV ou Excel de ta banque.", true); return; }
    const { months, items, txs } = depBuildItems(allTx);
    depApplyManualMap(items);
    depState = { ts: Date.now(), months, items, txs, cut: {}, gcut: {}, source: 'csv', warn, nTx: allTx.length, check };
    depSave(); depRender();
    if (useAi && items.some(i => i.cat === 'autre')) depAiClassify(true);   // classe tout d'un coup, sans clic supplémentaire
  } catch (e) {
    console.warn('depOnFile:', e);
    if (e && e.message === 'image') say("Les photos et scans ne sont pas lus (pour ta confidentialité, rien n'est envoyé nulle part). Utilise le PDF, l'Excel ou le CSV de ta banque.", true);
    else say(e && /lecteur/.test(e.message) ? e.message : "Impossible de lire ce fichier. Essaie l'export CSV ou Excel de ta banque.", true);
  }
}
function depManualAnalyze() {
  if (!depRequirePremium()) return;
  const items = [];
  DEP_PRESETS.forEach(p => {
    const cb = document.getElementById('dep-p-' + p.key), inp = document.getElementById('dep-pv-' + p.key);
    if (cb && cb.checked) { const v = parseFloat(String(inp.value).replace(',', '.')); if (v > 0) items.push({ key: p.key.toUpperCase(), label: p.label, cat: p.cat, monthly: v, recurring: true }); }
  });
  if (!items.length) { if (typeof showToast === 'function') showToast('Coche au moins un abonnement'); return; }
  depState = { ts: Date.now(), months: 1, items, cut: {}, source: 'manual', warn: '' };
  depSave(); depRender();
}
function depReset() {
  if (!confirm('Effacer cette analyse de dépenses ?')) return;
  try { localStorage.removeItem(depKeyStore()); } catch {}
  depState = null; depRender();
}
// ── Groupes de dépenses (camembert + curseurs « diminuer ») ──
// Les dépenses du quotidien se réduisent PAR GROUPE (tous les restos ensemble), les abonnements un par un.
const DEP_GROUPS = [
  { id: 'logement',    label: 'Logement',              cats: ['logement'],                          color: '#6366f1' },
  { id: 'credit',      label: 'Crédits & prêts',       cats: ['credit'],                            color: '#8b5cf6' },
  { id: 'courses',     label: 'Courses',               cats: ['alimentation'],                      color: '#16a34a' },
  { id: 'resto',       label: 'Restaurants & cafés',   cats: ['restauration'],                      color: '#f59e0b', reducible: 30, hint: 'Passer un repas sur trois à la maison, ou un resto de moins par semaine.' },
  { id: 'livraison',   label: 'Livraison de repas',    cats: ['livraison'],                         color: '#fb923c', reducible: 50, hint: 'Les frais de livraison et de service coûtent souvent 30 % de plus.' },
  { id: 'abos',        label: 'Abonnements',           cats: ['streaming', 'musique', 'apps', 'presse', 'sport', 'jeux_video', 'telecom', 'frais'], color: '#0ea5e9', subs: true },
  { id: 'jeux_argent', label: "Jeux d'argent",         cats: ['jeux_argent'],                       color: '#dc2626', reducible: 100 },
  { id: 'shopping',    label: 'Shopping & achats',     cats: ['shopping'],                          color: '#ec4899', reducible: 30, hint: 'Attendre 48 h avant chaque achat non prévu.' },
  { id: 'sorties',     label: 'Sorties & voyages',     cats: ['loisirs', 'voyage'],                 color: '#14b8a6', reducible: 20 },
  { id: 'tabac',       label: 'Tabac',                 cats: ['tabac'],                             color: '#78716c', reducible: 50 },
  { id: 'transport',   label: 'Transport',             cats: ['transport'],                         color: '#64748b' },
  { id: 'factures',    label: 'Factures & assurances', cats: ['energie', 'assurance', 'impots'],    color: '#3b82f6' },
  { id: 'sante',       label: 'Santé',                 cats: ['sante'],                             color: '#22c55e' },
  { id: 'autre',       label: 'Autres',                cats: ['autre'],                             color: '#9ca3af' },
];
function depGroupOf(item) {
  if (item.sub === true && !['jeux_argent'].includes(item.cat)) return DEP_GROUPS.find(g => g.id === 'abos');
  return DEP_GROUPS.find(g => g.cats.includes(item.cat)) || DEP_GROUPS[DEP_GROUPS.length - 1];
}
function depGroupTotals(items) {
  return DEP_GROUPS.map(g => {
    const its = items.filter(i => depGroupOf(i).id === g.id);
    return { g, items: its, total: its.reduce((a, i) => a + i.monthly, 0) };
  }).filter(x => x.items.length);
}

// Un abonnement : 0 (je garde) ou 100 (j'arrête)
function depSetCut(key, pct) {
  pct = pct ? 100 : 0;
  depState.cut = depState.cut || {};
  if (pct) depState.cut[key] = pct; else delete depState.cut[key];
  depSave(); depRender();
}
// Un groupe de dépenses : curseur 0 à 100 %
function depSetGCut(id, pct) {
  pct = Math.max(0, Math.min(100, Math.round(+pct || 0)));
  depState.gcut = depState.gcut || {};
  if (pct) depState.gcut[id] = pct; else delete depState.gcut[id];
  depSave();
  const a = depAnalyze(), gt = depGroupTotals(a.items).find(x => x.g.id === id);
  const lbl = document.querySelector(`[data-dep-glbl="${id}"]`);
  if (lbl && gt) lbl.textContent = pct ? `−${pct} % · économise ${depFmt(gt.total * pct / 100)}/mois` : 'Je garde tel quel';
  depRenderSavings();
}
// Suggestions : abonnements non vitaux → arrêter ; groupes → réduction recommandée
function depApplySuggestions(on) {
  depState.cut = {}; depState.gcut = {};
  if (on) {
    const a = depAnalyze();
    a.items.forEach(i => { if (a.tiers.get(i.key) === 'nonvital' && depGroupOf(i).id === 'abos') depState.cut[i.key] = 100; });
    DEP_GROUPS.forEach(g => { if (g.reducible) depState.gcut[g.id] = g.reducible; });
  }
  depSave(); depRender();
}
function depInvestDca(m) {
  nav('dca');
  setTimeout(() => {
    const el = document.getElementById('dca-m');
    if (el) { const max = parseFloat(el.max) || m; el.value = Math.max(parseFloat(el.min) || 0, Math.min(Math.round(m), max)); try { updateDCA(); } catch {} }
  }, 250);
}

// Classement de TOUTES les lignes non reconnues par l'IA, en une fois (libellés nettoyés seuls, sans montant).
// Par paquets de 90 libellés, 1 appel par paquet (2 paquets max). L'IA indique aussi si c'est un abonnement.
let _depAiBusy = false;
async function depAiClassify(auto) {
  if (_depAiBusy || !depState) return;
  const a = depAnalyze();
  const unknown = a.items.filter(i => i.cat === 'autre' && !i.manual).sort((x, y) => y.monthly - x.monthly).slice(0, 180);
  if (!unknown.length) return;
  _depAiBusy = true;
  const btn = document.getElementById('dep-ai-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Analyse en cours…'; }
  const note = document.getElementById('dep-ai-note');
  if (note) note.textContent = `L'IA classe ${unknown.length} commerçant${unknown.length > 1 ? 's' : ''}…`;
  const cats = Object.keys(DEP_CATS).filter(k => !['autre', 'virement', 'epargne'].includes(k));
  let classified = 0, failed = false;
  try {
    for (let start = 0; start < unknown.length && !failed; start += 90) {
      const chunk = unknown.slice(start, start + 90);
      const prompt = `Voici des libellés de commerçants extraits d'un relevé bancaire français (sans montants ni noms de personnes).
Pour CHAQUE libellé, donne la catégorie la plus probable parmi : ${cats.join(', ')}.
Utilise ta connaissance des enseignes, bars, restaurants, boutiques, services et abonnements en France : un nom comme « Le Seven », « La Mandibule » ou « Italoria » est très probablement un bar/restaurant (restauration).
Ajoute "s":1 si c'est un abonnement ou un prélèvement récurrent typique (streaming, salle de sport, téléphone, logiciel, presse, assurance, cloud…), sinon "s":0.
Mets "autre" seulement si tu n'as vraiment aucune idée.
Réponds UNIQUEMENT en JSON valide : {"LIBELLÉ": {"c": "catégorie", "s": 0}, ...} avec exactement les libellés donnés.
Libellés :
${chunk.map(u => '- ' + u.key.replace(/\d{4,}/g, '')).join('\n')}`;
      const raw = await callClaude(prompt, 'Tu classes des commerçants français. Réponds UNIQUEMENT en JSON valide, sans backticks.', 3000, typeof HAIKU_MODEL !== 'undefined' ? HAIKU_MODEL : undefined);
      if (typeof callClaudeFailed === 'function' && callClaudeFailed(raw)) {
        failed = true;
        if (typeof showToast === 'function') showToast(String(raw).replace(/^🔒\s*/, '').slice(0, 160));
        break;
      }
      const clean = String(raw).replace(/```json|```/g, '').trim();
      const map = JSON.parse(clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1));
      const norm = s => String(s).replace(/\d{4,}/g, '').trim().toUpperCase();
      const byLabel = {}; Object.keys(map).forEach(k => { byLabel[norm(k)] = map[k]; });
      chunk.forEach(u => {
        const r = byLabel[norm(u.key)];
        const c = r && (typeof r === 'string' ? r : r.c);
        if (c && DEP_CATS[c] && c !== 'autre') {
          const item = depState.items.find(i => i.key === u.key);
          if (item) { item.cat = c; item.aiSub = !!(r && r.s === 1); if (item.aiSub) item.sub = true; classified++; }
        }
      });
    }
    depSave(); depRender();
    if (typeof showToast === 'function' && !failed) showToast(classified ? `✓ ${classified} ligne${classified > 1 ? 's' : ''} classée${classified > 1 ? 's' : ''} par l'IA` : "L'IA n'a rien pu classer de plus");
  } catch (e) {
    console.warn('depAi:', e);
    if (typeof showToast === 'function') showToast('⚠️ Classement impossible pour le moment');
  } finally {
    _depAiBusy = false;
    const b = document.getElementById('dep-ai-btn'); if (b) { b.disabled = false; b.textContent = "✨ Classer avec l'IA"; }
    const n = document.getElementById('dep-ai-note'); if (n && !depState) n.textContent = '';
  }
}

// ── Affichage ──
const DEP_CARD = 'background:var(--color-surface);border:1px solid var(--color-border);border-radius:16px;padding:18px;margin-bottom:12px';
const DEP_MUTED = 'color:var(--color-text-secondary)';

function depTierBadge(t) {
  const m = { essentiel: ['#16a34a', 'Essentiel'], confort: ['#d97706', 'Confort'], nonvital: ['#dc2626', 'Non vital'], autre: ['#6b7280', 'À classer'] }[t] || ['#6b7280', ''];
  return `<span style="font-size:10px;font-weight:800;color:${m[0]};background:${m[0]}1f;padding:2px 8px;border-radius:99px;white-space:nowrap">${m[1]}</span>`;
}
function depSavingsMonthly() {
  const a = depAnalyze(), cut = depState.cut || {}, gcut = depState.gcut || {};
  let m = 0, n = 0;
  a.items.forEach(i => { if (cut[i.key] > 0 && depGroupOf(i).id === 'abos') { m += i.monthly; n++; } });
  depGroupTotals(a.items).forEach(x => { if (x.g.reducible != null && gcut[x.g.id] > 0) { m += x.total * gcut[x.g.id] / 100; n++; } });
  return { m, n };
}
function depRenderSavings() {
  const el = document.getElementById('dep-savings'); if (!el || !depState) return;
  const { m, n: picked } = depSavingsMonthly();
  if (!picked) {
    el.innerHTML = `<div style="font-size:13px;${DEP_MUTED}">Diminue une catégorie avec les curseurs ou arrête un abonnement pour voir ce que tu économiserais.</div>`;
    return;
  }
  el.innerHTML = `
    <div style="font-size:12px;${DEP_MUTED};margin-bottom:6px">En agissant sur ${picked} poste${picked > 1 ? 's' : ''} :</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <div style="flex:1;min-width:110px;background:var(--color-bg);border-radius:12px;padding:12px;text-align:center"><div style="font-size:20px;font-weight:900;color:var(--color-text)">${depFmt(m)}</div><div style="font-size:11px;${DEP_MUTED}">par mois</div></div>
      <div style="flex:1;min-width:110px;background:var(--color-bg);border-radius:12px;padding:12px;text-align:center"><div style="font-size:20px;font-weight:900;color:#16a34a">${depFmt0(m * 12)}</div><div style="font-size:11px;${DEP_MUTED}">économisés par an</div></div>
      <div style="flex:1;min-width:110px;background:var(--color-bg);border-radius:12px;padding:12px;text-align:center"><div style="font-size:20px;font-weight:900;color:#16a34a">${depFmt0(depProject(m, DEP_INVEST_YEARS, DEP_INVEST_RATE))}</div><div style="font-size:11px;${DEP_MUTED}">si investis ${DEP_INVEST_YEARS} ans</div></div>
    </div>
    <div style="font-size:10.5px;${DEP_MUTED};margin-top:8px;line-height:1.5">Simulation à ${DEP_INVEST_RATE} %/an, versements mensuels, avant frais et impôts. Ce n'est pas une garantie.</div>
    <button onclick="depInvestDca(${Math.round(m)})" style="margin-top:12px;width:100%;padding:12px;background:#16a34a;color:#fff;border:none;border-radius:12px;font:inherit;font-size:13px;font-weight:800;cursor:pointer">📈 Voir ce que ça donne dans le simulateur DCA</button>`;
}

function depRenderImport() {
  const rows = DEP_PRESETS.map(p => `
    <label style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--color-border);cursor:pointer">
      <input type="checkbox" id="dep-p-${p.key}" style="width:18px;height:18px;flex-shrink:0;accent-color:#16a34a">
      <span style="flex:1;font-size:13px;color:var(--color-text)">${DEP_CATS[p.cat].ic} ${_escHtml(p.label)}</span>
      <span style="display:flex;align-items:center;gap:4px"><input type="number" id="dep-pv-${p.key}" value="${p.price}" min="0" step="0.01" style="width:78px;padding:6px 8px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-bg);color:var(--color-text);font:inherit;font-size:13px;text-align:right" onclick="event.stopPropagation()"><span style="font-size:12px;${DEP_MUTED}">€/mois</span></span>
    </label>`).join('');
  return `
  <div style="${DEP_CARD}">
    <div style="font-size:15px;font-weight:800;color:var(--color-text);margin-bottom:4px">📂 Importer un relevé de compte</div>
    <div style="font-size:12.5px;${DEP_MUTED};line-height:1.55;margin-bottom:12px">Télécharge ton relevé depuis ton espace bancaire, en <strong>PDF, Excel, CSV ou OFX</strong> (1 mois, ou plusieurs pour repérer les prélèvements récurrents). Le site retrouve tes abonnements et classe tes dépenses. Les photos et scans ne sont pas lus.</div>
    <div style="display:flex;gap:8px;align-items:flex-start;background:rgba(22,163,74,0.08);border:1px solid rgba(22,163,74,0.25);border-radius:12px;padding:10px 12px;font-size:12px;color:var(--color-text);line-height:1.5;margin-bottom:12px">
      <span>🔒</span><span><strong>Ton fichier reste dans ton navigateur.</strong> Il n'est ni envoyé ni enregistré. Seuls tes opérations et leur classement sont mémorisés, sur cet appareil uniquement. L'IA, si tu la laisses faire, ne voit que les noms des commerçants non reconnus, jamais les montants ni les dates.</span>
    </div>
    <label style="display:flex;gap:9px;align-items:flex-start;font-size:12.5px;color:var(--color-text);line-height:1.45;margin-bottom:12px;cursor:pointer">
      <input type="checkbox" id="dep-ai-opt" checked style="width:17px;height:17px;flex-shrink:0;margin-top:1px;accent-color:#16a34a">
      <span>Laisser l'IA classer les commerçants que le site ne reconnaît pas (bars, restaurants, boutiques…). Ça compte pour 1 ou 2 analyses de ton quota. <span style="${DEP_MUTED}">Décoche pour tout garder sur ton appareil.</span></span>
    </label>
    <label style="display:block;text-align:center;padding:16px;border:2px dashed var(--color-border);border-radius:14px;cursor:pointer;font-size:13px;font-weight:700;color:var(--color-text)">
      Choisir un ou plusieurs fichiers
      <div style="font-size:11.5px;font-weight:500;${DEP_MUTED};margin-top:3px">PDF · Excel · CSV · OFX/QFX</div>
      <input type="file" accept=".csv,.txt,.tsv,.pdf,.xls,.xlsx,.ods,.ofx,.qfx,.qif,text/csv,application/pdf" multiple style="display:none" onchange="depOnFile(this)">
    </label>
    <div id="dep-import-msg" style="font-size:12px;margin-top:8px;${DEP_MUTED}"></div>
  </div>
  <div style="${DEP_CARD}">
    <div style="font-size:15px;font-weight:800;color:var(--color-text);margin-bottom:4px">✅ Ou coche tes abonnements</div>
    <div style="font-size:12.5px;${DEP_MUTED};margin-bottom:8px">Pas de fichier sous la main ? Coche ce que tu paies et corrige les montants (les prix affichés sont indicatifs).</div>
    ${rows}
    <button onclick="depManualAnalyze()" style="margin-top:14px;width:100%;padding:13px;background:#16a34a;color:#fff;border:none;border-radius:12px;font:inherit;font-size:13.5px;font-weight:800;cursor:pointer">Analyser mes abonnements</button>
  </div>`;
}

// Questions posées pour chaque type d'abonnement (on veut que l'utilisateur se demande s'il en a vraiment besoin)
const DEP_SUB_QUESTIONS = {
  streaming:  "Tu le regardes encore chaque semaine ? Un seul abonnement vidéo suffit largement.",
  musique:    "Une seule appli de musique suffit : tu utilises vraiment celle-ci ?",
  apps:       "Tu t'en sers encore ? Beaucoup d'abonnements logiciels ou cloud dorment sans qu'on s'en rende compte.",
  jeux_video: "Tu y as joué ce mois-ci ? Sinon, tu peux le suspendre et le reprendre quand tu veux.",
  presse:     "Tu lis vraiment tous les articles ? Sinon, un seul média suffit.",
  sport:      "Tu y vas au moins une fois par semaine ? Sinon, chaque séance te coûte très cher.",
  telecom:    "Tu paies peut-être trop cher : les forfaits comparables se trouvent souvent 30 à 50 % moins chers.",
  frais:      "Beaucoup de banques en ligne offrent la carte et la tenue de compte gratuitement : ça vaut le coup de comparer.",
};
const DEP_SUB_DEFAULT = "Tu en as encore vraiment besoin ? Si tu hésites, arrête-le : tu pourras le reprendre.";

function depRenderResults() {
  const a = depAnalyze(), cut = depState.cut || {}, gcut = depState.gcut || {};
  const pct = v => a.total ? Math.round(v / a.total * 100) : 0;
  const itemByKey = new Map(depState.items.map(i => [i.key, i]));
  const txs = depState.txs || [];
  const unknown = a.items.filter(i => i.cat === 'autre').sort((x, y) => y.monthly - x.monthly);
  const totals = depGroupTotals(a.items).sort((x, y) => y.total - x.total);
  const subsItems = a.items.filter(i => depGroupOf(i).id === 'abos').sort((x, y) => y.monthly - x.monthly);
  const subsTotal = subsItems.reduce((t, i) => t + i.monthly, 0);
  const reducibles = totals.filter(x => x.g.reducible != null);
  const gambling = totals.find(x => x.g.id === 'jeux_argent');
  const fmtDay = d => { const m = String(d).match(/^\d{4}-(\d{2})-(\d{2})/); return m ? `${m[2]}/${m[1]}` : ''; };

  // 1) Toutes les opérations
  const listRows = txs.slice().sort((x, y) => x.d < y.d ? -1 : 1).map(t => {
    const it = itemByKey.get(t.k), cat = it ? (DEP_CATS[it.cat] || DEP_CATS.autre) : DEP_CATS.autre;
    const unk = !it || it.cat === 'autre', excl = cat.tier === 'excl';
    return `<div class="dep-tx" data-u="${unk ? 1 : 0}" data-t="${_escHtml(String(t.l).toLowerCase())}" style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--color-border);font-size:12px${excl ? ';opacity:.55' : ''}">
      <span style="width:38px;flex-shrink:0;${DEP_MUTED}">${fmtDay(t.d)}</span>
      <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--color-text)">${_escHtml(t.l)}</span>
      <span style="flex-shrink:0;${unk ? 'outline:1.5px solid #d97706;border-radius:7px' : ''}">${depCatSelect(t.k, it ? it.cat : 'autre')}</span>
      <span style="width:66px;flex-shrink:0;text-align:right;font-weight:700;color:var(--color-text)">${depFmt(t.a)}</span>
    </div>`;
  }).join('');
  const listCard = txs.length ? `
  <div style="${DEP_CARD}">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px">
      <div><div style="font-size:15px;font-weight:800;color:var(--color-text)">🧾 Toutes tes opérations</div><div style="font-size:12px;${DEP_MUTED};margin-top:2px">${txs.length} dépenses lues dans ton relevé</div></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input id="dep-q" type="search" placeholder="Rechercher…" oninput="depFilterList()" style="padding:7px 10px;border:1px solid var(--color-border);border-radius:9px;background:var(--color-bg);color:var(--color-text);font:inherit;font-size:12.5px;width:150px">
        <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--color-text);cursor:pointer"><input id="dep-uonly" type="checkbox" onchange="depFilterList()" style="accent-color:#d97706">Non reconnus</label>
      </div>
    </div>
    <div style="max-height:340px;overflow-y:auto;border-top:1px solid var(--color-border)">${listRows}</div>
    <button onclick="depOpenFullList()" style="margin-top:10px;width:100%;padding:10px;background:transparent;border:1px solid var(--color-border);border-radius:10px;color:var(--color-text);font:inherit;font-size:12.5px;font-weight:700;cursor:pointer">⤢ Tout afficher en grand · trier par catégorie · exporter</button>
  </div>` : `
  <div style="${DEP_CARD}">
    <div style="font-size:15px;font-weight:800;color:var(--color-text)">🧾 Toutes tes dépenses</div>
    <div style="font-size:12px;${DEP_MUTED};margin:2px 0 10px">${depState.source === 'csv' ? 'Cette analyse a été faite avant l\'ajout de la liste détaillée : clique sur « Refaire » et réimporte ton relevé pour voir chaque opération. Voici déjà tous les postes :' : 'Voici tout ce que tu as indiqué :'}</div>
    <div style="max-height:300px;overflow-y:auto;border-top:1px solid var(--color-border)">${a.items.slice().sort((x, y) => y.monthly - x.monthly).map(i => `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--color-border);font-size:12px"><span style="flex:1;color:var(--color-text)">${_escHtml(i.label)}</span><span style="${DEP_MUTED}">${(DEP_CATS[i.cat] || DEP_CATS.autre).label}</span><strong style="width:80px;text-align:right;color:var(--color-text)">${depFmt(i.monthly)}/mois</strong></div>`).join('')}</div>
    <button onclick="depOpenFullList()" style="margin-top:10px;width:100%;padding:10px;background:transparent;border:1px solid var(--color-border);border-radius:10px;color:var(--color-text);font:inherit;font-size:12.5px;font-weight:700;cursor:pointer">⤢ Tout afficher en grand · exporter</button>
  </div>`;

  // 2) Lignes non reconnues → IA
  const unkCard = unknown.length ? `
  <div style="${DEP_CARD}">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:4px">
      <div><div style="font-size:15px;font-weight:800;color:var(--color-text)">❓ Lignes non reconnues</div><div style="font-size:12px;${DEP_MUTED};margin-top:2px">${unknown.length} commerçant${unknown.length > 1 ? 's' : ''} à classer. L'IA les range d'un coup dans les catégories ci-dessous.</div></div>
      ${depState.source === 'csv' ? `<button id="dep-ai-btn" onclick="depAiClassify()" style="background:#16a34a;color:#fff;border:none;font:inherit;font-size:12px;font-weight:800;padding:9px 13px;border-radius:10px;cursor:pointer">✨ Classer avec l'IA</button>` : ''}
    </div>
    ${unknown.slice(0, 12).map(i => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--color-border)"><span style="flex:1;font-size:13px;font-weight:700;color:var(--color-text)">${_escHtml(i.label)}</span>${depCatSelect(i.key, i.cat)}<span style="font-size:13px;font-weight:800;color:var(--color-text);width:70px;text-align:right">${depFmt(i.monthly)}</span></div>`).join('')}
    ${unknown.length > 12 ? `<div style="font-size:11.5px;${DEP_MUTED};padding-top:8px">… et ${unknown.length - 12} autres plus petits.</div>` : ''}
    <div id="dep-ai-note" style="font-size:11px;${DEP_MUTED};margin-top:8px">L'IA reçoit uniquement les noms des commerçants, sans montants ni dates, et compte pour 1 ou 2 analyses de ton quota.</div>
  </div>` : '';

  // 3) Camembert
  const pieCard = `
  <div style="${DEP_CARD}">
    <div style="font-size:15px;font-weight:800;color:var(--color-text);margin-bottom:12px">🥧 Où part ton argent</div>
    <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
      <div style="position:relative;width:210px;height:210px;flex-shrink:0;margin:0 auto"><canvas id="dep-pie" style="width:100%;height:100%"></canvas></div>
      <div style="flex:1;min-width:220px">
        ${totals.map(x => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12.5px;color:var(--color-text)">
          <span style="width:10px;height:10px;border-radius:3px;background:${x.g.color};flex-shrink:0"></span>
          <span style="flex:1">${x.g.label}</span>
          <span style="${DEP_MUTED};width:34px;text-align:right">${pct(x.total)} %</span>
          <strong style="width:74px;text-align:right">${depFmt0(x.total)}</strong>
        </div>`).join('')}
      </div>
    </div>
  </div>`;

  // 4) Dépenses du quotidien : une réduction par catégorie (tous les restos ensemble)
  const reduceRows = reducibles.map(x => {
    const c = gcut[x.g.id] || 0;
    return `
    <div style="padding:12px 0;border-bottom:1px solid var(--color-border)">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="width:10px;height:10px;border-radius:3px;background:${x.g.color};flex-shrink:0"></span>
        <div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:800;color:var(--color-text)">${x.g.label}</div><div style="font-size:11px;${DEP_MUTED}">${x.items.length} commerçant${x.items.length > 1 ? 's' : ''}${x.g.hint ? ' · ' + x.g.hint : ''}</div></div>
        <div style="text-align:right"><div style="font-size:14px;font-weight:900;color:var(--color-text)">${depFmt0(x.total)}<span style="font-size:10px;${DEP_MUTED}">/mois</span></div><div style="font-size:10.5px;${DEP_MUTED}">${depFmt0(x.total * 12)}/an</div></div>
      </div>
      <input type="range" min="0" max="100" step="10" value="${c}" oninput="depSetGCut('${x.g.id}', this.value)" style="width:100%;accent-color:${x.g.color};margin-top:8px">
      <div style="display:flex;justify-content:space-between;font-size:10.5px;${DEP_MUTED}"><span>Je garde</span><span data-dep-glbl="${x.g.id}" style="font-weight:700;color:var(--color-text)">${c ? `−${c} % · économise ${depFmt(x.total * c / 100)}/mois` : 'Je garde tel quel'}</span><span>Je supprime</span></div>
      <details style="margin-top:6px"><summary style="cursor:pointer;font-size:11.5px;${DEP_MUTED}">Voir le détail</summary>
        ${x.items.sort((p, q) => q.monthly - p.monthly).map(i => `<div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:4px 0;color:var(--color-text)"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${_escHtml(i.label)}</span>${depCatSelect(i.key, i.cat)}<strong style="width:64px;text-align:right">${depFmt(i.monthly)}</strong></div>`).join('')}
      </details>
    </div>`;
  }).join('');
  const reduceCard = reducibles.length ? `
  <div style="${DEP_CARD}">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:2px">
      <div><div style="font-size:15px;font-weight:800;color:var(--color-text)">📉 Dépenses du quotidien : à diminuer</div><div style="font-size:12px;${DEP_MUTED};margin-top:2px">On ne supprime pas tous les restos : on réduit la catégorie entière avec le curseur.</div></div>
      <span style="display:flex;gap:6px"><button onclick="depApplySuggestions(true)" style="background:transparent;border:1px solid var(--color-border);color:var(--color-text);font:inherit;font-size:11.5px;font-weight:700;padding:6px 10px;border-radius:8px;cursor:pointer">Appliquer mes suggestions</button><button onclick="depApplySuggestions(false)" style="background:transparent;border:1px solid var(--color-border);color:var(--color-text-secondary);font:inherit;font-size:11.5px;font-weight:700;padding:6px 10px;border-radius:8px;cursor:pointer">Remettre à zéro</button></span>
    </div>
    ${reduceRows}
    ${gambling ? `<div style="font-size:12px;color:var(--color-text);background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.25);border-radius:12px;padding:10px 12px;margin-top:12px;line-height:1.55">🎲 <strong>${depFmt(gambling.total)}/mois</strong> en jeux d'argent (${depFmt0(gambling.total * 12)} par an). Si tu sens que c'est difficile à contrôler, des services d'aide gratuits et confidentiels existent, comme Joueurs Info Service.</div>` : ''}
  </div>` : '';

  // 5) Abonnements : un par un, avec une vraie question
  const dupStream = a.streamCount > 1;
  const subRows = subsItems.map(i => {
    const c = cut[i.key] || 0, cat = DEP_CATS[i.cat] || DEP_CATS.autre, kAttr = _escHtml(JSON.stringify(i.key));
    const tier = a.tiers.get(i.key);
    const q = DEP_SUB_QUESTIONS[i.cat] || DEP_SUB_DEFAULT;
    const tag = i.cat === 'streaming' && dupStream ? (i.key === a.keepStreamKey ? '<span style="font-size:10px;font-weight:800;color:#16a34a;background:#16a34a1f;padding:2px 8px;border-radius:99px">à garder (le moins cher)</span>' : '<span style="font-size:10px;font-weight:800;color:#dc2626;background:#dc26261f;padding:2px 8px;border-radius:99px">en double</span>') : depTierBadge(tier);
    return `
    <div style="padding:12px 0;border-bottom:1px solid var(--color-border);${c ? 'background:rgba(220,38,38,0.04)' : ''}">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:18px;width:24px;text-align:center">${cat.ic}</span>
        <div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:800;color:var(--color-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_escHtml(i.label)}</div><div style="font-size:11px;${DEP_MUTED}">${cat.label}${i.recurring ? ' · prélèvement récurrent' : ''}</div></div>
        <div style="text-align:right"><div style="font-size:14px;font-weight:900;color:var(--color-text)">${depFmt(i.monthly)}<span style="font-size:10px;${DEP_MUTED}">/mois</span></div><div style="font-size:10.5px;${DEP_MUTED}">${depFmt0(i.monthly * 12)}/an</div></div>
      </div>
      <div style="margin:7px 0 0 34px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">${tag}<span style="font-size:11.5px;${DEP_MUTED};line-height:1.45;flex:1;min-width:180px">${q}</span><span style="font-size:10.5px;${DEP_MUTED}">Ce n'est pas ça ?</span>${depCatSelect(i.key, i.cat)}</div>
      <div style="display:flex;gap:6px;margin:9px 0 0 34px">
        <button onclick="depSetCut(${kAttr}, 0)" style="flex:1;padding:8px;border-radius:9px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;border:1px solid ${c ? 'var(--color-border)' : '#16a34a'};background:${c ? 'transparent' : 'rgba(22,163,74,0.12)'};color:var(--color-text)">Je garde</button>
        <button onclick="depSetCut(${kAttr}, 1)" style="flex:1;padding:8px;border-radius:9px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;border:1px solid ${c ? '#dc2626' : 'var(--color-border)'};background:${c ? 'rgba(220,38,38,0.12)' : 'transparent'};color:var(--color-text)">${c ? '✓ Je résilie' : 'Je résilie'}</button>
      </div>
    </div>`;
  }).join('');
  const subsCard = `
  <div style="${DEP_CARD}">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:2px">
      <div><div style="font-size:15px;font-weight:800;color:var(--color-text)">🔁 Tes abonnements : lesquels résilier ?</div><div style="font-size:12px;${DEP_MUTED};margin-top:2px">Pour chacun, décide : je garde ou je résilie.</div></div>
      <div style="font-size:13px;font-weight:800;color:var(--color-text)">${depFmt(subsTotal)}<span style="font-size:11px;${DEP_MUTED}"> /mois · ${depFmt0(subsTotal * 12)}/an</span></div>
    </div>
    ${subsItems.length ? subRows : `<div style="font-size:13px;${DEP_MUTED};padding:12px 0">Aucun abonnement reconnu.${depState.months < 2 ? ' Importe 2 mois de relevé pour repérer les prélèvements récurrents.' : ''}</div>`}
    ${dupStream ? `<div style="font-size:11.5px;${DEP_MUTED};margin-top:10px;line-height:1.5">🎬 Tu as ${a.streamCount} abonnements de streaming vidéo : n'en garde qu'un, celui que tu regardes le plus.</div>` : ''}
  </div>`;

  return `
  <div style="${DEP_CARD}">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap">
      <div>
        <div style="font-size:11px;font-weight:700;${DEP_MUTED};text-transform:uppercase;letter-spacing:.06em">Tes dépenses analysées</div>
        <div style="font-size:34px;font-weight:900;color:var(--color-text);letter-spacing:-0.04em;line-height:1.1">${depFmt0(a.total)}<span style="font-size:14px;font-weight:600;${DEP_MUTED}"> /mois</span></div>
        <div style="font-size:11.5px;${DEP_MUTED};margin-top:2px">${depState.source === 'csv' ? `d'après ${depState.nTx || ''} opérations sur ${depState.months} mois` : "d'après tes abonnements cochés"} · hors virements et épargne</div>
      </div>
      <button onclick="depReset()" style="background:transparent;border:1px solid var(--color-border);color:var(--color-text-secondary);font:inherit;font-size:12px;font-weight:700;padding:7px 12px;border-radius:9px;cursor:pointer">🔄 Refaire</button>
    </div>
    <div style="display:flex;height:10px;border-radius:99px;overflow:hidden;margin:14px 0 8px;background:var(--color-border)">
      <div style="width:${pct(a.essentiel)}%;background:#16a34a"></div><div style="width:${pct(a.confort)}%;background:#f59e0b"></div><div style="width:${pct(a.nonvital)}%;background:#dc2626"></div><div style="width:${pct(a.autre)}%;background:#9ca3af"></div>
    </div>
    <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--color-text)">
      <span><span style="color:#16a34a">●</span> Essentiel <strong>${depFmt0(a.essentiel)}</strong></span>
      <span><span style="color:#f59e0b">●</span> Confort <strong>${depFmt0(a.confort)}</strong></span>
      <span><span style="color:#dc2626">●</span> Non vital <strong>${depFmt0(a.nonvital)}</strong></span>
      ${a.autre ? `<span><span style="color:#9ca3af">●</span> À classer <strong>${depFmt0(a.autre)}</strong></span>` : ''}
    </div>
    ${depState.warn ? `<div style="font-size:11.5px;color:#d97706;margin-top:10px">⚠️ ${_escHtml(depState.warn)}</div>` : ''}
    ${(() => {
      const c = depState.check; if (!c) return '';
      const ok = Math.abs(c.stated - c.read) <= Math.max(1, c.stated * 0.01);
      return ok
        ? `<div style="font-size:11.5px;color:#16a34a;margin-top:8px">✓ Contrôle : le relevé annonce ${depFmt(c.stated)} de débits, j'en ai lu ${depFmt(c.read)}.</div>`
        : `<div style="font-size:11.5px;color:#dc2626;margin-top:8px">⚠️ Écart : le relevé annonce ${depFmt(c.stated)} de débits, j'en ai lu ${depFmt(c.read)}. Il manque ou il y a peut-être des lignes en trop : vérifie dans « Toutes tes opérations ».</div>`;
    })()}
    ${(() => {
      const ex = depState.items.filter(i => (DEP_CATS[i.cat] || {}).tier === 'excl');
      const t = ex.reduce((s, i) => s + i.monthly, 0);
      return t > 0 ? `<div style="font-size:11.5px;${DEP_MUTED};margin-top:8px">Non comptés dans l'analyse : ${depFmt0(t)}/mois de virements, retraits ou épargne (${ex.length} ligne${ex.length > 1 ? 's' : ''}). Un virement qui est en fait un loyer ou une dépense ? Change sa catégorie dans « Tout afficher ».</div>` : '';
    })()}
  </div>

  ${listCard}
  ${unkCard}
  ${pieCard}
  ${reduceCard}
  ${subsCard}

  <div style="${DEP_CARD}">
    <div style="font-size:15px;font-weight:800;color:var(--color-text);margin-bottom:10px">💰 Ce que tu pourrais économiser</div>
    <div id="dep-savings"></div>
    ${(() => {
      const saved = typeof loadSavedBilan === 'function' && loadSavedBilan();
      const going = typeof bilanInProgress === 'function' && bilanInProgress();
      const resume = !!(saved || going);
      return `<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--color-border)">
        <button onclick="openBilan()" style="width:100%;padding:13px 14px;background:transparent;border:1.5px solid #16a34a;border-radius:12px;color:#16a34a;font:inherit;font-size:14px;font-weight:800;cursor:pointer">📄 ${resume ? 'Reprendre mon bilan' : 'Faire mon bilan'}</button>
        <div style="font-size:11.5px;${DEP_MUTED};margin-top:7px;text-align:center;line-height:1.45">${resume ? 'Retrouve ton bilan patrimonial ou continue-le avec ces dépenses.' : 'Le bilan patrimonial utilise tes dépenses réelles pour calculer ce que tu peux épargner.'}</div>
      </div>`;
    })()}
  </div>

  <details style="${DEP_CARD}">
    <summary style="cursor:pointer;font-size:14px;font-weight:800;color:var(--color-text)">✅ Ce qui est vital (${depFmt0(a.essentiel)}/mois)</summary>
    <div style="margin-top:8px">${a.items.filter(i => a.tiers.get(i.key) === 'essentiel').sort((x, y) => y.monthly - x.monthly).map(i => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--color-border)"><span style="font-size:15px;width:22px;text-align:center">${(DEP_CATS[i.cat] || DEP_CATS.autre).ic}</span><span style="flex:1;font-size:13px;font-weight:700;color:var(--color-text)">${_escHtml(i.label)}</span><span style="font-size:13px;font-weight:800;color:var(--color-text)">${depFmt(i.monthly)}</span></div>`).join('') || `<div style="font-size:13px;${DEP_MUTED}">—</div>`}</div>
  </details>
  <div style="font-size:11px;${DEP_MUTED};line-height:1.55;padding:2px 4px 16px">Classement indicatif fait par des règles simples et l'IA : à toi de décider ce qui compte pour toi. Ce ne sont pas des conseils financiers personnalisés. Tes opérations restent sur cet appareil.</div>`;
}

function depFilterList() {
  const q = (document.getElementById('dep-q')?.value || '').toLowerCase().trim();
  const u = !!document.getElementById('dep-uonly')?.checked;
  document.querySelectorAll('.dep-tx').forEach(r => {
    r.style.display = ((!q || r.dataset.t.includes(q)) && (!u || r.dataset.u === '1')) ? 'flex' : 'none';
  });
}

// Camembert (Chart.js déjà présent dans l'app)
function depDrawChart() {
  const cv = document.getElementById('dep-pie');
  if (!cv || typeof Chart === 'undefined' || !depState) return;
  try { if (window._depChart) window._depChart.destroy(); } catch {}
  const totals = depGroupTotals(depAnalyze().items).sort((x, y) => y.total - x.total);
  window._depChart = new Chart(cv, {
    type: 'doughnut',
    data: { labels: totals.map(x => x.g.label), datasets: [{ data: totals.map(x => Math.round(x.total * 100) / 100), backgroundColor: totals.map(x => x.g.color), borderWidth: 2, borderColor: 'transparent' }] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false, cutout: '58%',
      devicePixelRatio: Math.max(window.devicePixelRatio || 1, 2),     // rendu net sur écrans HD et pendant les zooms
      plugins: { legend: { display: false }, tooltip: { callbacks: { title: () => '', label: c => ` ${c.label} : ${depFmt0(c.parsed)}/mois` } } },
    },
  });
}

function depRender() {
  const root = document.getElementById('dep-root'); if (!root) return;
  if (!depState) depState = depLoad();
  const y = window.scrollY;
  root.innerHTML = depState ? depRenderResults() : depRenderImport();
  if (depState) { depRenderSavings(); depDrawChart(); window.scrollTo(0, y); }
}
// « Mes dépenses » est réservé à Premium. Les comptes gratuits (et la démo) voient un aperçu figé sur des données fictives.
function depRequirePremium() {
  if (isPremiumUser()) return true;
  showPlansModal({
    feature: 'Mes dépenses', subtitle: 'Fonctionnalité Premium',
    benefits: ['Importe ton relevé (PDF, Excel, CSV) : le site retrouve tous tes abonnements', 'Vois ce qui est vital et ce qui ne l\'est pas, et ce que tu économiserais en l\'investissant'],
  });
  return false;
}
function depSampleState() {
  const d = (day, l, a) => ({ date: new Date(new Date().getFullYear(), new Date().getMonth(), day), label: l, amount: a });
  const { months, items, txs } = depBuildItems([
    d(1, 'PRLV SEPA LOYER APPARTEMENT', 850), d(2, 'PRLV SEPA NETFLIX.COM', 13.49), d(2, 'PRLV SEPA DISNEY PLUS', 9.99), d(3, 'PRLV SEPA BASIC-FIT', 24.99),
    d(3, 'PRLV SEPA SPOTIFY', 11.99), d(4, 'PRLV SEPA SFR MOBILE', 19.99), d(5, 'PRLV SEPA EDF', 62.4), d(5, 'PRLV SEPA MAIF ASSURANCE', 28.5),
    d(6, 'CARTE 06/09 CARREFOUR MARKET', 92.3), d(9, 'CARTE 09/09 CARREFOUR MARKET', 71.6), d(7, 'CARTE 07/09 WINAMAX', 60), d(14, 'CARTE 14/09 WINAMAX', 45),
    d(8, 'CARTE 08/09 UBER EATS', 27.8), d(15, 'CARTE 15/09 UBER EATS', 31.2), d(10, 'CARTE 10/09 RESTAURANT LE COMPTOIR', 54), d(12, 'CARTE 12/09 BRASSERIE DU PORT', 42.5),
    d(17, 'CARTE 17/09 PIZZERIA ITALIA', 24), d(13, 'CARTE 13/09 AMAZON', 45.9), d(11, 'PRLV SEPA PRET PERSONNEL', 200), d(16, 'CARTE 16/09 TOTAL ACCESS', 58.2),
  ]);
  return { ts: Date.now(), months, items, txs, cut: { NETFLIX: 100 }, gcut: { resto: 30, jeux_argent: 100 }, source: 'csv', warn: '', nTx: txs.length };
}
function depRenderSample() {
  const root = document.getElementById('dep-root'); if (!root) return;
  const prev = depState;
  depState = depSampleState();
  const banner = `
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.3);border-radius:14px;padding:14px 16px;margin-bottom:12px">
    <div style="flex:1;min-width:220px">
      <div style="font-size:14px;font-weight:800;color:var(--color-text)">🔒 Mes dépenses est réservé à Premium</div>
      <div style="font-size:12px;${DEP_MUTED};margin-top:3px;line-height:1.5">Aperçu figé sur des données fictives : importe ton relevé, vois ce que tu paies vraiment, résilie ce qui ne sert à rien et découvre ce que ça donnerait investi.</div>
    </div>
    <button onclick="showPlansModal()" style="padding:11px 18px;background:#16a34a;color:#fff;border:none;border-radius:10px;font:inherit;font-size:13px;font-weight:800;cursor:pointer">✦ Débloquer avec Premium</button>
  </div>`;
  root.innerHTML = banner + `<div class="agent-sample" style="opacity:.96">${depRenderResults()}</div>`;
  depRenderSavings(); depDrawChart();
  depState = prev;
}
function renderDepenses() {
  if (!isPremiumUser()) { depState = null; depRenderSample(); return; }
  depState = depLoad(); depRender();
}
function depRefreshRow() { depRender(); }

// ── Vue « tout afficher » : plein écran, par catégorie ou par date, avec recherche et export CSV ──
let _depFullMode = 'cat';
function depFullData() {
  const byKey = new Map(depState.items.map(i => [i.key, i]));
  if ((depState.txs || []).length) return depState.txs.map(t => ({ d: t.d, l: t.l, a: t.a, k: t.k, cat: (byKey.get(t.k) || {}).cat || 'autre', monthly: false }));
  return depState.items.map(i => ({ d: '', l: i.label, a: i.monthly, k: i.key, cat: i.cat, monthly: true }));
}
function depOpenFullList(mode) {
  if (!depState) return;
  if (mode) _depFullMode = mode;
  let o = document.getElementById('dep-full');
  if (!o) { o = document.createElement('div'); o.id = 'dep-full'; o.style.cssText = 'position:fixed;inset:0;z-index:10010;background:var(--color-bg);overflow-y:auto'; document.body.appendChild(o); document.body.style.overflow = 'hidden'; }
  const q = (document.getElementById('dep-full-q')?.value || '').toLowerCase().trim();
  const rows = depFullData().filter(r => !q || r.l.toLowerCase().includes(q) || (DEP_CATS[r.cat] || DEP_CATS.autre).label.toLowerCase().includes(q));
  const fmtDay = d => { const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
  const row = r => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--color-border);font-size:13px"><span style="width:82px;flex-shrink:0;font-size:12px;${DEP_MUTED}">${fmtDay(r.d)}</span><span style="flex:1;min-width:0;color:var(--color-text);overflow:hidden;text-overflow:ellipsis">${_escHtml(r.l)}</span>${depCatSelect(r.k, r.cat)}<strong style="width:${r.monthly ? 92 : 70}px;flex-shrink:0;text-align:right;color:var(--color-text)">${depFmt(r.a)}${r.monthly ? '/mois' : ''}</strong></div>`;
  let body = '';
  if (_depFullMode === 'date') body = rows.slice().sort((x, y) => x.d < y.d ? 1 : -1).map(row).join('');
  else {
    const groups = {};
    rows.forEach(r => { (groups[r.cat] = groups[r.cat] || []).push(r); });
    body = Object.entries(groups).map(([cat, list]) => ({ cat, list, total: list.reduce((t, r) => t + r.a, 0) })).sort((x, y) => y.total - x.total).map(g => {
      const c = DEP_CATS[g.cat] || DEP_CATS.autre;
      return `<div style="margin-top:14px"><div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:10px;font-size:13px;font-weight:800;color:var(--color-text)"><span>${c.ic} ${c.label} <span style="font-weight:600;${DEP_MUTED}">· ${g.list.length}</span></span><span>${depFmt(g.total)}</span></div>${g.list.sort((x, y) => y.a - x.a).map(row).join('')}</div>`;
    }).join('');
  }
  const total = rows.reduce((t, r) => t + r.a, 0);
  const tab = (m, l) => `<button onclick="depOpenFullList('${m}')" style="padding:7px 13px;border-radius:99px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;border:1px solid ${_depFullMode === m ? '#16a34a' : 'var(--color-border)'};background:${_depFullMode === m ? '#16a34a' : 'transparent'};color:${_depFullMode === m ? '#fff' : 'var(--color-text-secondary)'}">${l}</button>`;
  o.innerHTML = `
    <div style="max-width:860px;margin:0 auto;padding:18px 16px 40px">
      <div style="position:sticky;top:0;background:var(--color-bg);padding-bottom:10px;z-index:1">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px"><div style="font-size:20px;font-weight:900;color:var(--color-text)">🧾 Tout ce que tu as dépensé</div><button onclick="depCloseFullList()" style="background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);width:34px;height:34px;border-radius:50%;font-size:16px;cursor:pointer">✕</button></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${tab('cat', 'Par catégorie')}${tab('date', 'Par date')}
          <input id="dep-full-q" type="search" value="${_escHtml(q)}" placeholder="Rechercher…" oninput="depOpenFullList();document.getElementById('dep-full-q').focus()" style="flex:1;min-width:130px;padding:8px 11px;border:1px solid var(--color-border);border-radius:9px;background:var(--color-surface);color:var(--color-text);font:inherit;font-size:13px">
          <button onclick="depExportCsv()" style="padding:8px 12px;border:1px solid var(--color-border);border-radius:9px;background:transparent;color:var(--color-text);font:inherit;font-size:12.5px;font-weight:700;cursor:pointer">⬇ Exporter (CSV)</button></div>
        <div style="font-size:12px;${DEP_MUTED};margin-top:8px">${rows.length} ligne${rows.length > 1 ? 's' : ''} · total ${depFmt(total)}${rows.some(r => r.monthly) ? ' par mois' : ''}</div>
      </div>
      ${body || `<div style="padding:30px 0;text-align:center;${DEP_MUTED}">Aucun résultat.</div>`}
    </div>`;
}
function depCloseFullList() { document.getElementById('dep-full')?.remove(); document.body.style.overflow = ''; }
// Export local du classement (téléchargé sur l'appareil, rien n'est envoyé)
function depExportCsv() {
  const q = s => '"' + String(s).replace(/"/g, '""') + '"';
  const lines = ['Date;Libellé;Catégorie;Montant'].concat(depFullData().map(r => [r.d, q(r.l), q((DEP_CATS[r.cat] || DEP_CATS.autre).label), String(r.a).replace('.', ',')].join(';')));
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mes-depenses.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ── Correction manuelle de catégorie : s'applique à toutes les lignes du même commerçant ──
function depCatSelect(key, cat) {
  const opts = Object.entries(DEP_CATS).map(([k, c]) => `<option value="${k}"${k === cat ? ' selected' : ''}>${c.ic} ${c.label}</option>`).join('');
  return `<select onchange="depSetCat(${_escHtml(JSON.stringify(key))}, this.value)" title="Changer la catégorie" style="max-width:150px;padding:3px 4px;border:1px solid var(--color-border);border-radius:7px;background:var(--color-bg);color:var(--color-text);font:inherit;font-size:11px;cursor:pointer">${opts}</select>`;
}
function depSetCat(key, cat) {
  const it = depState.items.find(i => i.key === key);
  if (!it || !DEP_CATS[cat]) return;
  it.cat = cat; it.manual = true;
  if (!DEP_BINARY_CATS.includes(cat)) delete it.sub;
  depSave();
  // On retient la correction : elle s'appliquera aussi aux prochains relevés (même commerçant)
  try { const m = depManualMap(); m[key] = cat; localStorage.setItem(depMapKey(), JSON.stringify(m)); } catch {}
  const full = document.getElementById('dep-full');
  depRender();
  if (full) depOpenFullList();
  if (typeof showToast === 'function') showToast('✓ Catégorie modifiée pour ' + it.label);
}

// Corrections manuelles mémorisées par commerçant (par compte, sur cet appareil)
const depMapKey = () => 'iq_depenses_map_' + (currentUser?.id || 'demo');
function depManualMap() { try { return JSON.parse(localStorage.getItem(depMapKey()) || '{}') || {}; } catch { return {}; } }
function depApplyManualMap(items) {
  const m = depManualMap();
  items.forEach(i => { if (m[i.key] && DEP_CATS[m[i.key]]) { i.cat = m[i.key]; i.manual = true; } });
}
