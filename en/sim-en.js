// en/sim-en.js — outils communs des simulateurs publics anglais (kapitaro.com).
// Devise d'affichage seulement ($ / € / £ : le calcul est identique), avertissement selon la région,
// curseurs ↔ champs, exemples, graphique, liens /en/ hors kapitaro.com. Les simulateurs français n'utilisent pas ce fichier.
window.KS = (function () {
  var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
  var cur = 'EUR';
  try { cur = localStorage.getItem('kp_sim_cur') || (/^America\//.test(tz) ? 'USD' : (tz === 'Europe/London' ? 'GBP' : 'EUR')); } catch (e) {}
  var LOC = { USD: 'en-US', EUR: 'en-IE', GBP: 'en-GB' }, SYM = { USD: '$', EUR: '€', GBP: '£' };
  var DISC = {
    USD: 'Illustrative, educational calculation based on hypothetical constant assumptions. It is not investment, tax or legal advice, and Kapitaro is not a registered investment adviser. Investing involves risk, including loss of principal.',
    EUR: 'Illustrative, educational calculation based on hypothetical constant assumptions. It is not investment advice. Capital at risk. Past performance is not a reliable indicator of future results.',
    GBP: 'Illustrative, educational calculation based on hypothetical constant assumptions. It is not financial advice. Capital at risk. Past performance is not a reliable indicator of future results.',
  };
  var listeners = [];
  function fmt(n) { return new Intl.NumberFormat(LOC[cur], { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(Math.round(n)); }
  function num(n, d) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: d == null ? 2 : d }); }
  function setCur(c) {
    cur = c; try { localStorage.setItem('kp_sim_cur', c); } catch (e) {}
    document.querySelectorAll('.cur-sym').forEach(function (s) { s.textContent = SYM[c]; });
    document.querySelectorAll('[data-cur]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-cur') === c); });
    var d = document.getElementById('disclaimer'); if (d) d.textContent = DISC[c];
    listeners.forEach(function (f) { f(); });
  }
  // Curseur ↔ champ chiffré, exemples, suivi des clics d'inscription
  function bind(ids, update, page) {
    listeners.push(update);
    ids.forEach(function (id) {
      var range = document.getElementById(id), n = document.getElementById(id + '-n');
      n.value = range.value;
      range.addEventListener('input', function () { n.value = range.value; update(); });
      n.addEventListener('input', function () { range.value = n.value; update(); });
    });
    document.querySelectorAll('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-preset').split(',');
        ids.forEach(function (id, k) { if (v[k] === undefined) return; document.getElementById(id).value = v[k]; document.getElementById(id + '-n').value = v[k]; });
        update();
      });
    });
    document.querySelectorAll('[data-cta]').forEach(function (a) {
      a.addEventListener('click', function () { try { window.va && window.va('event', { name: 'seo_cta', data: { page: page + '-en', where: a.getAttribute('data-cta') } }); } catch (e) {} });
    });
  }
  function get(id) { var v = parseFloat(document.getElementById(id + '-n').value); return isFinite(v) && v >= 0 ? v : 0; }
  function fv(c, m, years, rPct) { var i = rPct / 100 / 12, cap = c, out = [c]; for (var y = 1; y <= years; y++) { for (var k = 0; k < 12; k++) cap = cap * (1 + i) + m; out.push(cap); } return out; }
  // Graphique : séries de valeurs annuelles sur la même échelle
  function draw(series, years, extra) {
    var svg = document.getElementById('chart'), W = 520, H = 220, L = 8, Rr = 8, T = 10, B = 24;
    var max = 1; series.forEach(function (s) { s.v.forEach(function (x) { if (x > max) max = x; }); });
    if (extra && extra.max > max) max = extra.max;
    var x = function (k) { return L + (W - L - Rr) * k / (years || 1); };
    var yv = function (v) { return T + (H - T - B) * (1 - v / max); };
    var path = function (v) { return v.map(function (p, k) { return (k ? 'L' : 'M') + x(k).toFixed(1) + ',' + yv(p).toFixed(1); }).join(''); };
    var step = Math.max(1, Math.ceil(years / 5)), ticks = '', marks = [];
    for (var k = 0; k < years; k += step) if (years - k >= step / 2) marks.push(k);
    marks.push(years);
    marks.forEach(function (k) {
      var anchor = k === 0 ? 'start' : (k === years ? 'end' : 'middle');
      ticks += '<text x="' + x(k).toFixed(1) + '" y="' + (H - 6) + '" font-size="15" text-anchor="' + anchor + '" fill="var(--faint)">' + (k ? k + ' yr' + (k > 1 ? 's' : '') : 'Now') + '</text>';
    });
    var line = '';
    if (extra && extra.target != null) {
      var ty = yv(extra.target).toFixed(1);
      line = '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + ty + '" y2="' + ty + '" stroke="var(--text)" stroke-dasharray="5 4" stroke-width="1.5" opacity="0.55"/>'
        + '<text x="' + (L + 4) + '" y="' + (Number(ty) < 30 ? Number(ty) + 19 : Number(ty) - 6) + '" font-size="15" font-weight="700" fill="var(--text)">' + extra.label + '</text>';
    }
    svg.innerHTML = series.map(function (s) {
      return s.area ? '<path d="' + path(s.v) + 'L' + x(years).toFixed(1) + ',' + yv(0) + 'L' + x(0).toFixed(1) + ',' + yv(0) + 'Z" fill="' + s.color + '"' + (s.opacity ? ' opacity="' + s.opacity + '"' : '') + '/>'
        : '<path d="' + path(s.v) + '" fill="none" stroke="' + s.color + '" stroke-width="3" stroke-linejoin="round"' + (s.dash ? ' stroke-dasharray="7 6"' : '') + '/>';
    }).join('') + line + ticks;
  }
  document.addEventListener('DOMContentLoaded', function () {
    // Sélecteur de devise ajouté à la ligne d'exemples
    var pre = document.querySelector('.presets');
    if (pre && !pre.querySelector('.cur-switch')) {
      pre.style.alignItems = 'center';
      pre.insertAdjacentHTML('beforeend', '<span class="cur-switch" role="group" aria-label="Currency"><button type="button" data-cur="USD">$</button><button type="button" data-cur="EUR">€</button><button type="button" data-cur="GBP">£</button></span>');
      pre.querySelectorAll('[data-cur]').forEach(function (b) { b.addEventListener('click', function () { setCur(b.getAttribute('data-cur')); }); });
    }
    // Hors kapitaro.com (aperçus, localhost) : les pages anglaises sont sous /en/
    if (location.hostname.indexOf('kapitaro.com') < 0) document.querySelectorAll('a[href^="/"]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (h === '/' || h.indexOf('/?') === 0) a.setAttribute('href', h === '/' ? '/?lang=en' : h + '&lang=en');
      else if (h.indexOf('/en/') !== 0) a.setAttribute('href', '/en' + h);
    });
    setCur(cur);
  });
  return { fmt: fmt, num: num, bind: bind, get: get, fv: fv, draw: draw, cur: function () { return cur; } };
})();
