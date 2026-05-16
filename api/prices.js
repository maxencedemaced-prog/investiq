export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ quotes: [] });

  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);
  const apiKey = process.env.FINNHUB_API_KEY;
  const quotes = [];

  for (const symbol of symbolList) {
    let price = null;
    let changePct = 0;

    // Try Finnhub with correct format
    const finnhubSymbol = toFinnhubSymbol(symbol);
    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${apiKey}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d && d.c > 0) {
        price = d.c;
        changePct = d.dp || 0;
      }
    } catch(e) {}

    // If Finnhub failed, try Yahoo Finance as fallback
    if (!price) {
      try {
        const yahooSymbol = symbol; // Yahoo uses original format (MC.PA, BMW.DE etc)
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;
        const r = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        const d = await r.json();
        const meta = d?.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice) {
          price = meta.regularMarketPrice;
          changePct = meta.previousClose ? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100) : 0;
        }
      } catch(e) {}
    }

    quotes.push({
      symbol,
      price,
      changePct: Math.round(changePct * 100) / 100,
      change: 0
    });
  }

  res.status(200).json({ quotes });
}

function toFinnhubSymbol(ticker) {
  // Finnhub requires exchange prefix for non-US stocks
  if (ticker.endsWith('.PA')) return 'EURONEXT:' + ticker.replace('.PA', '');
  if (ticker.endsWith('.DE')) return 'XETR:' + ticker.replace('.DE', '');
  if (ticker.endsWith('.L'))  return 'LSE:' + ticker.replace('.L', '');
  if (ticker.endsWith('.MI')) return 'MIL:' + ticker.replace('.MI', '');
  if (ticker.endsWith('.SW')) return 'SWX:' + ticker.replace('.SW', '');
  if (ticker.endsWith('.WA')) return 'WSE:' + ticker.replace('.WA', '');
  if (ticker.endsWith('.AS')) return 'AMS:' + ticker.replace('.AS', '');
  if (ticker.endsWith('.CO')) return 'CPH:' + ticker.replace('.CO', '');
  if (ticker.endsWith('.HE')) return 'HEL:' + ticker.replace('.HE', '');
  // US stocks - no prefix needed
  return ticker;
}
