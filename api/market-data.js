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

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
  return res.status(200).json({ data, asOf: new Date().toISOString(), requested: symbols.length });
}
