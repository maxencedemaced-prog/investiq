// api/_push.js — envoi Web Push et Apple partagé (préfixe « _ » : pas une route Vercel).
const webpush = require('web-push');
const http2 = require('http2');
const crypto = require('crypto');

// Notifications natives de l'appli iOS. APNS_KEY = contenu du fichier AuthKey_9U6T54Z2ZN.p8 en base64, sans les lignes BEGIN/END.
const APNS_KEY_ID = '9U6T54Z2ZN', APNS_TEAM_ID = '2229PQ4BTQ', APNS_TOPIC = 'fr.kapitaro.app';
const b64url = b => Buffer.from(b).toString('base64url');
let apnsJwt = null, apnsJwtAt = 0;
function apnsToken() {
  if (apnsJwt && Date.now() - apnsJwtAt < 40 * 60000) return apnsJwt;   // Apple refuse un renouvellement trop fréquent (20 min) et l'expire à 60 min
  const key = crypto.createPrivateKey({ key: Buffer.from(process.env.APNS_KEY, 'base64'), format: 'der', type: 'pkcs8' });
  const msg = b64url(JSON.stringify({ alg: 'ES256', kid: APNS_KEY_ID })) + '.' + b64url(JSON.stringify({ iss: APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }));
  apnsJwt = msg + '.' + b64url(crypto.sign('sha256', Buffer.from(msg), { key, dsaEncoding: 'ieee-p1363' }));
  apnsJwtAt = Date.now();
  return apnsJwt;
}
function sendApns(token, payload, urgency) {
  return new Promise(resolve => {
    if (!process.env.APNS_KEY) return resolve({ ok: false, gone: false, error: 'Clé Apple manquante côté serveur.' });
    let done = false, status = 0, data = '', session;
    const finish = r => { if (done) return; done = true; try { session && session.close(); } catch {} resolve(r); };
    try {
      session = http2.connect('https://api.push.apple.com');
      session.on('error', e => finish({ ok: false, gone: false, error: e.message }));
      session.setTimeout(10000, () => { try { session.destroy(); } catch {} finish({ ok: false, gone: false, error: 'Apple ne répond pas' }); });
      const headers = {
        ':method': 'POST', ':path': '/3/device/' + token,
        authorization: 'bearer ' + apnsToken(),
        'apns-topic': APNS_TOPIC, 'apns-push-type': 'alert',
        'apns-priority': urgency === 'high' ? '10' : '5',
        'apns-expiration': String(Math.floor(Date.now() / 1000) + 6 * 3600),
      };
      if (payload.tag) headers['apns-collapse-id'] = String(payload.tag).slice(0, 64);
      const req = session.request(headers);
      req.setEncoding('utf8');
      req.on('response', h => { status = h[':status']; });
      req.on('data', c => { data += c; });
      req.on('error', e => finish({ ok: false, gone: false, error: e.message }));
      req.on('end', () => {
        if (status === 200) return finish({ ok: true });
        let reason = ''; try { reason = JSON.parse(data).reason || ''; } catch {}
        finish({ ok: false, gone: status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered', error: reason || 'Apple : erreur ' + status });
      });
      req.end(JSON.stringify({ aps: { alert: { title: payload.title, body: payload.body }, sound: 'default' }, url: payload.url || '/' }));
    } catch (e) { finish({ ok: false, gone: false, error: e.message }); }
  });
}

let ready = false;
function pushReady() {
  if (ready) return true;
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails('mailto:contact@kapitaro.fr', pub, priv);
  ready = true;
  return true;
}

// Envoie une notification à un appareil. Renvoie { ok:true } ou { ok:false, gone:true|false, error }.
// gone = l'abonnement n'existe plus (désinstallé, permission retirée) : à supprimer de la base.
async function sendToDevice(device, payload, urgency = 'normal') {
  try {
    const parsed = JSON.parse(device.subscription);
    if (parsed.apns) return await sendApns(parsed.apns, payload, urgency);
    await webpush.sendNotification(JSON.parse(device.subscription), JSON.stringify({ icon: '/icons/icon-192.png', url: '/', ...payload }), { TTL: 6 * 3600, urgency });   // « high » : Android réveille le téléphone au lieu de différer la notification
    return { ok: true };
  } catch (err) {
    return { ok: false, gone: err.statusCode === 404 || err.statusCode === 410, error: err.message };
  }
}

module.exports = { pushReady, sendToDevice };
