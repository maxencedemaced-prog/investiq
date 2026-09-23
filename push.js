// push.js — notifications push sur l'appareil courant (téléphone ou ordinateur).
// Serveur : api/push-key.js, api/push-subscribe.js, api/push-send.js. Dépend d'app.js : sb, currentUser, isDemo, showToast.

// Auto-guérison : si un appareil a déjà un service worker installé (même désactivé depuis, même en
// mode démo), on lui demande de vérifier une mise à jour à CHAQUE visite, sans attendre le délai
// habituel du navigateur (jusqu'à 24h). Sans ça, un appareil resterait bloqué sur une ancienne
// version de l'app jusqu'à ce que quelqu'un vide son cache à la main.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration().then(reg => reg && reg.update()).catch(() => {});
}

const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
// iPhone/iPad : les notifications n'existent que si l'app est ajoutée à l'écran d'accueil
const pushNeedsInstall = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  && !(window.navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches));

function pushB64ToBytes(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
async function pushHeaders() {
  const { data } = await sb.auth.getSession();
  const t = data?.session?.access_token;
  return t ? { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t } : null;
}
async function pushRegSW() {
  if (!('serviceWorker' in navigator)) return null;
  // updateViaCache:'none' — le fichier sw.js lui-même ne doit jamais venir du cache HTTP, sinon le
  // navigateur peut continuer d'exécuter une ancienne version du service worker pendant des heures.
  try { await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }); return await navigator.serviceWorker.ready; } catch (e) { console.warn('[push] service worker :', e.message); return null; }
}
async function pushCurrentSub() {
  if (!pushSupported()) return null;
  try { const reg = await navigator.serviceWorker.getRegistration(); return reg ? await reg.pushManager.getSubscription() : null; } catch { return null; }
}
// Renvoie l'un de : 'unsupported' | 'install' | 'denied' | 'on' | 'off'
async function pushState() {
  if (!pushSupported()) return pushNeedsInstall() ? 'install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return (Notification.permission === 'granted' && await pushCurrentSub()) ? 'on' : 'off';
}

async function pushEnable() {
  if (isDemo || !currentUser) { showToast('Crée un compte pour activer les notifications'); return; }
  if (pushNeedsInstall()) { renderPushCard(); return; }
  const btn = document.getElementById('push-btn'); if (btn) { btn.disabled = true; btn.textContent = 'Activation…'; }
  try {
    const perm = await Notification.requestPermission();   // doit partir d'un clic
    if (perm !== 'granted') { renderPushCard(); return; }
    const reg = await pushRegSW(); if (!reg) throw new Error('Service worker indisponible');
    const kr = await fetch('/api/push-key'); const kj = await kr.json();
    if (!kr.ok || !kj.key) throw new Error(kj.error || 'Clé serveur manquante');
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: pushB64ToBytes(kj.key) });
    const h = await pushHeaders(); if (!h) throw new Error('Session expirée, reconnecte-toi');
    const r = await fetch('/api/push-subscribe', { method: 'POST', headers: h, body: JSON.stringify({ subscription: sub.toJSON(), moves: pushMovesOn() }) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Enregistrement impossible');
    showToast('🔔 Notifications activées');
    try { trackEvent('push_enabled'); } catch(e) {}
    pushTest(true);   // notification de confirmation immédiate
  } catch (e) {
    console.warn('[push] activation :', e.message);
    showToast('Activation impossible : ' + e.message);
  }
  renderPushCard(); renderNotifications();
}

async function pushDisable() {
  try {
    const sub = await pushCurrentSub();
    const h = await pushHeaders();
    if (h) await fetch('/api/push-subscribe', { method: 'DELETE', headers: h, body: JSON.stringify({ endpoint: sub?.endpoint }) });
    if (sub) await sub.unsubscribe();
    showToast('Notifications désactivées sur cet appareil');
  } catch (e) { showToast('Désactivation impossible : ' + e.message); }
  renderPushCard(); renderNotifications();
}

async function pushTest(silent) {
  const btn = document.getElementById('push-test');
  if (btn && !silent) { btn.disabled = true; btn.textContent = 'Envoi…'; }
  try {
    const sub = await pushCurrentSub();
    const h = await pushHeaders();
    if (!sub || !h) throw new Error('Active d\'abord les notifications');
    const r = await fetch('/api/push-subscribe', { method: 'POST', headers: h, body: JSON.stringify({ test: true, endpoint: sub.endpoint }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Envoi impossible');
    if (!silent) showToast('Notification envoyée : regarde ton appareil');
  } catch (e) { showToast('Test impossible : ' + e.message); }
  if (btn && !silent) { btn.disabled = false; btn.textContent = 'Envoyer un test'; }
}

// À la connexion : enregistre le service worker et resynchronise l'abonnement (le navigateur peut le renouveler).
async function pushInit() {
  if (isDemo || !currentUser || !pushSupported()) return;
  const reg = await pushRegSW(); if (!reg) return;
  if (Notification.permission !== 'granted') return;
  try {
    const sub = await reg.pushManager.getSubscription(); if (!sub) return;
    const h = await pushHeaders(); if (!h) return;
    fetch('/api/push-subscribe', { method: 'POST', headers: h, body: JSON.stringify({ subscription: sub.toJSON(), moves: pushMovesOn() }) }).catch(() => {});
  } catch {}
}

// À la déconnexion : cet appareil ne doit plus recevoir les notifications de ce compte
async function pushOnLogout() {
  try {
    const sub = await pushCurrentSub(); if (!sub) return;
    const h = await pushHeaders();
    if (h) await fetch('/api/push-subscribe', { method: 'DELETE', headers: h, body: JSON.stringify({ endpoint: sub.endpoint }) });
    await sub.unsubscribe();
  } catch {}
}

// Alertes « forte hausse / forte baisse » (portefeuille, watchlist, grandes valeurs) : activées par défaut, réglage par appareil
const pushMovesOn = () => { try { return localStorage.getItem('iq_push_moves') !== '0'; } catch { return true; } };
async function pushMovesChanged(on) {
  try { localStorage.setItem('iq_push_moves', on ? '1' : '0'); } catch {}
  try {
    const sub = await pushCurrentSub(); const h = await pushHeaders();
    if (!sub || !h) throw new Error('Active d\'abord les notifications');
    const r = await fetch('/api/push-subscribe', { method: 'POST', headers: h, body: JSON.stringify({ endpoint: sub.endpoint, prefs: { moves: !!on } }) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Enregistrement impossible');
    showToast(on ? '✓ Alertes de gros mouvements activées' : 'Alertes de gros mouvements désactivées');
  } catch (e) { showToast('Réglage impossible : ' + e.message); }
}

// Choix de fréquence du briefing (daily / weekly / off), enregistré sur le profil
async function pushPrefChanged() {
  try { await saveProfile(); showToast('✓ Préférence enregistrée'); } catch { showToast('Enregistrement impossible'); }
}

// Carte « Notifications » des Paramètres
async function renderPushCard() {
  const box = document.getElementById('push-card-body'); if (!box) return;
  if (isDemo) { box.innerHTML = '<div style="font-size:13px;line-height:1.55;color:var(--color-text-secondary)">Les notifications sont disponibles avec un compte : crée le tien pour les activer.</div>'; return; }
  const st = await pushState();
  const msg = {
    unsupported: 'Ce navigateur ne gère pas les notifications. Essaie Chrome, Edge, Firefox ou Safari récent.',
    install: 'Sur iPhone, ajoute d\'abord Kapitaro à l\'écran d\'accueil : bouton Partager, puis « Sur l\'écran d\'accueil ». Ouvre ensuite l\'app depuis cette icône et reviens ici.',
    denied: 'Les notifications sont bloquées pour ce site. Autorise-les dans les réglages du navigateur (cadenas à côté de l\'adresse), puis recharge la page.',
    on: '✓ Actives sur cet appareil.',
    off: 'Désactivées sur cet appareil.',
  }[st];
  const color = st === 'on' ? '#16a34a' : (st === 'denied' ? '#dc2626' : 'var(--color-text-secondary)');
  const canToggle = st === 'on' || st === 'off';
  box.innerHTML = `
    <div style="font-size:13px;line-height:1.55;color:${color};font-weight:${st === 'on' ? 700 : 500}">${msg}</div>
    ${canToggle ? `<div class="btn-row" style="margin-top:12px">
      ${st === 'on'
        ? `<button class="btn-secondary" id="push-test" onclick="pushTest()" style="flex:1">Envoyer un test</button><button class="btn-secondary" onclick="pushDisable()" style="flex:1">Désactiver</button>`
        : `<button class="btn-primary" id="push-btn" onclick="pushEnable()" style="flex:1">🔔 Activer les notifications</button>`}
    </div>` : ''}
    ${st === 'on' ? `<label style="display:flex;gap:10px;align-items:flex-start;margin-top:14px;cursor:pointer">
      <input type="checkbox" ${pushMovesOn() ? 'checked' : ''} onchange="pushMovesChanged(this.checked)" style="margin-top:3px;width:auto;flex-shrink:0">
      <span style="font-size:13px;line-height:1.5"><strong>Alertes de gros mouvements</strong><br><span style="color:var(--color-text-secondary)">Quand une action explose ou s'effondre en séance (+5 % / −5 %) : les tiennes, celles de ta watchlist, et les grandes valeurs du marché (LVMH, Apple, NVIDIA…).</span></span>
    </label>` : ''}`;
}

// Invitation dans la cloche, tant que les notifications ne sont pas actives
async function pushBellPromptHTML() {
  if (isDemo || !currentUser) return '';
  const st = await pushState();
  if (st !== 'off') return '';
  return `<div id="push-bell-prompt" style="background:rgba(22,163,74,0.1);border:1px solid rgba(22,163,74,0.35);border-radius:12px;padding:12px 14px;margin-bottom:10px">
    <div style="font-size:13px;font-weight:800;color:#15803d">🔔 Reçois ton briefing du matin</div>
    <div style="font-size:12px;color:#3c3c43;line-height:1.5;margin:3px 0 9px">Et une alerte dès qu'un prix tombe sous ton seuil, même quand l'app est fermée.</div>
    <button onclick="pushEnable()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:7px 13px;font-size:12px;font-weight:700;cursor:pointer">Activer les notifications</button>
  </div>`;
}
