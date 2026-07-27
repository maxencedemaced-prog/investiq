export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ quotes: [] });

  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);
  const apiKey = process.env.FINNHUB_API_KEY;

  const results = await Promise.allSettled(
    symbolList.map(async (symbol) => {
      const attempts = getSymbolAttempts(symbol);
      for (const attempt of attempts) {
        try {
          const result = await fetchQuote(attempt, symbol, apiKey);
          if (result && result.price > 0) return result;
        } catch(e) {}
      }
      return { symbol, price: null, changePct: 0, change: 0, source: null };
    })
  );

  const quotes = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { symbol: symbolList[i], price: null, changePct: 0, change: 0, source: null }
  );

  res.status(200).json({ quotes });
}

function getSymbolAttempts(symbol) {
  const nameToYahoo = {
    'LVMH': 'MC.PA', 'Air Liquide': 'AI.PA', 'TotalEnergies': 'TTE.PA',
    'BNP Paribas': 'BNP.PA', 'Veolia': 'VIE.PA', 'Veolia Environnement': 'VIE.PA',
    'Stellantis': 'STLA', 'Porsche': 'PAH3.DE', 'Porsche Automobil Holding': 'PAH3.DE',
    'Porsche Automobil': 'PAH3.DE', 'LOreal': 'OR.PA', 'Airbus': 'AIR.PA',
    'Schneider Electric': 'SU.PA', 'Sanofi': 'SAN.PA', 'AXA': 'CS.PA',
  };

  const yahooTicker = nameToYahoo[symbol];
  if (yahooTicker) {
    return [
      { type: 'yahoo', ticker: yahooTicker },
      { type: 'finnhub', ticker: toFinnhubSymbol(yahooTicker) },
    ];
  }

  const attempts = [
    { type: 'finnhub', ticker: toFinnhubSymbol(symbol) },
    { type: 'yahoo', ticker: symbol },
  ];

  if (!symbol.includes('.') && !symbol.includes(':')) {
    attempts.push({ type: 'yahoo', ticker: symbol + '.PA' });
    attempts.push({ type: 'finnhub', ticker: 'EURONEXT:' + symbol });
  }

  return attempts;
}

async function fetchQuote(attempt, originalSymbol, apiKey) {
  if (attempt.type === 'finnhub') {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(attempt.ticker)}&token=${apiKey}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    if (d && d.c && d.c > 0) { // Accept even if price unchanged
      return { symbol: originalSymbol, price: d.c, changePct: typeof d.dp === 'number' ? d.dp : 0, change: d.d || 0, source: 'finnhub' };
    }
  } else {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(attempt.ticker)}?interval=1d&range=1d`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    const d = await r.json();
    const meta = d?.chart?.result?.[0]?.meta;
    if (meta?.regularMarketPrice && meta.regularMarketPrice > 0) {
      const prev = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
      const changePct = prev && prev !== meta.regularMarketPrice
        ? ((meta.regularMarketPrice - prev) / prev * 100)
        : (meta.regularMarketChangePercent || 0);
      return { symbol: originalSymbol, price: meta.regularMarketPrice, changePct, change: meta.regularMarketPrice - prev, source: 'yahoo' };
    }
  }
  return null;
}

function toFinnhubSymbol(ticker) {
  if (ticker.endsWith('.PA')) return 'EURONEXT:' + ticker.replace('.PA', '');
  if (ticker.endsWith('.DE')) return 'XETR:' + ticker.replace('.DE', '');
  if (ticker.endsWith('.L'))  return 'LSE:' + ticker.replace('.L', '');
  if (ticker.endsWith('.MI')) return 'MIL:' + ticker.replace('.MI', '');
  if (ticker.endsWith('.SW')) return 'SWX:' + ticker.replace('.SW', '');
  if (ticker.endsWith('.AS')) return 'AMS:' + ticker.replace('.AS', '');
  return ticker;
}
