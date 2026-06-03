export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ results: [] });

  try {
    // Yahoo Finance search — le plus fiable depuis Vercel
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&enableFuzzyQuery=false&lang=fr-FR`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      }
    });

    if (!response.ok) throw new Error('Yahoo search failed: ' + response.status);

    const data = await response.json();
    const quotes = data.quotes || [];

    const results = quotes
      .filter(q => ['EQUITY', 'ETF', 'MUTUALFUND', 'INDEX'].includes(q.quoteType))
      .slice(0, 8)
      .map(q => ({
        ticker: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        type: q.quoteType === 'ETF' ? 'ETF' : 'Action',
        sector: q.industry || q.sector || '',
        exchange: q.fullExchangeName || q.exchange || '',
      }));

    return res.status(200).json({ results });

  } catch (error) {
    console.error('Search error:', error.message);

    // Fallback : recherche locale sur les entreprises populaires
    const popular = [
      { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
      { ticker: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
      { ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
      { ticker: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ' },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ' },
      { ticker: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
      { ticker: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ' },
      { ticker: 'MC.PA', name: 'LVMH', exchange: 'Euronext Paris' },
      { ticker: 'TTE.PA', name: 'TotalEnergies', exchange: 'Euronext Paris' },
      { ticker: 'AI.PA', name: 'Air Liquide', exchange: 'Euronext Paris' },
      { ticker: 'BNP.PA', name: 'BNP Paribas', exchange: 'Euronext Paris' },
      { ticker: 'OR.PA', name: "L'Oréal", exchange: 'Euronext Paris' },
      { ticker: 'SAN.PA', name: 'Sanofi', exchange: 'Euronext Paris' },
      { ticker: 'AIR.PA', name: 'Airbus', exchange: 'Euronext Paris' },
      { ticker: 'ASML', name: 'ASML Holding', exchange: 'NASDAQ' },
      { ticker: 'SAP', name: 'SAP SE', exchange: 'NYSE' },
      { ticker: 'IWDA.AS', name: 'iShares Core MSCI World ETF', exchange: 'Euronext Amsterdam' },
      { ticker: 'VWCE.DE', name: 'Vanguard FTSE All-World ETF', exchange: 'XETRA' },
      { ticker: 'PAH3.DE', name: 'Porsche Automobil Holding', exchange: 'XETRA' },
      { ticker: 'VOW3.DE', name: 'Volkswagen AG', exchange: 'XETRA' },
    ];

    const q_lower = q.toLowerCase();
    const results = popular
      .filter(c => c.name.toLowerCase().includes(q_lower) || c.ticker.toLowerCase().includes(q_lower))
      .slice(0, 6);

    return res.status(200).json({ results });
  }
}
