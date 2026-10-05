// api/chart.js — historique de cours pour les graphiques (Yahoo Finance), même logique de symboles que /api/prices :
// cryptos et matières premières convertis en euros au taux du jour correspondant, devises inversées, métaux au gramme.
// Réponse : bougies { t (secondes), o, h, l, c, v } + devise. Aucune analyse, uniquement des cours.
const ALLOWED_ORIGINS = [
  'https://kapitaro.fr',
  'https://www.kapitaro.fr',
  'https://investiq-kappa.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

const hits = new Map();
function rateLimited(key, max = 40, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(key) || { count: 0, start: now };
  if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
  entry.count++;
  hits.set(key, entry);
  return entry.count > max;
}

const RANGES = {
  '1w':  { range: '5d',  interval: '30m', ttl: 300 },
  '1m':  { range: '1mo', interval: '1d',  ttl: 900 },
  '3m':  { range: '3mo', interval: '1d',  ttl: 1800 },
  '6m':  { range: '6mo', interval: '1d',  ttl: 1800 },
  '1y':  { range: '1y',  interval: '1d',  ttl: 3600 },
  '5y':  { range: '5y',  interval: '1wk', ttl: 3600 },
  'max': { range: 'max', interval: '1mo', ttl: 3600 },
};
const METAL_GRAM = { 'XAU-G': 'GC=F', 'XAG-G': 'SI=F', 'XPT-G': 'PL=F' };
// Positions saisies avec un nom ou un ancien ticker
const ALIAS = { 'LVMH': 'MC.PA', 'FDJ.PA': 'FDJU.PA', 'FDJ': 'FDJU.PA', 'TOTALENERGIES': 'TTE.PA', 'AIRBUS': 'AIR.PA', 'SANOFI': 'SAN.PA', 'AXA': 'CS.PA', 'VEOLIA': 'VIE.PA', 'AGGH.L': 'AGGH.AS', 'AGGH.DE': 'AGGH.AS' };

function planFor(symbol) {
  if (/^CUR-[A-Z]{3}$/.test(symbol)) return { ticker: 'EUR' + symbol.slice(4) + '=X', inv: true, cur: 'EUR' };
  if (METAL_GRAM[symbol]) return { ticker: METAL_GRAM[symbol], fx: true, per: 31.1034768, cur: 'EUR' };
  if (/^[A-Z0-9]{2,20}-EUR$/.test(symbol)) return { ticker: symbol, cur: 'EUR' };
  if (/^[A-Z0-9]{2,20}-USD$/.test(symbol)) return { ticker: symbol, fx: true, cur: 'EUR' };
  if (/^[A-Z]{1,3}=F$/.test(symbol)) return { ticker: symbol, fx: true, cur: 'EUR' };
  return { ticker: ALIAS[symbol] || symbol };
}

async function yahoo(ticker, range, interval) {
  const r = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`,
    { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const res = (await r.json())?.chart?.result?.[0];
  const q = res?.indicators?.quote?.[0];
  if (!res || !q || !res.timestamp) return null;
  const pts = [];
  for (let i = 0; i < res.timestamp.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
    if ([o, h, l, c].some(x => !Number.isFinite(x) || x <= 0)) continue;
    pts.push({ t: res.timestamp[i], o, h, l, c, v: Number.isFinite(q.volume?.[i]) ? q.volume[i] : 0 });
  }
  return { pts, cur: res.meta?.currency || null };
}

const sig = (x) => { const d = x >= 100 ? 2 : x >= 1 ? 3 : x >= 0.01 ? 5 : 8; return Math.round(x * 10 ** d) / 10 ** d; };

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: 'Trop de requêtes.', points: [] });

  const symbol = String(req.query?.symbol || '').trim().toUpperCase();
  const cfg = RANGES[String(req.query?.range || '1y')] || RANGES['1y'];
  if (!/^[A-Z0-9.\-=]{1,20}$/.test(symbol)) return res.status(400).json({ error: 'symbole invalide', points: [] });

  try {
    const plan = planFor(symbol);
    const main = await yahoo(plan.ticker, cfg.range, cfg.interval);
    if (!main || main.pts.length < 2) return res.status(200).json({ symbol, points: [], unavailable: true });
    let pts = main.pts;

    if (plan.fx) {   // cours en dollars : converti en euros au taux de CHAQUE bougie (et non au taux du jour)
      const fx = await yahoo('EURUSD=X', cfg.range, cfg.interval);
      if (!fx || !fx.pts.length) return res.status(200).json({ symbol, points: [], unavailable: true });
      let j = 0;
      pts = pts.map(p => {
        while (j + 1 < fx.pts.length && fx.pts[j + 1].t <= p.t) j++;
        const rate = fx.pts[j].c;   // dollars pour 1 euro
        const k = 1 / rate / (plan.per || 1);
        return { t: p.t, o: p.o * k, h: p.h * k, l: p.l * k, c: p.c * k, v: p.v };
      });
    } else if (plan.inv) {   // devise : valeur en euros d'une unité de la devise
      pts = pts.map(p => ({ t: p.t, o: 1 / p.o, h: 1 / p.l, l: 1 / p.h, c: 1 / p.c, v: 0 }));
    }
    pts = pts.map(p => ({ t: p.t, o: sig(p.o), h: sig(p.h), l: sig(p.l), c: sig(p.c), v: p.v }));

    res.setHeader('Cache-Control', `s-maxage=${cfg.ttl}, stale-while-revalidate=${cfg.ttl * 2}`);
    return res.status(200).json({ symbol, currency: plan.cur || main.cur || null, range: req.query?.range || '1y', interval: cfg.interval, points: pts });
  } catch (e) {
    return res.status(200).json({ symbol, points: [], unavailable: true });
  }
}
