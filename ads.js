// ads.js — Publicité : consentement cookies (CNIL), pixel Meta et balise Google, provenance des visiteurs.
// • Rien de publicitaire n'est chargé sans un « Accepter » explicite ; « Refuser » est aussi simple qu'« Accepter ».
// • Le bandeau n'apparaît que si au moins un identifiant publicitaire est renseigné ci-dessous.
// • La provenance (utm_*, gclid, fbclid, site d'origine) est mémorisée en local (1re visite, 30 jours) pour la
//   mesure interne des campagnes : elle n'est jamais transmise à un tiers.
(function () {
  // Identifiants publics (ce ne sont pas des secrets) : à renseigner une fois les comptes publicitaires créés.
  const CONFIG = {
    metaPixel: '29037079089229292',     // ex. '123456789012345' (Meta Business → Gestionnaire d'événements)
    googleTag: '',     // ex. 'AW-123456789' (Google Ads) ou 'G-XXXXXXX'
  };
  const CONSENT_KEY = 'kp_consent', CONSENT_VERSION = 1, CONSENT_DAYS = 180;
  const SOURCE_KEY = 'kp_source';
  const enabled = !!(CONFIG.metaPixel || CONFIG.googleTag);
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
    b.setAttribute('aria-label', 'Cookies publicitaires');
    b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:30000;max-width:520px;margin:0 auto;background:#0b1220;color:#fff;border:1px solid rgba(255,255,255,0.14);border-radius:16px;padding:16px;box-shadow:0 16px 50px rgba(0,0,0,0.45);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif';
    b.innerHTML = '<div style="font-weight:800;font-size:15px;margin-bottom:4px">🍪 Cookies publicitaires</div>'
      + '<div style="font-size:13px;color:rgba(255,255,255,0.72)">Avec ton accord, Kapitaro utilise des cookies de Meta et Google pour mesurer l\'efficacité de ses publicités. Aucun cookie publicitaire n\'est déposé si tu refuses, et l\'app fonctionne pareil. '
      + '<a href="/confidentialite" style="color:#4ade80">En savoir plus</a></div>'
      + '<div style="display:flex;gap:8px;margin-top:12px">'
      + '<button type="button" data-c="0" style="flex:1;padding:11px;border-radius:10px;border:1px solid rgba(255,255,255,0.25);background:transparent;color:#fff;font-weight:700;font-size:14px;cursor:pointer">Refuser</button>'
      + '<button type="button" data-c="1" style="flex:1;padding:11px;border-radius:10px;border:none;background:#16a34a;color:#fff;font-weight:700;font-size:14px;cursor:pointer">Accepter</button></div>';
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
        if (name === 'signup') window.gtag('event', 'sign_up');
        else if (name === 'subscribe') window.gtag('event', 'purchase', { value: data.value || 0, currency: 'EUR', transaction_id: data.id || undefined });
        else if (name === 'lead') window.gtag('event', 'generate_lead');
      }
    } catch {}
  }

  window.kpAds = {
    enabled, track, sourceLabel, source: () => ls.get(SOURCE_KEY),
    openConsent() { if (!enabled) { alert('Kapitaro n\'utilise actuellement aucun cookie publicitaire.'); return; } showBanner(); },
  };

  function start() {
    const c = consent();
    if (c && c.ads) loadTags();
    else if (!c) showBanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
