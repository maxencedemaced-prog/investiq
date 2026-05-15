export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ results: [] });

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=fr-FR&region=FR&quotesCount=8&newsCount=0&listsCount=0`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    const data = await response.json();
    const quotes = data.quotes || [];
    const results = quotes
      .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'MUTUALFUND')
      .slice(0, 7)
      .map(q => ({
        ticker: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        type: q.quoteType === 'ETF' ? 'ETF' : 'Action',
        sector: q.sector || q.industry || q.quoteType || 'Autre',
        exchange: q.exchange || q.fullExchangeName || ''
      }));
    res.status(200).json({ results });
  } catch (error) {
    res.status(500).json({ results: [], error: error.message });
  }
}
