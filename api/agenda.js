// Redéploiement forcé pour prendre en compte FMP_API_KEY
const ALLOWED_ORIGINS = [
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

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Récupère le calendrier économique via Financial Modeling Prep
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) throw new Error('FMP_API_KEY manquante');

    const now = new Date();
    const from = now.toISOString().split('T')[0];
    const to = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const url = `https://financialmodelingprep.com/stable/economic-calendar?from=${from}&to=${to}&apikey=${apiKey}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (!resp.ok || !Array.isArray(data)) {
      console.error('[api/agenda] FMP error:', resp.status, JSON.stringify(data).slice(0, 200));
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

    return res.status(200).json({ events });

  } catch (err) {
    console.error('[api/agenda]', err.message);
    // Fallback : données statiques pour la démo
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = (offset) => {
      const d = new Date(now.getTime() + offset * 86400000);
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    };

    return res.status(200).json({
      events: [
        { id:'1', date: dateStr(0), heure:'14:30', titre:'Taux directeurs BCE', pays:'EU', impact:'high', prevision:'2.5%', precedent:'2.5%' },
        { id:'2', date: dateStr(1), heure:'14:30', titre:'Inflation US (CPI)', pays:'US', impact:'high', prevision:'3.2%', precedent:'3.4%' },
        { id:'3', date: dateStr(2), heure:'16:00', titre:'Ventes au détail US', pays:'US', impact:'medium', prevision:'+0.3%', precedent:'-0.1%' },
        { id:'4', date: dateStr(3), heure:'08:45', titre:'PMI manufacturier France', pays:'FR', impact:'medium', prevision:'46.5', precedent:'45.8' },
        { id:'5', date: dateStr(4), heure:'14:30', titre:'NFP (Emplois non-agricoles)', pays:'US', impact:'high', prevision:'+185K', precedent:'+175K' },
        { id:'6', date: dateStr(5), heure:'10:00', titre:'Indice de confiance ZEW', pays:'DE', impact:'medium', prevision:'12.5', precedent:'11.3' },
        { id:'7', date: dateStr(7), heure:'20:00', titre:'Minutes FOMC Fed', pays:'US', impact:'high', prevision:null, precedent:null },
        { id:'8', date: dateStr(8), heure:'14:30', titre:'PIB US (révision)', pays:'US', impact:'high', prevision:'+2.1%', precedent:'+2.3%' },
        { id:'9', date: dateStr(9), heure:'09:00', titre:'Taux chômage Zone Euro', pays:'EU', impact:'medium', prevision:'6.4%', precedent:'6.5%' },
        { id:'10', date: dateStr(10), heure:'14:30', titre:'Inflation PCE US', pays:'US', impact:'high', prevision:'2.7%', precedent:'2.8%' },
        { id:'11', date: dateStr(12), heure:'09:30', titre:'Indice PMI services UK', pays:'UK', impact:'medium', prevision:'53.2', precedent:'52.9' },
        { id:'12', date: dateStr(14), heure:'14:30', titre:'Décision taux Fed', pays:'US', impact:'high', prevision:'4.25%', precedent:'4.25%' },
      ]
    });
  }
}
