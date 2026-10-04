// Calendrier économique (Financial Modeling Prep). En cas d'échec, on renvoie une liste vide marquée
// « unavailable » avec un code de cause — jamais d'événements inventés.
const ALLOWED_ORIGINS = [
  'https://kapitaro.fr',
  'https://www.kapitaro.fr',
  'https://investiq-kappa.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

// FMP renvoie des codes pays bruts — on les aligne sur ce que le front sait afficher
// (drapeaux définis dans app.js). Les zones euro sont regroupées sous "EU".
const COUNTRY_MAP = {
  US: 'US', FR: 'FR', DE: 'DE', GB: 'UK', UK: 'UK', JP: 'JP', CN: 'CN',
  EA: 'EU', EMU: 'EU', EU: 'EU', ITA: 'EU', ESP: 'EU', IT: 'EU', ES: 'EU',
};

// Rate limit simple en mémoire par IP — évite d'épuiser le quota FMP payant en cas d'abus
const hits = new Map();
function rateLimited(key, max = 30, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(key) || { count: 0, start: now };
  if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
  entry.count++;
  hits.set(key, entry);
  return entry.count > max;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';

  let reason = 'exception';
  try {
    // Récupère le calendrier économique via Financial Modeling Prep
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) { reason = 'no_key'; throw new Error('FMP_API_KEY manquante'); }
    if (rateLimited(ip)) { reason = 'rate_limit'; throw new Error('rate-limit local atteint'); }

    const now = new Date();
    const from = now.toISOString().split('T')[0];
    const to = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const url = `https://financialmodelingprep.com/stable/economic-calendar?from=${from}&to=${to}&apikey=${apiKey}`;
    const resp = await fetch(url);
    const raw = await resp.text();
    let data;
    try { data = JSON.parse(raw); } catch {
      console.error('[api/agenda] FMP non-JSON:', resp.status, raw.slice(0, 300));
      reason = 'fmp_non_json_' + resp.status;
      throw new Error('FMP indisponible (réponse non-JSON)');
    }

    if (!resp.ok || !Array.isArray(data)) {
      console.error('[api/agenda] FMP error:', resp.status, JSON.stringify(data).slice(0, 300));
      reason = 'fmp_status_' + resp.status;
      throw new Error('FMP indisponible');
    }

    const events = data
      .filter(e => {
        const impact = (e.impact || '').toLowerCase();
        return (impact === 'high' || impact === 'medium') && COUNTRY_MAP[e.country];
      })
      .map(e => ({
        id: `${e.event}-${e.date}`,
        date: e.date?.split(' ')[0] || e.date,
        heure: e.date?.split(' ')[1]?.slice(0, 5) || '00:00',
        titre: e.event || 'Événement économique',
        pays: COUNTRY_MAP[e.country] || e.country,
        impact: (e.impact || 'low').toLowerCase(),
        precedent: e.previous ?? null,
        prevision: e.estimate ?? null,
        actual: e.actual ?? null,
        unite: e.unit || '',
      }))
      .sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure))
      .slice(0, 60);

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json({ events, source: 'fmp' });

  } catch (err) {
    console.error('[api/agenda]', err.message);
    res.setHeader('Cache-Control', 's-maxage=300');
    return res.status(200).json({ events: [], unavailable: true, reason });
  }
}
