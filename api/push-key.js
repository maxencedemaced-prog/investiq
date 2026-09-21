// api/push-key.js — clé publique VAPID (publique par nature) dont le navigateur a besoin pour s'abonner.
module.exports = function handler(req, res) {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: 'Notifications non configurées côté serveur (VAPID_PUBLIC_KEY manquante).' });
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).json({ key });
};
