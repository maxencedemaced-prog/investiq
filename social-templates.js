// social-templates.js — dessine les images des carrousels réseaux sociaux (1080 × 1350, format 4:5).
// Utilisé par le Studio (studio.html) et pour les captures locales. Une diapositive = un objet :
//   { t:'cover',   title, sub }
//   { t:'text',    title, body }
//   { t:'number',  big, title, body }
//   { t:'list',    title, items:[...], note }
//   { t:'compare', title, a:{label,value,amount}, b:{label,value,amount}, note }
//   { t:'cta',     title, body }
(function () {
  var W = 1080, H = 1350;
  var GREEN = '#24e898', NAVY = '#080e1e';
  var FONT = "'Plus Jakarta Sans', 'Segoe UI', -apple-system, Roboto, Arial, sans-serif";

  function injectAssets() {
    if (document.getElementById('kp-social-css')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    var css = document.createElement('style');
    css.id = 'kp-social-css';
    css.textContent = [
      '.kps{position:relative;width:' + W + 'px;height:' + H + 'px;overflow:hidden;background:' + NAVY + ';color:#fff;font-family:' + FONT + ';box-sizing:border-box;padding:96px 88px 150px;display:flex;flex-direction:column}',
      '.kps *{box-sizing:border-box;margin:0}',
      '.kps-glow{position:absolute;right:-260px;top:-260px;width:820px;height:820px;background:radial-gradient(circle,rgba(36,232,152,.20),transparent 62%);pointer-events:none}',
      '.kps-glow2{position:absolute;left:-300px;bottom:-320px;width:760px;height:760px;background:radial-gradient(circle,rgba(99,102,241,.16),transparent 62%);pointer-events:none}',
      '.kps-main{position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;gap:40px}',
      '.kps-kicker{font-size:30px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:' + GREEN + '}',
      '.kps-title{font-size:84px;font-weight:800;line-height:1.08;letter-spacing:-.03em}',
      '.kps-title em{font-style:normal;color:' + GREEN + '}',
      '.kps-sub{font-size:40px;font-weight:500;line-height:1.35;color:rgba(255,255,255,.72)}',
      '.kps-body{font-size:44px;font-weight:500;line-height:1.42;color:rgba(255,255,255,.86)}',
      '.kps-body strong{color:#fff;font-weight:800}',
      '.kps-big{font-size:200px;font-weight:800;line-height:1;letter-spacing:-.05em;color:' + GREEN + '}',
      '.kps-list{display:flex;flex-direction:column;gap:26px}',
      '.kps-item{display:flex;gap:26px;align-items:flex-start;font-size:44px;font-weight:600;line-height:1.3;background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.09);border-radius:28px;padding:28px 32px}',
      '.kps-dot{flex-shrink:0;width:56px;height:56px;border-radius:50%;background:' + GREEN + ';color:' + NAVY + ';display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;margin-top:-2px}',
      '.kps-note{font-size:30px;color:rgba(255,255,255,.5);line-height:1.4}',
      '.kps-bars{display:flex;flex-direction:column;gap:34px}',
      '.kps-bar-l{display:flex;justify-content:space-between;font-size:40px;font-weight:700;margin-bottom:14px}',
      '.kps-bar-t{height:64px;border-radius:32px;background:rgba(255,255,255,.08);overflow:hidden}',
      '.kps-bar-f{height:100%;border-radius:32px}',
      '.kps-cta-btn{align-self:flex-start;background:' + GREEN + ';color:' + NAVY + ';font-size:44px;font-weight:800;padding:30px 44px;border-radius:24px}',
      '.kps-foot{position:absolute;left:88px;right:88px;bottom:64px;display:flex;align-items:center;justify-content:space-between;font-size:30px;font-weight:700;color:rgba(255,255,255,.55)}',
      '.kps-brand{display:flex;align-items:center;gap:16px;color:#fff}',
      '.kps-brand i{width:54px;height:54px;border-radius:14px;background:#0d1628 url(/icons/kapitaro-tile.svg) center/cover;display:block}',
      '.kps-page{display:flex;align-items:center;gap:14px}',
      '.kps-swipe{color:' + GREEN + '}',
      '.kps-disc{font-size:26px;line-height:1.4;color:rgba(255,255,255,.45)}'
    ].join('\n');
    document.head.appendChild(css);
  }

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  // *mot* → mot en vert (titres) ; **mot** → gras (textes)
  // Espaces insécables dans les nombres (« 41 000 € » ne doit jamais être coupé en fin de ligne)
  var NBSP = '\u00a0';
  var nb = function (s) {
    return String(s == null ? '' : s)
      .replace(/(\d) (?=\d)/g, '$1' + NBSP)
      .replace(/ (\u20ac|%)/g, NBSP + '$1')
      .replace(/(\d) (mois|ans?|jours?)\b/g, '$1' + NBSP + '$2')
      .replace(/\u2248 /g, '\u2248' + NBSP);
  };
  var fmt = function (s) { return esc(nb(s)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>'); };

  function inner(s) {
    switch (s.t) {
      case 'cover':
        return '<div class="kps-title" data-fit="84">' + fmt(s.title) + '</div>' + (s.sub ? '<div class="kps-sub" data-fit="40">' + fmt(s.sub) + '</div>' : '');
      case 'number':
        return (s.title ? '<div class="kps-kicker">' + fmt(s.title) + '</div>' : '') + '<div class="kps-big" data-fit="200">' + esc(nb(s.big)) + '</div>' + (s.body ? '<div class="kps-body" data-fit="44">' + fmt(s.body) + '</div>' : '');
      case 'list':
        return '<div class="kps-title" style="font-size:66px" data-fit="66">' + fmt(s.title) + '</div><div class="kps-list">' +
          (s.items || []).map(function (it, i) { return '<div class="kps-item"><span class="kps-dot">' + (i + 1) + '</span><span data-fit="44">' + fmt(it) + '</span></div>'; }).join('') +
          '</div>' + (s.note ? '<div class="kps-note">' + fmt(s.note) + '</div>' : '');
      case 'compare': {
        var a = s.a || {}, b = s.b || {};
        var max = Math.max(a.amount || 0, b.amount || 0) || 1;
        var bar = function (x, color) { return '<div><div class="kps-bar-l"><span>' + esc(x.label) + '</span><span style="color:' + color + '">' + esc(nb(x.value)) + '</span></div><div class="kps-bar-t"><div class="kps-bar-f" style="width:' + Math.max(6, (x.amount || 0) / max * 100).toFixed(1) + '%;background:' + color + '"></div></div></div>'; };
        return '<div class="kps-title" style="font-size:66px" data-fit="66">' + fmt(s.title) + '</div><div class="kps-bars">' + bar(a, '#94a3b8') + bar(b, GREEN) + '</div>' + (s.note ? '<div class="kps-note">' + fmt(s.note) + '</div>' : '');
      }
      case 'cta':
        return '<div class="kps-title" data-fit="84">' + fmt(s.title) + '</div>' + (s.body ? '<div class="kps-body" data-fit="44">' + fmt(s.body) + '</div>' : '') +
          '<div class="kps-cta-btn">kapitaro.fr</div><div class="kps-disc">Contenu éducatif, pas un conseil en investissement. Investir comporte un risque de perte en capital.</div>';
      default: // text
        return (s.kicker ? '<div class="kps-kicker">' + fmt(s.kicker) + '</div>' : '') + '<div class="kps-title" style="font-size:72px" data-fit="72">' + fmt(s.title) + '</div>' + (s.body ? '<div class="kps-body" data-fit="44">' + fmt(s.body) + '</div>' : '');
    }
  }

  // Réduit les textes tant que le contenu dépasse de la zone (titres longs, listes chargées)
  function fit(el) {
    var main = el.querySelector('.kps-main');
    var nodes = [].slice.call(el.querySelectorAll('[data-fit]'));
    for (var step = 0; step < 30 && main.scrollHeight > main.clientHeight + 2; step++) {
      nodes.forEach(function (n) {
        var cur = parseFloat(getComputedStyle(n).fontSize);
        var min = parseFloat(n.getAttribute('data-fit')) * 0.55;
        if (cur > min) n.style.fontSize = (cur * 0.94).toFixed(1) + 'px';
      });
    }
  }

  function renderSlide(slide, index, total) {
    injectAssets();
    var el = document.createElement('div');
    el.className = 'kps';
    var last = index === total - 1;
    el.innerHTML = '<div class="kps-glow"></div><div class="kps-glow2"></div><div class="kps-main">' + inner(slide || {}) + '</div>' +
      '<div class="kps-foot"><span class="kps-brand"><i></i>@kapitaro_app</span><span class="kps-page">' + (index + 1) + '/' + total + (last ? '' : ' <span class="kps-swipe">→</span>') + '</span></div>';
    return el;
  }

  window.KapitaroSocial = { W: W, H: H, renderSlide: renderSlide, fit: fit, fontsReady: function () { return document.fonts ? document.fonts.ready : Promise.resolve(); } };
})();
