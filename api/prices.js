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
    try {
      // Convert European tickers to Finnhub format
      const finnhubSymbol = toFinnhubSymbol(symbol);
      
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.c && data.c > 0) {
        quotes.push({
          symbol,
          price: data.c,           // current price
          change: data.d || 0,     // change
          changePct: data.dp || 0, // change percent
          high: data.h,
          low: data.l,
          open: data.o,
          prevClose: data.pc,
          name: symbol,
          source: 'finnhub'
        });
      } else {
        quotes.push({ symbol, price: null, change: 0, changePct: 0, source: null });
      }
    } catch (e) {
      quotes.push({ symbol, price: null, change: 0, changePct: 0, source: null });
    }
  }

  res.status(200).json({ quotes });
}

function toFinnhubSymbol(ticker) {
  // Finnhub uses exchange prefixes for non-US stocks
  if (ticker.endsWith('.PA')) return 'EURONEXT:' + ticker.replace('.PA', '');
  if (ticker.endsWith('.DE')) return 'XETR:' + ticker.replace('.DE', '');
  if (ticker.endsWith('.L'))  return 'LSE:' + ticker.replace('.L', '');
  if (ticker.endsWith('.MI')) return 'MIL:' + ticker.replace('.MI', '');
  if (ticker.endsWith('.SW')) return 'SWX:' + ticker.replace('.SW', '');
  if (ticker.endsWith('.WA')) return 'WSE:' + ticker.replace('.WA', '');
  if (ticker.endsWith('.AS')) return 'AMS:' + ticker.replace('.AS', '');
  // US stocks - no prefix needed
  return ticker;
}
