// app-coeur.js — Cœur : configuration, état, démarrage, connexion, données, cours en direct, logos, bilan.
// Partie de l'appli Kapitaro, découpée en 6 fichiers chargés dans cet ordre par index.html : app-objectif.js, app-positions.js, app-marches.js, app-coeur.js, app-ecrans.js, app.js.
// Les fonctions et variables sont partagées entre ces fichiers (app-objectif.js, app-positions.js, app-marches.js, app-ecrans.js, app.js).

// ===== CONFIG =====
const SUPABASE_URL = 'https://soyyznyceqzimhoaffaw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3_8eb6YbCfJ04Qihdy9ivw_NsQ4H_cu';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== STATE =====
let currentUser = null;
let isDemo = false;
let positions = [];
let profile = { bankroll: 5000, horizon: 'moyen', risk: 'faible', notif: 'daily' };
let objective = { target: 50000, years: 10, rate: 7, monthly: 200 };
let newsData = [];
let newsFilter = 'tous';
let notifications = [];
let posSignals = {};
let chatHistory = [];
const COLORS = ['#1a7f5a','#1c1c1e','#ff3b30','#1a56db','#ff9500','#9b59b6'];
const HL = { court:'Court (<3 ans)', moyen:'Moyen (3–7 ans)', long:'Long (>7 ans)' };
const RL = { faible:'Faible', modere:'Modérée', eleve:'Élevée' };

// Cache keys
const CACHE_NEWS = 'iq_news_cache';
const CACHE_SIGNALS = 'iq_signals_cache';
const CACHE_CHAT = 'iq_chat_history';

// ===== INIT =====
window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) await initApp(session.user);
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) await initApp(session.user);
    if (event === 'SIGNED_OUT') showAuthScreen();
  });
});

// ── Caches du navigateur : rattachés à UN compte ──
// Briefing, verdict, signaux, plan… sont stockés en localStorage. Sans nettoyage, ils passaient
// d'un compte (ou du mode démo) à l'autre et affichaient le portefeuille de quelqu'un d'autre.
const KEEP_CACHE = /^(iq_theme|iq_logo_domains|iq_last_page|iq_legal_accepted|iq_onboarded|iq_cache_uid|iq_seen_|iq_bilan_|iq_depenses_|iq_reset_seen_)/;

// Compte remis à zéro depuis Supabase (profiles.data_reset_at) : on efface aussi les copies gardées sur l'appareil
// (bilan, dépenses, tutoriel, bulles d'aide…), une seule fois par remise à zéro.
function applyAccountReset(resetAt) {
  if (!resetAt || !currentUser) return;
  const seenKey = 'iq_reset_seen_' + currentUser.id;
  try {
    if (localStorage.getItem(seenKey) === String(resetAt)) return;
    Object.keys(localStorage)
      .filter(k => k.startsWith('iq_') && !/^(iq_theme|iq_logo_domains|iq_cache_uid|iq_reset_seen_|iq_legal_accepted)/.test(k))
      .forEach(k => localStorage.removeItem(k));
    localStorage.setItem(seenKey, String(resetAt));
    try { updateNavDots(); updateMenuDot(); } catch(e) {}
  } catch {}
}
function clearUserCaches() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('iq_') && !KEEP_CACHE.test(k))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}
// À appeler à chaque entrée dans l'app : purge si le propriétaire des caches n'est pas l'utilisateur courant
function claimCaches(ownerId) {
  try {
    if (localStorage.getItem('iq_cache_uid') !== ownerId) {
      clearUserCaches();
      localStorage.setItem('iq_cache_uid', ownerId);
    }
  } catch {}
}

// Ouvre le panneau de notifications dès l'arrivée sur l'app (pas sur mobile : il y prend tout l'écran)
function openNotifPanelByDefault() {
  // On ne l'ouvre plus automatiquement (trop intrusif) : on prépare juste son contenu.
  try { renderNotifications(); } catch(e) {}
}

// Parrainage : lien kapitaro.fr/?parrain=CODE mémorisé 30 jours, rattaché au compte après l'inscription
(function keepReferral() {
  try {
    const code = new URLSearchParams(location.search).get('parrain');
    if (code && /^[A-Za-z0-9]{4,12}$/.test(code)) localStorage.setItem('kp_ref', JSON.stringify({ code: code.toUpperCase(), at: Date.now() }));
  } catch (e) {}
})();
// Nouveau compte : provenance (tableau de bord) + conversion « inscription » pour les régies (si consentement)
function trackSignupSource(user) {
  try {
    if (!user || !user.id || Date.now() - new Date(user.created_at).getTime() > 2 * 3600000) return;
    const key = 'kp_signup_src_' + user.id;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    const local = window.kpAds ? kpAds.source() || {} : {};
    const source = (user.user_metadata && user.user_metadata.source) || (window.kpAds ? kpAds.sourceLabel() : 'direct');
    trackEvent('signup_source', { source, campaign: local.campaign || null, content: local.content || null, landing: local.landing || null,
      provider: (user.app_metadata && user.app_metadata.provider) || 'email' });
    if (window.kpAds) kpAds.track('signup');
  } catch (e) {}
}
let referralPromo = false;   // filleul jamais abonné : −50 % sur le 1er mois de la formule mensuelle
async function loadReferralPromo() {
  try {
    const { data } = await sb.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return;
    const r = await fetch('/api/referral', { headers: { Authorization: 'Bearer ' + token } });
    if (!r.ok) return;
    const d = await r.json();
    const was = referralPromo;
    referralPromo = !!d.promo_filleul;
    if (referralPromo) plansBilling = 'monthly';
    if (was !== referralPromo) { try { renderSubscriptionCard(); } catch (e) {} try { setPlansBilling(plansBilling); } catch (e) {} }
  } catch (e) {}
}
async function attachReferral(user) {
  let ref = null;
  try { ref = JSON.parse(localStorage.getItem('kp_ref') || 'null'); } catch (e) {}
  const fromAccount = user && user.user_metadata && user.user_metadata.parrain;
  if ((!ref || !ref.code) && fromAccount) ref = { code: String(fromAccount), at: Date.now() };
  if (!ref || !ref.code) return;
  const doneKey = 'kp_ref_done_' + (user && user.id);
  try { if (localStorage.getItem(doneKey)) return; } catch (e) {}
  if (Date.now() - (ref.at || 0) > 30 * 86400000) { try { localStorage.removeItem('kp_ref'); } catch (e) {} return; }
  try {
    const { data } = await sb.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return;
    const r = await fetch('/api/referral', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ action: 'attach', code: ref.code }) });
    if (!r.ok) return;   // on réessaiera à la prochaine ouverture
    const d = await r.json();
    try { localStorage.removeItem('kp_ref'); localStorage.setItem(doneKey, '1'); } catch (e) {}
    if (d.attached && typeof showToast === 'function') showToast('🎁 Invité par un ami : −50 % sur ton 1er mois Premium');
  } catch (e) {}
}
async function renderReferralCard() {
  const el = document.getElementById('ref-card');
  if (!el || isDemo) return;
  el.innerHTML = '<div class="set-row"><div class="set-row-main"><div class="set-row-sub">Chargement…</div></div></div>';
  try {
    const { data } = await sb.auth.getSession();
    const r = await fetch('/api/referral', { headers: { Authorization: 'Bearer ' + (data?.session?.access_token || '') } });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Erreur');
    const esc2 = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    el.innerHTML = `
      <div class="set-row"><div class="set-row-main"><div class="set-row-title">Invite tes amis, gagne des mois offerts</div>
        <div class="set-row-sub">Ton ami a <strong>−50 % sur son 1er mois Premium</strong>. Toi, tu gagnes <strong>1 mois offert</strong> dès qu'il a payé son abonnement.</div></div></div>
      <div class="set-row" style="gap:8px;flex-wrap:wrap">
        <input type="text" readonly value="${esc2(d.link)}" id="ref-link" class="set-input" style="flex:1;min-width:0;width:auto" onclick="this.select()" aria-label="Ton lien de parrainage">
        <button type="button" class="set-pill primary" onclick="copyReferral()">Copier</button>
        ${navigator.share ? '<button type="button" class="set-pill" onclick="shareReferral()">Partager</button>' : ''}
      </div>
      <div class="set-row"><div class="set-row-main"><div class="set-row-sub">${d.invites} ami${d.invites > 1 ? 's' : ''} inscrit${d.invites > 1 ? 's' : ''} · ${d.abonnes} abonné${d.abonnes > 1 ? 's' : ''} · <strong>${d.mois_gagnes} mois gagné${d.mois_gagnes > 1 ? 's' : ''}</strong></div></div></div>`;
  } catch (e) {
    el.innerHTML = '<div class="set-row"><div class="set-row-main"><div class="set-row-sub">Parrainage indisponible pour le moment.</div></div></div>';
  }
}
function copyReferral() {
  const i = document.getElementById('ref-link');
  if (!i) return;
  (navigator.clipboard ? navigator.clipboard.writeText(i.value) : Promise.reject()).then(
    () => { if (typeof showToast === 'function') showToast('Lien copié'); },
    () => { i.select(); document.execCommand && document.execCommand('copy'); });
  try { trackEvent('referral_copy'); } catch (e) {}
}
function shareReferral() {
  const i = document.getElementById('ref-link');
  if (!i || !navigator.share) return;
  navigator.share({ title: 'Kapitaro', text: 'Je suis mon épargne avec Kapitaro. Avec mon lien, tu as −50 % sur ton 1er mois Premium :', url: i.value }).catch(() => {});
  try { trackEvent('referral_share'); } catch (e) {}
}

async function initApp(user) {
  try {
  currentUser = user; isDemo = false;
  try { localStorage.setItem('kp_known', '1'); } catch (e) {}
  try { if (typeof appLockOnStart === 'function') appLockOnStart(); } catch (e) {}   // écran verrouillé avant d'afficher quoi que ce soit
  claimCaches(user.id);
  try { updateNavDots(); updateMenuDot(); } catch(e) {}
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('demo-banner').style.display = 'none';
  openNotifPanelByDefault();
  try { trackEvent('login'); startHeartbeat(); } catch(e) {}
  setTimeout(() => { try { kpStorePreload(); kpLoadSellSignals(); kpOpenFromNotif(); } catch (e) {} try { kpPlaySync(); } catch (e) {} }, 1500);
  requestWelcomeEmail(user);
  attachReferral(user).then(loadReferralPromo);
  try { if (typeof installAfterSignup === 'function') installAfterSignup(user); } catch (e) {}
  try { if (typeof pushAskOnce === 'function') pushAskOnce(user); } catch (e) {}
  try { if (typeof lockAskOnSecondVisit === 'function') lockAskOnSecondVisit(user); } catch (e) {}
  trackSignupSource(user);
  const email = user.email || '';
  document.getElementById('topbar-email').textContent = email.split('@')[0];
  document.getElementById('topbar-avatar').textContent = (email[0]||'U').toUpperCase();
  await loadProfile(); await loadPositions(); await loadObjective();
  try { updateSidebarPremiumCard(); } catch(e) { console.warn('sidebar-premium:', e); }
  try { refreshAIQuota(); } catch(e) { console.warn('refreshAIQuota:', e); }
  // Dernier bilan du compte (autre appareil ?) — met à jour la bannière si l'Agent est déjà affiché
  try {
    syncBilanFromCloud().then(changed => {
      if (changed && document.getElementById('sec-ai')?.classList.contains('active')) { try { renderAgentDashboard(); } catch {} }
    });
  } catch(e) { console.warn('syncBilan:', e); }
  try { loadChatHistory(); } catch(e) { console.warn('loadChatHistory:', e); }
  // Charge les signaux déjà générés (< 4 jours) pour éviter de relancer une rafale IA à chaque session
  try { loadSignalsCache(); } catch(e) { console.warn('loadSignalsCache:', e); }
  // Acceptation des conditions obligatoire à la première utilisation
  try { showLegalAcceptance(); } catch(e) { console.warn('legal:', e); }
  // Retour depuis Stripe après paiement
  try { handleStripeReturn(); } catch(e) { console.warn('stripe:', e); }
  // Restaure la page où l'utilisateur était (si l'onglet a été rechargé par Chrome)
  let lastPage = 'home';
  try { lastPage = sessionStorage.getItem('iq_last_page') || 'home'; } catch {}
  nav(lastPage, true);
  // Si objectif chargé depuis Supabase, prêt à afficher au clic sur Objectif
  if (objChartCapital && objChartTarget) {
    try { localStorage.setItem('iq_validated_objective', JSON.stringify({
      capital: objChartCapital, monthly: objChartMonthly, target: objChartTarget,
      years: objChartYears, rate: objChartRate, risk: objRisk,
      validatedAt: new Date().toISOString()
    })); } catch {}
  }
  setTimeout(() => { checkPriceAlerts(); checkAndGenerateNotifications(); }, 2000);
  try { kpApplyMainPlatform(true); } catch (e) {}
  setTimeout(() => kpMaybePresentation(), 500);
  try { kpUpdateNewsDot(); setTimeout(() => kpMaybeWhatsNew(0), 5000); } catch (e) {}
  startSmartRefresh();
  setTimeout(() => { refreshPrices(); }, 2000);
  setTimeout(() => showPriceTicker(), 1000); // show immediately from stored prices
  try { pushInit(); } catch(e) {}   // notifications push : ne demande plus la permission d'office, c'est l'utilisateur qui l'active
  initTheme();
  } catch(e) { console.error('initApp error:', e); alert('Erreur de chargement: ' + e.message); }
}

function enterDemo() {
  isDemo = true;
  claimCaches('demo');
  try { updateNavDots(); updateMenuDot(); } catch(e) {}
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('demo-banner').style.display = 'block';
  openNotifPanelByDefault();
  document.getElementById('topbar-email').textContent = 'Demo';
  document.getElementById('topbar-avatar').textContent = 'D';
  positions = [
    {id:'d1',name:'IWDA.L',qty:15,pru:87.5,price:94.2,type:'ETF',sector:'Monde',platform:'Trade Republic',alert_price:80},
    {id:'d2',name:'VWCE.DE',qty:8,pru:110,price:118.5,type:'ETF',sector:'Monde',platform:'Trade Republic',alert_price:null},
    {id:'d3',name:'LVMH',qty:2,pru:730,price:685,type:'Action',sector:'Luxe',platform:'XTB',alert_price:650},
    {id:'d4',name:'Air Liquide',qty:5,pru:162,price:179,type:'Action',sector:'Industrie',platform:'XTB',alert_price:null},
  ];
  nav('home');
  // Reset et affiche l'onboarding depuis l'étape 1
  obGoals = { long: false, court: false };
  obNext(1);
  const skipBtn = document.getElementById('ob-btn-skip');
  if (skipBtn) skipBtn.textContent = 'Démo';
  document.getElementById('onboarding-modal').style.display = 'flex';
}

function showAuthScreen(tab) {
  currentUser = null; isDemo = false; positions = []; posSignals = {}; chatHistory = []; bilanData = {}; bilanStep = 0;
  _kpAnalysisCache = {}; _sigRun = null; _sigMarket = { ts: 0, data: null }; Object.keys(newsTabCache).forEach(k => { newsTabCache[k].html = ''; newsTabCache[k].ts = 0; });
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('demo-banner').style.display = 'none';
  if (tab === 'signup') setTimeout(() => switchAuth('signup'), 50);
}

// ===== AUTH =====
async function resetPassword() {
  const email = document.getElementById('login-email')?.value?.trim();
  if (!email) {
    setAuthMsg('Entre ton email puis clique Mot de passe oublié', false);
    document.getElementById('login-email')?.focus();
    return;
  }
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://kapitaro.fr'
    });
    if (error) throw error;
    setAuthMsg('📧 Email de réinitialisation envoyé !', true);
  } catch(e) {
    setAuthMsg('Erreur : ' + (e.message || 'Réessaie'), false);
  }
}

function switchAuth(m) {
  const confirmBox = document.getElementById('auth-confirm');
  if (confirmBox) confirmBox.style.display = 'none';
  document.getElementById('auth-login').style.display = m==='login'?'block':'none';
  document.getElementById('auth-signup').style.display = m==='signup'?'block':'none';
  document.getElementById('tab-login').classList.toggle('active', m==='login');
  document.getElementById('tab-signup').classList.toggle('active', m==='signup');
  setAuthMsg('');
}
// E-mail de bienvenue : demandé une fois par appareil pour les comptes récents ; le serveur garantit l'envoi unique
function requestWelcomeEmail(user) {
  try {
    if (!user?.id || Date.now() - new Date(user.created_at).getTime() > 3 * 86400000) return;
    const key = 'iq_welcome_req_' + user.id;
    if (localStorage.getItem(key)) return;
    sb.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (!token) return;
      fetch('/api/email-welcome', { method: 'POST', headers: { Authorization: 'Bearer ' + token } })
        .then(r => { if (r.ok) localStorage.setItem(key, '1'); }).catch(() => {});
    });
  } catch {}
}

// Préférence « e-mails de conseils et rappels » (Paramètres → Notifications)
async function emailPrefChanged(on) {
  if (isDemo || !currentUser) { showToast('Crée un compte pour gérer tes e-mails'); return; }
  const { error } = await sb.from('profiles').update({ email_opt_out: !on }).eq('id', currentUser.id);
  if (error) { showToast('Réglage impossible : ' + error.message); return; }
  profile.email_opt_out = !on;
  showToast(on ? '✓ E-mails de conseils activés' : 'E-mails de conseils désactivés');
}

// Boutons « Créer mon compte » de la présentation : remonte au formulaire, onglet Inscription ouvert
function lpSignup() {
  switchAuth('signup');
  const tab = document.getElementById('tab-signup');
  if (tab) tab.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => document.getElementById('signup-email')?.focus({ preventScroll: true }), 500);
  try { window.va && window.va('event', { name: 'landing_cta' }); } catch {}
}
function setAuthMsg(msg, ok=false) {
  const el = document.getElementById('auth-msg');
  el.textContent = msg; el.className = 'auth-msg ' + (ok?'success':'error');
}
// Appli iPhone (Capacitor) : Google et Apple refusent la connexion dans la vue web de l'appli.
// La connexion s'ouvre donc dans le navigateur sécurisé du téléphone, puis revient par le lien fr.kapitaro.app://auth-callback.
const KP_NATIVE_REDIRECT = 'fr.kapitaro.app://auth-callback';
const kpIsNative = () => { try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) { return false; } };
async function kpNativeOAuth(provider, label) {
  setAuthMsg('Ouverture de ' + label + '…', true);
  const { data, error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: KP_NATIVE_REDIRECT, skipBrowserRedirect: true } });
  if (error || !data?.url) { setAuthMsg('Connexion ' + label + ' indisponible pour l’instant.'); return; }
  // Méthode système d'Apple (build 3 et suivants) ; les builds plus anciens gardent le navigateur intégré
  const cap = window.Capacitor;
  const kpAuth = cap.isPluginAvailable && cap.isPluginAvailable('KpAuth') ? (cap.Plugins.KpAuth || cap.registerPlugin('KpAuth')) : null;
  if (kpAuth) {
    try {
      const { url } = await kpAuth.start({ url: data.url, scheme: 'fr.kapitaro.app' });
      setAuthMsg('Connexion…', true);
      await kpNativeFinish(url);
    } catch (e) {
      setAuthMsg(e?.code === 'CANCELED' ? '' : 'La connexion n’a pas abouti. Réessaie.');
    }
    return;
  }
  await cap.Plugins.Browser.open({ url: data.url, presentationStyle: 'fullscreen' });
}
// Retour de la connexion : on récupère la session (jetons dans le lien, ou code à échanger)
async function kpNativeFinish(url) {
  const u = new URL(url.replace(KP_NATIVE_REDIRECT, 'https://kapitaro.fr/auth-callback'));
  const hash = new URLSearchParams(u.hash.replace(/^#/, ''));
  const access_token = hash.get('access_token'), refresh_token = hash.get('refresh_token'), code = u.searchParams.get('code');
  const { error } = access_token && refresh_token ? await sb.auth.setSession({ access_token, refresh_token })
    : code ? await sb.auth.exchangeCodeForSession(code) : { error: new Error('lien de connexion incomplet') };
  if (error) setAuthMsg('La connexion n’a pas abouti. Réessaie.');
}
// Bouton œil des champs de mot de passe
function kpTogglePass(btn) {
  const inp = btn.parentElement.querySelector('input');
  if (!inp) return;
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.setAttribute('aria-pressed', show ? 'true' : 'false');
  btn.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
  inp.focus();
}

async function loginWithApple() {
  if (kpIsNative()) return kpNativeOAuth('apple', 'Apple');
  const { error } = await sb.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: window.location.origin + window.location.pathname } });
  if (error) setAuthMsg('Connexion Apple indisponible pour l’instant.');
}
if (kpIsNative()) {
  try {
    document.documentElement.classList.add('kp-native');
    window.Capacitor.Plugins.App.addListener('appUrlOpen', async ({ url }) => {
      if (!String(url).startsWith(KP_NATIVE_REDIRECT)) return;
      try { await window.Capacitor.Plugins.Browser.close(); } catch (e) {}
      await kpNativeFinish(url);
    });
  } catch (e) { console.warn('[natif] retour de connexion :', e); }
}
async function loginWithGoogle() {
  if (kpIsNative()) return kpNativeOAuth('google', 'Google');
  // Android, navigateur d'Instagram / Facebook : on rouvre la page dans Chrome (fin du lien utm gardée), qui lance la connexion Google
  if (document.documentElement.classList.contains('kp-inapp-android')) {
    const q = new URLSearchParams(location.search); q.delete('inscription'); q.set('google', '1');
    const url = location.host + location.pathname + '?' + q.toString();
    setAuthMsg('Ouverture de Chrome…', true);
    window.location.href = 'intent://' + url + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent('https://' + url) + ';end';
    return;
  }
  if (document.documentElement.classList.contains('kp-inapp')) { setAuthMsg('Google bloque sa connexion dans le navigateur d’Instagram ou de Facebook : inscris-toi avec ton e-mail, ou ouvre kapitaro.fr dans ton navigateur.'); return; }
  setAuthMsg('Redirection vers Google...', true);
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
  if (error) setAuthMsg("Connexion Google indisponible pour l'instant.");
}
async function login() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!email||!pass) { setAuthMsg('Remplis tous les champs.'); return; }
  setAuthMsg('Connexion...', true);
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) setAuthMsg('Email ou mot de passe incorrect.');
}
async function signup() {
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-pass').value;
  const pass2 = document.getElementById('signup-pass2').value;
  if (!email||!pass) { setAuthMsg('Remplis tous les champs.'); return; }
  if (pass!==pass2) { setAuthMsg('Mots de passe différents.'); return; }
  if (pass.length<8) { setAuthMsg('Mot de passe trop court : au moins 8 caractères.'); return; }
  setAuthMsg('Création...', true);
  let parrain = null;
  try { const ref = JSON.parse(localStorage.getItem('kp_ref') || 'null'); if (ref && ref.code && Date.now() - (ref.at || 0) < 30 * 86400000) parrain = ref.code; } catch (e) {}
  const meta = {};
  if (parrain) meta.parrain = parrain;
  try { if (window.kpAds) meta.source = kpAds.sourceLabel(); } catch (e) {}
  const { data, error } = await sb.auth.signUp({ email, password: pass, options: Object.keys(meta).length ? { data: meta } : undefined });
  if (error) {
    const m = (error.message || '').toLowerCase();
    if (m.includes('rate limit')) setAuthMsg("Trop d'emails envoyés récemment. Réessaie dans environ 1 heure.");
    else if (m.includes('already') || m.includes('registered')) setAuthMsg('Un compte existe déjà avec cet email — connecte-toi.');
    else if (m.includes('invalid') && m.includes('email')) setAuthMsg('Adresse email invalide.');
    else if (m.includes('password')) setAuthMsg('Mot de passe refusé : utilise au moins 8 caractères.');
    else setAuthMsg(error.message);
    return;
  }
  // Supabase renvoie un "succès" sans identité si l'email existe déjà (anti-énumération)
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    setAuthMsg('Un compte existe déjà avec cet email — connecte-toi.');
    return;
  }
  // Session immédiate = confirmation email désactivée : l'appli s'ouvre toute seule
  if (data?.session) return;
  setAuthMsg('');
  showSignupConfirmation(email);
}

function showSignupConfirmation(email) {
  let box = document.getElementById('auth-confirm');
  if (!box) {
    box = document.createElement('div');
    box.id = 'auth-confirm';
    document.getElementById('auth-signup').after(box);
  }
  const safe = email.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  box.innerHTML = `
    <div style="text-align:center;padding:8px 0 4px">
      <div style="font-size:40px;margin-bottom:10px">📬</div>
      <div style="font-size:18px;font-weight:800;color:#0b1220;margin-bottom:8px;letter-spacing:-0.02em">Vérifie ta boîte mail</div>
      <div style="font-size:13px;color:#475467;line-height:1.6;margin-bottom:16px">
        On vient d'envoyer un lien de confirmation à<br><strong style="color:#0b1220">${safe}</strong>.<br>
        Clique dessus pour activer ton compte, puis reviens te connecter ici.
      </div>
      <div style="font-size:11.5px;color:#667085;margin-bottom:18px">Rien reçu ? Regarde dans les spams / courriers indésirables.</div>
      <button id="auth-resend-btn" onclick="resendConfirmation('${safe}')" style="width:100%;padding:12px;background:#fff;border:1.5px solid #d0d5dd;border-radius:12px;font-size:13px;font-weight:700;color:#344054;cursor:pointer;margin-bottom:8px">Renvoyer l'email</button>
      <button onclick="backToLoginAfterSignup('${safe}')" style="width:100%;padding:13px;background:#16a34a;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer">J'ai confirmé → Me connecter</button>
    </div>`;
  document.getElementById('auth-signup').style.display = 'none';
  box.style.display = 'block';
}

async function resendConfirmation(email) {
  const btn = document.getElementById('auth-resend-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Envoi...'; }
  const { error } = await sb.auth.resend({ type: 'signup', email });
  if (btn) {
    btn.textContent = error ? 'Échec — réessaie dans 1 min' : '✓ Email renvoyé';
    setTimeout(() => { btn.disabled = false; btn.textContent = "Renvoyer l'email"; }, 30000);
  }
}

function backToLoginAfterSignup(email) {
  const box = document.getElementById('auth-confirm');
  if (box) box.style.display = 'none';
  switchAuth('login');
  const el = document.getElementById('login-email');
  if (el) el.value = email;
  document.getElementById('login-pass')?.focus();
}
async function logout() {
  if (!isDemo) { try { await pushOnLogout(); } catch(e) {} await sb.auth.signOut({ scope: 'local' }); }   // « local » : se déconnecter ici ne déconnecte pas tes autres appareils
  clearUserCaches(); try { localStorage.removeItem('iq_cache_uid'); } catch {}
  showAuthScreen();
  closeSidebar();
}
async function changePassword() {
  const p = document.getElementById('new-pass').value;
  const p2 = document.getElementById('new-pass2').value;
  const msg = document.getElementById('pass-msg');
  if (p!==p2) { msg.style.display='block'; msg.style.color='#ff3b30'; msg.textContent='Mots de passe différents.'; return; }
  if (p.length<8) { msg.style.display='block'; msg.style.color='#ff3b30'; msg.textContent='Trop court : au moins 8 caractères.'; return; }
  const { error } = await sb.auth.updateUser({ password: p });
  msg.style.display='block';
  if (error) { msg.style.color='#ff3b30'; msg.textContent='Erreur: '+error.message; }
  else { msg.style.color='#1a7f5a'; msg.textContent='✓ Mot de passe mis à jour !'; }
}

// ===== DATA =====
async function loadProfile() {
  const { data } = await sb.from('profiles').select('*').eq('id',currentUser.id).single();
  if (data) {
    applyAccountReset(data.data_reset_at);
    profile = { bankroll: data.bankroll||5000, horizon: data.horizon||'moyen', risk: kpTolerance(data.risk||'faible'), notif: data.notif||'daily',
                is_premium: data.is_premium || data.premium || false,
                premium_until: data.premium_until || data.subscription_end || null,
                subscription_status: data.subscription_status || null,
                subscription_plan: data.subscription_plan || null,
                stripe_customer_id: data.stripe_customer_id || null,
                premium_source: data.premium_source || null,
                email_opt_out: data.email_opt_out === true };
    document.getElementById('s-bankroll').value = profile.bankroll;
    document.getElementById('s-horizon').value = profile.horizon;
    document.getElementById('s-risk').value = profile.risk;
    if (document.getElementById('s-notif')) document.getElementById('s-notif').value = profile.notif;
  }
}
async function saveProfile() {
  profile.bankroll = parseFloat(document.getElementById('s-bankroll').value)||5000;
  profile.horizon = document.getElementById('s-horizon').value;
  profile.risk = document.getElementById('s-risk').value;
  profile.notif = document.getElementById('s-notif')?.value||'daily';
  // Seules les préférences partent du navigateur : les colonnes d'abonnement sont réservées au serveur
  if (!isDemo) await sb.from('profiles').upsert({ id:currentUser.id, bankroll:profile.bankroll, horizon:profile.horizon, risk:profile.risk, notif:profile.notif });
}
async function loadPositions() {
  const { data } = await sb.from('positions').select('*').eq('user_id',currentUser.id).order('created_at');
  positions = data||[];
}
async function loadObjective() {
  if (isDemo) return;
  try {
    // Sans .order() pour compatibilité max avec toutes les versions de la table
    const { data, error } = await sb.from('objectives').select('*').eq('user_id', currentUser.id);
    if (error) { console.warn('[loadObjective] Supabase error:', error.message); }
    // Le déclencheur d'inscription crée une ligne « par défaut » (200 €/mois, 10 ans, 7 %, 50 k€) que l'utilisateur n'a
    // jamais choisie : on l'ignore pour qu'un compte neuf n'ait pas d'objectif tant qu'il n'en a pas créé un.
    const isPlaceholder = d => !d.validated_at && d.risk == null && d.stock_pct == null
      && Number(d.target) === 50000 && Number(d.years) === 10 && Number(d.rate) === 7 && Number(d.monthly) === 200 && !Number(d.capital || 0);
    const realRows = (data || []).filter(d => !isPlaceholder(d));
    if (data && data.length > 0 && realRows.length === 0) { allObjectives = []; activeObjId = null; }
    if (realRows.length > 0) {
      allObjectives = realRows.map((d, i) => ({
        id: d.id,
        label: ('Objectif ' + (i + 1)),
        capital: d.capital || 0,
        monthly: d.monthly || 200,
        target: d.target || 100000,
        years: d.years || 10,
        rate: d.rate || 7,
        risk: d.risk || 'equilibre',
        stock_pct: (d.stock_pct !== null && d.stock_pct !== undefined) ? d.stock_pct : kpDefaultStockPct(d.risk),
        glide: d.glide || false,
        color: OBJ_COLORS[i % OBJ_COLORS.length],
        validated_at: d.validated_at,
        updated_at: d.updated_at || d.created_at || null,
        etf_plan: d.etf_plan || null,
        monthly_plan: d.monthly_plan || null
      }));
      activeObjId = allObjectives[0].id;
      applyObjData(allObjectives[0]);
      objective = { target: allObjectives[0].target, years: allObjectives[0].years, rate: allObjectives[0].rate, monthly: allObjectives[0].monthly };
      try { localStorage.setItem('iq_validated_objective', JSON.stringify({
        capital: allObjectives[0].capital, monthly: allObjectives[0].monthly,
        target: allObjectives[0].target, years: allObjectives[0].years,
        rate: allObjectives[0].rate, risk: allObjectives[0].risk,
        validatedAt: allObjectives[0].validated_at || new Date().toISOString()
      })); } catch {}
    }
  } catch(e) { console.warn('[loadObjective] error:', e); }
}


// ===== LIVE PRICES =====
async function refreshPrices() {
  if (!positions.length) return;
  const btn = document.getElementById('refresh-prices-btn');
  const ico = document.getElementById('refresh-prices-ico');
  if (btn) btn.disabled = true;
  if (ico) ico.classList.add('spinning');
  try {
    const tickers = positions.map(p => p.name).join(',');
    const res = await fetch('/api/prices?symbols=' + encodeURIComponent(tickers));
    if (!res.ok) throw new Error('API error ' + res.status);
    const data = await res.json();
    const quotes = data.quotes || [];
    let updated = 0;
    for (const q of quotes) {
      if (!q.price || q.price <= 0) continue;
      // Match by symbol (case insensitive)
      // Match by symbol or by known name->ticker mapping
      const nameMap = {
        'LVMH': 'MC.PA', 'Air Liquide': 'AI.PA', 'TotalEnergies': 'TTE.PA',
        'BNP Paribas': 'BNP.PA', 'Veolia Environnement': 'VIE.PA',
        'Porsche Automobil Holding': 'PAH3.DE', 'LOreal': 'OR.PA'
      };
      const pos = positions.find(p => {
        const sym = (q.symbol||'').toUpperCase();
        const posName = p.name.toUpperCase();
        const mapped = (nameMap[p.name]||'').toUpperCase();
        return posName === sym || mapped === sym || 
               posName === sym.replace('.PA','') || posName === sym.replace('.DE','');
      });
      if (pos) {
        pos.price = parseFloat(q.price);
        const newChg = parseFloat(q.changePct);
        if (!isNaN(newChg) && newChg !== 0) {
          pos.change_pct = newChg;
          // Also update grouped positions with same name
          positions.filter(p => p.name === pos.name).forEach(p => { p.change_pct = newChg; p.price = pos.price; });
        }
        else if (pos.change_pct === undefined) pos.change_pct = 0;
        if (!isDemo) {
          sb.from('positions').update({ price: pos.price }).eq('id', pos.id).then(()=>{});
        }
        updated++;
      }
    }
    console.log('Prix mis à jour:', updated, 'positions sur', positions.length);
    renderPortfolio();
    renderHome();
    // Re-render la page Agent IA avec les prix frais (si elle est ouverte ou pour la prochaine visite)
    try { renderAgentDashboard(); } catch(e) {}
    setTimeout(() => showPriceTicker(), 100);
    showToast('✓ ' + updated + ' prix mis à jour');
    // Recalcule les alertes prix avec les nouveaux cours (remplace les anciennes)
    checkPriceAlerts();
    // Refresh bloomberg ticker with latest prices
    const strip = document.getElementById('bloomberg-strip');
    if (strip) {
      const seen = new Set();
      const myTickers = positions.filter(p=>{ if(seen.has(p.name)) return false; seen.add(p.name); return true; })
        .map(p => ({ ticker: p.name, name: p.name, inPortfolio: true }));
      const wlItems = watchlist.map(w => ({ ticker: w.ticker, name: w.name||w.ticker, inPortfolio: false }));
      const allT = [...myTickers, ...wlItems.filter(w => !myTickers.find(m => m.ticker === w.ticker))];
      strip.innerHTML = buildBloombergTicker(allT);
    }
  } catch(e) {
    // Market may be closed - keep last known prices and ticker
    showPriceTicker(); // show last known
    showToast('Marché fermé — derniers prix connus affichés');
  } finally {
    if (btn) btn.disabled = false;
    if (ico) ico.classList.remove('spinning');
  }
}




let tickerInterval = null;
let tickerIndex = 0;

function showPriceTicker() {
  const ticker = document.getElementById('price-ticker');
  if (!ticker || !positions || !positions.length) return;

  const allItems = positions.map(p => {
    const chg = p.change_pct || 0;
    const color = chg >= 0 ? '#1a7f5a' : '#cc2f26';
    const sign = chg >= 0 ? '+' : '';
    return `<span style="font-size:11px;font-weight:700;color:${color};white-space:nowrap">${p.name} ${sign}${chg.toFixed(1).replace(".", ",")} %</span>`;
  });

  if (allItems.length <= 3) {
    ticker.innerHTML = allItems.join('<span style="color:#c7c7cc;margin:0 5px">·</span>');
    return;
  }

  function showNext() {
    const chunk = [];
    for (let i = 0; i < 3; i++) {
      chunk.push(allItems[(tickerIndex + i) % allItems.length]);
    }
    ticker.style.opacity = '0';
    ticker.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      ticker.innerHTML = chunk.join('<span style="color:#c7c7cc;margin:0 5px">·</span>');
      ticker.style.opacity = '1';
    }, 300);
    tickerIndex = (tickerIndex + 3) % allItems.length;
  }

  showNext();
  if (tickerInterval) clearInterval(tickerInterval);
  tickerInterval = setInterval(showNext, 3000);
}



function showTickerFallback() {
  const ticker = document.getElementById('price-ticker');
  ticker.innerHTML = '<span style="font-size:12px;color:#8e8e93">Prix mis à jour manuellement</span>';
}

function checkPriceAlerts() {
  // Vide d'abord TOUTES les anciennes alertes prix
  notifications = notifications.filter(n => n.type !== 'prix');

  // Grouper par ticker pour éviter les doublons (positions avec plusieurs lignes)
  const grouped = {};
  positions.forEach(p => {
    if (!grouped[p.name]) {
      grouped[p.name] = { name: p.name, price: p.price, alert_price: p.alert_price };
    }
    // Garde l'alerte la plus haute (seuil le plus récent)
    if (p.alert_price && (!grouped[p.name].alert_price || p.alert_price > grouped[p.name].alert_price)) {
      grouped[p.name].alert_price = p.alert_price;
      grouped[p.name].price = p.price;
    }
  });

  Object.values(grouped).forEach(g => {
    if (g.alert_price && g.price <= g.alert_price) {
      const notif = {
        titre: `⚠ Alerte prix — ${g.name}`,
        texte: `${g.name} est à ${fmt(g.price)}€, sous ton seuil d'alerte de ${fmt(g.alert_price)}€.`,
        action: `Consulter ${g.name} dans ton portefeuille`,
        impact: 'high',
        heure: 'Maintenant',
        type: 'prix'
      };
      notifications.unshift(notif);
      showLocalNotification(`Kapitaro — Alerte ${g.name}`, notif.texte);
    }
  });

  if (notifications.length) document.getElementById('notif-dot').classList.add('show');
  renderNotifications();
}

// ===== CHAT MEMORY =====
function loadChatHistory() {
  try { chatHistory = JSON.parse(localStorage.getItem(CACHE_CHAT)||'[]'); } catch { chatHistory = []; }
  const chat = document.getElementById('ai-chat');
  if (chat && chatHistory.length > 0) {
    // Les [ACTION:{...}] sont des commandes internes : jamais affichées à l'utilisateur
    chat.innerHTML = chatHistory.map(m => `<div class="bubble ${m.role==='user'?'user':'bot'}">${m.role==='user' ? _escHtml(m.content) : formatMD(String(m.content).replace(/\[ACTION:[\s\S]*?\}\s*\]/g, '').trim())}</div>`).join('');
    const qbtns = document.getElementById('qbtns');
    if (qbtns) qbtns.style.display = 'none';
    chat.scrollTop = chat.scrollHeight;
  }
}
function saveChatHistory() {
  try { localStorage.setItem(CACHE_CHAT, JSON.stringify(chatHistory.slice(-20))); } catch {}
}
function clearChat() {
  chatHistory = [];
  try { localStorage.removeItem(CACHE_CHAT); } catch {}
  const chat = document.getElementById('ai-chat');
  if (chat) chat.innerHTML = '<div class="bubble bot" id="ai-welcome">Conversation effacée. Comment puis-je t\'aider ?</div>';
  const qbtns = document.getElementById('qbtns');
  if (qbtns) qbtns.style.display = 'flex';
  if (typeof buildAgentContext === 'function') { buildAgentContext(); buildAgentSuggestions(); }
}

// ===== SIGNALS CACHE =====
const SIGNALS_CACHE_DAYS = 4; // un signal conserver/renforcer/réduire/vendre ne change pas d'un jour à l'autre
function loadSignalsCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_SIGNALS)||'{}');
    if (cached.date) {
      const ageDays = (Date.now() - new Date(cached.date).getTime()) / 86400000;
      if (ageDays < SIGNALS_CACHE_DAYS) posSignals = cached.signals||{};
    }
  } catch {}
}
function saveSignalsCache() {
  try { localStorage.setItem(CACHE_SIGNALS, JSON.stringify({ date: new Date().toISOString(), signals: posSignals })); } catch {}
}

// ===== NEWS CACHE =====
function loadNewsCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_NEWS)||'{}');
    const today = new Date().toDateString();
    if (cached.date === today && cached.data?.length && (!cached.ts || Date.now() - cached.ts < 3600000)) { newsData = cached.data; return true; }
  } catch {}
  return false;
}
function saveNewsCache() {
  try { localStorage.setItem(CACHE_NEWS, JSON.stringify({ date: new Date().toDateString(), ts: Date.now(), data: newsData })); } catch {}
}


// ===== ANIMATIONS UTILITAIRES =====
// ===== MOTION DESIGN SYSTEM =====
// Easing functions
const ease = {
  out3: p => 1 - Math.pow(1-p, 3),
  out4: p => 1 - Math.pow(1-p, 4),
  spring: p => {
    const c4 = (2*Math.PI)/3;
    return p===0?0:p===1?1:Math.pow(2,-10*p)*Math.sin((p*10-0.75)*c4)+1;
  }
};

function animateNumber(el, from, to, duration=900, prefix='', suffix='') {
  if (!el) return;
  const start = performance.now();
  const range = to - from;
  function step(now) {
    const p = Math.min((now-start)/duration, 1);
    const e = ease.out4(p);
    const current = from + range * e;
    el.textContent = prefix + fmtK(Math.round(current)) + suffix;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = prefix + fmtK(Math.round(to)) + suffix;
  }
  requestAnimationFrame(step);
}

function animateNumberRaw(el, from, to, duration=800, decimals=1, suffix='') {
  if (!el) return;
  const start = performance.now();
  function step(now) {
    const p = Math.min((now-start)/duration, 1);
    const e = ease.out3(p);
    el.textContent = (from + (to-from)*e).toFixed(decimals) + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function animatePercent(el, to, duration=700) {
  animateNumberRaw(el, 0, to, duration, 1, '%');
}

function animateBar(el, targetPct, duration=900, delay=0) {
  if (!el) return;
  el.style.width = '0%';
  el.style.transition = 'none';
  setTimeout(() => {
    el.style.transition = `width ${duration}ms cubic-bezier(0.16,1,0.3,1)`;
    el.style.width = Math.min(targetPct, 100) + '%';
  }, delay);
}

function fadeInCards(selector, delay=70) {
  const els = document.querySelectorAll(selector);
  els.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    el.style.transition = `opacity 0.3s ease ${i*delay+30}ms, transform 0.3s ease ${i*delay+30}ms`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }));
  });
}

function fadeInEl(el, delay=0) {
  if (!el) return;
  el.style.opacity = '0';
  el.style.transform = 'translateY(8px)';
  setTimeout(() => {
    el.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  }, delay);
}

function staggerFadeIn(els, delay=60) {
  els.forEach((el, i) => { if(el) fadeInEl(el, i*delay); });
}

// Counter avec séparateurs de milliers animé
function animateCounter(el, to, duration=1000) {
  if (!el) return;
  const start = performance.now();
  function step(now) {
    const p = Math.min((now-start)/duration, 1);
    const e = ease.spring(p);
    const v = Math.round(to * e);
    el.textContent = v.toLocaleString('fr-FR');
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = to.toLocaleString('fr-FR');
  }
  requestAnimationFrame(step);
}


// ===== DARK MODE =====
function initTheme() {
  const saved = localStorage.getItem('iq_theme') || 'light';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('iq_theme', theme);
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (theme === 'dark') {
    if (icon) icon.textContent = '☀️';
    if (label) label.textContent = 'Clair';
  } else {
    if (icon) icon.textContent = '🌙';
    if (label) label.textContent = 'Sombre';
  }
  try { syncThemeSeg(); } catch {}
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  // Petite animation du bouton
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.style.transform = 'scale(0.92)';
    setTimeout(() => btn.style.transform = '', 150);
  }
}


// ===== LOGOS ENTREPRISES =====
// ═══ RÉSOLUTION AUTO DES LOGOS INCONNUS ═══
// Cache persistant ticker → domaine ('none' = introuvable, on ne réessaie pas)
let _logoDomainCache = {};
try {
  _logoDomainCache = JSON.parse(localStorage.getItem('iq_logo_domains_v2') || '{}');
  localStorage.removeItem('iq_logo_domains'); // purge l'ancien cache (domaines mal devinés)
} catch {}
const _logoResolving = new Set();

async function _resolveLogoDomain(ticker, name) {
  if (_logoResolving.has(ticker)) return;
  _logoResolving.add(ticker);
  try {
    // Nettoyer le nom pour la recherche (retirer suffixes de ticker)
    const query = (typeof displayName === 'function' ? displayName(ticker) : null) || name || ticker;
    const q = query.replace(/\.(PA|DE|L|AS|MI|SW|CO)$/i, '').trim();
    // Résolution via /api/search (Yahoo Finance) : ticker → website si dispo, sinon devine nom.com
    let found = null;
    try {
      const res = await fetch('/api/search?q=' + encodeURIComponent(q));
      const data = await res.json();
      const hit = (data.results || [])[0];
      if (hit && hit.name) {
        // Deviner le domaine à partir du nom de la société (heuristique simple)
        const slug = hit.name.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/\b(sa|se|nv|plc|inc|corp|group|holding|ag|spa|the)\b/g, '')
          .replace(/[^a-z0-9]/g, '').slice(0, 20);
        if (slug.length >= 3) found = slug + '.com';
      }
    } catch {}
    _logoDomainCache[ticker] = found || 'none';
    try { localStorage.setItem('iq_logo_domains_v2', JSON.stringify(_logoDomainCache)); } catch {}
    if (found) {
      // Remplacer tous les fallbacks en attente pour ce ticker
      document.querySelectorAll('[data-logo-pending="' + ticker + '"]').forEach(el => {
        const s = el.offsetWidth || 36;
        const r = parseInt(el.style.borderRadius) || 10;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        el.style.background = isDark ? '#1a2230' : '#f4f4f5';
        el.style.border = 'none';
        el.style.padding = '3px';
        el.style.boxSizing = 'border-box';
        el.innerHTML = '<img src="https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://' + found + '&size=64" data-ddg="https://icons.duckduckgo.com/ip3/' + found + '.ico" style="width:100%;height:100%;object-fit:contain;border-radius:' + Math.max(r-2,2) + 'px" onerror="_logoErr(this,\'\',\'#888\')">';
        el.removeAttribute('data-logo-pending');
      });
    }
  } catch(e) {
    _logoDomainCache[ticker] = 'none';
  } finally {
    _logoResolving.delete(ticker);
  }
}

// ═══ LOGOS des cryptos, devises et matières premières (hébergés avec l'appli : /icons/crypto et /icons/flags) ═══
const CRYPTO_EXT = {"HYPE32196-USD":"jpg","USDS33039-USD":"webp","NEAR-USD":"jpg","XLM-EUR":"jpg","QNT-EUR":"jpg","TAO22974-USD":"jpg","PUMP36507-USD":"jpg","WLD-USD":"jpg","SKY33038-USD":"jpg","DOT-EUR":"jpg","PEPE24478-USD":"jpg","U39120-USD":"jpg","USDD-USD":"jpg","ARB11841-USD":"jpg","ZRO26997-USD":"jpg","JST-USD":"jpg","ETHFI-USD":"jpg","RAY-EUR":"jpg","GRASS32956-USD":"jpg","TIA-USD":"jpg","BONK-USD":"jpg","AR-EUR":"jpg","ENS-USD":"jpg","ZBCN-USD":"jpg","JASMY-USD":"jpg","WIF-USD":"jpg","CRVUSD-USD":"jpg","CARDS38283-USD":"jpg","SAND-EUR":"jpg","TRAC-USD":"jpg","XCN18679-USD":"jpg","FARTCOIN-USD":"jpg","B-USD":"jpg","CASHCAT-USD":"jpg","BTSE-USD":"jpg","1INCH-EUR":"jpg","RAIL-USD":"jpg","GUSD38330-USD":"jpg","JPYC40123-USD":"jpg","SN64-USD":"jpg","SKR39377-USD":"jpg","FORM23635-USD":"jpg","RLB-USD":"jpg","SOSO-USD":"jpg","PROS39682-USD":"jpg","KSM-EUR":"jpg","YFI-EUR":"jpg","KAITO-USD":"jpg","ORBIO42040-USD":"jpg","BABYDOGE-USD":"jpg","ESP39548-USD":"jpg","MUBARAK-USD":"jpg","NOS-USD":"jpg","LINEA-USD":"jpg","ARC34926-USD":"jpg","BONER-USD":"jpg","XPR-USD":"jpg","MERL-USD":"jpg","BIO34812-USD":"jpg","AXL17799-USD":"jpg","BAN33881-USD":"jpg","GAL11877-USD":"jpg","CELO-EUR":"jpg","SN44-USD":"jpg","POD42398-USD":"jpg","ANSEM-USD":"jpg","SN120-USD":"jpg","MEGA38770-USD":"jpg","XVS-USD":"jpg","JELLYJELLY-USD":"webp","BIM-USD":"jpg","XVG-EUR":"jpg","RAVE38967-USD":"jpg","RON14101-USD":"jpg","CFG-USD":"jpg","NIL35702-USD":"jpg","AURORA14803-USD":"jpg","NOCK-USD":"jpg"};   // extension du logo quand ce n'est pas du png
const CUR_FLAG = {"USD":"us","GBP":"gb","CHF":"ch","JPY":"jp","CAD":"ca","AUD":"au","NZD":"nz","SEK":"se","NOK":"no","DKK":"dk","PLN":"pl","CZK":"cz","HUF":"hu","RON":"ro","TRY":"tr","CNY":"cn","HKD":"hk","SGD":"sg","INR":"in","BRL":"br","MXN":"mx","ZAR":"za","MAD":"ma","TND":"tn","AED":"ae","SAR":"sa","ILS":"il","KRW":"kr","THB":"th","DZD":"dz","XPF":"pf","XOF":"sn"};
const MP_BADGE = { 'XAU-G': ['🥇', '#fef3c7'], 'XAG-G': ['🥈', '#e5e7eb'], 'XPT-G': ['⚪', '#e0e7ff'], '4GLD.DE': ['🥇', '#fef3c7'], 'BRNT.PA': ['🛢️', '#e5e7eb'], 'CRUD.MI': ['🛢️', '#e5e7eb'], 'NGASP.PA': ['🔥', '#ffedd5'], 'COPAP.PA': ['🟠', '#ffedd5'] };
function kpTrackedLogo(ticker, size, radius) {
  const t = String(ticker || '').toUpperCase();
  const s = size || 36, r = radius || 10;
  const box = 'width:' + s + 'px;height:' + s + 'px;border-radius:' + r + 'px;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden';
  const cur = t.match(/^CUR-([A-Z]{3})$/);
  if (cur) { const cc = CUR_FLAG[cur[1]]; return cc ? '<div style="' + box + ';background:#f4f4f5"><img src="/icons/flags/' + cc + '.png" alt="' + cur[1] + '" style="width:100%;height:100%;object-fit:cover"></div>' : ''; }
  if (MP_BADGE[t]) return '<div style="' + box + ';background:' + MP_BADGE[t][1] + ';font-size:' + Math.round(s * 0.55) + 'px">' + MP_BADGE[t][0] + '</div>';
  if (/^[A-Z0-9]{2,20}-(EUR|USD)$/.test(t)) {
    const base = t.replace(/\d{3,}-(EUR|USD)$/, '').replace(/-(EUR|USD)$/, '').slice(0, 4);
    const ext = CRYPTO_EXT[t] || 'png';
    return '<div style="' + box + ';background:#f4f4f5;color:#1c1c1e;font-size:' + Math.max(8, Math.round(s * 0.3)) + 'px;font-weight:800"><img src="/icons/crypto/' + t + '.' + ext + '" alt="' + base + '" style="width:100%;height:100%;object-fit:cover" onerror="this.replaceWith(document.createTextNode(\'' + base + '\'))"></div>';
  }
  return '';
}

function getCompanyLogo(ticker, name, size, radius) {
  size = size || 36; radius = radius || 10;
  const _tk = kpTrackedLogo(ticker, size, radius);
  if (_tk) return _tk;
  const domainMap = {
    'AAPL':'apple.com','MSFT':'microsoft.com','GOOGL':'google.com','GOOG':'google.com',
    'AMZN':'amazon.com','TSLA':'tesla.com','NVDA':'nvidia.com','META':'meta.com',
    'NFLX':'netflix.com','UBER':'uber.com','SPOT':'spotify.com','PYPL':'paypal.com',
    'INTC':'intel.com','AMD':'amd.com','ORCL':'oracle.com','CRM':'salesforce.com',
    'ADBE':'adobe.com','QCOM':'qualcomm.com','ASML':'asml.com',
    'MC.PA':'lvmh.com','OR.PA':'loreal.com','TTE.PA':'totalenergies.com',
    'AI.PA':'airliquide.com','BNP.PA':'bnpparibas.com','SAN.PA':'sanofi.com',
    'AIR.PA':'airbus.com','ACA.PA':'credit-agricole.com','ORA.PA':'orange.com',
    'KER.PA':'kering.com','VIE.PA':'veolia.com','RMS.PA':'hermes.com',
    'IWDA.L':'ishares.com','VWCE.DE':'vanguard.com','CSPX.L':'ishares.com',
    'SWDA.L':'ishares.com','VUSA.L':'vanguard.com','IWDA.AS':'ishares.com',
    'LVMH':'lvmh.com','FDJ.PA':'groupefdj.com','SOI.PA':'soitec.com',
    'PAH3.DE':'porsche.com','VOW3.DE':'volkswagen.com','BMW.DE':'bmw.com',
    'SAP.DE':'sap.com','SIE.DE':'siemens.com','ALV.DE':'allianz.com',
    'BAYN.DE':'bayer.com','MBG.DE':'mercedes-benz.com','NESN.SW':'nestle.com',
    'NOVO-B.CO':'novonordisk.com','SHEL.L':'shell.com','HSBA.L':'hsbc.com',
    'BP.L':'bp.com','GSK.L':'gsk.com','AZN.L':'astrazeneca.com',
    'MCPA':'lvmh.com','MC.PA':'lvmh.com',
    'IWDA.L':'ishares.com','IWDA.AS':'ishares.com','IWDA':'ishares.com',
    'VWCE.DE':'vanguard.com','VWCE':'vanguard.com',
    'CSPX.L':'ishares.com','EUNL.DE':'ishares.com',
    'SOI.PA':'soitec.com','SOITEC':'soitec.com',
    'FDJ.PA':'groupefdj.com','FDJ':'groupefdj.com',
    'AIR.PA':'airbus.com','AIRBUS':'airbus.com',
    'ACA.PA':'credit-agricole.com',
    'GLE.PA':'societegenerale.com',
    'SU.PA':'schneider-electric.com',
    'CAP.PA':'capgemini.com',
    'DSY.PA':'dassaultsystemes.com',
    'HO.PA':'thalesgroup.com',
    'PUB.PA':'publicis.com',
    'SGO.PA':'saint-gobain.com',
    'WLN.PA':'worldline.com',
    'ALO.PA':'alstom.com',
    'LR.PA':'legrand.com',
    'EDF.PA':'edf.fr',
    'ENGI.PA':'engie.com',
    'EIMI.L':'ishares.com', 'IS3N.DE':'ishares.com', 'WSML.L':'ishares.com',
    'IUSN.DE':'ishares.com', 'WLDS.L':'ishares.com', 'AGBP.L':'ishares.com', 'IGLT.L':'ishares.com', 'IAU':'ishares.com', 'VEVE.L':'vanguard.com', 'VWRP.L':'vanguard.com', 'VFEG.L':'vanguard.com', 'VTI':'vanguard.com', 'VT':'vanguard.com', 'VXUS':'vanguard.com', 'VSS':'vanguard.com', 'BND':'vanguard.com', 'VOO':'vanguard.com',
    'IITU.L':'ishares.com', 'AGGH.L':'ishares.com', 'AGGH.AS':'ishares.com', 'EUNL.DE':'ishares.com',
    'VUSA.L':'vanguard.com', 'VWRL.L':'vanguard.com',
    'BAC':'bankofamerica.com', 'RACE':'ferrari.com', 'XOM':'exxonmobil.com',
    'SWRD.L':'ssga.com', 'SPPW.DE':'ssga.com',
    'AMEM.DE':'amundi.com', 'AMEM':'amundi.com',
    'STM.DE':'st.com', 'STM.PA':'st.com', 'STM':'st.com',
    'ALHPI.PA':'hopium.com',
    'TTE.PA':'totalenergies.com', 'AIR.PA':'airbus.com',
    'JPM':'jpmorganchase.com', 'GS':'goldmansachs.com', 'V':'visa.com', 'MA':'mastercard.com',
    'KO':'coca-cola.com', 'PEP':'pepsico.com', 'MCD':'mcdonalds.com', 'NKE':'nike.com',
    'DIS':'disney.com', 'BA':'boeing.com', 'CAT':'caterpillar.com', 'JNJ':'jnj.com',
    'PFE':'pfizer.com', 'WMT':'walmart.com', 'COST':'costco.com', 'BRK-B':'berkshirehathaway.com',
  };
  const LCOLORS = ['#3fb950','#6366f1','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#ef4444','#14b8a6','#f97316'];
  const c = LCOLORS[(ticker||'').charCodeAt(0) % LCOLORS.length];
  const init = (ticker||name||'?').replace(/[.\-]/g,'').slice(0,2).toUpperCase();
  const s = size, r = radius;
  const fallback = '<div style="width:'+s+'px;height:'+s+'px;border-radius:'+r+'px;background:'+c+'20;border:1px solid '+c+'40;display:flex;align-items:center;justify-content:center;font-size:'+Math.round(s*0.35)+'px;font-weight:800;color:'+c+';flex-shrink:0">'+init+'</div>';
  // Logos SVG custom pour ETF et tickers sans favicon
  const svgLogos = {
    'IWDA.L': '<svg viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="#00529B"/><text x="18" y="24" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="Arial">iS</text></svg>',
    'IWDA.AS': '<svg viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="#00529B"/><text x="18" y="24" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="Arial">iS</text></svg>',
    'VWCE.DE': '<svg viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="#CC0000"/><text x="18" y="24" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="Arial">VG</text></svg>',
    'MC.PA': '<svg viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="#1a1a1a"/><text x="18" y="24" text-anchor="middle" font-size="10" font-weight="800" fill="#c9a96e" font-family="Arial">LV</text></svg>',
    'LVMH': '<svg viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="#1a1a1a"/><text x="18" y="24" text-anchor="middle" font-size="10" font-weight="800" fill="#c9a96e" font-family="Arial">LV</text></svg>',
    'MCPA': '<svg viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="#1a1a1a"/><text x="18" y="24" text-anchor="middle" font-size="10" font-weight="800" fill="#c9a96e" font-family="Arial">LV</text></svg>',
    'SOI.PA': '<svg viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="#0055A4"/><text x="18" y="24" text-anchor="middle" font-size="10" font-weight="800" fill="#fff" font-family="Arial">SOI</text></svg>',
    'FDJ.PA': '<svg viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="#00843D"/><text x="18" y="24" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="Arial">FDJ</text></svg>',
  };;
  if (svgLogos[ticker]) {
    // Le dessin reste en coordonnées 36×36 et c'est l'affichage qui est mis à l'échelle (sinon le logo est rogné en petite taille)
    const svg = svgLogos[ticker].replace('<svg ', '<svg width="'+s+'" height="'+s+'" ').replace('rx="8"', 'rx="'+Math.round(r*36/s)+'"');
    return '<div style="width:'+s+'px;height:'+s+'px;border-radius:'+r+'px;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center">'+svg+'</div>';
  }
  const t = (ticker||'').toUpperCase();
  const base = t.replace(/\.PA$|\.DE$|\.L$|\.AS$|\.MI$|\.SW$/,'');
  let domain = domainMap[ticker] || domainMap[t] || domainMap[base];

  // Résolution auto des logos inconnus (cache + API Clearbit)
  if (!domain) {
    const cached = _logoDomainCache[t];
    if (cached && cached !== 'none') {
      domain = cached;
    } else if (cached === 'none') {
      return fallback; // déjà cherché, introuvable
    } else {
      // Pas encore cherché : fallback immédiat marqué, résolution en arrière-plan
      _resolveLogoDomain(t, name || ticker);
      return fallback.replace('<div style=', '<div data-logo-pending="' + t + '" style=');
    }
  }
  // Cascade de sources : Clearbit (haute qualité, vraie 404) → favicon DuckDuckGo → initiales
  const isDarkLogo = document.documentElement.getAttribute('data-theme') === 'dark';
  const logoBg = isDarkLogo ? '#1a2230' : '#f4f4f5';
  return `<div style="width:${s}px;height:${s}px;border-radius:${r}px;overflow:hidden;flex-shrink:0;background:${logoBg};display:flex;align-items:center;justify-content:center;padding:3px;box-sizing:border-box">
    <img src="https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=64" alt="${init}" data-ddg="https://icons.duckduckgo.com/ip3/${domain}.ico" style="width:100%;height:100%;object-fit:contain;border-radius:${Math.max(r-2,2)}px" onerror="_logoErr(this,'${init}','${c}')">
  </div>`;
}

// Cascade d'erreurs : 1er échec → DuckDuckGo, 2e échec → initiales
function _logoErr(img, text, color) {
  const ddg = img.dataset.ddg;
  if (ddg && img.src !== ddg) {
    img.src = ddg;
    img.dataset.ddg = '';
  } else {
    _logoFallback(img, text, color);
  }
}

function _logoFallback(img, text, color) {
  img.style.display = 'none';
  var p = img.parentElement;
  if (p) { p.style.background = color + '20'; p.style.border = '1px solid ' + color + '40'; p.innerHTML = '<span style="font-size:' + Math.round(p.offsetWidth * 0.35 || 13) + 'px;font-weight:800;color:' + color + '">' + text + '</span>'; }
}


// ═══ AIDE À LA DÉCISION — refonte ═══

function selectIntent(intent) {
  decisionIntention = intent;
  ['garder','acheter','vendre'].forEach(i => {
    const btn = document.getElementById('d-int-'+i);
    if (btn) btn.classList.toggle('active', i === intent);
  });
  updateDecisionCTA();
}

const DECISION_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

function renderAmountChips() {
  const el = document.getElementById('d-amount-chips');
  if (!el) return;
  const current = parseInt(document.getElementById('d-amount-display')?.dataset.amount || 500);
  el.innerHTML = DECISION_AMOUNTS.map(m => {
    const active = m === current;
    return `<button onclick="updateDecisionAmount(${m})" data-chip="${m}"
      style="padding:8px 15px;background:${active?'var(--color-primary,#16a34a)':'var(--color-bg-subtle,#f5f5f5)'};border:1px solid ${active?'var(--color-primary,#16a34a)':'var(--color-border)'};border-radius:10px;font-size:13px;font-weight:700;color:${active?'#fff':'var(--color-text-secondary)'};cursor:pointer;transition:all 0.15s">
      ${m.toLocaleString('fr-FR')} €
    </button>`;
  }).join('');
}

function updateDecisionAmount(euros) {
  euros = Math.max(50, Math.min(5000, Math.round(euros / 50) * 50));
  const display = document.getElementById('d-amount-display');
  if (display) { display.textContent = euros.toLocaleString('fr-FR') + ' €'; display.dataset.amount = euros; }
  const slider = document.getElementById('d-amount-slider');
  if (slider) slider.value = euros;
  // % de la bankroll si connue
  const pctEl = document.getElementById('d-amount-pct');
  if (pctEl) {
    const bk = profile.bankroll || 0;
    pctEl.textContent = bk > 0 ? `= ${(euros / bk * 100).toFixed(1).replace(".", ",")} % de ton capital` : '';
  }
  renderAmountChips();
  updateDecisionCTA();
}

function updateDecisionCTA() {
  const cta = document.getElementById('d-cta');
  if (!cta) return;
  const name = document.getElementById('d-name')?.value.trim();
  const amount = document.getElementById('d-amount-display')?.dataset.amount || 500;
  const intentLbl = { garder: 'Que faire ?', acheter: 'Acheter', vendre: 'Vendre' }[decisionIntention || 'garder'];
  { const cb = document.getElementById('d-chart-btn'); if (cb) cb.style.display = name ? 'block' : 'none'; }
  const _kind = decisionTrackOnlyKind(name);
  setDecisionNotice(_kind);
  if (_kind) {
    cta.innerHTML = '🪙 Pas d’analyse pour ' + (_kind === 'Devise' ? 'les devises' : 'les cryptomonnaies');
    cta.style.opacity = '0.55';
    return;
  }
  if (name) {
    cta.innerHTML = `🤖 Analyser <strong style="margin:0 4px">${_escHtml(name)}</strong> · ${intentLbl} · ${parseInt(amount).toLocaleString('fr-FR')} €`;
    cta.style.opacity = '1';
  } else {
    cta.innerHTML = `🤖 Obtenir mon analyse personnalisée`;
    cta.style.opacity = '0.8';
  }
}

function initDecisionPage() {
  // Positions rapides (dédupliquées)
  const el = document.getElementById('d-quick-pos');
  if (el) {
    const dedupMap = {};
    apos().forEach(p => { const k = p.name; if (!dedupMap[k]) dedupMap[k] = p; });
    const dedup = Object.values(dedupMap).slice(0, 8);
    el.innerHTML = dedup.map(p => {
      const pnl = p.pru > 0 ? ((p.price - p.pru)/p.pru*100).toFixed(1) : '0.0';
      const color = parseFloat(pnl) >= 0 ? '#3fb950' : '#f87171';
      return `<button onclick="prefillDecision('${p.name.replace(/'/g,"\\'")}')"
        style="display:flex;align-items:center;gap:8px;padding:7px 11px;background:var(--color-bg-subtle,#f7f7f8);border:1px solid var(--color-border);border-radius:10px;cursor:pointer;transition:all 0.15s;font-family:inherit"
        onmouseover="this.style.borderColor='${color}'" onmouseout="this.style.borderColor='var(--color-border)'">
        ${getCompanyLogo(p.name, p.name, 22, 6)}
        <div style="text-align:left">
          <div style="font-size:12px;font-weight:700;color:var(--color-text)">${displayName(p.name)}</div>
          <div style="font-size:10px;font-weight:600;color:${color}">${parseFloat(pnl)>=0?'+':''}${pnl}%</div>
        </div>
      </button>`;
    }).join('');
  }
  renderAmountChips();
  updateDecisionAmount(parseInt(document.getElementById('d-amount-display')?.dataset.amount || 500));
  updateDecisionCTA();
}

function prefillDecision(ticker) {
  setDecisionAsset(ticker);
  const drop = document.getElementById('d-ac-drop');
  if (drop) drop.style.display = 'none';
  updateDecisionCTA();
  // Scroll doux vers l'intention
  document.getElementById('d-intents')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}


// ===== BILAN FINANCIER PREMIUM =====

let bilanData = {};
let bilanStep = 0;

const BILAN_STEPS = [
  { title: 'Situation personnelle', icon: '👤' },
  { title: 'Revenus & charges', icon: '💳' },
  { title: 'Patrimoine existant', icon: '🏦' },
  { title: 'Habitudes d\'investissement', icon: '📊' },
  { title: 'Objectifs de vie', icon: '🎯' },
  { title: 'Tolérance au risque', icon: '⚖️' },
  { title: 'Horizon & contraintes', icon: '📅' },
  { title: 'Précisions sur tes projets', icon: '🎯' },
  { title: 'Analyse IA', icon: '🤖' },
];

async function openBilan() {
  if (!isPremiumUser()) {
    showPremiumGate('Bilan patrimonial complet', [
      'Analyse toute ta situation : revenus, épargne, PEA, assurance-vie… pas seulement ton portefeuille',
      'Mensualité recommandée, allocation cible et projections à 5, 10 et 20 ans',
      'Export PDF de ton bilan',
      'Retrouvable à tout moment, à refaire quand ta situation change',
    ]);
    return;
  }
  document.getElementById('bilan-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  // Une saisie en cours (bilan qu'on refait, ou parti analyser ses dépenses) : on la reprend là où elle s'est arrêtée,
  // avec un bouton pour retourner voir le dernier bilan
  if (bilanInProgress()) { renderBilanStep(bilanStep); return; }
  // Un bilan déjà fait : on le rouvre (avec « Refaire mon bilan ») au lieu de repartir de zéro
  let saved = loadSavedBilan();
  if (!saved && !isDemo) {
    // Rien sur cet appareil : on cherche dans le compte (autre appareil, données du navigateur vidées)
    const el = document.getElementById('bilan-content');
    if (el) el.innerHTML = '<div style="text-align:center;padding:40px 0;font-size:13px;opacity:.6">Chargement…</div>';
    await syncBilanFromCloud();
    saved = loadSavedBilan();
  }
  if (saved) {
    bilanData = saved.data || {};
    bilanStep = BILAN_STEPS.length;          // on consulte un résultat : ce n'est pas une saisie en cours
    window._lastBilanResult = saved.result;
    renderBilanResult(saved.result, saved.ts);
    return;
  }
  bilanData = {};
  bilanStep = 0;
  renderBilanStep(0);
}

function closeBilan() {
  document.getElementById('bilan-modal').style.display = 'none';
  document.body.style.overflow = '';
}

function updateBilanProgress(step) {
  const total = BILAN_STEPS.length;
  for (let i = 0; i < total; i++) {
    const bar = document.getElementById('bpb-' + i);
    if (bar) bar.style.background = i <= step ? '#3fb950' : 'rgba(255,255,255,0.15)';
  }
  const label = document.getElementById('bilan-step-label');
  const title = document.getElementById('bilan-step-title');
  if (label) label.textContent = `Étape ${step + 1} / ${total}`;
  if (title) title.textContent = BILAN_STEPS[step]?.title || '';
}

function bilanNext(step, data) {
  Object.assign(bilanData, data);
  let next = step + 1;
  // L'étape « Précisions » n'apparaît que s'il y a des objectifs à détailler (ou des crédits en cours)
  if (next === 7 && !(typeof bilanNeedsPrecisions === 'function' && bilanNeedsPrecisions())) next = 8;
  if (next < BILAN_STEPS.length) {
    renderBilanStep(next);
  }
}

function bilanPrev(step) {
  if (step > 0) renderBilanStep(step - 1);
}

// ── Icônes du questionnaire Bilan (SVG, à la place des emojis) ──
const BILAN_ICONS = {
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  bank: '<path d="M3 21h18"/><path d="M5 21V10"/><path d="M9 21V10"/><path d="M15 21V10"/><path d="M19 21V10"/><path d="M12 3 2 9h20z"/>',
  chart: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  scale: '<path d="M12 3v18"/><path d="M6 21h12"/><path d="M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0z"/><path d="M19 7l-3 7a3 3 0 0 0 6 0z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  dollar: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  up: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  down: '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
  flag: '<path d="M4 22V4"/><path d="M4 4h13l-2 4 2 4H4"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  minus: '<circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
};
const bilanIco = (name, size = 20, color = 'currentColor') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">${BILAN_ICONS[name] || ''}</svg>`;
const bilanBadge = name => `<div style="width:44px;height:44px;border-radius:12px;background:rgba(63,185,80,0.12);border:1px solid rgba(63,185,80,0.25);display:flex;align-items:center;justify-content:center;margin-bottom:10px;color:#3fb950">${bilanIco(name, 22)}</div>`;
// Réaction au scénario de perte : met à jour l'aspect des cartes au clic
function bilanPickReaction(input) {
  document.querySelectorAll('label[data-reaction]').forEach(l => {
    const on = l.contains(input) && input.checked;
    const c = l.dataset.color;
    l.style.borderColor = on ? c : 'var(--color-border, rgba(128,128,128,0.3))';
    l.style.background = on ? c + '1f' : 'transparent';
  });
}

function renderBilanStep(step) {
  bilanStep = step;
  updateBilanProgress(step);
  const el = document.getElementById('bilan-content');
  if (!el) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const surf = isDark ? 'var(--color-surface-raised)' : '#f9fafb';
  const bord = isDark ? 'var(--color-border)' : '#e4e4e7';
  const txt = isDark ? 'var(--color-text)' : '#09090b';
  const sub = isDark ? 'var(--color-text-secondary)' : '#71717a';

  const btnRow = (step) => `
    <div style="display:flex;gap:10px;margin-top:24px">
      ${step > 0 ? `<button onclick="bilanPrev(${step})" style="flex:1;padding:12px;background:transparent;border:1px solid ${bord};border-radius:12px;font-size:14px;font-weight:600;color:${sub};cursor:pointer">← Retour</button>` : ''}
      <button onclick="saveBilanStep(${step})" style="flex:2;padding:12px;background:#16a34a;border:none;border-radius:12px;font-size:14px;font-weight:700;color:#fff;cursor:pointer">
        ${(step === BILAN_STEPS.length - 2 || (step === 6 && !(typeof bilanNeedsPrecisions === 'function' && bilanNeedsPrecisions()))) ? 'Générer mon analyse →' : 'Continuer →'}
      </button>
    </div>`;

  const fieldStyle = `width:100%;padding:12px 14px;background:${surf};border:1px solid ${bord};border-radius:12px;font-size:14px;color:${txt};font-family:inherit;outline:none;box-sizing:border-box`;
  const labelStyle = `display:block;font-size:11px;font-weight:700;color:${sub};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px`;
  const sectionStyle = `margin-bottom:20px`;

  const steps = {
    0: `
      ${bilanBadge("user")}
      <div style="font-size:18px;font-weight:800;color:${txt};margin-bottom:4px;letter-spacing:-0.04em">Ta situation personnelle</div>
      <div style="font-size:13px;color:${sub};margin-bottom:24px">Ces informations nous permettent de personnaliser ton plan.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
        <div>
          <label style="${labelStyle}">Ton âge</label>
          <input type="number" id="b-age" placeholder="Ex: 28" min="18" max="80" style="${fieldStyle}" value="${bilanData.age||''}">
        </div>
        <div>
          <label style="${labelStyle}">Situation familiale</label>
          <select id="b-famille" style="${fieldStyle}">
            <option value="">Choisir...</option>
            <option value="celibataire" ${bilanData.famille==='celibataire'?'selected':''}>Célibataire</option>
            <option value="couple" ${bilanData.famille==='couple'?'selected':''}>En couple</option>
            <option value="marie" ${bilanData.famille==='marie'?'selected':''}>Marié(e)</option>
            <option value="divorce" ${bilanData.famille==='divorce'?'selected':''}>Divorcé(e)</option>
          </select>
        </div>
        <div>
          <label style="${labelStyle}">Enfants à charge</label>
          <select id="b-enfants" style="${fieldStyle}">
            <option value="0" ${bilanData.enfants==='0'?'selected':''}>Aucun</option>
            <option value="1" ${bilanData.enfants==='1'?'selected':''}>1 enfant</option>
            <option value="2" ${bilanData.enfants==='2'?'selected':''}>2 enfants</option>
            <option value="3+" ${bilanData.enfants==='3+'?'selected':''}>3 ou plus</option>
          </select>
        </div>
        <div>
          <label style="${labelStyle}">Situation professionnelle</label>
          <select id="b-statut" style="${fieldStyle}">
            <option value="">Choisir...</option>
            <option value="salarie" ${bilanData.statut==='salarie'?'selected':''}>Salarié(e)</option>
            <option value="independant" ${bilanData.statut==='independant'?'selected':''}>Indépendant / Freelance</option>
            <option value="fonctionnaire" ${bilanData.statut==='fonctionnaire'?'selected':''}>Fonctionnaire</option>
            <option value="etudiant" ${bilanData.statut==='etudiant'?'selected':''}>Étudiant(e)</option>
            <option value="retraite" ${bilanData.statut==='retraite'?'selected':''}>Retraité(e)</option>
          </select>
        </div>
      </div>
      ${btnRow(0)}`,

    1: `
      ${bilanBadge("card")}
      <div style="font-size:18px;font-weight:800;color:${txt};margin-bottom:4px;letter-spacing:-0.04em">Revenus & charges</div>
      <div style="font-size:13px;color:${sub};margin-bottom:24px">Pour calculer ta capacité d'épargne réelle.</div>
      <div style="${sectionStyle}">
        <label style="${labelStyle}">Revenu net mensuel (€)</label>
        <input type="number" id="b-revenu" min="0" step="250" placeholder="Ex: 2 800" style="${fieldStyle}" value="${bilanData.revenu||''}">
        <div style="font-size:11px;color:${sub};margin-top:5px">Après impôts, avant charges</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
        <div>
          <label style="${labelStyle}">Loyer / Remb. immo (€/mois)</label>
          <input type="number" id="b-loyer" min="0" step="100" placeholder="Ex: 900" style="${fieldStyle}" value="${bilanData.loyer||''}">
        </div>
        <div>
          <label style="${labelStyle}">Autres crédits (€/mois)</label>
          <input type="number" id="b-credits" min="0" step="50" placeholder="Ex: 300" style="${fieldStyle}" value="${bilanData.credits||''}">
        </div>
        <div>
          <label style="${labelStyle}">Charges fixes estimées (€/mois)</label>
          <input type="number" id="b-charges" min="0" step="50" placeholder="Ex: 800" style="${fieldStyle}" value="${bilanData.charges||''}">
        </div>
        <div>
          <label style="${labelStyle}">Épargne actuelle (€/mois)</label>
          <input type="number" id="b-epargne-actuelle" min="0" step="50" placeholder="Ex: 200" style="${fieldStyle}" value="${bilanData.epargneMensuelle||''}">
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:14px">
        ${typeof depChargesHint === 'function' ? depChargesHint() : ''}
        <button type="button" onclick="bilanLeaveTo('depenses')" style="background:none;border:none;color:${sub};font:inherit;font-size:13px;text-decoration:underline;cursor:pointer;padding:0;text-align:left">Pas sûr ? Analyse tes vraies dépenses →</button>
      </div>
      <div id="b-capacite-calc" style="padding:14px;background:rgba(63,185,80,0.08);border:1px solid rgba(63,185,80,0.2);border-radius:12px;font-size:13px;color:${txt}">
        Remplis les champs pour voir ta capacité d'épargne calculée
      </div>
      ${btnRow(1)}`,

    2: `
      ${bilanBadge("bank")}
      <div style="font-size:18px;font-weight:800;color:${txt};margin-bottom:4px;letter-spacing:-0.04em">Patrimoine existant</div>
      <div style="font-size:13px;color:${sub};margin-bottom:24px">Fais un état des lieux de ce que tu possèdes déjà.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
        <div>
          <label style="${labelStyle}">Livret A / LDDS (€)</label>
          <input type="number" id="b-livret" min="0" step="500" placeholder="Ex: 5 000" style="${fieldStyle}" value="${bilanData.livret||''}">
        </div>
        <div>
          <label style="${labelStyle}">Assurance vie (€)</label>
          <input type="number" id="b-assurance" min="0" step="500" placeholder="Ex: 0" style="${fieldStyle}" value="${bilanData.assurance||''}">
        </div>
        <div>
          <label style="${labelStyle}">PEA (€)</label>
          <input type="number" id="b-pea" min="0" step="500" placeholder="Ex: 0" style="${fieldStyle}" value="${bilanData.pea||''}">
        </div>
        <div>
          <label style="${labelStyle}">Bourse / CTO (€)</label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="number" id="b-bourse" min="0" step="500" placeholder="Ex: 0" style="${fieldStyle};flex:1" value="${bilanData.bourse||''}">
            ${objChartCapital > 0 ? `<button type="button" onclick="document.getElementById('b-bourse').value='${objChartCapital}';this.style.background='#16a34a';this.innerHTML='✓ Importé'" style="padding:8px 12px;background:#1d4ed8;border:none;border-radius:10px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0">📥 Importer (${fmtI(objChartCapital)} €)</button>` : ''}
          </div>
        </div>
        <div>
          <label style="${labelStyle}">Immobilier (valeur estimée €)</label>
          <input type="number" id="b-immo" min="0" step="5000" placeholder="Ex: 0" style="${fieldStyle}" value="${bilanData.immo||''}">
        </div>
        <div>
          <label style="${labelStyle}">Autres actifs (€)</label>
          <input type="number" id="b-autres-actifs" min="0" step="500" placeholder="Ex: 0" style="${fieldStyle}" value="${bilanData.autresActifs||''}">
        </div>
      </div>
      ${btnRow(2)}`,

    3: `
      ${bilanBadge("chart")}
      <div style="font-size:18px;font-weight:800;color:${txt};margin-bottom:4px;letter-spacing:-0.04em">Tes habitudes d'investissement</div>
      <div style="font-size:13px;color:${sub};margin-bottom:24px">Pour comprendre ton niveau et adapter les recommandations.</div>
      <div style="${sectionStyle}">
        <label style="${labelStyle}">Depuis combien de temps investis-tu ?</label>
        <select id="b-experience" style="${fieldStyle}">
          <option value="">Choisir...</option>
          <option value="jamais" ${bilanData.experience==='jamais'?'selected':''}>Je n'ai jamais investi</option>
          <option value="moins1" ${bilanData.experience==='moins1'?'selected':''}>Moins d'1 an</option>
          <option value="1-3" ${bilanData.experience==='1-3'?'selected':''}>1 à 3 ans</option>
          <option value="3-5" ${bilanData.experience==='3-5'?'selected':''}>3 à 5 ans</option>
          <option value="plus5" ${bilanData.experience==='plus5'?'selected':''}>Plus de 5 ans</option>
        </select>
      </div>
      <div style="${sectionStyle}">
        <label style="${labelStyle}">Quelle part de ton salaire investis-tu ?</label>
        <select id="b-part-salaire" style="${fieldStyle}">
          <option value="0" ${bilanData.partSalaire==='0'?'selected':''}>Rien pour l'instant</option>
          <option value="5" ${bilanData.partSalaire==='5'?'selected':''}>Moins de 5%</option>
          <option value="10" ${bilanData.partSalaire==='10'?'selected':''}>5 à 10%</option>
          <option value="20" ${bilanData.partSalaire==='20'?'selected':''}>10 à 20%</option>
          <option value="30" ${bilanData.partSalaire==='30'?'selected':''}>Plus de 20%</option>
        </select>
      </div>
      <div style="${sectionStyle}">
        <label style="${labelStyle}">Ton plus gros problème avec l'investissement</label>
        <select id="b-probleme" style="${fieldStyle}">
          <option value="">Choisir...</option>
          <option value="peur" ${bilanData.probleme==='peur'?'selected':''}>J'ai peur de perdre de l'argent</option>
          <option value="temps" ${bilanData.probleme==='temps'?'selected':''}>Je n'ai pas le temps de suivre</option>
          <option value="connaissance" ${bilanData.probleme==='connaissance'?'selected':''}>Je ne sais pas quoi choisir</option>
          <option value="irregulier" ${bilanData.probleme==='irregulier'?'selected':''}>J'investis de façon irrégulière</option>
          <option value="emotions" ${bilanData.probleme==='emotions'?'selected':''}>Je vends quand ça baisse</option>
          <option value="aucun" ${bilanData.probleme==='aucun'?'selected':''}>Pas de problème particulier</option>
        </select>
      </div>
      ${btnRow(3)}`,

    4: `
      ${bilanBadge("target")}
      <div style="font-size:18px;font-weight:800;color:${txt};margin-bottom:4px;letter-spacing:-0.04em">Tes objectifs de vie</div>
      <div style="font-size:13px;color:${sub};margin-bottom:24px">Sélectionne tout ce qui correspond à ta situation.</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px" id="b-objectifs-list">
        ${[
          {id:'immo', icon:'home', label:'Acheter un bien immobilier', sub:'Résidence principale ou investissement locatif'},
          {id:'retraite', icon:'clock', label:'Préparer ma retraite', sub:'Compléter ma pension, retraite anticipée (FIRE)'},
          {id:'revenus', icon:'dollar', label:'Générer des revenus passifs', sub:'Dividendes, loyers, rentes mensuelles'},
          {id:'capital', icon:'up', label:'Faire grossir mon capital', sub:'Patrimoine long terme, transmission'},
          {id:'projet', icon:'flag', label:'Financer un projet précis', sub:'Voyage, études, création d\'entreprise'},
          {id:'securite', icon:'shield', label:'Sécuriser mon épargne', sub:'Protéger contre l\'inflation'},
        ].map(o => `
        <label style="display:flex;align-items:center;gap:12px;padding:14px;background:${surf};border:1.5px solid ${bilanData.objectifs?.includes(o.id)?'#3fb950':bord};border-radius:12px;cursor:pointer;transition:all 0.15s">
          <input type="checkbox" id="b-obj-${o.id}" value="${o.id}" ${bilanData.objectifs?.includes(o.id)?'checked':''} style="width:18px;height:18px;accent-color:#3fb950;flex-shrink:0"
            onchange="this.closest('label').style.borderColor=this.checked?'#3fb950':'${bord}'">
          <span style="width:36px;height:36px;border-radius:10px;background:rgba(63,185,80,0.12);color:#3fb950;display:flex;align-items:center;justify-content:center;flex-shrink:0">${bilanIco(o.icon, 18)}</span>
          <div>
            <div style="font-size:14px;font-weight:700;color:${txt}">${o.label}</div>
            <div style="font-size:12px;color:${sub}">${o.sub}</div>
          </div>
        </label>`).join('')}
      </div>
      ${btnRow(4)}`,

    5: `
      ${bilanBadge("scale")}
      <div style="font-size:18px;font-weight:800;color:${txt};margin-bottom:4px;letter-spacing:-0.04em">Tolérance au risque réelle</div>
      <div style="font-size:13px;color:${sub};margin-bottom:24px">Deux questions pour mesurer ce que tu supportes vraiment. Tes réponses déterminent la part d'actions de ton allocation cible et la baisse que ton plan doit pouvoir encaisser sans que tu paniques.</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
        <div style="padding:16px;background:${surf};border:1px solid ${bord};border-radius:14px;margin-bottom:6px">
          <div style="display:flex;align-items:flex-start;gap:10px;font-size:13.5px;font-weight:600;color:${txt};margin-bottom:14px;line-height:1.5"><span style="color:#f87171;margin-top:1px">${bilanIco('down', 18)}</span><span><strong>Question 1 · Ta réaction.</strong> Imagine que ton portefeuille de ${fmtK(bilanRiskBase())} perde <strong style="color:#f87171">20 % en 1 mois</strong> (soit −${fmtK(bilanRiskBase() * 0.2)}). Que fais-tu ?</span></div>
          ${[
            {val:'vendre_tout', icon:'down', label:'Je vends tout immédiatement', color:'#f87171'},
            {val:'vendre_partiel', icon:'minus', label:'Je vends une partie pour limiter', color:'#f97316'},
            {val:'attendre', icon:'pause', label:'J\'attends sans rien faire', color:'#f59e0b'},
            {val:'tenir', icon:'shield', label:'Je tiens et reste investi', color:'#3fb950'},
            {val:'renforcer', icon:'up', label:'J\'en profite pour renforcer', color:'#22c55e'},
          ].map(r => `
          <label data-reaction data-color="${r.color}" style="position:relative;display:flex;align-items:center;gap:12px;padding:11px 13px;border:1.5px solid ${bilanData.reaction===r.val?r.color:bord};background:${bilanData.reaction===r.val?r.color+'1f':'transparent'};border-radius:11px;cursor:pointer;margin-bottom:8px;box-sizing:border-box;transition:all .15s">
            <input type="radio" name="b-reaction" value="${r.val}" ${bilanData.reaction===r.val?'checked':''} onchange="bilanPickReaction(this)" style="position:absolute;opacity:0;pointer-events:none;width:1px;height:1px">
            <span style="width:34px;height:34px;border-radius:9px;background:${r.color}22;color:${r.color};display:flex;align-items:center;justify-content:center;flex-shrink:0">${bilanIco(r.icon, 18)}</span>
            <span style="font-size:13.5px;font-weight:600;color:${txt};flex:1;text-align:left">${r.label}</span>
          </label>`).join('')}
        </div>
        <div style="${sectionStyle}">
          <label style="${labelStyle}">Question 2 · Ta limite. Quelle perte maximale peux-tu supporter sans paniquer ?</label>
          <select id="b-perte-max" style="${fieldStyle}">
            <option value="5" ${bilanData.perteMax==='5'?'selected':''}>5% maximum (-${fmtK(bilanRiskBase()*0.05)})</option>
            <option value="10" ${bilanData.perteMax==='10'?'selected':''}>10% acceptable (-${fmtK(bilanRiskBase()*0.1)})</option>
            <option value="20" ${bilanData.perteMax==='20'?'selected':''}>20% supportable (-${fmtK(bilanRiskBase()*0.2)})</option>
            <option value="30" ${bilanData.perteMax==='30'?'selected':''}>30% si nécessaire (-${fmtK(bilanRiskBase()*0.3)})</option>
            <option value="50" ${bilanData.perteMax==='50'?'selected':''}>50%+ j\'ai un horizon très long</option>
          </select>
        </div>
      </div>
      ${btnRow(5)}`,

    6: `
      ${bilanBadge("calendar")}
      <div style="font-size:18px;font-weight:800;color:${txt};margin-bottom:4px;letter-spacing:-0.04em">Horizon & contraintes</div>
      <div style="font-size:13px;color:${sub};margin-bottom:24px">Pour adapter la stratégie à ta situation temporelle.</div>
      <div style="${sectionStyle}">
        <label style="${labelStyle}">Horizon d'investissement principal</label>
        <select id="b-horizon" style="${fieldStyle}">
          <option value="court" ${bilanData.horizon==='court'?'selected':''}>Court terme — moins de 3 ans</option>
          <option value="moyen" ${bilanData.horizon==='moyen'?'selected':''}>Moyen terme — 3 à 7 ans</option>
          <option value="long" ${bilanData.horizon==='long'?'selected':''}>Long terme — 7 à 15 ans</option>
          <option value="tres-long" ${bilanData.horizon==='tres-long'?'selected':''}>Très long terme — 15+ ans</option>
        </select>
      </div>
      <div style="${sectionStyle}">
        <label style="${labelStyle}">As-tu besoin de liquidité rapide sur ton épargne ?</label>
        <select id="b-liquidite" style="${fieldStyle}">
          <option value="non" ${bilanData.liquidite==='non'?'selected':''}>Non — tout peut rester investi longtemps</option>
          <option value="partiel" ${bilanData.liquidite==='partiel'?'selected':''}>Partiellement — je garde un fonds d'urgence</option>
          <option value="oui" ${bilanData.liquidite==='oui'?'selected':''}>Oui — j'ai besoin d'accéder rapidement</option>
        </select>
      </div>
      <div style="${sectionStyle}">
        <label style="${labelStyle}">Événement majeur prévu dans les 3 prochaines années ?</label>
        <select id="b-evenement" style="${fieldStyle}">
          <option value="aucun" ${bilanData.evenement==='aucun'?'selected':''}>Aucun événement prévu</option>
          <option value="achat-immo" ${bilanData.evenement==='achat-immo'?'selected':''}>Achat immobilier</option>
          <option value="mariage" ${bilanData.evenement==='mariage'?'selected':''}>Mariage / PACS</option>
          <option value="enfant" ${bilanData.evenement==='enfant'?'selected':''}>Naissance d'un enfant</option>
          <option value="creation-entreprise" ${bilanData.evenement==='creation-entreprise'?'selected':''}>Création d'entreprise</option>
          <option value="changement-emploi" ${bilanData.evenement==='changement-emploi'?'selected':''}>Changement d'emploi</option>
        </select>
      </div>
      <div style="${sectionStyle}">
        <label style="${labelStyle}">Commentaires libres (optionnel)</label>
        <textarea id="b-commentaires" placeholder="Décris ta situation en quelques mots..." style="${fieldStyle};height:80px;resize:none">${bilanData.commentaires||''}</textarea>
      </div>
      ${btnRow(6)}`,

    7: `
      ${bilanBadge("target")}
      <div style="font-size:18px;font-weight:800;color:${txt};margin-bottom:4px;letter-spacing:-0.04em">Précisions sur tes projets</div>
      <div style="font-size:13px;color:${sub};margin-bottom:22px">Quelques questions ciblées sur ce que tu as coché, pour un bilan chiffré et un plan d'action précis. Tu peux laisser un champ vide.</div>
      ${typeof bilanPrecisionsHTML === 'function' ? bilanPrecisionsHTML({ txt, sub, bord, surf }) : ''}
      ${btnRow(7)}`,

    8: `
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:48px;margin-bottom:16px">🤖</div>
        <div style="font-size:20px;font-weight:800;color:${txt};margin-bottom:8px;letter-spacing:-0.04em">Génération de ton bilan...</div>
        <div style="font-size:14px;color:${sub};margin-bottom:24px">Claude analyse ta situation complète et génère ton plan personnalisé</div>
        <div id="bilan-loading-steps" style="display:flex;flex-direction:column;gap:8px;text-align:left;max-width:340px;margin:0 auto">
          ${['Analyse de ta capacité d\'épargne','Évaluation de ton profil de risque','Calcul de tes projections','Définition de ton allocation optimale','Rédaction de tes recommandations'].map((s,i)=>`
          <div class="bilan-load-step" id="bls-${i}" style="display:flex;align-items:center;gap:10px;opacity:0.3;transition:opacity 0.3s">
            <div style="width:20px;height:20px;border-radius:50%;background:rgba(63,185,80,0.2);display:flex;align-items:center;justify-content:center;font-size:11px;color:#3fb950;flex-shrink:0" id="bls-icon-${i}">○</div>
            <div style="font-size:13px;color:${txt}">${s}</div>
          </div>`).join('')}
        </div>
      </div>`,
  };

  el.innerHTML = steps[step] || '';
  // Une saisie est en cours alors qu'un bilan existe déjà : accès direct au dernier bilan
  if (step <= 7) {
    const sv = loadSavedBilan();
    if (!sv && step === 0) el.insertAdjacentHTML('afterbegin', `<div style="margin-bottom:16px;padding:10px 14px;background:${surf};border:1px solid ${bord};border-radius:12px;font-size:12px;color:${sub};line-height:1.5">Aucun bilan enregistré pour l'instant. Celui que tu vas faire sera enregistré automatiquement, et tu pourras le retrouver ici.</div>`);
    if (sv) el.insertAdjacentHTML('afterbegin', `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:16px;padding:10px 14px;background:${surf};border:1px solid ${bord};border-radius:12px"><span style="font-size:12px;color:${sub}">Tu as déjà un bilan du <strong style="color:${txt}">${bilanDateLabel(sv.ts)}</strong></span><button type="button" onclick="bilanShowLast()" style="background:transparent;border:1px solid ${bord};color:${txt};font:inherit;font-size:12px;font-weight:700;padding:7px 12px;border-radius:9px;cursor:pointer">Voir mon dernier bilan</button></div>`);
  }

  // Animation des étapes de chargement
  if (step === 8) {
    el.innerHTML = steps[8];
    generateBilanIA();
  }

  // Calcul capacité épargne en temps réel (étape 1)
  if (step === 1) {
    ['b-revenu','b-loyer','b-credits','b-charges'].forEach(id => {
      const inp = document.getElementById(id);
      if (inp) inp.addEventListener('input', calcCapaciteEpargne);
    });
  }
}

function calcCapaciteEpargne() {
  const revenu = parseFloat(document.getElementById('b-revenu')?.value)||0;
  const loyer = parseFloat(document.getElementById('b-loyer')?.value)||0;
  const credits = parseFloat(document.getElementById('b-credits')?.value)||0;
  const charges = parseFloat(document.getElementById('b-charges')?.value)||0;
  const capacite = revenu - loyer - credits - charges;
  const el = document.getElementById('b-capacite-calc');
  if (!el || !revenu) return;
  const pct = revenu > 0 ? (capacite/revenu*100).toFixed(0) : 0;
  const color = capacite > 500 ? '#3fb950' : capacite > 0 ? '#f59e0b' : '#f87171';
  el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:12px;color:var(--color-text-secondary);margin-bottom:3px">Capacité d'épargne estimée</div>
      <div style="font-size:22px;font-weight:800;color:${color}">${capacite.toLocaleString('fr-FR')} €/mois</div>
      <div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px">${pct}% de tes revenus · ${capacite > 200 ? 'Bonne capacité' : capacite > 0 ? 'Marge limitée' : 'Budget serré'}</div>
    </div>
    <div style="width:44px;height:44px;border-radius:12px;background:${color}22;color:${color};display:flex;align-items:center;justify-content:center">${bilanIco(capacite > 500 ? 'up' : capacite > 0 ? 'scale' : 'down', 22)}</div>
  </div>`;
  el.style.borderColor = color + '40';
}

// Bilan en cours : des réponses ont été saisies mais le rapport n'est pas encore généré
function bilanInProgress() {
  const hasData = Object.values(bilanData || {}).some(v => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length));
  return hasData && bilanStep >= 0 && bilanStep <= 7;
}
// Quitte le bilan (ex. pour analyser ses dépenses) sans perdre les réponses de l'étape en cours
function bilanLeaveTo(page) {
  try { Object.assign(bilanData, bilanCollect(bilanStep)); } catch {}
  closeBilan();
  nav(page);
}
function saveBilanStep(step) { bilanNext(step, bilanCollect(step)); }
function bilanCollect(step) {
  const data = {};
  // Collecter les données selon l'étape
  if (step === 0) {
    data.age = document.getElementById('b-age')?.value;
    data.famille = document.getElementById('b-famille')?.value;
    data.enfants = document.getElementById('b-enfants')?.value;
    data.statut = document.getElementById('b-statut')?.value;
  } else if (step === 1) {
    data.revenu = document.getElementById('b-revenu')?.value;
    data.loyer = document.getElementById('b-loyer')?.value;
    data.credits = document.getElementById('b-credits')?.value;
    data.charges = document.getElementById('b-charges')?.value;
    data.epargneMensuelle = document.getElementById('b-epargne-actuelle')?.value;
    data.capaciteEpargne = parseFloat(data.revenu||0) - parseFloat(data.loyer||0) - parseFloat(data.credits||0) - parseFloat(data.charges||0);
  } else if (step === 2) {
    data.livret = document.getElementById('b-livret')?.value;
    data.assurance = document.getElementById('b-assurance')?.value;
    data.pea = document.getElementById('b-pea')?.value;
    data.bourse = document.getElementById('b-bourse')?.value;
    data.immo = document.getElementById('b-immo')?.value;
    data.autresActifs = document.getElementById('b-autres-actifs')?.value;
    data.patrimoineTotal = [data.livret,data.assurance,data.pea,data.bourse,data.immo,data.autresActifs].reduce((a,v)=>a+parseFloat(v||0),0);
  } else if (step === 3) {
    data.experience = document.getElementById('b-experience')?.value;
    data.partSalaire = document.getElementById('b-part-salaire')?.value;
    data.probleme = document.getElementById('b-probleme')?.value;
  } else if (step === 4) {
    data.objectifs = Array.from(document.querySelectorAll('#b-objectifs-list input:checked')).map(i=>i.value);
  } else if (step === 5) {
    data.reaction = document.querySelector('input[name="b-reaction"]:checked')?.value;
    data.perteMax = document.getElementById('b-perte-max')?.value;
  } else if (step === 6) {
    data.horizon = document.getElementById('b-horizon')?.value;
    data.liquidite = document.getElementById('b-liquidite')?.value;
    data.evenement = document.getElementById('b-evenement')?.value;
    data.commentaires = document.getElementById('b-commentaires')?.value;
  } else if (step === 7) {
    if (typeof bilanPrecisionsCollect === 'function') data.precisions = bilanPrecisionsCollect();
  }
  return data;
}

// ── Appels IA « JSON » du Bilan ──
// Récupère un JSON coupé (réponse arrêtée par la limite de longueur) : on garde tout jusqu'au dernier élément complet et on referme.
function jsonRepairTruncated(s) {
  const st = []; let inStr = false, esc = false, last = -1, lastStack = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') st.push(c);
    else if (c === '}' || c === ']') { st.pop(); last = i; lastStack = st.slice(); }
  }
  if (last < 0) return null;
  return s.slice(0, last + 1) + lastStack.reverse().map(x => x === '{' ? '}' : ']').join('');
}
async function bilanAskJSON(p, valid) {
  let reason = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    let meta = {};
    try {
      const raw = await callClaude(p, 'Réponds UNIQUEMENT en JSON valide, sans backticks.', 3500, undefined, { noThinking: true, onMeta: m => { meta = m || {}; } });
      // quota / connexion : inutile de réessayer. Une réponse vide (« Aucune réponse. ») vaut, elle, un nouvel essai.
      if (raw !== 'Aucune réponse.' && (callClaudeFailed(raw) || raw === 'Erreur de connexion.')) return { fail: String(raw).replace(/^🔒\s*/, '').slice(0, 200) };
      if (raw === 'Aucune réponse.') { console.warn('Bilan IA : réponse vide', meta); reason = 'L\'IA n\'a renvoyé aucun texte'; continue; }
      const clean = raw.replace(/```json|```/g, '').trim();
      const start = clean.indexOf('{');
      let parsed = null;
      try { parsed = JSON.parse(clean.slice(start, clean.lastIndexOf('}') + 1)); }
      catch (pe) {
        const fixed = jsonRepairTruncated(clean.slice(start));      // réponse coupée : on récupère la partie exploitable
        if (fixed) { try { parsed = JSON.parse(fixed); } catch {} }
        if (!parsed) { console.warn('Bilan IA : JSON illisible', meta, 'longueur', clean.length); reason = meta.stop_reason === 'max_tokens' ? 'La réponse de l\'IA a été coupée (trop longue)' : 'La réponse de l\'IA était illisible'; throw pe; }
        console.warn('Bilan IA : réponse coupée, partie exploitable récupérée', meta);
      }
      if (!valid(parsed)) throw new Error('réponse incomplète');
      return { data: parsed };
    } catch (e) {
      console.error('Bilan IA error (tentative ' + (attempt + 1) + ') :', e);
      if (!reason) reason = 'La réponse de l\'IA était incomplète.';
    }
  }
  return { fail: reason };
}
const bilanValidDeep1 = r => Array.isArray(r.risques) || Array.isArray(r.analyse_objectifs);
const bilanValidDeep2 = r => Array.isArray(r.plan_90_jours) && r.plan_90_jours.length > 0;
// Relance UNIQUEMENT les parties d'approfondissement manquantes (le reste du bilan est conservé)
async function bilanRetryDeep() {
  const r = window._lastBilanResult; if (!r || typeof bilanDeepPrompt !== 'function') return;
  const D = r.deep || {};
  const need1 = !(Array.isArray(D.risques) && D.risques.length), need2 = !(Array.isArray(D.plan_90_jours) && D.plan_90_jours.length);
  const el = document.getElementById('bilan-deep-retry'); if (el) el.innerHTML = '<div style="font-size:12.5px;opacity:.7">Génération en cours… (environ 30 secondes)</div>';
  const [b1, b2] = await Promise.all([
    need1 ? bilanAskJSON(bilanDeepPrompt(1), bilanValidDeep1) : Promise.resolve({ data: null, skip: true }),
    need2 ? bilanAskJSON(bilanDeepPrompt(2), bilanValidDeep2) : Promise.resolve({ data: null, skip: true }),
  ]);
  r.deep = { ...D, ...(b1.data || {}), ...(b2.data || {}) };
  r._deepFailed = (need1 && !b1.data) || (need2 && !b2.data);
  if (!r._deepFailed) delete r._deepFailed;
  window._lastBilanResult = r;
  saveBilan(r);
  renderBilanResult(r, Date.now());
}

async function generateBilanIA() {
  // Animer les étapes de chargement
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 600));
    const step = document.getElementById('bls-' + i);
    const icon = document.getElementById('bls-icon-' + i);
    if (step) step.style.opacity = '1';
    if (icon) icon.textContent = '✓';
  }

  const tv = apos().reduce((a,p)=>a+p.qty*p.price,0);
  const ti = apos().reduce((a,p)=>a+p.qty*p.pru,0);
  const pnl = tv - ti;
  const capacite = bilanData.capaciteEpargne || 0;
  const revenu = parseFloat(bilanData.revenu||0);
  const bilanCapital = parseFloat(bilanData.bourse||0) + parseFloat(bilanData.pea||0) + parseFloat(bilanData.assurance||0);
  const patrimoine = bilanData.patrimoineTotal || bilanCapital || tv;

  const prompt = `Tu es le copilote financier IA de Kapitaro. Génère un bilan financier complet et personnalisé.
TON : tutoiement, chaleureux et direct, comme un ami compétent qui travaille en finance. Commence par le positif, sois concret et chiffré, jamais alarmiste. Exemple : au lieu de "Épargne de précaution insuffisante", écris "Bonne nouvelle : tu investis déjà régulièrement. Prochain chantier : ton matelas de sécurité, encore un peu léger pour dormir tranquille.".

PROFIL CLIENT :
- Âge : ${bilanData.age} ans | Statut : ${bilanData.famille} | Enfants : ${bilanData.enfants}
- Situation pro : ${bilanData.statut}
- Revenu net mensuel : ${revenu.toLocaleString('fr-FR')} €
- Capacité d'épargne : ${capacite.toLocaleString('fr-FR')} €/mois (${revenu>0?(capacite/revenu*100).toFixed(0):0}% des revenus)
- Patrimoine total : ${patrimoine.toLocaleString('fr-FR')} € (dont ${tv.toLocaleString('fr-FR')} € en bourse)
- Performance bourse : ${pnl>=0?'+':''}${pnl.toLocaleString('fr-FR',{maximumFractionDigits:0})} € (${ti>0?(pnl/ti*100).toFixed(1).replace(".", ","):0} %)

OBJECTIFS : ${(bilanData.objectifs||[]).join(', ')}
HORIZON : ${bilanData.horizon}
TOLÉRANCE RISQUE : Perd max ${bilanData.perteMax}% | Réaction baisse : ${bilanData.reaction}
EXPÉRIENCE : ${bilanData.experience} | Problème principal : ${bilanData.probleme}
ÉVÉNEMENT PRÉVU : ${bilanData.evenement}
${typeof bilanPrecisionsText === 'function' ? bilanPrecisionsText() : ''}
${typeof bilanRiskText === 'function' ? bilanRiskText() : ''}
${typeof bilanFactsText === 'function' ? bilanFactsText() : ''}
${bilanData.commentaires ? 'NOTES : ' + bilanData.commentaires : ''}

PORTEFEUILLE ACTUEL :
${apos().slice(0,8).map(p=>`${p.name}: ${(p.qty*p.price).toLocaleString('fr-FR',{maximumFractionDigits:0})}€ (${((p.qty*p.price/tv)*100).toFixed(1).replace(".", ",")} %)`).join('\n')}

Génère un rapport structuré en JSON :
{
  "score_global": 7.5,
  "score_label": "Bonne situation",
  "score_color": "#3fb950",
  "resume_executif": "2-3 phrases résumant la situation",
  "points_forts": ["point 1", "point 2", "point 3"],
  "points_attention": ["risque 1", "risque 2"],
  "mensualite_recommandee": 350,
  "mensualite_min": 200,
  "mensualite_max": 500,
  "mensualite_explication": "explication courte",
  "allocation_cible": [
    {"type": "ETF Monde", "pct": 60, "color": "#3fb950", "explication": "court"},
    {"type": "ETF Obligataire", "pct": 20, "color": "#6366f1", "explication": "court"},
    {"type": "Actions", "pct": 20, "color": "#f59e0b", "explication": "court"}
  ],
  "objectif_principal": "description courte",
  "actions_prioritaires": [
    {"priorite": "urgent", "action": "action 1", "impact": "impact"},
    {"priorite": "important", "action": "action 2", "impact": "impact"},
    {"priorite": "conseil", "action": "action 3", "impact": "impact"}
  ],
  "verdict": "phrase finale motivante"
}
Réponds UNIQUEMENT en JSON valide. Sois précis et personnalisé avec les vrais chiffres. N'utilise JAMAIS de guillemets doubles à l'intérieur des textes (utilise « » ou des apostrophes), et pas de retour à la ligne dans les textes.`;

  // Le rapport est produit en TROIS appels parallèles, chacun assez court pour ne jamais être coupé :
  //   A  = analyse (score, résumé, mensualité, allocation, actions, verdict)
  //   B1 = objectifs un par un + risques + erreurs à éviter
  //   B2 = plan des 90 jours + enveloppes + questions
  // Si A échoue → version simplifiée clairement signalée ; si B1/B2 échouent → rapport complet sans ces parties, avec un bouton pour les relancer.
  const pB1 = typeof bilanDeepPrompt === 'function' ? bilanDeepPrompt(1) : '', pB2 = typeof bilanDeepPrompt === 'function' ? bilanDeepPrompt(2) : '';
  const [resA, resB1, resB2] = await Promise.all([
    bilanAskJSON(prompt, r => r.resume_executif && r.mensualite_recommandee),
    pB1 ? bilanAskJSON(pB1, bilanValidDeep1) : Promise.resolve({ data: null }),
    pB2 ? bilanAskJSON(pB2, bilanValidDeep2) : Promise.resolve({ data: null }),
  ]);
  const result = resA.data, reason = resA.fail || '';
  if (result) {
    const deep = { ...(resB1.data || {}), ...(resB2.data || {}) };
    if (Object.keys(deep).length) result.deep = deep;
    if ((pB1 && !resB1.data) || (pB2 && !resB2.data)) result._deepFailed = true;
  }
  if (result) {
    if (typeof bilanEnforceRisk === 'function') bilanEnforceRisk(result);   // allocation ramenée dans la fourchette du profil de risque
    finalizeBilanResult(result, bilanCapital || tv);   // projections calculées, pas inventées par l'IA
    window._lastBilanResult = result;
    saveBilan(result);
    renderBilanResult(result, Date.now());
    return;
  }
  // Secours : version simplifiée, clairement signalée à l'utilisateur (bandeau + bouton « Relancer »)
  const _fallbackResult = {
    _fallback: true, _fallbackReason: reason,
    score_global: 7.0,
    score_label: 'Situation correcte',
    score_color: '#f59e0b',
    resume_executif: 'Version simplifiée : l\'analyse IA n\'a pas pu être générée. Les chiffres détaillés plus bas (diagnostic, objectifs, plan) sont calculés à partir de tes réponses et restent valables.',
    points_forts: ['Tu as renseigné ta situation en détail', 'Tu épargnes déjà régulièrement', 'Tu as un horizon long terme'],
    points_attention: ['Relance l\'analyse pour obtenir des pistes d\'amélioration', 'Vérifie ta mensualité et ton allocation'],
    mensualite_recommandee: Math.round(capacite * 0.4),
    mensualite_min: Math.round(capacite * 0.2),
    mensualite_max: Math.round(capacite * 0.6),
    mensualite_explication: 'Estimation simple : 40 % de ta capacité d\'épargne',
    allocation_cible: [{type:'ETF Monde',pct:70,color:'#3fb950',explication:'Base solide'},{type:'Obligations',pct:20,color:'#6366f1',explication:'Stabilité'},{type:'Actions',pct:10,color:'#f59e0b',explication:'Performance'}],
    objectif_principal: bilanData.objectifs?.[0] || 'Capital long terme',
    actions_prioritaires: [{priorite:'urgent',action:'Relancer l\'analyse IA',impact:'Pour obtenir un verdict et des actions personnalisés'},{priorite:'important',action:'Définir une mensualité fixe',impact:'Régularité = performance'},{priorite:'conseil',action:'Ouvrir un PEA si pas encore fait',impact:'Avantage fiscal'}],
    verdict: 'Analyse simplifiée. Relance l\'analyse pour obtenir ton verdict personnalisé.'
  };
  finalizeBilanResult(_fallbackResult, bilanCapital || tv);
  window._lastBilanResult = _fallbackResult;
  // Version simplifiée : mémorisée EN LOCAL seulement (pour pouvoir la retrouver), sans écraser un vrai bilan ni partir dans le compte
  if (!loadSavedBilan()) saveBilan(_fallbackResult, true);
  renderBilanResult(_fallbackResult, Date.now());
}

// ── Bilan : projections CALCULÉES (l'IA ne fait que recommander la mensualité et l'allocation) ──
// Rendement moyen déduit de l'allocation cible ; capitalisation mensuelle ; avant frais et impôts.
function bilanExpectedRate(alloc) {
  const list = (alloc || []).filter(a => a && a.pct > 0);
  if (!list.length) return 6;
  let tot = 0, acc = 0;
  list.forEach(a => {
    const t = String(a.type || '').toLowerCase();
    let rate = 7;                                                      // ETF diversifié par défaut
    if (/livret|cash|liquid|mon[ée]taire/.test(t)) rate = 2.5;
    else if (/oblig/.test(t)) rate = 3;
    else if (/immo|scpi/.test(t)) rate = 4.5;
    else if (/\bor\b|m[ée]taux/.test(t)) rate = 4;
    else if (/action/.test(t)) rate = 8;
    tot += a.pct; acc += a.pct * rate;
  });
  return Math.round(acc / tot * 10) / 10;
}
function bilanProject(capital, monthly, ratePct, years) {
  const r = ratePct / 100, i = Math.pow(1 + r, 1 / 12) - 1, n = years * 12;
  return Math.round(capital * Math.pow(1 + r, years) + (i > 0 ? monthly * ((Math.pow(1 + i, n) - 1) / i) : monthly * n));
}
function finalizeBilanResult(result, capital) {
  const cap = Math.max(0, Number(capital) || 0);
  const monthly = Math.max(0, Number(result.mensualite_recommandee) || 0);
  result.projection_rate = bilanExpectedRate(result.allocation_cible);
  result.projection_capital = Math.round(cap);
  [5, 10, 20].forEach(y => { result['projection_' + y + 'ans'] = bilanProject(cap, monthly, result.projection_rate, y); });
  return result;
}

// ── Bilan : dernier bilan mémorisé (par compte, sur cet appareil) pour pouvoir le retrouver ──
const bilanKey = () => 'iq_bilan_' + (currentUser?.id || 'demo');
function loadSavedBilan() {
  try { const s = JSON.parse(localStorage.getItem(bilanKey()) || 'null'); return s && s.result ? s : null; } catch { return null; }
}
function saveBilan(result, localOnly) {
  try { localStorage.setItem(bilanKey(), JSON.stringify({ ts: Date.now(), result, data: bilanData })); } catch {}
  trackEvent('bilan_completed');
  // Copie dans le compte (table « bilans », voir SUPABASE_BILANS.sql) : retrouvable sur tous les appareils.
  // Silencieux si la table n'existe pas encore : la copie locale reste utilisée.
  if (!localOnly && !isDemo && currentUser) {
    bilanSetSaveStatus('pending');
    sb.from('bilans').insert({ user_id: currentUser.id, result, data: bilanData })
      .then(({ error }) => { if (error) console.warn('bilan cloud:', error.message); bilanSetSaveStatus(error ? 'error:' + error.message : 'ok'); },
            e => { console.warn('bilan cloud:', e); bilanSetSaveStatus('error:' + (e && e.message || e)); });
  } else bilanSetSaveStatus('local');
}
// Retour visible sur l'enregistrement (au lieu d'un échec silencieux)
function bilanSaveStatusHTML(s) {
  if (s === 'ok') return '<span style="color:#16a34a">✓ Enregistré dans ton compte</span>';
  if (s === 'local') return '<span>Enregistré sur cet appareil</span>';
  if (s === 'pending') return '<span>Enregistrement…</span>';
  if (String(s).startsWith('error')) return `<span style="color:#d97706" title="${_escHtml(String(s).slice(6))}">Enregistré sur cet appareil seulement : ton compte n'a pas répondu</span>`;
  return '';
}
function bilanSetSaveStatus(s) {
  window._bilanSaveStatus = s;
  const el = document.getElementById('bilan-save-status');
  if (el) el.innerHTML = bilanSaveStatusHTML(s);
}
// Rapatrie le dernier bilan du compte s'il est plus récent que la copie locale. true = copie locale mise à jour.
async function syncBilanFromCloud() {
  if (isDemo || !currentUser || !isPremiumUser()) return false;
  try {
    const { data, error } = await sb.from('bilans').select('result, data, created_at')
      .eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(1);
    if (error || !data || !data.length) return false;
    const ts = new Date(data[0].created_at).getTime();
    const local = loadSavedBilan();
    if (local && local.ts >= ts && !(local.result && local.result._fallback)) return false;   // une version simplifiée locale ne masque pas un vrai bilan du compte
    localStorage.setItem(bilanKey(), JSON.stringify({ ts, result: data[0].result, data: data[0].data || {} }));
    return true;
  } catch (e) { console.warn('bilan sync:', e); return false; }
}
function restartBilan() {
  // On repart de l'étape 1 en GARDANT les réponses précédentes (les champs sont pré-remplis) : refaire = modifier, pas tout ressaisir
  bilanData = { ...(bilanData || {}) }; delete bilanData.precisions_done; bilanStep = 0; window._bilanDraft = null;
  renderBilanStep(0);
}
// Depuis la saisie en cours : retourner voir le dernier bilan (la saisie est mise de côté, pas perdue)
function bilanShowLast() {
  const saved = loadSavedBilan(); if (!saved) return;
  if (bilanInProgress()) {
    try { Object.assign(bilanData, bilanCollect(bilanStep)); } catch {}
    window._bilanDraft = { data: bilanData, step: bilanStep };
  }
  bilanData = saved.data || {};
  bilanStep = BILAN_STEPS.length;
  window._lastBilanResult = saved.result;
  renderBilanResult(saved.result, saved.ts);
  document.getElementById('bilan-modal')?.scrollTo?.(0, 0);
}
// Depuis le dernier bilan : reprendre la saisie mise de côté
function bilanResumeDraft() {
  const d = window._bilanDraft; if (!d) return;
  bilanData = d.data; bilanStep = d.step; window._bilanDraft = null;
  renderBilanStep(bilanStep);
}
function bilanDateLabel(ts) {
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function renderBilanResult(r, ts) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const surf = isDark ? 'var(--color-surface-raised)' : '#f9fafb';
  const bord = isDark ? 'var(--color-border)' : '#e4e4e7';
  const txt = isDark ? 'var(--color-text)' : '#09090b';
  const sub = isDark ? 'var(--color-text-secondary)' : '#71717a';

  const prio = {urgent:'#f87171', important:'#f59e0b', conseil:'#3fb950'};

  const html = `
  ${window._bilanDraft ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:16px;padding:10px 14px;background:rgba(22,163,74,0.10);border:1px solid rgba(22,163,74,0.35);border-radius:12px"><span style="font-size:12.5px;color:${txt}">Tu as un bilan <strong>en cours de saisie</strong> (étape ${Math.min(window._bilanDraft.step + 1, 8)}/8).</span><button type="button" onclick="bilanResumeDraft()" style="background:#16a34a;color:#fff;border:none;font:inherit;font-size:12.5px;font-weight:700;padding:8px 13px;border-radius:9px;cursor:pointer">Reprendre ma saisie</button></div>` : ''}
  ${r._fallback ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;padding:12px 14px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.4);border-radius:12px">
    <div style="font-size:12.5px;color:${txt};line-height:1.5;flex:1;min-width:200px"><strong>Version simplifiée.</strong> L'analyse IA n'a pas pu être générée${r._fallbackReason ? ' (' + _escHtml(r._fallbackReason) + ')' : ''}. Les chiffres détaillés plus bas sont calculés à partir de tes réponses.</div>
    <button onclick="renderBilanStep(8)" style="background:#16a34a;color:#fff;border:none;border-radius:9px;padding:9px 14px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer">Relancer l'analyse</button>
  </div>` : ''}
  ${ts ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:16px;padding:10px 14px;background:${surf};border:1px solid ${bord};border-radius:12px">
    <div style="font-size:12px;color:${sub}">📅 Bilan du <strong style="color:${txt}">${bilanDateLabel(ts)}</strong><span id="bilan-save-status" style="margin-left:10px;font-size:11.5px">${window._bilanSaveStatus && Date.now() - ts < 60000 ? bilanSaveStatusHTML(window._bilanSaveStatus) : ''}</span></div>
    <button onclick="restartBilan()" style="background:transparent;border:1px solid ${bord};color:${txt};font-size:12px;font-weight:700;padding:7px 12px;border-radius:9px;cursor:pointer">🔄 Refaire mon bilan</button>
  </div>` : ''}
  <!-- SCORE -->
  <div style="text-align:center;margin-bottom:24px">
    <div style="width:80px;height:80px;border-radius:50%;background:${r.score_color}20;border:3px solid ${r.score_color};display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto 12px">
      <div style="font-size:24px;font-weight:900;color:${r.score_color}">${r.score_global}</div>
      <div style="font-size:9px;color:${r.score_color};font-weight:600">/10</div>
    </div>
    <div style="font-size:18px;font-weight:800;color:${txt};letter-spacing:-0.04em">${r.score_label}</div>
    <div style="font-size:13px;color:${sub};margin-top:6px;line-height:1.5;max-width:400px;margin-left:auto;margin-right:auto">${r.resume_executif}</div>
  </div>

  <!-- MENSUALITÉ RECOMMANDÉE -->
  <div style="background:linear-gradient(135deg,${r.score_color}15,${r.score_color}05);border:1px solid ${r.score_color}30;border-radius:16px;padding:20px;margin-bottom:16px;text-align:center">
    <div style="font-size:11px;font-weight:700;color:${sub};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">💰 Mensualité recommandée</div>
    <div style="font-size:42px;font-weight:900;color:${r.score_color};letter-spacing:-0.05em">${r.mensualite_recommandee?.toLocaleString('fr-FR')} €</div>
    <div style="font-size:12px;color:${sub};margin-top:4px">${r.mensualite_explication}</div>
    <div style="display:flex;justify-content:center;gap:20px;margin-top:12px">
      <div><div style="font-size:11px;color:${sub}">Minimum</div><div style="font-size:16px;font-weight:700;color:${txt}">${r.mensualite_min?.toLocaleString('fr-FR')} €</div></div>
      <div style="width:1px;background:${bord}"></div>
      <div><div style="font-size:11px;color:${sub}">Maximum</div><div style="font-size:16px;font-weight:700;color:${txt}">${r.mensualite_max?.toLocaleString('fr-FR')} €</div></div>
    </div>
  </div>

  <!-- PROJECTIONS -->
  <div style="background:${surf};border:1px solid ${bord};border-radius:16px;padding:18px;margin-bottom:16px">
    <div style="font-size:13px;font-weight:700;color:${txt};margin-bottom:14px">📈 Projections à ${r.mensualite_recommandee?.toLocaleString('fr-FR')}€/mois</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      ${[{label:'Dans 5 ans',val:r.projection_5ans},{label:'Dans 10 ans',val:r.projection_10ans},{label:'Dans 20 ans',val:r.projection_20ans}].map(p=>`
      <div style="text-align:center;padding:12px;background:${isDark?'rgba(255,255,255,0.04)':'#fff'};border-radius:10px;border:1px solid ${bord}">
        <div style="font-size:10px;color:${sub};margin-bottom:6px">${p.label}</div>
        <div style="font-size:17px;font-weight:800;color:${r.score_color};letter-spacing:-0.03em">${fmtK(p.val)}</div>
      </div>`).join('')}
    </div>
    <div style="font-size:11px;color:${sub};margin-top:12px;line-height:1.5">Simulation calculée avec un rendement moyen de <strong>${r.projection_rate ?? 7} %/an</strong> (selon l'allocation cible), un capital de départ de <strong>${fmtI(r.projection_capital ?? 0)} €</strong> et ${r.mensualite_recommandee?.toLocaleString('fr-FR')} €/mois versés, avant frais et impôts. Ce n'est pas une garantie.</div>
  </div>

  <!-- ALLOCATION CIBLE -->
  <div style="background:${surf};border:1px solid ${bord};border-radius:16px;padding:18px;margin-bottom:16px">
    <div style="font-size:13px;font-weight:700;color:${txt};margin-bottom:14px">Allocation cible recommandée</div>
    ${r.allocation_ajustee ? `<div style="font-size:11.5px;color:${sub};margin:-6px 0 12px;line-height:1.5">Ajustée pour respecter ton profil « ${_escHtml(r.allocation_ajustee.profil)} » : ${r.allocation_ajustee.de} % → ${r.allocation_ajustee.vers} % d'actions.</div>` : ''}
    ${(r.allocation_cible||[]).map(a=>`
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:4px">
        <span style="color:${txt}">${a.type}</span>
        <span style="color:${a.color}">${a.pct}%</span>
      </div>
      <div style="background:${isDark?'rgba(255,255,255,0.06)':'#f0f0f2'};border-radius:99px;height:6px;overflow:hidden">
        <div style="height:100%;background:${a.color};width:${a.pct}%;border-radius:99px;transition:width 1s ease"></div>
      </div>
      <div style="font-size:11px;color:${sub};margin-top:3px">${a.explication}</div>
    </div>`).join('')}
  </div>

  <!-- POINTS FORTS & ATTENTION -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
    <div style="background:rgba(63,185,80,0.08);border:1px solid rgba(63,185,80,0.2);border-radius:14px;padding:14px">
      <div style="font-size:12px;font-weight:700;color:#3fb950;margin-bottom:10px">✅ Points forts</div>
      ${(r.points_forts||[]).map(p=>`<div style="font-size:12px;color:${txt};margin-bottom:6px;display:flex;gap:7px"><span>•</span>${p}</div>`).join('')}
    </div>
    <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:14px;padding:14px">
      <div style="font-size:12px;font-weight:700;color:#f59e0b;margin-bottom:10px">⚠️ À surveiller</div>
      ${(r.points_attention||[]).map(p=>`<div style="font-size:12px;color:${txt};margin-bottom:6px;display:flex;gap:7px"><span>•</span>${p}</div>`).join('')}
    </div>
  </div>

  <!-- ACTIONS PRIORITAIRES -->
  <div style="background:${surf};border:1px solid ${bord};border-radius:16px;padding:18px;margin-bottom:16px">
    <div style="font-size:13px;font-weight:700;color:${txt};margin-bottom:14px">🚀 Actions prioritaires</div>
    ${(r.actions_prioritaires||[]).map((a,i)=>`
    <div style="display:flex;align-items:flex-start;gap:12px;padding:12px;background:${isDark?'rgba(255,255,255,0.04)':'#fff'};border-radius:10px;border:1px solid ${bord};margin-bottom:8px">
      <span style="background:${prio[a.priorite]}20;color:${prio[a.priorite]};font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;white-space:nowrap;margin-top:1px">${a.priorite.toUpperCase()}</span>
      <div>
        <div style="font-size:13px;font-weight:700;color:${txt};margin-bottom:2px">${a.action}</div>
        <div style="font-size:11px;color:${sub}">${a.impact}</div>
      </div>
    </div>`).join('')}
  </div>

  ${typeof bilanExtraHTML === 'function' ? bilanExtraHTML(r, { isDark, surf, bord, txt, sub }) : ''}

  <!-- VERDICT -->
  <div style="background:linear-gradient(135deg,#080c10,#0d1520);border:1px solid rgba(63,185,80,0.2);border-radius:16px;padding:20px;text-align:center;margin-bottom:20px">
    <div style="font-size:28px;margin-bottom:8px">🎯</div>
    <div style="font-size:14px;font-weight:600;color:rgba(255,255,255,0.8);line-height:1.6">${r.verdict}</div>
  </div>

  <!-- BOUTONS FINAUX -->
  <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px">
    <div style="display:flex;gap:10px">
      <button onclick="createObjectifFromBilan()" style="flex:1;padding:13px 10px;background:linear-gradient(135deg,#2563eb,#1d4ed8);border:none;border-radius:12px;font-size:13px;font-weight:700;color:#fff;cursor:pointer">🎯 Créer mon objectif</button>
      <button onclick="exportBilanPDF()" style="flex:1;padding:13px 10px;background:linear-gradient(135deg,#7c3aed,#6d28d9);border:none;border-radius:12px;font-size:13px;font-weight:700;color:#fff;cursor:pointer">📄 Exporter PDF</button>
    </div>
    <div style="display:flex;gap:10px">
      <button onclick="closeBilan()" style="flex:1;padding:12px;background:transparent;border:1px solid ${bord};border-radius:12px;font-size:13px;font-weight:600;color:${sub};cursor:pointer">Fermer</button>
      <button onclick="bilanDiscuss()" style="flex:2;padding:12px;background:#16a34a;border:none;border-radius:12px;font-size:13px;font-weight:700;color:#fff;cursor:pointer">🤖 Discuter avec l'IA →</button>
    </div>
  </div>`;

  const el = document.getElementById('bilan-content');
  if (el) el.innerHTML = html;
  if (typeof bilanExtraInit === 'function') bilanExtraInit();
  updateBilanProgress(BILAN_STEPS.length - 1);
}



// ===== BILAN — CRÉER OBJECTIF =====
function createObjectifFromBilan() {
  if (!window._lastBilanResult) {
    closeBilan();
    nav('objectif');
    return;
  }
  const r = window._lastBilanResult;
  const monthly = r.mensualite_recommandee || 200;
  const target = r.projection_10ans || 50000;
  const years = 10;
  const rate = r.projection_rate || 7;   // même hypothèse que les projections du bilan

  // Si 3 objectifs déjà, proposer de remplacer
  if (allObjectives.length >= 3) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const surf = isDark ? '#1a1f2e' : '#fff';
    const txt = isDark ? '#f0f0f0' : '#09090b';
    const sub = isDark ? '#888' : '#71717a';
    const bord = isDark ? '#2a2f3e' : '#e4e4e7';

    // Créer modal de remplacement
    const overlay = document.createElement('div');
    overlay.id = 'bilan-replace-modal';
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px`;
    overlay.innerHTML = `
      <div style="background:${surf};border-radius:20px;padding:24px;max-width:400px;width:100%;border:1px solid ${bord}">
        <div style="font-size:18px;font-weight:800;color:${txt};margin-bottom:6px">⚠️ 3 objectifs déjà créés</div>
        <div style="font-size:13px;color:${sub};margin-bottom:20px;line-height:1.5">Tu as atteint le maximum. Choisis quel objectif remplacer par celui du bilan :</div>
        ${allObjectives.map((obj, i) => `
          <div onclick="replaceBilanObjectif('${obj.id}')" style="padding:14px;border:1px solid ${bord};border-radius:12px;margin-bottom:10px;cursor:pointer;transition:all 0.2s"
            onmouseover="this.style.borderColor='#2563eb';this.style.background='${isDark?'rgba(37,99,235,0.1)':'#eff6ff'}'"
            onmouseout="this.style.borderColor='${bord}';this.style.background='transparent'">
            <div style="font-size:13px;font-weight:700;color:${txt}">${obj.label || 'Objectif ' + (i+1)}</div>
            <div style="font-size:11px;color:${sub};margin-top:2px">${obj.monthly}€/mois · cible ${fmtI(obj.target)}€ · ${obj.years} ans</div>
          </div>`).join('')}
        <button onclick="document.getElementById('bilan-replace-modal').remove()" style="width:100%;padding:12px;background:transparent;border:1px solid ${bord};border-radius:12px;font-size:13px;font-weight:600;color:${sub};cursor:pointer;margin-top:4px">Annuler</button>
      </div>`;
    document.body.appendChild(overlay);

    // Store pending bilan data for replaceBilanObjectif
    window._pendingBilanObjectif = { monthly, target, years, rate, capital: r.projection_capital, ...bilanObjectiveExtras(r) };
    return;
  }

  bilanCreateObjectif({ monthly, target, years, rate, capital: r.projection_capital, ...bilanObjectiveExtras(r) });
}

// Création réelle de l'objectif. Ordre IMPORTANT : on ouvre d'abord la page Objectif (qui recharge SON objectif actif et écrase les
// variables du graphique), et on applique les valeurs du bilan APRÈS — sinon « créer » retombait sur une mise à jour de l'ancien objectif.
async function bilanCreateObjectif(p) {
  closeBilan();
  nav('objectif');
  await new Promise(r => setTimeout(r, 250));
  try {
    if (!isDemo && currentUser) await loadObjective();          // liste à jour (et évite qu'un chargement tardif écrase nos valeurs)
    objChartMonthly = p.monthly; objChartTarget = p.target; objChartYears = p.years; objChartRate = p.rate;
    objChartCapital = p.capital ?? (parseFloat(bilanData.bourse) || parseFloat(bilanData.pea) || 0);
    if (p.risk) objRisk = p.risk;
    if (p.stockPct != null) objStockPct = p.stockPct;
    buildObjChart(objChartCapital, objChartMonthly, objChartTarget, objChartYears, objChartRate);
    const idsBefore = new Set(allObjectives.map(o => o.id));
    await validateObjectif('Objectif Bilan', true);
    showValidatedChart();
    const created = allObjectives.some(o => !idsBefore.has(o.id));
    bilanShowBanner(created ? `✅ Objectif créé depuis ton bilan : ${Math.round(p.monthly).toLocaleString('fr-FR')} €/mois, cible ${Math.round(p.target / 1000)} k€ en ${p.years} ans` : 'Objectif mis à jour depuis ton bilan');
  } catch (e) {
    console.warn('bilanCreateObjectif:', e);
    bilanShowBanner('⚠️ Impossible de créer l\'objectif pour le moment. Réessaie depuis la page Objectif.');
  }
}
function bilanShowBanner(text) {
  document.getElementById('bilan-import-banner')?.remove();
  const banner = document.createElement('div');
  banner.id = 'bilan-import-banner';
  banner.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:9999;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:12px 20px;border-radius:14px;font-size:13px;font-weight:700;box-shadow:0 8px 32px rgba(37,99,235,0.4);display:flex;align-items:center;gap:10px;max-width:420px';
  banner.innerHTML = `<span>${_escHtml(text)}</span><button onclick="this.parentElement.remove()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;border-radius:8px;padding:4px 8px;cursor:pointer;font-size:12px;font-weight:700">x</button>`;
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 7000);
}
// Profil de risque et part d'actions du bilan → paramètres de l'objectif (cohérence bilan ↔ objectif)
function bilanObjectiveExtras(r) {
  const out = {};
  try {
    const P = typeof bilanRiskProfile === 'function' ? bilanRiskProfile() : null;
    if (P) out.risk = P.level <= 1 ? 'prudent' : P.level === 2 ? 'equilibre' : 'agressif';
    // Sur la page Objectif, « actions » = ACTIONS INDIVIDUELLES (le reste = ETF, obligataires compris) : on reprend donc la part
    // d'actions individuelles de l'allocation du bilan, pas la part d'actions au sens large (qui compte aussi les ETF actions)
    if (r && Array.isArray(r.allocation_cible)) out.stockPct = Math.round(r.allocation_cible.reduce((t, x) => t + (/action/i.test(String(x.type || '')) && !/etf|fonds|tracker|indic|oblig/i.test(String(x.type || '')) ? (Number(x.pct) || 0) : 0), 0));
  } catch {}
  return out;
}

// ===== BILAN — REMPLACER OBJECTIF =====
async function replaceBilanObjectif(idToReplace) {
  document.getElementById('bilan-replace-modal')?.remove();
  const pending = window._pendingBilanObjectif;
  if (!pending) return;

  // Supprimer l'objectif existant
  allObjectives = allObjectives.filter(o => o.id !== idToReplace);
  if (activeObjId === idToReplace) activeObjId = allObjectives[0]?.id || null;

  // Supprimer en base si connecté
  if (!isDemo && currentUser) {
    try { await sb.from('objectives').delete().eq('id', idToReplace); } catch(e) {}
  }

  await bilanCreateObjectif(pending);
}

// ===== BILAN — EXPORT PDF =====
function stripEmoji(str) {
  if (!str) return '';
  return (str + '').replace(/[^\u0000-\u00FF\u0100-\u024F\u2000-\u206F]/g, '').replace(/\s+/g, ' ').trim();
}
function safeK(val) {
  if (!val && val !== 0) return '0 EUR';
  return val >= 1000 ? (val/1000).toFixed(0) + ' k EUR' : Math.round(val) + ' EUR';
}
// Outil PDF chargé à la demande (évite ~350 Ko au chargement de chaque page)
let _jsPDFLoading = null;
function loadJsPDF() {
  if (window.jspdf) return Promise.resolve();
  if (!_jsPDFLoading) _jsPDFLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.integrity = 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk';
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve();
    s.onerror = () => { _jsPDFLoading = null; reject(new Error('Outil PDF indisponible, vérifie ta connexion et réessaie.')); };
    document.head.appendChild(s);
  });
  return _jsPDFLoading;
}
async function exportBilanPDF() {
  if (!window._lastBilanResult) {
    alert("Aucun résultat de bilan à exporter.");
    return;
  }

  // Bouton en état loading
  const btn = document.querySelector('[onclick="exportBilanPDF()"]');
  const origText = btn ? btn.innerHTML : '';
  if (btn) { btn.innerHTML = '⏳ Génération...'; btn.disabled = true; }

  try {
    await loadJsPDF();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const r = window._lastBilanResult;
    const d = bilanData;
    const pageW = 210;
    const margin = 16;
    const colW = pageW - margin * 2;
    let y = 0;

    // ── Helpers ──
    const addPage = () => { doc.addPage(); y = 16; };
    const checkY = (need) => { if (y + need > 280) addPage(); };
    const hex2rgb = (hex) => {
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
      return [r,g,b];
    };
    const colorToRgb = (c) => {
      if (c && c.startsWith('#')) return hex2rgb(c);
      if (c === '#f87171') return [248,113,113];
      return [22,163,74];
    };

    // ── HEADER ──
    doc.setFillColor(8, 12, 16);
    doc.rect(0, 0, 210, 42, 'F');
    doc.setFillColor(22, 163, 74);
    doc.rect(0, 38, 210, 4, 'F');

    // Logo texte
    doc.setFontSize(22); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
    doc.text('Kapitaro', margin, 18);
    doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(120,180,120);
    doc.text('Bilan Financier Premium', margin, 26);

    // Date
    doc.setFontSize(9); doc.setTextColor(150,150,150);
    const now = new Date();
    doc.text(`Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toHours ? now.toHours() : now.getHours()}h${String(now.getMinutes()).padStart(2,'0')}`, pageW - margin, 18, {align:'right'});

    // Score cercle (simulé avec rect arrondi)
    const sc = r.score_global || 0;
    const scColor = r.score_color || '#16a34a';
    doc.setFontSize(10); doc.setTextColor(200,200,200);
    doc.text(`Score global : ${sc}/10 - ${stripEmoji(r.score_label || '')}`, pageW - margin, 28, {align:'right'});

    y = 52;

    // ── RÉSUMÉ EXÉCUTIF ──
    doc.setFillColor(245,248,245);
    doc.roundedRect(margin, y, colW, 20, 3, 3, 'F');
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(60,60,60);
    const resumeLines = doc.splitTextToSize(stripEmoji(r.resume_executif || ''), colW - 8);
    doc.text(resumeLines, margin + 4, y + 7);
    y += 26;

    // ── MENSUALITÉ ──
    checkY(28);
    doc.setFillColor(230,247,235);
    doc.roundedRect(margin, y, colW, 26, 3, 3, 'F');
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(22,100,50);
    doc.text(`Mensualité recommandée : ${(r.mensualite_recommandee||0).toLocaleString('fr-FR')} €/mois`, margin+4, y+10);
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(60,60,60);
    doc.text(`Min : ${(r.mensualite_min||0).toLocaleString('fr-FR')} €  —  Max : ${(r.mensualite_max||0).toLocaleString('fr-FR')} €`, margin+4, y+18);
    doc.setFontSize(8); doc.setTextColor(100,100,100);
    const explLines = doc.splitTextToSize(stripEmoji(r.mensualite_explication || ''), colW - 8);
    doc.text(explLines, margin + 4, y + 22);
    y += 32;

    // ── PROJECTIONS ──
    checkY(28);
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(20,20,20);
    doc.text('Projections', margin, y); y += 6;
    const projs = [
      {label:'5 ans', val: r.projection_5ans},
      {label:'10 ans', val: r.projection_10ans},
      {label:'20 ans', val: r.projection_20ans}
    ];
    const projW = (colW - 8) / 3;
    projs.forEach((p, i) => {
      const px = margin + i * (projW + 4);
      doc.setFillColor(240,250,242);
      doc.roundedRect(px, y, projW, 18, 2, 2, 'F');
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100);
      doc.text(`Dans ${p.label}`, px + projW/2, y+6, {align:'center'});
      doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(22,163,74);
      const kval = safeK(p.val);
      doc.text(kval, px + projW/2, y+14, {align:'center'});
    });
    y += 24;

    // ── ALLOCATION ──
    checkY(40);
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(20,20,20);
    doc.text('Allocation cible recommandée', margin, y); y += 6;
    (r.allocation_cible || []).forEach(a => {
      checkY(14);
      doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(30,30,30);
      doc.text(stripEmoji(a.type || ''), margin, y+4);
      doc.setFont('helvetica','normal'); doc.setTextColor(80,80,80);
      doc.text(`${a.pct}%`, margin + colW - 10, y+4, {align:'right'});
      // Barre
      doc.setFillColor(220,220,220);
      doc.roundedRect(margin, y+6, colW, 4, 2, 2, 'F');
      try {
        const rgb = colorToRgb(a.color || '#16a34a');
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      } catch(e) { doc.setFillColor(22,163,74); }
      doc.roundedRect(margin, y+6, colW * a.pct/100, 4, 2, 2, 'F');
      doc.setFontSize(7.5); doc.setTextColor(120,120,120);
      const explA = doc.splitTextToSize(stripEmoji(a.explication || ''), colW);
      doc.text(explA, margin, y+14);
      y += 16 + (explA.length > 1 ? (explA.length-1)*3 : 0);
    });
    y += 4;

    // ── POINTS FORTS & ATTENTION ──
    checkY(50);
    const halfW = (colW - 6) / 2;
    doc.setFillColor(235,252,240); doc.roundedRect(margin, y, halfW, 6, 2, 2, 'F');
    doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(22,163,74);
    doc.text('Points forts', margin+3, y+4.5);

    doc.setFillColor(255,247,230); doc.roundedRect(margin + halfW + 6, y, halfW, 6, 2, 2, 'F');
    doc.setTextColor(180,120,0);
    doc.text('A surveiller', margin + halfW + 9, y+4.5);
    y += 8;

    const forts = r.points_forts || [];
    const attention = r.points_attention || [];
    const maxRows = Math.max(forts.length, attention.length);
    for (let i=0; i<maxRows; i++) {
      checkY(8);
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(40,40,40);
      if (forts[i]) {
        const lines = doc.splitTextToSize(`- ${stripEmoji(forts[i])}`, halfW - 4);
        doc.text(lines, margin+2, y+4);
      }
      if (attention[i]) {
        const lines = doc.splitTextToSize(`- ${stripEmoji(attention[i])}`, halfW - 4);
        doc.text(lines, margin + halfW + 8, y+4);
      }
      y += 8;
    }
    y += 6;

    // ── ACTIONS PRIORITAIRES ──
    checkY(20);
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(20,20,20);
    doc.text('Actions prioritaires', margin, y); y += 6;
    const pColors = {urgent:[248,113,113], important:[245,158,11], conseil:[63,185,80]};
    (r.actions_prioritaires || []).forEach(a => {
      checkY(16);
      const pRgb = pColors[a.priorite] || [22,163,74];
      doc.setFillColor(pRgb[0]+80, pRgb[1]+80, pRgb[2]+80 > 255 ? 220 : pRgb[2]+80);
      doc.roundedRect(margin, y, 22, 6, 1, 1, 'F');
      doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(pRgb[0], pRgb[1], pRgb[2]);
      doc.text((a.priorite||'').toUpperCase(), margin+11, y+4.2, {align:'center'});
      doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(20,20,20);
      doc.text(stripEmoji(a.action || ''), margin+26, y+4.5);
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100);
      const impactLines = doc.splitTextToSize(stripEmoji(a.impact || ''), colW - 28);
      doc.text(impactLines, margin+26, y+9);
      y += 14 + (impactLines.length > 1 ? (impactLines.length-1)*3 : 0);
    });
    y += 4;

    // ── ANALYSE DÉTAILLÉE (calculée) ──
    if (typeof bilanPdfExtra === 'function') { try { y = bilanPdfExtra(doc, y, margin, colW, r); } catch (e) { console.warn('pdf extra:', e); } }

    // ── VERDICT ──
    checkY(28);
    doc.setFillColor(8, 12, 16);
    doc.roundedRect(margin, y, colW, 26, 4, 4, 'F');
    doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(200,240,200);
    doc.text('Verdict', margin+4, y+8);
    doc.setFont('helvetica','normal'); doc.setTextColor(200,200,200);
    const verdictLines = doc.splitTextToSize(stripEmoji(r.verdict || ''), colW - 8);
    doc.text(verdictLines, margin+4, y+14);
    y += 32;

    // ── FOOTER ──
    const totalPages = doc.getNumberOfPages();
    for (let i=1; i<=totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(240,240,240);
      doc.rect(0, 287, 210, 10, 'F');
      doc.setFontSize(7.5); doc.setTextColor(130,130,130); doc.setFont('helvetica','normal');
      doc.text('Kapitaro — Bilan Financier Premium — Confidentiel', margin, 293);
      doc.text(`Page ${i}/${totalPages}`, pageW - margin, 293, {align:'right'});
    }

    // ── Sauvegarde ──
    const filename = `Kapitaro_Bilan_${now.toLocaleDateString('fr-FR').replace(/\//g,'-')}.pdf`;
    doc.save(filename);

  } catch(err) {
    console.error('PDF error:', err);
    alert('Erreur lors de la génération du PDF. Réessaie.');
  } finally {
    if (btn) { btn.innerHTML = origText; btn.disabled = false; }
  }
}

