export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ quotes: [] });

  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);
  const quotes = [];

  for (const symbol of symbolList) {
    try {
      // TradingView REST API - no auth needed for basic quotes
      const tvSymbol = toTradingViewSymbol(symbol);
      const url = `https://symbol-search.tradingview.com/symbol_search/v3/?text=${encodeURIComponent(symbol)}&hl=1&exchange=&lang=fr&search_type=undefined&domainEnabled=true&sort_by_country=FR`;
      
      const searchRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Origin': 'https://www.tradingview.com',
          'Referer': 'https://www.tradingview.com/'
        }
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const match = searchData.symbols?.[0];
        if (match) {
          // Get quote from TradingView
          const exchange = match.exchange || 'NASDAQ';
          const tvTicker = match.symbol || symbol;
          const quoteUrl = `https://quote-feed.tradingview.com/l?=${exchange}%3A${tvTicker}`;
          
          const quoteRes = await fetch(quoteUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0',
              'Origin': 'https://www.tradingview.com',
              'Referer': 'https://www.tradingview.com/'
            }
          });

          if (quoteRes.ok) {
            const quoteData = await quoteRes.json();
            const key = `${exchange}:${tvTicker}`;
            const q = quoteData[key];
            if (q && q.lp) {
              quotes.push({
                symbol,
                price: q.lp,
                change: q.ch || 0,
                changePct: q.chp || 0,
                name: match.full_name || symbol,
                source: 'tradingview'
              });
              continue;
            }
          }
        }
      }

      // Fallback to Yahoo Finance
      const yahooRes = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'application/json' } }
      );
      if (yahooRes.ok) {
        const yahooData = await yahooRes.json();
        const meta = yahooData.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice) {
          quotes.push({
            symbol,
            price: meta.regularMarketPrice,
            change: meta.regularMarketPrice - meta.previousClose,
            changePct: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
            name: meta.longName || meta.shortName || symbol,
            source: 'yahoo'
          });
          continue;
        }
      }

      // Nothing found
      quotes.push({ symbol, price: null, change: 0, changePct: 0, name: symbol, source: null });

    } catch (e) {
      quotes.push({ symbol, price: null, change: 0, changePct: 0, name: symbol, source: null });
    }
  }

  res.status(200).json({ quotes });
}

function toTradingViewSymbol(ticker) {
  // Convert Yahoo Finance format to TradingView
  return ticker
    .replace('.PA', '')   // Euronext Paris
    .replace('.DE', '')   // XETRA
    .replace('.L', '')    // LSE
    .replace('.MI', '')   // Milan
    .replace('.SW', '')   // Zurich
    .replace('.WA', '')   // Warsaw
    .replace('.CO', '')   // Copenhagen
    .replace('.HE', '');  // Helsinki
}
