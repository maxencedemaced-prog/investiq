// applock.js — Verrouillage de l'app par empreinte / Face ID (comme les applis bancaires).
// La session Supabase reste ouverte ; à l'ouverture de l'app (et au retour après le délai choisi),
// un écran opaque masque tout jusqu'à la vérification biométrique du téléphone (WebAuthn, capteur intégré).
// Réglage propre à chaque appareil et à chaque compte (localStorage), désactivé par défaut.
// Le serveur n'est pas concerné : c'est une protection de la vie privée sur l'appareil, pas un mode de connexion.

const LOCK_DELAYS = [[0, 'Immédiatement'], [60, 'Après 1 minute'], [300, 'Après 5 minutes'], [1800, 'Après 30 minutes']];
const lockKey = uid => 'kp_lock_' + uid;
const lockB64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const lockBytes = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
let _lockHiddenAt = 0;

function lockConfig() {
  if (!currentUser || isDemo) return null;
  try { return JSON.parse(localStorage.getItem(lockKey(currentUser.id)) || 'null'); } catch { return null; }
}
function lockSave(cfg) {
  try { cfg ? localStorage.setItem(lockKey(currentUser.id), JSON.stringify(cfg)) : localStorage.removeItem(lockKey(currentUser.id)); } catch {}
}
async function lockAvailable() {
  try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { return false; }
}
const lockIsApple = () => /iphone|ipad|ipod|macintosh/i.test(navigator.userAgent);
const lockName = () => lockIsApple() ? 'Face ID / Touch ID' : 'ton empreinte';

// ── Écran de verrouillage ──
function appLockShow() {
  if (document.getElementById('app-lock')) return;
  const o = document.createElement('div');
  o.id = 'app-lock';
  o.style.cssText = 'position:fixed;inset:0;z-index:20000;background:#080e1e;display:flex;align-items:center;justify-content:center;padding:24px;color:#fff;text-align:center';
  o.innerHTML = `<div style="max-width:320px;width:100%">
    <img src="icons/kapitaro-tile.svg" width="64" height="64" alt="" style="border-radius:16px;margin-bottom:18px">
    <div style="font-size:20px;font-weight:900;letter-spacing:-0.02em">Kapitaro est verrouillé</div>
    <div style="font-size:13.5px;color:rgba(255,255,255,0.6);margin:6px 0 26px;line-height:1.5">Utilise ${lockName()} pour afficher ton portefeuille.</div>
    <button type="button" id="app-lock-btn" onclick="appLockUnlock()" style="width:100%;padding:15px;background:#16a34a;color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:800;cursor:pointer">🔓 Déverrouiller</button>
    <div id="app-lock-msg" style="font-size:12.5px;color:#fca5a5;margin-top:12px;min-height:18px"></div>
    <button type="button" onclick="appLockFallback()" style="margin-top:18px;background:none;border:none;color:rgba(255,255,255,0.5);font-size:13px;font-weight:600;cursor:pointer;text-decoration:underline">Se reconnecter avec mon mot de passe</button>
  </div>`;
  document.body.appendChild(o);
  // L'iPhone exige un appui sur le bouton ; ailleurs on lance directement la vérification
  if (!lockIsApple()) setTimeout(() => appLockUnlock(true), 300);
}

async function appLockUnlock(auto) {
  const cfg = lockConfig();
  const msg = document.getElementById('app-lock-msg');
  if (!cfg) { document.getElementById('app-lock')?.remove(); return; }
  try {
    await navigator.credentials.get({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: lockBytes(cfg.cred), transports: ['internal'] }],
      userVerification: 'required', timeout: 60000,
    } });
    document.getElementById('app-lock')?.remove();
    _lockHiddenAt = 0;
  } catch (e) {
    if (msg && !auto) msg.textContent = 'Vérification annulée ou refusée. Réessaie.';
  }
}

// Capteur en panne, nouveau téléphone… : on se déconnecte et on retire le verrou de cet appareil
async function appLockFallback() {
  lockSave(null);
  document.getElementById('app-lock')?.remove();
  try { await logout(); } catch { location.reload(); }
}

// Appelé à l'ouverture de l'app (une seule fois par chargement de page)
function appLockOnStart() {
  if (window._appLockStarted) return;
  window._appLockStarted = true;
  if (lockConfig()) appLockShow();
}
document.addEventListener('visibilitychange', () => {
  const cfg = lockConfig();
  if (!cfg) return;
  if (document.hidden) { _lockHiddenAt = Date.now(); return; }
  if (_lockHiddenAt && Date.now() - _lockHiddenAt >= (cfg.delay || 0) * 1000) appLockShow();
});

// ── Réglage dans Paramètres → Connexion ──
async function renderLockCard() {
  const el = document.getElementById('lock-row');
  if (!el) return;
  if (isDemo || !currentUser || !(await lockAvailable())) { el.innerHTML = ''; return; }
  const cfg = lockConfig();
  el.innerHTML = `<div class="set-row">
      <div class="set-row-main"><div class="set-row-title">Verrouiller avec ${lockName()}</div>
        <div class="set-row-sub">Ton portefeuille reste masqué tant que tu ne l'as pas déverrouillé, sur cet appareil.</div></div>
      <div class="set-row-ctrl"><label class="set-switch"><input type="checkbox" ${cfg ? 'checked' : ''} onchange="lockToggle(this)" aria-label="Verrouillage biométrique"><span></span></label></div>
    </div>
    ${cfg ? `<div class="set-row"><div class="set-row-main"><div class="set-row-title">Verrouiller</div></div>
      <div class="set-row-ctrl"><select class="set-select" onchange="lockDelayChanged(this.value)" aria-label="Délai de verrouillage">
        ${LOCK_DELAYS.map(([v, l]) => `<option value="${v}" ${Number(cfg.delay || 0) === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select></div></div>` : ''}`;
}

async function lockToggle(input) {
  if (!input.checked) { lockSave(null); showToast('Verrouillage désactivé sur cet appareil'); renderLockCard(); return; }
  if (!(await lockEnable())) input.checked = false;
  renderLockCard();
}
// Crée la clé biométrique de l'appareil (doit partir d'un appui) ; true si le verrou est activé
async function lockEnable() {
  try {
    const cred = await navigator.credentials.create({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Kapitaro' },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: currentUser.email || 'Kapitaro', displayName: currentUser.email || 'Kapitaro' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60000, attestation: 'none',
    } });
    lockSave({ cred: lockB64(cred.rawId), delay: 60, at: Date.now() });
    showToast('🔒 Verrouillage activé sur cet appareil');
    try { trackEvent('applock_enabled'); } catch {}
    return true;
  } catch (e) {
    showToast('Activation annulée');
    return false;
  }
}

// Proposition du verrouillage à la 2e ouverture de l'app sur cet appareil (pas dès le début, pour rester léger).
// Une seule fois par compte et par appareil, jamais en même temps qu'une autre fenêtre.
function lockAskOnSecondVisit(user) {
  try {
    if (!user || !user.id || isDemo || window._lockAskCounted) return;
    window._lockAskCounted = true;
    const countKey = 'kp_opens_' + user.id, askKey = 'kp_lock_ask_' + user.id;
    const opens = (Number(localStorage.getItem(countKey)) || 0) + 1;
    localStorage.setItem(countKey, String(opens));
    if (opens < 2 || localStorage.getItem(askKey) || lockConfig()) return;
    const tryShow = async left => {
      const busy = window._pushSheetShown || window._installSheetShown
        || ['app-lock', 'install-sheet', 'push-sheet', 'plans-modal'].some(id => document.getElementById(id))
        || (document.getElementById('onboarding-modal') || {}).style?.display === 'flex';
      if (window._pushSheetShown || window._installSheetShown) return;   // déjà une proposition pendant cette visite : on attend la prochaine
      if (busy) { if (left > 0) setTimeout(() => tryShow(left - 1), 4000); return; }
      if (!(await lockAvailable()) || lockConfig() || document.getElementById('lock-sheet')) return;
      try { localStorage.setItem(askKey, '1'); } catch {}
      const o = document.createElement('div');
      o.id = 'lock-sheet';
      o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:10006;display:flex;align-items:flex-end;justify-content:center';
      o.onclick = e => { if (e.target === o) o.remove(); };
      o.innerHTML = `<div style="background:#0b1220;border:1px solid rgba(255,255,255,0.1);border-radius:22px 22px 0 0;width:100%;max-width:480px;padding:22px 20px calc(20px + env(safe-area-inset-bottom));color:#fff">
        <div style="font-size:30px;line-height:1;margin-bottom:10px">🔒</div>
        <div style="font-size:17px;font-weight:900;letter-spacing:-0.02em">Protège ton portefeuille</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.72);line-height:1.55;margin:6px 0 16px">Verrouille Kapitaro avec ${lockName()} : personne d'autre ne verra tes placements si on prend ton téléphone. Modifiable à tout moment dans Paramètres.</div>
        <button type="button" onclick="lockSheetEnable(this)" style="width:100%;padding:14px;background:#16a34a;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer">Activer le verrouillage</button>
        <button type="button" onclick="document.getElementById('lock-sheet').remove()" style="width:100%;margin-top:8px;padding:12px;background:none;border:none;color:rgba(255,255,255,0.55);font-size:14px;font-weight:600;cursor:pointer">Plus tard</button>
      </div>`;
      document.body.appendChild(o);
      try { window.va && window.va('event', { name: 'lock_sheet_view' }); } catch {}
    };
    setTimeout(() => tryShow(60), 5000);
  } catch {}
}
async function lockSheetEnable(btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Vérification…'; }
  await lockEnable();
  document.getElementById('lock-sheet')?.remove();
  try { renderLockCard(); } catch {}
}
function lockDelayChanged(v) {
  const cfg = lockConfig(); if (!cfg) return;
  cfg.delay = Number(v) || 0; lockSave(cfg);
  showToast('✓ Préférence enregistrée');
}
