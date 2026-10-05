// api/live.js — dernier cours d'un actif pour les graphiques « en direct » (Yahoo Finance).
// Réponse très courte en cache partagé (3 s) : mille personnes sur le même actif = un seul appel à la source.
// Même logique de symboles que /api/chart : cryptos et matières premières en dollars convertis en euros, devises inversées, métaux au gramme.
// Renvoie aussi l'âge du dernier cours : les actions européennes ont environ 15 minutes de retard (règle des bourses), pas les actions US, cryptos et devises.
const ALLOWED_ORIGINS = [
  'https://kapitaro.fr',
  'https://www.kapitaro.fr',
  'https://investiq-kappa.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

const hits = new Map();
function rateLimited(key, max = 90, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(key) || { count: 0, start: now };
  if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
  entry.count++;
  hits.set(key, entry);
  return entry.count > max;
}

const METAL_GRAM = { 'XAU-G': 'GC=F', 'XAG-G': 'SI=F', 'XPT-G': 'PL=F' };
const ALIAS = { 'AIR LIQUIDE': 'AI.PA', 'BNP PARIBAS': 'BNP.PA', 'SCHNEIDER ELECTRIC': 'SU.PA', 'VEOLIA ENVIRONNEMENT': 'VIE.PA', 'PORSCHE': 'PAH3.DE', 'PORSCHE HOLDING': 'PAH3.DE', 'PORSCHE AUTOMOBIL HOLDING': 'PAH3.DE', 'FDJ UNITED': 'FDJU.PA', 'LOREAL': 'OR.PA', 'STELLANTIS': 'STLA', 'LVMH': 'MC.PA', 'FDJ.PA': 'FDJU.PA', 'FDJ': 'FDJU.PA', 'TOTALENERGIES': 'TTE.PA', 'AIRBUS': 'AIR.PA', 'SANOFI': 'SAN.PA', 'AXA': 'CS.PA', 'VEOLIA': 'VIE.PA', 'AGGH.L': 'AGGH.AS', 'AGGH.DE': 'AGGH.AS' };

function planFor(symbol) {
  if (/^CUR-[A-Z]{3}$/.test(symbol)) return { ticker: 'EUR' + symbol.slice(4) + '=X', inv: true, cur: 'EUR' };
  if (METAL_GRAM[symbol]) return { ticker: METAL_GRAM[symbol], fx: true, per: 31.1034768, cur: 'EUR' };
  if (/^[A-Z0-9]{2,20}-EUR$/.test(symbol)) return { ticker: symbol, cur: 'EUR' };
  if (/^[A-Z0-9]{2,20}-USD$/.test(symbol)) return { ticker: symbol, fx: true, cur: 'EUR' };
  if (/^[A-Z]{1,3}=F$/.test(symbol)) return { ticker: symbol, fx: true, cur: 'EUR' };
  return { ticker: ALIAS[symbol] || symbol };
}

async function meta(ticker) {
  const r = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
    { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
  if (!r.ok) return null;
  const m = (await r.json())?.chart?.result?.[0]?.meta;
  if (!m || !Number.isFinite(m.regularMarketPrice) || m.regularMarketPrice <= 0) return null;
  return { price: m.regularMarketPrice, ts: m.regularMarketTime || 0, cur: m.currency || null };
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: 'Trop de requêtes.' });

  const symbol = String(req.query?.symbol || '').trim().toUpperCase();
  if (!/^[A-Z0-9.\-= ]{1,30}$/.test(symbol)) return res.status(400).json({ error: 'symbole invalide' });

  try {
    const plan = planFor(symbol);
    const m = await meta(plan.ticker);
    if (!m) return res.status(200).json({ symbol, unavailable: true });
    let price = m.price, ts = m.ts;
    if (plan.fx) {
      const fx = await meta('EURUSD=X');
      if (!fx) return res.status(200).json({ symbol, unavailable: true });
      price = price / fx.price / (plan.per || 1);
      ts = Math.min(ts, fx.ts || ts);
    } else if (plan.inv) {
      price = 1 / price;
    }
    const now = Math.floor(Date.now() / 1000);
    res.setHeader('Cache-Control', 's-maxage=3, stale-while-revalidate=10');
    return res.status(200).json({ symbol, price: Number(price.toPrecision(7)), ts, ageMin: Math.max(0, Math.round((now - ts) / 60)), currency: plan.cur || m.cur || null, asOf: now });
  } catch (e) {
    return res.status(200).json({ symbol, unavailable: true });
  }
}
