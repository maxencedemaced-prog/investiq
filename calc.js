// calc.js — page « Calculateurs » de l'appli : impact des frais et effet de l'inflation, puis liens vers tous les calculateurs gratuits.
// Mêmes formules que les pages publiques (calculateur-frais-placement.html, calculateur-inflation.html) :
// capitalisation mensuelle (taux annuel / 12), frais retirés du rendement brut ; inflation composée annuellement.
(function () {
  var TAB = 'frais';
  var V = {
    frais: { c: 10000, m: 200, y: 20, r: 6, fa: 0.3, fb: 1.8 },
    infl: { s: 10000, y: 10, i: 3, r: 1 },
  };
  // Petit « ? » du lexique (glossary.js), si disponible
  var tip = function (k) { try { return typeof kpTip === 'function' ? ' ' + kpTip(k) : ''; } catch (e) { return ''; } };
  var eur = function (n) { return Math.round(n).toLocaleString('fr-FR') + ' €'; };
  var num = function (n, d) { return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: d == null ? 2 : d }); };
  var fv = function (c, m, years, rPct) { var i = rPct / 100 / 12, cap = c, out = [c]; for (var y = 1; y <= years; y++) { for (var k = 0; k < 12; k++) cap = cap * (1 + i) + m; out.push(cap); } return out; };

  var FIELDS = {
    frais: [
      ['c', 'Capital de départ', 0, 100000, 500, '€'],
      ['m', 'Versement mensuel', 0, 3000, 10, '€'],
      ['y', 'Durée', 1, 50, 1, 'ans'],
      ['r', 'Rendement brut annuel (hypothèse)' + tip('rendement'), 0, 12, 0.1, '%'],
      ['fa', 'Frais du placement A' + tip('frais') + '<br><span style="font-weight:500;font-size:12px;color:var(--color-text-secondary,#71717a)">ex. un ETF' + tip('etf') + ' : 0,1 à 0,5 %</span>', 0, 3, 0.05, '%'],
      ['fb', 'Frais du placement B' + tip('frais') + '<br><span style="font-weight:500;font-size:12px;color:var(--color-text-secondary,#71717a)">ex. un fonds de banque' + tip('fonds') + ' : 1,5 à 2,5 %</span>', 0, 4, 0.05, '%'],
    ],
    infl: [
      ['s', 'Somme aujourd’hui', 0, 200000, 500, '€'],
      ['y', 'Durée', 1, 40, 1, 'ans'],
      ['i', 'Inflation annuelle (hypothèse)' + tip('inflation'), 0, 10, 0.1, '%'],
      ['r', 'Rendement de ton épargne (hypothèse)' + tip('rendement'), 0, 10, 0.1, '%'],
    ],
  };
  var PRESETS = {
    frais: [['10 000 € + 200 €/mois, 20 ans', { c: 10000, m: 200, y: 20, r: 6, fa: 0.3, fb: 1.8 }], ['100 €/mois, 30 ans', { c: 0, m: 100, y: 30, r: 6, fa: 0.2, fb: 2 }], ['50 000 € placés, 15 ans', { c: 50000, m: 0, y: 15, r: 5, fa: 0.5, fb: 2.5 }]],
    infl: [['10 000 € sur 10 ans', { s: 10000, y: 10, i: 3, r: 1 }], ['Épargne qui dort, 20 ans', { s: 20000, y: 20, i: 2.5, r: 0 }], ['Inflation forte', { s: 10000, y: 5, i: 6, r: 3 }]],
  };

  function card(inner, extra) { return '<div style="background:var(--color-surface,#fff);border:1px solid var(--color-border,#e4e4e7);border-radius:18px;padding:18px;' + (extra || '') + '">' + inner + '</div>'; }

  function fieldsHTML() {
    return FIELDS[TAB].map(function (f) {
      var id = f[0], v = V[TAB][id];
      return '<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px">'
        + '<label for="calc-' + id + '" style="font-size:13px;font-weight:600;color:var(--color-text,#1c1c1e)">' + f[1] + '</label>'
        + '<span style="display:inline-flex;align-items:center;gap:4px"><input type="number" id="calc-' + id + '-n" value="' + v + '" min="' + f[2] + '" step="' + f[4] + '" style="width:92px;padding:6px 8px;border-radius:9px;border:1px solid var(--color-border,#e4e4e7);background:var(--color-bg,#f5f5f5);color:var(--color-text,#1c1c1e);font:inherit;font-size:14px;font-weight:700;text-align:right"><span style="font-size:12.5px;color:var(--color-text-secondary,#71717a)">' + f[5] + '</span></span></div>'
        + '<input type="range" id="calc-' + id + '" min="' + f[2] + '" max="' + f[3] + '" step="' + f[4] + '" value="' + v + '" style="width:100%;accent-color:#16a34a"></div>';
    }).join('');
  }

  function chart(series, years) {
    var W = 520, H = 210, L = 6, R = 6, T = 10, B = 24, max = 1;
    series.forEach(function (s) { s.v.forEach(function (x) { if (x > max) max = x; }); });
    var x = function (k) { return L + (W - L - R) * k / (years || 1); }, yv = function (v) { return T + (H - T - B) * (1 - v / max); };
    var path = function (v) { return v.map(function (p, k) { return (k ? 'L' : 'M') + x(k).toFixed(1) + ',' + yv(p).toFixed(1); }).join(''); };
    var step = Math.max(1, Math.ceil(years / 5)), ticks = '';
    for (var k = 0; k <= years; k += step) ticks += '<text x="' + x(k).toFixed(1) + '" y="' + (H - 6) + '" font-size="13" text-anchor="' + (k === 0 ? 'start' : 'middle') + '" fill="#9ca3af">' + (k ? k + ' an' + (k > 1 ? 's' : '') : 'Auj.') + '</text>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block">' + series.map(function (s) {
      return s.area ? '<path d="' + path(s.v) + 'L' + x(years).toFixed(1) + ',' + yv(0) + 'L' + x(0).toFixed(1) + ',' + yv(0) + 'Z" fill="' + s.color + '" opacity="' + (s.opacity || 0.18) + '"/>'
        : '<path d="' + path(s.v) + '" fill="none" stroke="' + s.color + '" stroke-width="3" stroke-linejoin="round"' + (s.dash ? ' stroke-dasharray="7 6"' : '') + '/>';
    }).join('') + ticks + '</svg>';
  }
  var legend = function (items) { return '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:12px;color:var(--color-text-secondary,#71717a)">' + items.map(function (it) { return '<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:14px;height:3px;border-radius:2px;background:' + it[1] + ';display:inline-block"></i>' + it[0] + '</span>'; }).join('') + '</div>'; };
  var stat = function (label, value, color) { return '<div style="flex:1;min-width:120px;background:var(--color-bg,#f5f5f5);border-radius:12px;padding:10px 12px"><div style="font-size:11.5px;color:var(--color-text-secondary,#71717a);font-weight:600">' + label + '</div><div style="font-size:18px;font-weight:800;color:' + (color || 'var(--color-text,#1c1c1e)') + ';margin-top:2px">' + value + '</div></div>'; };

  function results() {
    var v = V[TAB];
    if (TAB === 'frais') {
      var y = Math.max(1, Math.round(v.y)), a = fv(v.c, v.m, y, v.r - v.fa), b = fv(v.c, v.m, y, v.r - v.fb), inv = [];
      for (var k = 0; k <= y; k++) inv.push(v.c + v.m * 12 * k);
      var gap = Math.abs(a[y] - b[y]);
      return '<div style="font-size:12.5px;font-weight:700;color:var(--color-text-secondary,#71717a)">Écart au bout de ' + y + ' an' + (y > 1 ? 's' : '') + '</div>'
        + '<div style="font-size:38px;font-weight:900;letter-spacing:-1px;color:#dc2626;margin:2px 0 4px">' + eur(gap) + '</div>'
        + '<div style="font-size:13px;color:var(--color-text-secondary,#71717a);margin-bottom:12px">entre ' + num(v.fa) + ' % et ' + num(v.fb) + ' % de frais par an, pour le même placement</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' + stat('Placement A (frais ' + num(v.fa) + ' %)', eur(a[y]), '#16a34a') + stat('Placement B (frais ' + num(v.fb) + ' %)', eur(b[y])) + stat('Total versé', eur(inv[y])) + '</div>'
        + chart([{ v: inv, color: '#9ca3af', area: true }, { v: a, color: '#16a34a' }, { v: b, color: '#334155', dash: true }], y)
        + legend([['Versé', '#9ca3af'], ['Placement A', '#16a34a'], ['Placement B', '#334155']]);
    }
    var yy = Math.max(1, Math.round(v.y)), pa = [], nom = [], real = [];
    for (var j = 0; j <= yy; j++) { var infl = Math.pow(1 + v.i / 100, j), grow = Math.pow(1 + v.r / 100, j); pa.push(v.s / infl); nom.push(v.s * grow); real.push(v.s * grow / infl); }
    var lost = v.s - real[yy], prices = Math.pow(1 + v.i / 100, yy), dbl = v.i > 0 ? 72 / v.i : 0;
    return '<div style="font-size:12.5px;font-weight:700;color:var(--color-text-secondary,#71717a)">Pouvoir d’achat de ton épargne dans ' + yy + ' an' + (yy > 1 ? 's' : '') + '</div>'
      + '<div style="font-size:38px;font-weight:900;letter-spacing:-1px;color:' + (real[yy] < v.s ? '#dc2626' : '#16a34a') + ';margin:2px 0 4px">' + eur(real[yy]) + '</div>'
      + '<div style="font-size:13px;color:var(--color-text-secondary,#71717a);margin-bottom:12px">en euros d’aujourd’hui : ' + (lost > 0 ? 'tu perds ' + eur(lost) + ' de pouvoir d’achat' : 'ton épargne garde son pouvoir d’achat') + ' (rendement ' + num(v.r) + ' % contre inflation ' + num(v.i) + ' %)</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' + stat('Solde affiché', eur(nom[yy])) + stat('Sans aucun rendement', eur(pa[yy]), '#dc2626') + stat('Les prix auront', '× ' + num(prices, 2)) + (dbl ? stat('Prix doublés en', '≈ ' + num(dbl, 0) + ' ans') : '') + '</div>'
      + chart([{ v: nom, color: '#9ca3af', dash: true }, { v: real, color: '#16a34a' }, { v: pa, color: '#dc2626' }], yy)
      + legend([['Solde affiché', '#9ca3af'], ['Pouvoir d’achat avec ton rendement', '#16a34a'], ['Pouvoir d’achat sans rendement', '#dc2626']]);
  }

  // Menu de tous les calculateurs, classés par thème, tous affichés dans la page : '#frais' et '#infl' sont dessinés ici,
  // les autres sont les pages publiques (aussi listées sur /outils) dans un cadre intégré, en mode « app » (voir simcta.js)
  var TOOLS = [
    ['Budget et dépenses', [['/budget-50-30-20', '🧾', 'Budget 50/30/20'], ['/calculateur-petites-depenses', '☕', 'Petites dépenses'], ['/calculateur-abonnements', '📺', 'Abonnements']]],
    ['Crédits et dettes', [['/cout-credit-consommation', '💳', 'Coût d’un crédit conso'], ['/remboursement-dettes', '🧮', 'Rembourser ses dettes']]],
    ['Épargne et placements', [['#frais', '💸', 'Impact des frais'], ['#infl', '📉', 'Inflation'], ['/epargne-de-precaution', '☂️', 'Épargne de précaution'], ['/calculateur-objectif-epargne', '🎯', 'Objectif d’épargne'], ['/simulateur-interets-composes', '📈', 'Intérêts composés'], ['/simulateur-investissement-programme', '🗓️', 'Investir chaque mois'], ['/rendement-etf-msci-world', '🌍', 'ETF MSCI World']]],
  ];
  function menuHTML() {
    return '<div id="calc-tools" style="background:var(--color-surface,#fff);border:1px solid var(--color-border,#e4e4e7);border-radius:16px;padding:12px 14px 14px;margin-bottom:16px">'
      + TOOLS.map(function (g) {
        return '<div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--color-text-secondary,#71717a);margin:6px 2px 7px">' + g[0] + '</div>'
          + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">' + g[1].map(function (t) {
            var key = t[0][0] === '#' ? t[0].slice(1) : t[0], on = TAB === key;
            var style = 'display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:99px;font:inherit;font-size:13px;font-weight:' + (on ? 800 : 600) + ';cursor:pointer;'
              + 'border:1px solid ' + (on ? '#16a34a' : 'var(--color-border,#e4e4e7)') + ';background:' + (on ? 'rgba(22,163,74,.1)' : 'var(--color-bg,#f7f8fa)') + ';color:' + (on ? '#15803d' : 'var(--color-text,#1c1c1e)');
            return '<button type="button" onclick="calcTab(\'' + key + '\')" style="' + style + '">' + t[1] + ' ' + t[2] + '</button>';
          }).join('') + '</div>';
      }).join('') + '</div>';
  }
  // Petites dépenses et abonnements : le calcul à la main est un avant-goût de « Mes dépenses » (Premium), qui lit le relevé
  // bancaire et retrouve tout automatiquement ; encart au-dessus du calculateur (ouvre la page pour un compte Premium)
  function depensesPromoHTML() {
    if (TAB !== '/calculateur-petites-depenses' && TAB !== '/calculateur-abonnements') return '';
    var premium = typeof isPremiumUser === 'function' && isPremiumUser();
    var what = TAB === '/calculateur-abonnements' ? 'tous tes abonnements, même ceux que tu as oubliés' : 'toutes tes petites dépenses du mois';
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:linear-gradient(135deg,#0b1220,#14532d);color:#fff;border-radius:16px;padding:14px 16px;margin-bottom:14px">'
      + '<div style="font-size:13.5px;line-height:1.5;min-width:220px;flex:1"><b style="font-size:14.5px">' + (premium ? '✨ Fais-le automatiquement' : '✨ Tu ne sais pas tout ce que tu paies ?') + '</b><br>'
      + '<span style="color:rgba(255,255,255,.8)">Avec <a href="#" onclick="nav(\'depenses\');return false" style="color:#4ade80;font-weight:800;text-decoration:underline;text-underline-offset:3px">Mes dépenses</a>, Kapitaro lit ton relevé bancaire et retrouve ' + what + ', sans rien taper.</span></div>'
      + '<button type="button" onclick="' + (premium ? 'nav(\'depenses\')' : 'showPlansModal()') + '" style="background:#22c55e;border:none;color:#052e16;font:inherit;font-size:13px;font-weight:800;padding:10px 14px;border-radius:10px;cursor:pointer;white-space:nowrap">' + (premium ? 'Ouvrir Mes dépenses' : 'Essayer Premium') + '</button></div>';
  }
  // Hauteur du cadre intégré : envoyée par la page de l'outil (simcta.js), pour éviter une barre de défilement interne
  window.addEventListener('message', function (e) {
    var f = document.getElementById('calc-frame');
    if (f && e.origin === location.origin && e.data && e.data.kpCalcHeight) f.style.height = Math.max(400, e.data.kpCalcHeight) + 'px';
  });

  window.renderCalc = function () {
    var root = document.getElementById('calc-root'); if (!root) return;
    if (TAB[0] === '/') {   // calculateur public, affiché dans la page
      root.innerHTML = menuHTML() + depensesPromoHTML() + '<iframe id="calc-frame" src="' + (window.KP_EN && KP_EN.enPath ? KP_EN.enPath(TAB) : TAB) + '" title="Calculateur" loading="lazy" style="display:block;width:100%;height:900px;border:0;border-radius:16px;background:transparent"></iframe>';
      return;
    }
    root.innerHTML = menuHTML()
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' + PRESETS[TAB].map(function (p, k) { return '<button type="button" onclick="calcPreset(' + k + ')" style="padding:6px 12px;border-radius:99px;border:1px solid var(--color-border,#e4e4e7);background:var(--color-surface,#fff);color:var(--color-text,#1c1c1e);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer">' + p[0] + '</button>'; }).join('') + '</div>'
      + '<div class="calc-grid" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:12px;align-items:start">'
      + card((TAB === 'frais' ? '<p style="margin:0 0 14px;font-size:13px;line-height:1.5;color:var(--color-text-secondary,#71717a)">Compare <b style="color:var(--color-text,#1c1c1e)">deux placements identiques</b> (même versement, même durée, même rendement avant frais) qui n’ont <b style="color:var(--color-text,#1c1c1e)">pas les mêmes frais annuels</b>. Tu vois ce que la différence te coûte à la fin.</p>' : '<p style="margin:0 0 14px;font-size:13px;line-height:1.5;color:var(--color-text-secondary,#71717a)">Vois ce que vaudra vraiment ton épargne dans quelques années, une fois la hausse des prix prise en compte, selon ce qu’elle rapporte.</p>') + fieldsHTML()) + card('<div id="calc-out">' + results() + '</div>') + '</div>'
      + '<p style="font-size:11.5px;color:var(--color-text-secondary,#71717a);line-height:1.5;margin:12px 2px 0">Simulation pédagogique avec des hypothèses constantes, ce qui n’arrive jamais en réalité : les rendements varient et peuvent être négatifs. Ce n’est pas un conseil en investissement.</p>';
    FIELDS[TAB].forEach(function (f) {
      var id = f[0], range = document.getElementById('calc-' + id), box = document.getElementById('calc-' + id + '-n');
      var set = function (val) { var n = parseFloat(String(val).replace(',', '.')); V[TAB][id] = isFinite(n) && n >= 0 ? n : 0; document.getElementById('calc-out').innerHTML = results(); };
      range.addEventListener('input', function () { box.value = range.value; set(range.value); });
      box.addEventListener('input', function () { range.value = box.value; set(box.value); });
    });
  };
  window.calcTab = function (t) { TAB = t; window.renderCalc(); };
  window.calcPreset = function (k) { var p = PRESETS[TAB][k]; if (!p) return; Object.assign(V[TAB], p[1]); window.renderCalc(); };
})();
