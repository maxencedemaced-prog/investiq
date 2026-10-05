// api/market-data.js — indicateurs calculés sur les VRAIS cours (Yahoo Finance, 1 an d'historique) pour nourrir l'analyse du plan du mois.
// Renvoie par valeur : cours, performances 1/3/6/12 mois, baisse maximale sur 1 an, volatilité, écart au plus haut.
// Pour les valeurs américaines, ajoute (si la clé Finnhub est configurée) PER, marge nette et rendement du dividende.
// Rien n'est inventé : une valeur dont les données manquent est simplement absente de la réponse.
const ALLOWED_ORIGINS = [
  'https://kapitaro.fr',
  'https://www.kapitaro.fr',
  'https://investiq-kappa.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

const hits = new Map();
function rateLimited(key, max = 12, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(key) || { count: 0, start: now };
  if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
  entry.count++;
  hits.set(key, entry);
  return entry.count > max;
}

const pct = (a, b) => (a > 0 && b > 0) ? Math.round((b / a - 1) * 1000) / 10 : null;

function indicators(closes) {
  const c = closes.filter(x => Number.isFinite(x) && x > 0);
  if (c.length < 120) return null;   // pas assez d'historique pour juger
  const last = c[c.length - 1];
  const back = (n) => c[Math.max(0, c.length - 1 - n)];
  let peak = c[0], dd = 0;
  for (const x of c) { if (x > peak) peak = x; dd = Math.min(dd, x / peak - 1); }
  const rets = []; for (let i = 1; i < c.length; i++) rets.push(Math.log(c[i] / c[i - 1]));
  const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
  const sd = Math.sqrt(rets.reduce((s, x) => s + (x - mean) ** 2, 0) / (rets.length - 1));
  const hi = Math.max(...c);
  return {
    price: Math.round(last * 100) / 100,
    p1m: pct(back(21), last), p3m: pct(back(63), last), p6m: pct(back(126), last), p1y: pct(c[0], last),
    dd: Math.round(dd * 1000) / 10,                 // baisse maximale (négatif)
    vol: Math.round(sd * Math.sqrt(252) * 1000) / 10,   // volatilité annualisée en %
    fromHigh: Math.round((last / hi - 1) * 1000) / 10,
  };
}

async function one(symbol) {
  try {
    const r = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const j = await r.json();
    const res = j?.chart?.result?.[0];
    const ind = indicators(res?.indicators?.quote?.[0]?.close || []);
    if (!ind) return null;
    ind.cur = res.meta?.currency || null;
    const key = process.env.FINNHUB_API_KEY;
    if (key && !symbol.includes('.')) {   // fondamentaux : fiables seulement pour les valeurs américaines en offre gratuite
      try {
        const f = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${key}`, { signal: AbortSignal.timeout(4000) });
        if (f.ok) {
          const m = (await f.json())?.metric || {};
          const num = (x, d = 1) => Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null;
          ind.pe = num(m.peTTM ?? m.peBasicExclExtraTTM);
          ind.margin = num(m.netProfitMarginTTM);
          ind.divYield = num(m.currentDividendYieldTTM ?? m.dividendYieldIndicatedAnnual, 2);
        }
      } catch { /* fondamentaux facultatifs */ }
    }
    return ind;
  } catch { return null; }
}

// Grands indices : la tendance d'ensemble du marché (sert de contexte à l'analyse)
const INDICES = [['^FCHI', 'CAC 40'], ['^STOXX50E', 'Euro Stoxx 50'], ['^GSPC', 'S&P 500'], ['^IXIC', 'Nasdaq'], ['^VIX', 'VIX (indice de peur, niveau)']];

const decode = (s) => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// Derniers titres de presse sur une entreprise (flux RSS public Google Actualités, 14 derniers jours).
// On ne garde que : titre, source, date. Jamais le texte des articles.
async function newsFor(name) {
  try {
    const q = encodeURIComponent(name + ' action bourse when:14d');
    const r = await fetch(`https://news.google.com/rss/search?q=${q}&hl=fr&gl=FR&ceid=FR:fr`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Kapitaro)' }, signal: AbortSignal.timeout(5000) });
    if (!r.ok) return [];
    const xml = await r.text();
    const out = [];
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const pick = (t) => { const x = m[1].match(new RegExp('<' + t + '[^>]*>([\\s\\S]*?)</' + t + '>')); return x ? decode(x[1]) : ''; };
      let title = pick('title'), source = pick('source');
      if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
      const ts = Date.parse(pick('pubDate'));
      if (!title || !ts) continue;
      if (/cours (de l[’']?)?action|cotation|objectif de cours|cours\s+\S+\s+bourse|consensus des analystes|\|\s*cours/i.test(title)) continue;   // simples pages de cours : aucune information
      out.push({ title: title.slice(0, 140), source: source.slice(0, 40), ts });
      if (out.length >= 3) break;
    }
    return out;
  } catch { return []; }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: 'Trop de requêtes.', data: {} });

  const symbols = [...new Set(String(req.query?.symbols || '').split(',').map(s => s.trim().toUpperCase()).filter(s => /^[A-Z0-9.\-]{1,14}$/.test(s)))].slice(0, 60);
  if (!symbols.length) return res.status(400).json({ error: 'symbols manquant', data: {} });

  const data = {};
  let i = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {   // 8 requêtes en parallèle
    while (i < symbols.length) { const s = symbols[i++]; const v = await one(s); if (v) data[s] = v; }
  }));

  // tendance des grands indices
  const market = [];
  await Promise.all(INDICES.map(async ([sym, label]) => { const v = await one(sym); if (v) market.push({ symbol: sym, label, ...v }); }));
  market.sort((a, b) => INDICES.findIndex(i => i[0] === a.symbol) - INDICES.findIndex(i => i[0] === b.symbol));

  // actualités récentes de chaque entreprise (paramètre names=TICKER:Nom,TICKER:Nom)
  const names = String(req.query?.names || '').split(',').map(x => x.split(':')).filter(p => p.length === 2)
    .map(([t, n]) => [t.trim().toUpperCase(), n.replace(/[^\p{L}\p{N} &'.\-]/gu, '').trim().slice(0, 40)]).filter(([t, n]) => /^[A-Z0-9.\-]{1,14}$/.test(t) && n).slice(0, 45);
  const news = {};
  let j = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (j < names.length) { const [t, n] = names[j++]; const items = await newsFor(n); if (items.length) news[t] = items; }
  }));

  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  return res.status(200).json({ data, market, news, asOf: new Date().toISOString(), requested: symbols.length });
}
