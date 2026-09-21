// api/_quotes.js — cours en direct pour les notifications (préfixe « _ » : Vercel n'en fait pas une route).
// Même logique de repli que api/prices.js (Finnhub, puis Yahoo) : les noms d'entreprise et les tickers européens fonctionnent.

const NAME_TO_YAHOO = {
  'LVMH': 'MC.PA', 'Air Liquide': 'AI.PA', 'TotalEnergies': 'TTE.PA',
  'BNP Paribas': 'BNP.PA', 'Veolia': 'VIE.PA', 'Veolia Environnement': 'VIE.PA',
  'Stellantis': 'STLA', 'Porsche': 'PAH3.DE', 'Porsche Automobil Holding': 'PAH3.DE',
  'Porsche Automobil': 'PAH3.DE', 'LOreal': 'OR.PA', 'Airbus': 'AIR.PA',
  'Schneider Electric': 'SU.PA', 'Sanofi': 'SAN.PA', 'AXA': 'CS.PA',
};

function toFinnhubSymbol(t) {
  if (t.endsWith('.PA')) return 'EURONEXT:' + t.replace('.PA', '');
  if (t.endsWith('.DE')) return 'XETR:' + t.replace('.DE', '');
  if (t.endsWith('.L'))  return 'LSE:' + t.replace('.L', '');
  if (t.endsWith('.MI')) return 'MIL:' + t.replace('.MI', '');
  if (t.endsWith('.SW')) return 'SWX:' + t.replace('.SW', '');
  if (t.endsWith('.AS')) return 'AMS:' + t.replace('.AS', '');
  return t;
}

function attemptsFor(symbol) {
  const y = NAME_TO_YAHOO[symbol];
  if (y) return [{ type: 'yahoo', ticker: y }, { type: 'finnhub', ticker: toFinnhubSymbol(y) }];
  const a = [{ type: 'finnhub', ticker: toFinnhubSymbol(symbol) }, { type: 'yahoo', ticker: symbol }];
  if (!symbol.includes('.') && !symbol.includes(':')) {
    a.push({ type: 'yahoo', ticker: symbol + '.PA' });
    a.push({ type: 'finnhub', ticker: 'EURONEXT:' + symbol });
  }
  return a;
}

async function fetchOne(at) {
  if (at.type === 'finnhub') {
    if (!process.env.FINNHUB_API_KEY) return null;
    const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(at.ticker)}&token=${process.env.FINNHUB_API_KEY}`, { signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    if (d && d.c > 0) return { price: d.c, changePct: typeof d.dp === 'number' ? d.dp : 0 };
    return null;
  }
  const r = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(at.ticker)}?interval=1d&range=1d`, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, signal: AbortSignal.timeout(6000),
  });
  const d = await r.json();
  const m = d?.chart?.result?.[0]?.meta;
  if (m?.regularMarketPrice > 0) {
    const prev = m.chartPreviousClose || m.previousClose || m.regularMarketPrice;
    return { price: m.regularMarketPrice, changePct: prev && prev !== m.regularMarketPrice ? (m.regularMarketPrice - prev) / prev * 100 : (m.regularMarketChangePercent || 0) };
  }
  return null;
}

async function getQuote(symbol, preferYahoo) {
  let list = attemptsFor(symbol);
  if (preferYahoo) list = [...list.filter(a => a.type === 'yahoo'), ...list.filter(a => a.type !== 'yahoo')];   // évite des requêtes Finnhub vouées à l'échec pour les valeurs européennes
  for (const at of list) {
    try { const q = await fetchOne(at); if (q) return q; } catch { /* essai suivant */ }
  }
  return null;
}

// Renvoie { symbole: { price, changePct } } (les symboles introuvables sont absents). 8 requêtes en parallèle maximum.
async function getQuotes(symbols, opts = {}) {
  const list = [...new Set(symbols.filter(Boolean))];
  const out = {};
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(8, list.length) }, async () => {
    while (i < list.length) {
      const s = list[i++];
      const q = await getQuote(s, opts.preferYahoo);
      if (q) out[s] = q;
    }
  }));
  return out;
}

module.exports = { getQuotes };
