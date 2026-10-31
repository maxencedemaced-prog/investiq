// i18n.js — langue de l'interface (français par défaut, anglais sur kapitaro.com).
// Chargé EN PREMIER et de façon synchrone dans <head> : les autres scripts (ads.js, app.js…) lisent window.kpI18n.
//
// Principe (voir docs/I18N_PLAN.md) :
//  • La langue dépend d'abord du DOMAINE : kapitaro.fr → fr, kapitaro.com → en (décision du propriétaire, 29/10/2026).
//  • Sur les autres hôtes (localhost, aperçus Vercel) : ?lang=en|fr, puis choix mémorisé (localStorage kp_lang),
//    puis langue du navigateur à la première visite.
//  • En français, RIEN ne change : aucun dictionnaire n'est chargé, aucune traduction n'est appliquée.
//  • En anglais, i18n-en.js est chargé (dictionnaire FR → EN) et traduit les textes de la page au fil de l'eau.
(function () {
  var CONFIG = {
    hosts: { 'kapitaro.fr': 'fr', 'www.kapitaro.fr': 'fr', 'kapitaro.com': 'en', 'www.kapitaro.com': 'en' },
    domains: { fr: 'https://kapitaro.fr', en: 'https://kapitaro.com' },
    // À passer à true quand kapitaro.com sera acheté et branché sur Vercel : d'ici là, le sélecteur de langue
    // reste masqué sur kapitaro.fr (le site français en production ne change pas).
    enDomainLive: false,
    // Hôtes de test : langue du navigateur à la première visite (fr* → français, sinon anglais)
    autoDetect: true,
  };

  // Prix AFFICHÉS (aucun prix Stripe n'est créé ici). Les prix en dollars sont des valeurs provisoires :
  // ils ne s'affichent que si usdReady = true, c.-à-d. quand les prix USD existeront dans Stripe
  // (sinon on afficherait $ alors que le paiement serait en euros). Aperçu possible avec ?currency=usd sur un hôte de test.
  var PRICING = {
    usdReady: false,
    EUR: { fr: { monthly: '9,99 €', annual: '79,99 €' }, en: { monthly: '€9.99', annual: '€79.99' } },
    USD: { en: { monthly: '$9.99', annual: '$79.99' } },   // [À CONFIRMER] par le propriétaire
  };

  var PROD = !!CONFIG.hosts[location.hostname];
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function detect() {
    var forced = document.documentElement.getAttribute('data-kp-lang');   // pages publiques anglaises (dossier en/)
    if (forced === 'en' || forced === 'fr') return forced;
    var h = CONFIG.hosts[location.hostname];
    if (h) return h;                                   // le domaine décide
    try {
      var q = new URLSearchParams(location.search).get('lang');
      if (q === 'en' || q === 'fr') { safeSet('kp_lang', q); return q; }
    } catch (e) {}
    var s = safeGet('kp_lang');
    if (s === 'en' || s === 'fr') return s;
    if (CONFIG.autoDetect) {
      var n = (navigator.languages && navigator.languages[0]) || navigator.language || 'fr';
      return /^fr/i.test(n) ? 'fr' : 'en';
    }
    return 'fr';
  }

  var lang = detect();
  var EN = lang === 'en';

  // ── Région (contenu juridique, vocabulaire financier, avertissements) ──
  // FR = France (site français, inchangé) · EU = UE/EEE hors France · UK = Royaume-Uni · US = États-Unis · OTHER = reste du monde.
  // Ordre : choix explicite (inscription / Paramètres, mémorisé localement et dans le profil) > déduction
  // (langue + fuseau horaire + langue du navigateur). En français, la région est toujours FR.
  var EU_TZ = /^(Europe\/(Paris|Berlin|Madrid|Rome|Amsterdam|Brussels|Luxembourg|Vienna|Lisbon|Dublin|Stockholm|Copenhagen|Helsinki|Oslo|Warsaw|Prague|Budapest|Bratislava|Ljubljana|Zagreb|Athens|Sofia|Bucharest|Vilnius|Riga|Tallinn|Malta|Monaco|Andorra|Busingen|Vaduz)|Atlantic\/(Canary|Madeira|Azores|Reykjavik)|Asia\/Nicosia|Indian\/Reunion|America\/(Guadeloupe|Martinique|Cayenne))$/;
  var REGIONS = ['FR', 'EU', 'UK', 'US', 'OTHER'];
  function inferRegion() {
    if (!EN) return 'FR';
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    var loc = ((navigator.languages && navigator.languages[0]) || navigator.language || '').toUpperCase();
    if (tz === 'Europe/London' || tz === 'Europe/Belfast' || /-GB$/.test(loc)) return 'UK';
    if (EU_TZ.test(tz)) return 'EU';
    if (/^(America\/(New_York|Chicago|Denver|Phoenix|Los_Angeles|Anchorage|Detroit|Boise|Indiana|Kentucky|North_Dakota|Menominee|Adak|Juneau|Sitka|Nome|Yakutat|Metlakatla)|Pacific\/Honolulu)/.test(tz) || /-US$/.test(loc)) return 'US';
    return 'OTHER';
  }
  function storedRegion() { var r = safeGet('kp_region'); return REGIONS.indexOf(r) >= 0 ? r : null; }
  var region = EN ? (storedRegion() && storedRegion() !== 'FR' ? storedRegion() : inferRegion()) : 'FR';
  function setRegion(r, noReload) {
    if (REGIONS.indexOf(r) < 0) return;
    safeSet('kp_region', r);
    try { if (typeof sb !== 'undefined' && sb && sb.auth) sb.auth.updateUser({ data: { region: r } }).catch(function () {}); } catch (e) {}
    if (r === 'FR' && EN) { setLang('fr'); return; }
    if (!noReload) location.reload();
  }
  // Région enregistrée dans le profil (user_metadata.region) : appelée par app.js après connexion
  function syncRegionFromUser(user) {
    try {
      var md = (user && user.user_metadata) || {};
      // Compte créé via Google sur kapitaro.com : langue et région enregistrées dans le profil (e-mails en anglais)
      if (EN && !md.lang && typeof sb !== 'undefined' && sb && sb.auth) sb.auth.updateUser({ data: { lang: 'en', region: md.region || region } }).catch(function () {});
      var r = md.region;
      if (EN && REGIONS.indexOf(r) >= 0 && r !== 'FR' && r !== region) { safeSet('kp_region', r); location.reload(); }
    } catch (e) {}
  }

  // Devise de PAIEMENT de l'abonnement (affichage des prix Premium). La devise d'AFFICHAGE des montants est dans currency.js.
  function currency() {
    if (!EN) return 'EUR';
    if (!PROD) { try { var c = new URLSearchParams(location.search).get('currency'); if (c) safeSet('kp_price_currency', c.toUpperCase()); } catch (e) {} }
    var pref = safeGet('kp_price_currency');   // (kp_currency = devise d'affichage, voir currency.js)
    return (PRICING.usdReady || !PROD) && pref === 'USD' ? 'USD' : (PRICING.usdReady ? 'USD' : 'EUR');
  }

  // Textes des nouvelles fonctions (clé → texte). Le reste de l'app est traduit par le dictionnaire d'i18n-en.js.
  var FR = {
    'lang.switch': 'English',
    'auth.consent': 'J’accepte les conditions d’utilisation et la politique de confidentialité, et je confirme avoir 18 ans ou plus.',
    'auth.consentRequired': 'Coche la case pour accepter les conditions.',
  };

  function interp(s, vars) {
    return String(s).replace(/\{\{(\w+)\}\}/g, function (m, k) {
      if (vars && vars[k] != null) return vars[k];
      if (k === 'monthly' || k === 'annual') return price(k);
      return m;
    });
  }
  function t(key, vars) {
    var en = window.KP_EN && window.KP_EN.keys;
    var s = (EN && en && en[key] != null) ? en[key] : (FR[key] != null ? FR[key] : key);
    return interp(s, vars);
  }
  function price(plan) {
    var cur = currency();
    var tbl = cur === 'USD' ? PRICING.USD.en : PRICING.EUR[lang];
    return tbl[plan] || PRICING.EUR.fr[plan];
  }
  var locale = EN ? 'en-US' : 'fr-FR';
  function fmtNum(n, opts) { try { return Number(n).toLocaleString(locale, opts); } catch (e) { return String(n); } }
  function fmtMoney(n, cur, opts) {
    try { return new Intl.NumberFormat(locale, Object.assign({ style: 'currency', currency: cur || 'EUR' }, opts || {})).format(n); }
    catch (e) { return String(n); }
  }
  function fmtDate(d, opts) {
    try { return new Date(d).toLocaleDateString(locale, opts || { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return String(d); }
  }

  // Changement de langue : en production on change de domaine, ailleurs on mémorise et on recharge.
  function setLang(l) {
    if (l !== 'fr' && l !== 'en') return;
    try { if (typeof sb !== 'undefined' && sb && sb.auth) sb.auth.updateUser({ data: { lang: l } }).catch(function () {}); } catch (e) {}
    if (PROD) { location.href = CONFIG.domains[l] + '/'; return; }
    safeSet('kp_lang', l);
    try { var u = new URL(location.href); u.searchParams.delete('lang'); location.href = u.toString(); } catch (e) { location.reload(); }
  }

  // Liens légaux selon la langue (pages publiques)
  var LEGAL_URLS = {
    fr: { cgu: '/cgu', privacy: '/confidentialite', risk: '/risques', mentions: '/mentions-legales', cookies: '/confidentialite' },
    en: { cgu: '/terms', privacy: '/privacy', risk: '/risks', mentions: '/legal', cookies: '/cookies' },
  };
  function legalUrl(key) {
    var path = LEGAL_URLS[lang][key] || '/';
    if (!EN) return path;
    // Hors kapitaro.com, les pages anglaises sont servies sous /en/ (kapitaro.com les sert à la racine)
    return location.hostname.indexOf('kapitaro.com') >= 0 ? path : '/en' + path;
  }

  // Consentement à l'inscription : demandé explicitement en anglais (US/UE). En français, comportement inchangé.
  function signupConsentOk() {
    if (!EN) return true;
    var c = document.getElementById('kp-signup-consent');
    return !c || c.checked;
  }

  // Avertissement court à afficher sous les simulateurs et réponses IA, selon la région
  var DISCLAIMERS = {
    FR: '',
    US: 'Educational information only — not investment, tax or legal advice. Kapitaro is not a registered investment adviser or broker-dealer.',
    EU: 'Educational information only, not investment advice. Past performance is not a reliable indicator of future results. Capital at risk.',
    UK: 'Educational information only, not financial advice. Past performance is not a reliable indicator of future results. Capital at risk.',
    OTHER: 'Educational information only, not investment advice. Investing involves risk, including loss of capital.',
  };

  window.kpI18n = {
    lang: lang, locale: locale, isEN: EN, prod: PROD, config: CONFIG, pricing: PRICING,
    region: region, regions: REGIONS, setRegion: setRegion, syncRegionFromUser: syncRegionFromUser,
    disclaimer: function () { return DISCLAIMERS[region] || DISCLAIMERS.OTHER; },
    t: t, price: price, currency: currency, fmtNum: fmtNum, fmtMoney: fmtMoney, fmtDate: fmtDate,
    setLang: setLang, toggle: function () { setLang(EN ? 'fr' : 'en'); },
    legalUrl: legalUrl, signupConsentOk: signupConsentOk,
    tr: function (s) { return s; },   // remplacé par i18n-en.js en anglais
  };
  window.kpT = t;

  // Sélecteur de langue (éléments .kp-lang-switch) : masqué sur kapitaro.fr tant que kapitaro.com n'est pas en ligne
  document.addEventListener('DOMContentLoaded', function () {
    var show = !PROD || CONFIG.enDomainLive;
    var els = document.querySelectorAll('.kp-lang-switch');
    for (var i = 0; i < els.length; i++) {
      if (!show) { els[i].style.display = 'none'; continue; }
      if (els[i].hasAttribute('data-kp-label')) els[i].textContent = EN ? 'Français' : 'English';
    }
    var lb = document.querySelectorAll('[data-lang-opt]');
    for (var j = 0; j < lb.length; j++) lb[j].classList.toggle('on', lb[j].getAttribute('data-lang-opt') === lang);
  });

  if (EN) {
    document.documentElement.setAttribute('lang', 'en');
    document.documentElement.setAttribute('data-region', region);   // CSS : [data-region="US"] .fr-only { display:none }
    // Chargement synchrone du dictionnaire : il doit exister avant que le corps de la page soit lu
    document.write('<script src="/i18n-en.js?v=20261031180000"><\/script>');
  }
})();
