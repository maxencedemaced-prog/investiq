// api/commodity-news.js — vrais titres d'actualité sur les matières premières (flux RSS publics d'Investing.com France).
// On ne renvoie que : titre, lien vers l'article d'origine, date, source. Jamais le texte des articles.
const ALLOWED_ORIGINS = [
  'https://kapitaro.fr',
  'https://www.kapitaro.fr',
  'https://investiq-kappa.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

const FEEDS = [
  'https://fr.investing.com/rss/news_11.rss',     // actualités matières premières
  'https://fr.investing.com/rss/commodities.rss', // analyses matières premières
];

// Limite simple par IP : ce point d'entrée ne doit pas servir de relais
const hits = new Map();
function rateLimited(key, max = 30, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(key) || { count: 0, start: now };
  if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
  entry.count++;
  hits.set(key, entry);
  return entry.count > max;
}

const decode = (s) => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/\s+/g, ' ').trim();

function parseRss(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const pick = (tag) => { const t = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>')); return t ? decode(t[1]) : ''; };
    const title = pick('title'), link = pick('link'), date = new Date(pick('pubDate').replace(/ GMT$/, '') + (/GMT|Z|[+-]\d{4}/.test(pick('pubDate')) ? '' : ' GMT'));
    if (!title || !/^https:\/\/(fr\.)?investing\.com\//.test(link)) continue;   // uniquement des liens vers la source
    items.push({ title: title.slice(0, 220), link, ts: isNaN(date) ? 0 : date.getTime(), source: 'Investing.com' });
  }
  return items;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: 'Trop de requêtes.', news: [] });

  const all = [];
  await Promise.all(FEEDS.map(async (url) => {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Kapitaro)', Accept: 'application/rss+xml, text/xml' }, signal: AbortSignal.timeout(7000) });
      if (r.ok) all.push(...parseRss(await r.text()));
    } catch { /* un flux en panne ne bloque pas l'autre */ }
  }));

  const seen = new Set();
  const news = all
    .filter(n => { const k = n.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 12);

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  if (!news.length) return res.status(200).json({ news: [], unavailable: true });
  return res.status(200).json({ news });
}
