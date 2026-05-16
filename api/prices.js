export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ quotes: [] });

  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);
  const apiKey = process.env.FINNHUB_API_KEY;
  const quotes = [];

  // Fetch all from Finnhub in parallel
  const results = await Promise.allSettled(
    symbolList.map(async (symbol) => {
      const finnhubSymbol = toFinnhubSymbol(symbol);
      
      // Try Finnhub first
      try {
        const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${apiKey}`;
        const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const d = await r.json();
        if (d && d.c && d.c > 0 && d.c !== d.pc) {
          // Validate price makes sense (not obviously wrong)
          return {
            symbol,
            price: d.c,
            changePct: d.dp || 0,
            change: d.d || 0,
            source: 'finnhub'
          };
        }
      } catch(e) {}

      // Fallback: Yahoo Finance
      try {
        const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
        const r = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'fr-FR,fr;q=0.9'
          },
          signal: AbortSignal.timeout(5000)
        });
        const d = await r.json();
        const meta = d?.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice && meta.regularMarketPrice > 0) {
          const prev = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
          return {
            symbol,
            price: meta.regularMarketPrice,
            changePct: prev ? ((meta.regularMarketPrice - prev) / prev * 100) : 0,
            change: meta.regularMarketPrice - prev,
            source: 'yahoo'
          };
        }
      } catch(e) {}

      return { symbol, price: null, changePct: 0, change: 0, source: null };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      quotes.push(result.value);
    } else {
      const symbol = symbolList[results.indexOf(result)];
      quotes.push({ symbol, price: null, changePct: 0, change: 0, source: null });
    }
  }

  res.status(200).json({ quotes });
}

function toFinnhubSymbol(ticker) {
  if (ticker.endsWith('.PA')) return 'EURONEXT:' + ticker.replace('.PA', '');
  if (ticker.endsWith('.DE')) return 'XETR:' + ticker.replace('.DE', '');
  if (ticker.endsWith('.L'))  return 'LSE:' + ticker.replace('.L', '');
  if (ticker.endsWith('.MI')) return 'MIL:' + ticker.replace('.MI', '');
  if (ticker.endsWith('.SW')) return 'SWX:' + ticker.replace('.SW', '');
  if (ticker.endsWith('.WA')) return 'WSE:' + ticker.replace('.WA', '');
  if (ticker.endsWith('.AS')) return 'AMS:' + ticker.replace('.AS', '');
  return ticker;
}
