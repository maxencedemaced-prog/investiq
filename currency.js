// currency.js — devise d'affichage (EUR, CHF, GBP, USD, CAD, AUD, JPY).
// Chargé dans <head> juste après i18n.js (donc après i18n-en.js en anglais).
//
// Principe : TOUTES les données restent en euros (calculs, base Supabase, IA, API). On convertit seulement « aux bords » :
//  • Textes affichés : chaque montant « 1 234,50 € », « 4,6 k€ », « €1,234.50 », « 100k€ » est converti au cours du jour
//    dans la devise choisie, et le signe « € » seul (« Capital (€) ») devient le symbole de la devise. En anglais, la
//    conversion passe APRÈS la traduction (l'observateur ci-dessous est créé après celui d'i18n-en.js).
//  • Champs de saisie de montants : l'utilisateur voit et tape dans sa devise ; le code d'app.js lit et écrit des euros
//    (la propriété .value du champ est convertie dans les deux sens).
//  • Graphiques (canvas) et PDF : kpCurTxt() / patchPDF().
// Avec l'euro (choix par défaut, toujours le cas sur kapitaro.fr sans choix explicite), RIEN n'est modifié.
// Exceptions (jamais converties) : écran d'accueil / inscription (#auth-screen), éléments [data-nocur] (prix de
// l'abonnement, graphique d'un actif dans sa devise de cotation), prix Premium marqués par tag() (paiement en euros).
(function () {
  var I = window.kpI18n || { isEN: false, locale: 'fr-FR', region: 'FR', prod: false };
  var EN = !!I.isEN;
  var LIST = ['EUR', 'CHF', 'GBP', 'USD', 'CAD', 'AUD', 'JPY'];
  var SYM = { EUR: '€', CHF: 'CHF', GBP: '£', USD: '$', CAD: 'CA$', AUD: 'A$', JPY: '¥' };
  var NAMES = {
    fr: { EUR: 'Euro (€)', CHF: 'Franc suisse (CHF)', GBP: 'Livre sterling (£)', USD: 'Dollar américain ($)', CAD: 'Dollar canadien (CA$)', AUD: 'Dollar australien (A$)', JPY: 'Yen japonais (¥)' },
    en: { EUR: 'Euro (€)', CHF: 'Swiss franc (CHF)', GBP: 'British pound (£)', USD: 'US dollar ($)', CAD: 'Canadian dollar (CA$)', AUD: 'Australian dollar (A$)', JPY: 'Japanese yen (¥)' },
  };
  var TXT = {
    fr: {
      label: 'Devise d’affichage',
      sub: 'Tous les montants sont convertis au cours du jour. Tes données restent enregistrées en euros.',
      na: 'Taux de change indisponible pour le moment : montants affichés en euros.',
      rate: '1 € = {{r}} · cours du {{d}}',
    },
    en: {
      label: 'Display currency',
      sub: 'All amounts are converted at the current exchange rate. Your data is still stored in euros.',
      na: 'Exchange rate unavailable right now: amounts are shown in euros.',
      rate: '€1 = {{r}} · rate of {{d}}',
    },
  };
  var T = TXT[EN ? 'en' : 'fr'];
  var MARK = '⁠';   // « word joiner » invisible : placé devant un € qui ne doit jamais être converti (prix de l'abonnement)

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // Devise par défaut : euro en français ; en anglais, déduite de la région / du fuseau horaire
  function inferDefault() {
    if (!EN) return 'EUR';
    if (I.region === 'US') return 'USD';
    if (I.region === 'UK') return 'GBP';
    var tz = '', loc = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    loc = ((navigator.languages && navigator.languages[0]) || navigator.language || '').toUpperCase();
    if (tz === 'Europe/Zurich' || /-CH$/.test(loc)) return 'CHF';
    if (/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Montreal|Moncton|Glace_Bay|Whitehorse|Yellowknife|Iqaluit)/.test(tz) || /-CA$/.test(loc)) return 'CAD';
    if (/^Australia\//.test(tz) || /-AU$/.test(loc)) return 'AUD';
    if (tz === 'Asia/Tokyo' || /-JP$/.test(loc)) return 'JPY';
    return 'EUR';
  }
  // Hôtes de test : ?cur=CHF pour essayer une devise
  if (!I.prod) { try { var q = (new URLSearchParams(location.search).get('cur') || '').toUpperCase(); if (LIST.indexOf(q) >= 0) safeSet('kp_currency', q); } catch (e) {} }
  var stored = safeGet('kp_currency');
  var code = LIST.indexOf(stored) >= 0 ? stored : inferDefault();

  // ── Cours EUR → devise (via /api/prices, symboles CUR-XXX = valeur en euros d'une unité de XXX) ──
  var FX_KEY = 'kp_fx', FX_TTL = 6 * 3600e3, FX_MAX = 10 * 24 * 3600e3;
  function readFx() { try { var o = JSON.parse(safeGet(FX_KEY) || 'null'); return o && o.r && o.t ? o : null; } catch (e) { return null; } }
  var fx = readFx();
  var rate = code === 'EUR' ? 1 : (fx && fx.r[code] > 0 && Date.now() - fx.t < FX_MAX ? fx.r[code] : 0);
  var unavailable = false;
  function active() { return code !== 'EUR' && rate > 0; }

  function refresh() {
    var syms = LIST.filter(function (c) { return c !== 'EUR'; }).map(function (c) { return 'CUR-' + c; }).join(',');
    return fetch('/api/prices?symbols=' + syms).then(function (r) { return r.json(); }).then(function (d) {
      var r = {};
      (d && d.quotes || []).forEach(function (x) { var m = /^CUR-([A-Z]{3})$/.exec(x && x.symbol || ''); if (m && x.price > 0) r[m[1]] = 1 / x.price; });
      if (!Object.keys(r).length) throw new Error('fx');
      fx = { t: Date.now(), r: r };
      safeSet(FX_KEY, JSON.stringify(fx));
      if (code !== 'EUR' && r[code] > 0) {
        var first = !(rate > 0);
        rate = r[code];
        unavailable = false;
        if (first) { scanAll(); refreshUI(); }
      }
    }).catch(function () {
      if (code !== 'EUR' && !(rate > 0)) { unavailable = true; notifyUnavailable(); refreshUI(); }
    });
  }
  if (code !== 'EUR' && (!fx || !(fx.r[code] > 0) || Date.now() - fx.t > FX_TTL)) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { refresh(); }); else refresh();
  }
  var notified = false;
  function notifyUnavailable() {
    if (notified) return; notified = true;
    setTimeout(function () { try { if (typeof showToast === 'function') showToast('⚠️ ' + T.na); } catch (e) {} }, 1500);
  }

  // ── Conversion et formatage ──
  function toDisp(eur) { return active() ? Number(eur) * rate : Number(eur); }
  function fromDisp(v) { return active() ? Number(v) / rate : Number(v); }
  var NARROW = { USD: 1, GBP: 1, JPY: 1 };   // « 12 £ » plutôt que « 12 £GB » en français (CAD / AUD gardent CA$ / A$)
  var nfCache = {};
  function nf(dec) {
    var k = code + dec;
    if (!nfCache[k]) {
      try { nfCache[k] = new Intl.NumberFormat(I.locale, { style: 'currency', currency: code, currencyDisplay: NARROW[code] ? 'narrowSymbol' : 'symbol', minimumFractionDigits: dec, maximumFractionDigits: dec }); }
      catch (e) { nfCache[k] = { format: function (n) { return n.toFixed(dec) + ' ' + code; } }; }
    }
    return nfCache[k];
  }
  // Montant en euros → texte dans la devise d'affichage (dec = décimales voulues, compact = « 4,3 k CHF » / « $4.3k »)
  function money(eur, dec, compact) {
    var v = Number(eur) || 0;
    if (!active()) {
      var s0 = Math.abs(v).toLocaleString(I.locale, { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 });
      return (v < 0 ? '-' : '') + (EN ? '€' + s0 : s0 + ' €');
    }
    return fmtDisp(Math.abs(v) * rate, dec == null ? 2 : dec, compact ? 'k' : '', v < 0 ? '-' : '');
  }
  function fmtDisp(v, dec, suffix, sign) {
    var s;
    if (suffix) {
      var suf = v >= 1e6 ? 'M' : v >= 1e3 ? 'k' : '';
      var div = suf === 'M' ? 1e6 : suf === 'k' ? 1e3 : 1;
      var d = suf ? (dec > 0 || v / div < 10 ? 1 : 0) : 0;
      s = nf(d).format(v / div);
      if (suf) s = s.replace(/(\d)(?!.*\d)/, EN ? '$1' + suf : '$1 ' + suf);
    } else {
      if (code === 'JPY' && v >= 100) dec = 0;
      s = nf(Math.min(dec, 20)).format(v);
    }
    return (sign || '') + s;
  }
  // Lecture d'un nombre écrit par l'app : « 1 234,50 » (fr), « 1,234.50 » (en), « 12.50 » (toFixed)
  function parseNum(s) {
    s = s.replace(/[   ]/g, '');
    var c = s.lastIndexOf(','), p = s.lastIndexOf('.'), dec = '';
    if (c >= 0 && p >= 0) dec = c > p ? ',' : '.';
    else if (c >= 0) {
      var nc = s.split(',').length - 1, ac = s.length - c - 1;
      dec = nc > 1 ? '' : EN ? (ac === 3 ? '' : ',') : ',';
    } else if (p >= 0) {
      var np = s.split('.').length - 1, ap = s.length - p - 1;
      dec = np > 1 ? '' : EN ? '.' : (ap === 3 ? '' : '.');
    }
    var i = dec ? s.lastIndexOf(dec) : -1;
    var intPart = (i >= 0 ? s.slice(0, i) : s).replace(/[.,]/g, ''), frac = i >= 0 ? s.slice(i + 1) : '';
    return { v: parseFloat(intPart + (frac ? '.' + frac : '')), dec: frac.length };
  }
  var SP = '[ \\u00a0\\u202f]';
  var NUM = '\\d{1,3}(?:[ \\u00a0\\u202f.,]\\d{3})+(?:[.,]\\d+)?|\\d+(?:[.,]\\d+)?';
  var RE_SUF = new RegExp('(^|[^\\d.,])([+\\-−]?)(' + NUM + ')' + SP + '?([kKM]?)' + SP + '?€', 'g');      // 1 234,50 € · 4,6 k€ · 100k€
  var RE_PRE = new RegExp('([+\\-−]?)€' + SP + '?(' + NUM + ')([kKM]?)(?![\\d])', 'g');        // €1,234.50 · €4.6k · -€50
  function conv(sign, num, suf) {
    var n = parseNum(num);
    if (!isFinite(n.v)) return null;
    var mult = suf === 'M' ? 1e6 : suf ? 1e3 : 1;
    var v = n.v * mult * rate;
    return fmtDisp(v, !suf && n.dec === 1 ? 2 : n.dec, suf ? 'k' : '', sign);
  }
  // Convertit tous les montants en euros d'un texte. Renvoie le texte inchangé avec l'euro (ou sans cours).
  function convText(s, onSym) {
    if (!active() || s == null) return s;
    s = String(s);
    if (s.indexOf('€') < 0) return s;
    var out = s.replace(RE_SUF, function (m, pre, sign, num, suf) {
      var r = conv(sign, num, suf); return r == null ? m : pre + r;
    });
    out = out.replace(RE_PRE, function (m, sign, num, suf, off, all) {
      if (all.charAt(off + sign.length - 1) === MARK || all.charAt(off - 1) === MARK) return m;
      var r = conv(sign, num, suf); return r == null ? m : r;
    });
    out = out.replace(/k?€/g, function (m, off, all) {
      if (all.charAt(off - 1) === MARK) return m;
      if (onSym) onSym();
      return (m.length > 1 ? 'k ' : '') + SYM[code];
    });
    return out;
  }
  window.kpCurTxt = function (s) { return convText(s); };
  // Prix payés en euros (abonnement) : jamais convertis
  function tag(s) { return active() && typeof s === 'string' ? s.replace(/€/g, MARK + '€') : s; }
  if (I.price && !I._kpCurPrice) { var op = I.price; I.price = function (p) { return tag(op(p)); }; I._kpCurPrice = true; }

  // ── Textes de la page ──
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, INPUT: 1, SELECT: 1, OPTION: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label', 'data-tip'];
  function skipped(el) {
    for (; el && el.nodeType === 1; el = el.parentNode) {
      if (SKIP[el.tagName] || el.id === 'auth-screen' || el.hasAttribute('data-nocur') || el.isContentEditable) return true;
    }
    return false;
  }
  function doText(node) {
    var v = node.nodeValue;
    if (!v || v.indexOf('€') < 0) return;
    var par = node.parentNode;
    var r = convText(v, function () { if (par && par.setAttribute) par.setAttribute('data-kpcur', ''); });
    if (r !== v) node.nodeValue = r;
  }
  function doEl(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = el.getAttribute(ATTRS[i]);
      if (a && a.indexOf('€') >= 0) { var r = convText(a); if (r !== a) el.setAttribute(ATTRS[i], r); }
    }
  }
  var FILTER = { acceptNode: function (n) {
    if (n.nodeType === 1 && (SKIP[n.tagName] || n.id === 'auth-screen' || n.hasAttribute('data-nocur') || n.isContentEditable)) return n.tagName === 'INPUT' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  } };
  function walk(root) {
    if (!root || !active()) return;
    if (root.nodeType === 3) { if (!skipped(root.parentNode)) doText(root); return; }
    if (root.nodeType !== 1 || skipped(root)) return;
    doEl(root);
    var inputs = [];
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, FILTER), n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) doText(n);
      else if (n.tagName === 'INPUT') inputs.push(n);
      else doEl(n);
    }
    if (root.tagName === 'INPUT') inputs.push(root);
    for (var i = 0; i < inputs.length; i++) { if (isMoneyInput(inputs[i])) patchInput(inputs[i]); else doEl(inputs[i]); }
  }

  // ── Champs de saisie de montants ──
  var MONEY_ID = /^(obj-(capital|monthly|target)|s-bankroll|f-(pru|price|alert)|edit-(pru|price|alert)|qa-(pru|price)|pr-(amt|price)-\d+|dep-pv-|bx-(apport|exist|vers))/;
  function hasEuro(el) { return !!el && (el.textContent.indexOf('€') >= 0 || (el.hasAttribute && el.hasAttribute('data-kpcur')) || (el.querySelector && !!el.querySelector('[data-kpcur]'))); }
  function isMoneyInput(el) {
    if (el._kpCur) return false;
    var t = (el.type || '').toLowerCase();
    if (t === 'range' || t === 'hidden' || t === 'checkbox' || t === 'radio' || t === 'button' || t === 'submit' || t === 'date') return false;
    if (el.hasAttribute('data-nomoney')) return false;
    if (el.hasAttribute('data-money')) return true;
    if (t !== 'number' && el.inputMode !== 'decimal' && el.inputMode !== 'numeric') return false;
    if (MONEY_ID.test(el.id || '')) return true;
    if (el.labels) for (var i = 0; i < el.labels.length; i++) if (hasEuro(el.labels[i])) return true;
    var p = el.parentElement;
    if (!p) return false;
    if (p.querySelectorAll('input,select,textarea').length === 1) return hasEuro(p) || (p.parentElement && p.parentElement.querySelectorAll('input,select,textarea').length === 1 && hasEuro(p.parentElement));
    var prev = el.previousElementSibling, next = el.nextSibling;
    return (prev && prev.tagName === 'LABEL' && hasEuro(prev)) || (next && next.nodeType === 3 && next.nodeValue.indexOf('€') >= 0) || (next && next.nodeType === 1 && next.tagName === 'SPAN' && hasEuro(next));
  }
  var VD = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  function roundDisp(v, wasInt) {
    var a = Math.abs(v);
    if (wasInt && a >= 10) return Math.round(v);
    if (a >= 1) return Math.round(v * 100) / 100;
    return a > 0 ? Number(v.toPrecision(4)) : 0;
  }
  function roundEur(v) { var a = Math.abs(v); return a >= 1 ? Math.round(v * 100) / 100 : (a > 0 ? Number(v.toPrecision(6)) : 0); }
  function patchInput(el) {
    if (el._kpCur || !VD) return;
    el._kpCur = true;
    var raw = VD.get.call(el);
    Object.defineProperty(el, 'value', {
      configurable: true,
      get: function () {
        var v = VD.get.call(this);
        if (!active() || v === '' || !isFinite(parseFloat(v))) return v;
        return String(roundEur(parseFloat(v) / rate));
      },
      set: function (v) {
        var n = parseFloat(v);
        if (!active() || v === '' || v == null || !isFinite(n)) { VD.set.call(this, v == null ? '' : v); return; }
        VD.set.call(this, String(roundDisp(n * rate, Math.round(n) === n)));
      },
    });
    if (el.step && el.step !== 'any') el.step = 'any';
    if (raw !== '' && isFinite(parseFloat(raw))) el.value = raw;   // valeur initiale (en euros) → affichée dans la devise
    doEl(el);
  }

  function scanAll() { if (document.body) walk(document.body); }

  // Observateur : créé APRÈS celui d'i18n-en.js → en anglais, les textes sont déjà traduits quand on les convertit
  if (code !== 'EUR') {
    var mo = new MutationObserver(function (muts) {
      if (!active()) return;
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'childList') { for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]); }
        else if (m.type === 'characterData') { if (!skipped(m.target.parentNode)) doText(m.target); }
        else if (m.type === 'attributes' && !skipped(m.target)) doEl(m.target);
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    document.addEventListener('DOMContentLoaded', scanAll);
  }

  // ── PDF (jsPDF) : appelé par loadJsPDF() AVANT KP_EN.patchPDF (la traduction passe d'abord, puis la conversion) ──
  function patchPDF() {
    var api = window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API;
    if (!api || api._kpCur || code === 'EUR') return;
    api._kpCur = true;
    var cv = function (t) { return Array.isArray(t) ? t.map(cv) : (typeof t === 'string' ? String(convText(t)).replace(/[  ]/g, ' ') : t); };
    var text = api.text, split = api.splitTextToSize;
    api.text = function (t) { var a = Array.prototype.slice.call(arguments); a[0] = cv(t); return text.apply(this, a); };
    if (split) api.splitTextToSize = function (t) { var a = Array.prototype.slice.call(arguments); a[0] = cv(t); return split.apply(this, a); };
  }

  // ── Choix de la devise (Paramètres) ──
  function set(c) {
    if (LIST.indexOf(c) < 0) return;
    safeSet('kp_currency', c);
    try { if (typeof sb !== 'undefined' && sb && sb.auth) sb.auth.updateUser({ data: { currency: c } }).catch(function () {}); } catch (e) {}
    if (c !== code) setTimeout(function () { location.reload(); }, 150);
  }
  // Devise enregistrée dans le profil (user_metadata.currency) : appelée par app.js après connexion
  function syncFromUser(user) {
    try {
      var c = user && user.user_metadata && user.user_metadata.currency;
      if (LIST.indexOf(c) >= 0 && c !== code) { safeSet('kp_currency', c); location.reload(); }
    } catch (e) {}
  }
  function rateLine() {
    if (code === 'EUR') return '';
    if (!(rate > 0)) return unavailable ? T.na : '';
    var d = fx && fx.t ? new Date(fx.t) : new Date();
    var r = new Intl.NumberFormat(I.locale, { style: 'currency', currency: code, minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(rate);
    return T.rate.replace('{{r}}', r).replace('{{d}}', d.toLocaleDateString(I.locale, { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString(I.locale, { hour: '2-digit', minute: '2-digit' }));
  }
  function refreshUI() { var e = document.getElementById('set-currency-rate'); if (e) e.textContent = rateLine(); }
  // Ligne « Devise d'affichage » des Paramètres (visible en français comme en anglais)
  function mountSettings() {
    var anchor = document.getElementById('set-lang-row');
    if (!anchor || document.getElementById('set-currency-row')) return;
    var opts = LIST.map(function (c) { return '<option value="' + c + '"' + (c === code ? ' selected' : '') + '>' + NAMES[EN ? 'en' : 'fr'][c] + '</option>'; }).join('');
    var html = '<div class="set-row notranslate" id="set-currency-row" data-nocur><div class="set-row-main"><div class="set-row-title">' + T.label + '</div>'
      + '<div class="set-row-sub">' + T.sub + ' <span id="set-currency-rate"></span></div></div>'
      + '<div class="set-row-ctrl"><select id="set-currency" aria-label="' + T.label + '" style="padding:6px 8px;border-radius:8px;border:1px solid var(--border,#d0d5dd);background:transparent;color:inherit;font:inherit;max-width:190px">' + opts + '</select></div></div>';
    anchor.insertAdjacentHTML('beforebegin', html);
    document.getElementById('set-currency').addEventListener('change', function () { set(this.value); });
    refreshUI();
  }
  document.addEventListener('DOMContentLoaded', mountSettings);

  // Consigne pour l'IA : les données restent en euros, l'app convertit à l'affichage
  function aiNote() {
    if (!active()) return '';
    var r = rate.toLocaleString('en-US', { maximumFractionDigits: 4 });
    return EN
      ? '\n\nCURRENCY: the user displays amounts in ' + code + '. All amounts in the data are in euros (the app\'s reference currency): write amounts in euros with the € sign, the app converts them to ' + code + ' automatically at the current rate (€1 ≈ ' + r + ' ' + code + '). If the user quotes an amount in ' + code + ', convert it to euros with this rate before using it.'
      : '\n\nDEVISE : l\'utilisateur affiche ses montants en ' + code + '. Tous les montants des données sont en euros (devise de référence de l\'app) : écris les montants en euros avec le signe €, l\'app les convertit automatiquement en ' + code + ' au cours du jour (1 € ≈ ' + r + ' ' + code + '). Si l\'utilisateur cite un montant en ' + code + ', convertis-le d\'abord en euros avec ce cours.';
  }

  window.kpCur = {
    list: LIST, names: NAMES,
    code: function () { return code; },
    symbol: function () { return SYM[code]; },
    active: active, rate: function () { return active() ? rate : 1; },
    toDisp: toDisp, fromDisp: fromDisp, money: money, txt: convText, tag: tag,
    set: set, syncFromUser: syncFromUser, refresh: refresh, patchPDF: patchPDF, aiNote: aiNote, scan: scanAll,
  };
})();
