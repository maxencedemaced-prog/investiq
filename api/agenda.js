// api/agenda.js — calendrier des grandes annonces économiques, à partir des calendriers officiels (api/_ecocal.js).
// Jamais d'événement inventé : si le calendrier n'a plus de date à venir (pas encore mis à jour), on renvoie
// « unavailable » et l'app l'affiche honnêtement.
const { allEvents, parisDate, parisHM, LAST_UPDATED } = require('./_ecocal');

const ALLOWED_ORIGINS = [
  'https://kapitaro.fr',
  'https://www.kapitaro.fr',
  'https://investiq-kappa.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const now = new Date();
  const today = parisDate(now);
  const horizon = now.getTime() + 60 * 24 * 3600 * 1000;
  const events = allEvents()
    .filter(e => parisDate(e.utc) >= today && e.utc.getTime() <= horizon)
    .map(e => ({
      id: e.id,
      date: parisDate(e.utc),
      heure: parisHM(e.utc),
      titre: e.titre,
      description: e.desc,
      pays: e.zone,
      impact: 'high',
      precedent: null,
      prevision: null,
      actual: null,
    }));

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  if (!events.length) return res.status(200).json({ events: [], unavailable: true, reason: 'calendar_outdated', updated: LAST_UPDATED });
  return res.status(200).json({ events, source: 'official', updated: LAST_UPDATED });
};
