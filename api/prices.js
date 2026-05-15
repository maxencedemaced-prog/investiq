export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: 'No symbols provided' });

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketChange,shortName`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    const data = await response.json();
    const quotes = (data.quoteResponse?.result || []).map(q => ({
      symbol: q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePct: q.regularMarketChangePercent,
      name: q.shortName
    }));
    res.status(200).json({ quotes });
  } catch (error) {
    res.status(500).json({ error: error.message, quotes: [] });
  }
}
