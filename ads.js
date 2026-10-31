// ads.js — Publicité : consentement cookies (CNIL), pixel Meta et balise Google, provenance des visiteurs.
// • Rien de publicitaire n'est chargé sans un « Accepter » explicite ; « Refuser » est aussi simple qu'« Accepter ».
// • Le bandeau n'apparaît que si au moins un identifiant publicitaire est renseigné ci-dessous.
// • La provenance (utm_*, gclid, fbclid, site d'origine) est mémorisée en local (1re visite, 30 jours) pour la
//   mesure interne des campagnes : elle n'est jamais transmise à un tiers.
(function () {
  // Identifiants publics (ce ne sont pas des secrets) : à renseigner une fois les comptes publicitaires créés.
  const CONFIG = {
    metaPixel: '29037079089229292',     // ex. '123456789012345' (Meta Business → Gestionnaire d'événements)
    googleTag: 'AW-18528605387',     // Google Ads (compte créé le 21/10/2026)
    googleSignupLabel: '84zpCLy-uKQdEMupkINF',     // conversion « Inscription Kapitaro » (Google Ads → Objectifs → Conversions)
  };
  const CONSENT_KEY = 'kp_consent', CONSENT_VERSION = 1, CONSENT_DAYS = 180;
  const SOURCE_KEY = 'kp_source';
  const enabled = !!(CONFIG.metaPixel || CONFIG.googleTag);
  // Version anglaise (kapitaro.com) : textes en anglais, signal Global Privacy Control respecté (CCPA/CPRA),
  // lien « Do Not Sell or Share ». En français, comportement inchangé.
  const EN = !!(window.kpI18n && window.kpI18n.isEN) || document.documentElement.lang === 'en';
  const GPC = EN && navigator.globalPrivacyControl === true;
  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  // ── Provenance (première visite) ──
  (function rememberSource() {
    try {
      const p = new URLSearchParams(location.search);
      const utm = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => { const v = p.get(k); if (v) utm[k.slice(4)] = v.slice(0, 80); });
      if (p.get('gclid')) utm.click = 'google';
      if (p.get('fbclid')) utm.click = 'meta';
      let ref = '';
      try { const r = document.referrer && new URL(document.referrer); if (r && r.hostname !== location.hostname) ref = r.hostname.replace(/^www\./, ''); } catch {}
      const prev = ls.get(SOURCE_KEY);
      const fresh = prev && Date.now() - (prev.at || 0) < 30 * 86400000;
      if (Object.keys(utm).length) ls.set(SOURCE_KEY, { ...utm, ref, landing: location.pathname, at: Date.now() });   // une campagne l'emporte toujours
      else if (!fresh) ls.set(SOURCE_KEY, { ref, landing: location.pathname, at: Date.now() });
    } catch {}
  })();

  // Libellé lisible pour le tableau de bord : « meta / reel-volatilite », « google », « instagram.com », « direct »…
  function sourceLabel() {
    const s = ls.get(SOURCE_KEY) || {};
    if (s.source) return (s.source + (s.campaign ? ' / ' + s.campaign : '')).toLowerCase();
    if (s.click) return s.click;
    if (s.ref) {
      if (/google\./.test(s.ref)) return 'google (naturel)';
      if (/instagram|facebook|fb\.|l\.messenger/.test(s.ref)) return 'meta (naturel)';
      if (/tiktok/.test(s.ref)) return 'tiktok (naturel)';
      if (/bing|duckduckgo|qwant|ecosia|yahoo/.test(s.ref)) return 'moteur de recherche';
      return s.ref;
    }
    return 'direct';
  }

  // ── Consentement ──
  function consent() {
    if (GPC) return { ads: false, v: CONSENT_VERSION, at: Date.now(), gpc: true };   // GPC = refus automatique
    const c = ls.get(CONSENT_KEY);
    if (!c || c.v !== CONSENT_VERSION || Date.now() - (c.at || 0) > CONSENT_DAYS * 86400000) return null;
    return c;
  }
  let loaded = false;
  function loadTags() {
    if (loaded || !enabled) return;
    loaded = true;
    if (CONFIG.metaPixel) {
      /* Code officiel du pixel Meta (chargement asynchrone de fbevents.js) */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0;
        t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', CONFIG.metaPixel);
      window.fbq('track', 'PageView');
    }
    if (CONFIG.googleTag) {
      const s = document.createElement('script');
      s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CONFIG.googleTag);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      // Mode Consentement v2 (exigé par Google dans l'EEE) : la balise n'est chargée qu'après « Accepter », donc tout est accordé
      window.gtag('consent', 'default', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });
      window.gtag('js', new Date());
      window.gtag('config', CONFIG.googleTag);
    }
  }
  function setConsent(ads) {
    ls.set(CONSENT_KEY, { ads: !!ads, v: CONSENT_VERSION, at: Date.now() });
    document.getElementById('kp-consent')?.remove();
    if (ads) loadTags();
    else if (loaded) location.reload();   // retrait du consentement : on recharge sans les traceurs
  }

  function showBanner() {
    if (!enabled || document.getElementById('kp-consent')) return;
    const b = document.createElement('div');
    b.id = 'kp-consent';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', EN ? 'Advertising cookies' : 'Cookies publicitaires');
    // Bandeau compact (il ne doit pas cacher la moitié de l'écran) ; Refuser et Accepter restent de même taille (règle CNIL)
    b.style.cssText = 'position:fixed;left:10px;right:10px;bottom:10px;z-index:30000;max-width:520px;margin:0 auto;background:#fff;color:#0b1220;border:1px solid #e4e7ec;border-radius:14px;padding:12px 14px;box-shadow:0 12px 40px rgba(16,24,40,0.18);font:13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif';
    if (EN) b.innerHTML = '<div style="color:#344054">🍪 <b style="color:#0b1220">Advertising cookies</b> (Meta, Google) to measure our ads, only if you agree. If you refuse, nothing is stored and the app works the same. '
      + '<a href="' + ((window.kpI18n && kpI18n.legalUrl('cookies')) || '/cookies') + '" style="color:#15803d;font-weight:600">Learn more</a></div>'
      + '<div style="display:flex;gap:8px;margin-top:10px">'
      + '<button type="button" data-c="0" style="flex:1;padding:9px;border-radius:10px;border:1.5px solid #d0d5dd;background:#fff;color:#0b1220;font-weight:700;font-size:14px;cursor:pointer">Refuse</button>'
      + '<button type="button" data-c="1" style="flex:1;padding:9px;border-radius:10px;border:1.5px solid #16a34a;background:#16a34a;color:#fff;font-weight:700;font-size:14px;cursor:pointer">Accept</button></div>';
    else b.innerHTML = '<div style="color:#344054">🍪 <b style="color:#0b1220">Cookies publicitaires</b> (Meta, Google) pour mesurer nos pubs, seulement avec ton accord. Si tu refuses, rien n’est déposé et l’app fonctionne pareil. '
      + '<a href="/confidentialite" style="color:#15803d;font-weight:600">En savoir plus</a></div>'
      + '<div style="display:flex;gap:8px;margin-top:10px">'
      + '<button type="button" data-c="0" style="flex:1;padding:9px;border-radius:10px;border:1.5px solid #d0d5dd;background:#fff;color:#0b1220;font-weight:700;font-size:14px;cursor:pointer">Refuser</button>'
      + '<button type="button" data-c="1" style="flex:1;padding:9px;border-radius:10px;border:1.5px solid #16a34a;background:#16a34a;color:#fff;font-weight:700;font-size:14px;cursor:pointer">Accepter</button></div>';
    b.addEventListener('click', e => { const v = e.target && e.target.getAttribute('data-c'); if (v !== null) setConsent(v === '1'); });
    document.body.appendChild(b);
  }

  // ── Événements de conversion (envoyés seulement si consentement) ──
  function track(name, data) {
    const c = consent();
    if (!enabled || !c || !c.ads) return;
    loadTags();
    data = data || {};
    try {
      if (window.fbq) {
        if (name === 'signup') window.fbq('track', 'CompleteRegistration');
        else if (name === 'subscribe') window.fbq('track', 'Subscribe', { value: data.value || 0, currency: 'EUR', predicted_ltv: data.ltv || data.value || 0 });
        else if (name === 'lead') window.fbq('track', 'Lead');
      }
      if (window.gtag) {
        if (name === 'signup') {
          window.gtag('event', 'sign_up');
          // conversion Google Ads « inscription » (l'enchère « Maximiser les conversions » s'appuie dessus)
          if (CONFIG.googleSignupLabel && /^AW-/.test(CONFIG.googleTag)) window.gtag('event', 'conversion', { send_to: CONFIG.googleTag + '/' + CONFIG.googleSignupLabel });
        }
        else if (name === 'subscribe') window.gtag('event', 'purchase', { value: data.value || 0, currency: 'EUR', transaction_id: data.id || undefined });
        else if (name === 'lead') window.gtag('event', 'generate_lead');
      }
    } catch {}
  }

  window.kpAds = {
    enabled, track, sourceLabel, source: () => ls.get(SOURCE_KEY),
    openConsent() {
      if (!enabled) { alert(EN ? 'Kapitaro does not currently use any advertising cookies.' : 'Kapitaro n\'utilise actuellement aucun cookie publicitaire.'); return; }
      if (GPC) { alert('Your browser sends a Global Privacy Control signal: advertising cookies stay off.'); return; }
      showBanner();
    },
    // « Do Not Sell or Share My Personal Information » (version anglaise) : refus des cookies publicitaires, mémorisé
    optOut() { setConsent(false); alert(window.kpT ? kpT('dns.done') : 'Done: advertising cookies are off and we will not share your data for advertising.'); },
  };

  function start() {
    const c = consent();
    if (c && c.ads) loadTags();
    else if (!c) showBanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
