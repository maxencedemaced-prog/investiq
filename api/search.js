export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ results: [] });

  try {
    // TradingView symbol search - much better than Yahoo
    const url = `https://symbol-search.tradingview.com/symbol_search/v3/?text=${encodeURIComponent(q)}&hl=1&exchange=&lang=fr&search_type=undefined&domainEnabled=true&sort_by_country=FR&type=`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/'
      }
    });

    if (!response.ok) throw new Error('TradingView search failed');

    const data = await response.json();
    const symbols = data.symbols || [];

    const results = symbols
      .slice(0, 8)
      .map(s => ({
        ticker: s.symbol || s.id,
        name: s.full_name || s.description || s.symbol,
        type: s.type === 'fund' || s.type === 'ETF' ? 'ETF' : 'Action',
        sector: s.industry || s.type || 'Autre',
        exchange: s.exchange || s.prefix || '',
        tv_symbol: `${s.prefix || s.exchange}:${s.symbol}`,
        logo: s.logoid ? `https://s3-symbol-logo.tradingview.com/${s.logoid}.svg` : null
      }))
      .filter(r => r.ticker && r.name);

    res.status(200).json({ results });

  } catch (error) {
    // Fallback to Yahoo Finance search
    try {
      const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`;
      const yahooRes = await fetch(yahooUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const yahooData = await yahooRes.json();
      const quotes = yahooData.quotes || [];
      const results = quotes
        .filter(q => ['EQUITY','ETF','MUTUALFUND'].includes(q.quoteType))
        .slice(0, 8)
        .map(q => ({
          ticker: q.symbol,
          name: q.longname || q.shortname || q.symbol,
          type: q.quoteType === 'ETF' ? 'ETF' : 'Action',
          sector: q.industry || q.sector || 'Autre',
          exchange: q.exchange || q.fullExchangeName || ''
        }));
      res.status(200).json({ results });
    } catch {
      res.status(500).json({ results: [] });
    }
  }
}
