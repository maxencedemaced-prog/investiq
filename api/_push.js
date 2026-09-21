// api/_push.js — envoi Web Push partagé (préfixe « _ » : pas une route Vercel).
const webpush = require('web-push');

let ready = false;
function pushReady() {
  if (ready) return true;
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails('mailto:contact@investiq.fr', pub, priv);
  ready = true;
  return true;
}

// Envoie une notification à un appareil. Renvoie { ok:true } ou { ok:false, gone:true|false, error }.
// gone = l'abonnement n'existe plus (désinstallé, permission retirée) : à supprimer de la base.
async function sendToDevice(device, payload, urgency = 'normal') {
  try {
    await webpush.sendNotification(JSON.parse(device.subscription), JSON.stringify({ icon: '/icons/icon-192.png', url: '/', ...payload }), { TTL: 6 * 3600, urgency });   // « high » : Android réveille le téléphone au lieu de différer la notification
    return { ok: true };
  } catch (err) {
    return { ok: false, gone: err.statusCode === 404 || err.statusCode === 410, error: err.message };
  }
}

module.exports = { pushReady, sendToDevice };
