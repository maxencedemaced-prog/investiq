// push.js — notifications push sur l'appareil courant (téléphone ou ordinateur).
// Serveur : api/push-key.js, api/push-subscribe.js, api/push-send.js. Dépend d'app.js : sb, currentUser, isDemo, showToast.

// Auto-guérison : si un appareil a déjà un service worker installé (même désactivé depuis, même en
// mode démo), on lui demande de vérifier une mise à jour à CHAQUE visite, sans attendre le délai
// habituel du navigateur (jusqu'à 24h). Sans ça, un appareil resterait bloqué sur une ancienne
// version de l'app jusqu'à ce que quelqu'un vide son cache à la main.
// Enregistré pour tous les visiteurs : il rend aussi le site installable comme une app (bouton « Installer l'app »).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(reg => reg.update()).catch(() => {});
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
  if (btn && !silent) { btn.disabled = false; btn.textContent = 'Envoyer'; }
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
  const row = (title, sub, ctrl, subColor) => `<div class="set-row"><div class="set-row-main"><div class="set-row-title">${title}</div>${sub ? `<div class="set-row-sub"${subColor ? ` style="color:${subColor}"` : ''}>${sub}</div>` : ''}</div>${ctrl ? `<div class="set-row-ctrl">${ctrl}</div>` : ''}</div>`;
  if (isDemo) { box.innerHTML = row('Notifications sur cet appareil', 'Disponibles avec un compte : crée le tien pour les activer.'); return; }
  const st = await pushState();
  const sub = {
    unsupported: 'Ce navigateur ne gère pas les notifications. Essaie Chrome, Edge, Firefox ou Safari récent.',
    install: 'Sur iPhone, ajoute d\'abord Kapitaro à l\'écran d\'accueil (Partager, puis « Sur l\'écran d\'accueil »), ouvre l\'app depuis cette icône et reviens ici.',
    denied: 'Bloquées pour ce site. Autorise-les dans les réglages du navigateur (cadenas à côté de l\'adresse), puis recharge la page.',
    on: 'Activées',
    off: 'Désactivées',
  }[st];
  const sw = (on, handler, id, label) => `<label class="set-switch"><input type="checkbox" ${id ? `id="${id}"` : ''} ${on ? 'checked' : ''} onchange="${handler}" aria-label="${label}"><span></span></label>`;
  const canToggle = st === 'on' || st === 'off';
  box.innerHTML =
    row('Notifications sur cet appareil', sub,
        canToggle ? sw(st === 'on', st === 'on' ? 'pushDisable()' : 'pushEnable()', 'push-btn', 'Notifications sur cet appareil') : '',
        st === 'denied' ? '#dc2626' : '')
    + (st === 'on'
      ? row('Alertes de gros mouvements', 'Quand une action bouge de plus de 5 % en séance : les tiennes, ta watchlist et les grandes valeurs.',
            sw(pushMovesOn(), 'pushMovesChanged(this.checked)', '', 'Alertes de gros mouvements'))
        + row('Notification de test', 'Pour vérifier que tout arrive bien', '<button type="button" class="set-pill" id="push-test" onclick="pushTest()">Envoyer</button>')
      : '');
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

// ── « Installer l'app » : page de connexion, bandeau de l'Accueil (connecté, sur téléphone) et ligne des Paramètres ──
// Android / ordinateur (Chrome, Edge) : vraie installation en un clic via l'événement beforeinstallprompt (capté dans index.html).
// iPhone / iPad : Apple ne permet pas d'installer par un bouton, on explique le geste Partager → « Sur l'écran d'accueil ».
const INSTALL_DISMISS_KEY = 'iq_install_dismissed';            // bloc de la page de connexion
const INSTALL_HOME_DISMISS_KEY = 'iq_install_home_dismissed';  // bandeau de l'Accueil (utilisateur connecté)
const appIsInstalled = () => window._appJustInstalled === true || window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const isMobileDevice = () => /android|mobile/i.test(navigator.userAgent);
const isIOSDevice = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installDismissedRecently = key => { try { return Date.now() - Number(localStorage.getItem(key) || 0) < 14 * 86400000; } catch { return false; } };

// 'prompt' (bouton d'installation en un clic) | 'ios' | 'android' (geste expliqué) | null (déjà installée ou impossible)
function installMode() {
  if (appIsInstalled()) return null;
  if (window._installEvt) return 'prompt';
  if (isIOSDevice()) return 'ios';
  if (isMobileDevice()) return 'android';
  return null;   // ordinateur sans installation possible (ex. Firefox, Safari)
}

// Explication du geste ; strong = couleur du texte mis en avant (blanc sur la page de connexion sombre)
function installHowHTML(mode, strong) {
  const s = t => `<strong${strong ? ` style="color:${strong}"` : ''}>${t}</strong>`;
  if (mode === 'ios') return `Touche ${s('Partager')} <span style="font-size:13px">⬆️</span> (en bas dans Safari, en haut dans Chrome), puis ${s('« Sur l\'écran d\'accueil »')}.`;
  if (mode === 'android') return `Ouvre le menu ${s('⋮')} de ton navigateur, puis ${s('« Installer l\'application »')} ou ${s('« Ajouter à l\'écran d\'accueil »')}.`;
  return "Sur ton écran d'accueil, en plein écran, avec les notifications. Gratuit, sans passer par un magasin d'applications.";
}

function installAppRender() {
  const mode = installMode();

  // 1) Page de connexion
  const box = document.getElementById('install-app-box');
  if (box) {
    let known = false;
    try { known = !!localStorage.getItem('kp_known'); } catch (e) {}
    if (!mode || !known || installDismissedRecently(INSTALL_DISMISS_KEY)) box.style.display = 'none';
    else {
      document.getElementById('install-app-btn').style.display = mode === 'prompt' ? 'block' : 'none';
      document.getElementById('install-app-text').innerHTML = installHowHTML(mode, '#fff');
      box.style.display = 'block';
    }
  }

  // 2) Bandeau de l'Accueil : seulement sur téléphone (sur ordinateur, la ligne des Paramètres suffit)
  const banner = document.getElementById('home-install-banner');
  if (banner) {
    const mobile = isMobileDevice() || isIOSDevice();
    if (!mode || !mobile || installDismissedRecently(INSTALL_HOME_DISMISS_KEY)) { banner.style.display = 'none'; banner.innerHTML = ''; }
    else {
      banner.innerHTML = `<div class="install-banner">
        <img src="icons/kapitaro-tile.svg" alt="">
        <div style="flex:1;min-width:0">
          <div class="install-banner-title">Installe l'app Kapitaro</div>
          <div class="install-banner-text">${installHowHTML(mode)}</div>
          ${mode === 'prompt' ? '<button type="button" class="set-pill primary" style="margin-top:8px" onclick="installApp()">📲 Installer l\'app</button>' : ''}
        </div>
        <button type="button" class="install-banner-x" onclick="installHomeDismiss()" aria-label="Masquer">✕</button>
      </div>`;
      banner.style.display = 'block';
    }
  }

  // 3) Ligne « Installer l'app » des Paramètres : toujours là tant que ce n'est pas installé
  const wrap = document.getElementById('set-install-wrap');
  const body = document.getElementById('set-install-body');
  if (wrap && body) {
    if (!mode) { wrap.style.display = 'none'; body.innerHTML = ''; }
    else {
      body.innerHTML = `<div class="set-row">
        <div class="set-row-main">
          <div class="set-row-title">Installer l'app sur cet appareil</div>
          <div class="set-row-sub">${installHowHTML(mode)}</div>
        </div>
        ${mode === 'prompt' ? '<div class="set-row-ctrl"><button type="button" class="set-pill primary" onclick="installApp()">Installer</button></div>' : ''}
      </div>`;
      wrap.style.display = 'block';
    }
  }
}

async function installApp() {
  const evt = window._installEvt;
  if (!evt) return;
  evt.prompt();
  let outcome = 'dismissed';
  try { outcome = (await evt.userChoice).outcome; } catch {}
  window._installEvt = null;   // un événement ne sert qu'une fois ; le navigateur en renverra un si besoin
  if (outcome === 'accepted') {
    window._appJustInstalled = true;
    try { window.va && window.va('event', { name: 'app_install_accepted' }); } catch {}
  }
  installAppRender();
}

function installAppDismiss() {
  try { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())); } catch {}
  installAppRender();
}

function installHomeDismiss() {
  try { localStorage.setItem(INSTALL_HOME_DISMISS_KEY, String(Date.now())); } catch {}
  installAppRender();
}

window.addEventListener('kapitaro-installable', installAppRender);
window.addEventListener('appinstalled', () => {
  window._appJustInstalled = true;
  try { window.va && window.va('event', { name: 'app_installed' }); } catch {}
  installAppRender();
});
installAppRender();
