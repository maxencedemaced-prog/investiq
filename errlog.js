// errlog.js — remonte les erreurs JavaScript des visiteurs vers /api/log-error (section « Bugs » du tableau de bord).
// Chargé en premier pour voir aussi les erreurs du démarrage. Aucune donnée saisie par l'utilisateur n'est envoyée :
// seulement le message d'erreur, le fichier, la ligne, la page de l'app et la version.
(function () {
  if (location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
  var MAX_PER_PAGE = 8, sent = 0, seen = {};

  // Bruit sans intérêt : extensions du navigateur, erreurs d'autres sites, coupures réseau
  var IGNORE = /Script error\.?$|ResizeObserver loop|Failed to fetch|NetworkError|Load failed|AbortError|The operation was aborted|Network request failed|Java object is gone|Error invoking postMessage/i;   // les 2 derniers : script injecté par le navigateur intégré d'Instagram / Facebook
  var cleanUrl = function (u) {
    if (!u) return '';
    try { var x = new URL(u, location.href); return x.origin === location.origin ? x.pathname : x.origin + x.pathname; } catch (e) { return String(u).split('?')[0]; }
  };
  var fromExtension = function (s) { return /^(chrome|moz|safari|safari-web)-extension:|^webkit-masked-url:/.test(s || ''); };

  function page() {
    var app = document.getElementById('app');
    if (app && app.style.display === 'none') return 'connexion';
    var sec = document.querySelector('.sec.active');
    return sec ? sec.id.replace(/^sec-/, '') : location.pathname;
  }
  function version() {
    var s = document.querySelector('script[src*="app.js"]');
    var m = s && s.src.match(/[?&]v=([\w.]+)/);
    return m ? m[1] : '';
  }
  function token() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (/^sb-.*-auth-token$/.test(k)) return (JSON.parse(localStorage.getItem(k)) || {}).access_token || null;
      }
    } catch (e) {}
    return null;
  }

  function report(kind, message, source, line, col, stack) {
    message = String(message || '').slice(0, 300);
    if (!message || IGNORE.test(message) || fromExtension(source) || fromExtension(stack)) return;
    var key = message + '|' + (line || '');
    if (seen[key] || sent >= MAX_PER_PAGE) return;
    seen[key] = 1; sent++;
    var headers = { 'Content-Type': 'application/json' };
    var t = token(); if (t) headers.Authorization = 'Bearer ' + t;
    try {
      fetch('/api/log-error', {
        method: 'POST', keepalive: true, headers: headers,
        body: JSON.stringify({
          kind: kind, message: message, source: cleanUrl(source), line: line || null, col: col || null,
          // Pile d'appels raccourcie : adresse du site et paramètres de version retirés, numéros de ligne gardés
          stack: String(stack || '').split('\n').slice(0, 4).map(function (l) { return l.split(location.origin).join('').replace(/\?v=[\w.]+/g, ''); }).join('\n').slice(0, 800),
          page: page(), version: version()
        })
      }).catch(function () {});
    } catch (e) {}
  }

  window.addEventListener('error', function (e) {
    if (!e || !e.message) return;   // erreur de chargement d'image/script : pas une erreur JavaScript
    report('error', e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack);
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    var msg = r && (r.message || (typeof r === 'string' ? r : '')) || 'Promesse rejetée sans message';
    report('promise', msg, '', null, null, r && r.stack);
  });
})();
