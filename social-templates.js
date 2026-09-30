// social-templates.js — dessine les images des carrousels réseaux sociaux (1080 × 1350, format 4:5).
// Utilisé par le Studio (studio.html) et pour les captures locales. Une diapositive = un objet (champ « theme » facultatif) :
//   { t:'cover',   title, sub, kicker, emoji }
//   { t:'text',    kicker, title, body }
//   { t:'number',  title, big, body }
//   { t:'list',    title, items:[...], note }
//   { t:'steps',   title, items:[...] }                                  étapes reliées
//   { t:'myth',    title, myth, fact }                                   idée reçue / réalité
//   { t:'versus',  title, left:{title,items}, right:{title,items} }      comparatif en deux colonnes
//   { t:'quote',   title, sub }                                          phrase clé en grand
//   { t:'compare', title, a:{label,value,amount}, b:{…}, note }          deux barres
//   { t:'market',  title, rows:[{label,value,change}], note }            variations de marché (données réelles)
//   { t:'agenda',  title, rows:[{when,label,detail}], note }             rendez-vous économiques (données réelles)
//   { t:'cta',     title, body }
(function () {
  var W = 1080, H = 1350;
  var FONT = "'Plus Jakarta Sans', 'Segoe UI', -apple-system, Roboto, Arial, sans-serif";

  // Ambiances de couleurs : chaque post en choisit une pour que le fil ne se ressemble pas
  var THEMES = {
    nuit:   { bg: '#080e1e', text: '#ffffff', accent: '#24e898', ink: '#080e1e', muted: 'rgba(255,255,255,.72)', soft: 'rgba(255,255,255,.5)', card: 'rgba(255,255,255,.05)', line: 'rgba(255,255,255,.10)', g1: 'rgba(36,232,152,.20)', g2: 'rgba(99,102,241,.16)', up: '#34d399', down: '#f87171' },
    clair:  { bg: '#f6f2ea', text: '#0b1220', accent: '#0e9f5b', ink: '#ffffff', muted: 'rgba(11,18,32,.70)', soft: 'rgba(11,18,32,.5)', card: 'rgba(11,18,32,.045)', line: 'rgba(11,18,32,.10)', g1: 'rgba(14,159,91,.14)', g2: 'rgba(245,158,11,.14)', up: '#0e9f5b', down: '#dc2626' },
    violet: { bg: '#140e2c', text: '#ffffff', accent: '#b69cff', ink: '#140e2c', muted: 'rgba(255,255,255,.74)', soft: 'rgba(255,255,255,.5)', card: 'rgba(255,255,255,.06)', line: 'rgba(255,255,255,.12)', g1: 'rgba(182,156,255,.24)', g2: 'rgba(36,232,152,.10)', up: '#34d399', down: '#fb7185' },
    ocean:  { bg: '#03202e', text: '#ffffff', accent: '#3fd4f7', ink: '#03202e', muted: 'rgba(255,255,255,.74)', soft: 'rgba(255,255,255,.5)', card: 'rgba(255,255,255,.06)', line: 'rgba(255,255,255,.12)', g1: 'rgba(63,212,247,.22)', g2: 'rgba(36,232,152,.12)', up: '#34d399', down: '#fb7185' },
    soleil: { bg: '#1b1308', text: '#ffffff', accent: '#ffc53d', ink: '#1b1308', muted: 'rgba(255,255,255,.74)', soft: 'rgba(255,255,255,.5)', card: 'rgba(255,255,255,.06)', line: 'rgba(255,255,255,.12)', g1: 'rgba(255,197,61,.22)', g2: 'rgba(244,114,182,.12)', up: '#4ade80', down: '#fb7185' },
    actu:   { bg: '#0c0c10', text: '#ffffff', accent: '#ff8a3d', ink: '#0c0c10', muted: 'rgba(255,255,255,.74)', soft: 'rgba(255,255,255,.5)', card: 'rgba(255,255,255,.06)', line: 'rgba(255,255,255,.12)', g1: 'rgba(255,138,61,.20)', g2: 'rgba(99,102,241,.14)', up: '#4ade80', down: '#f87171' }
  };

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
      '.kps{position:relative;width:' + W + 'px;height:' + H + 'px;overflow:hidden;background:var(--bg);color:var(--text);font-family:' + FONT + ';box-sizing:border-box;padding:96px 88px 150px;display:flex;flex-direction:column}',
      '.kps *{box-sizing:border-box;margin:0}',
      '.kps-glow{position:absolute;right:-260px;top:-260px;width:820px;height:820px;background:radial-gradient(circle,var(--g1),transparent 62%);pointer-events:none}',
      '.kps-glow2{position:absolute;left:-300px;bottom:-320px;width:760px;height:760px;background:radial-gradient(circle,var(--g2),transparent 62%);pointer-events:none}',
      '.kps-main{position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;gap:40px}',
      '.kps-kicker{font-size:30px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}',
      '.kps-badge{align-self:flex-start;font-size:28px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;background:var(--accent);color:var(--ink);padding:12px 22px;border-radius:14px}',
      '.kps-emoji{font-size:150px;line-height:1}',
      '.kps-title{font-size:84px;font-weight:800;line-height:1.08;letter-spacing:-.03em}',
      '.kps-title em{font-style:normal;color:var(--accent)}',
      '.kps-sub{font-size:40px;font-weight:500;line-height:1.35;color:var(--muted)}',
      '.kps-body{font-size:44px;font-weight:500;line-height:1.42;color:var(--muted)}',
      '.kps-body strong,.kps-sub strong{color:var(--text);font-weight:800}',
      '.kps-big{font-size:190px;font-weight:800;line-height:1;letter-spacing:-.05em;color:var(--accent)}',
      '.kps-list{display:flex;flex-direction:column;gap:24px}',
      '.kps-item{display:flex;gap:26px;align-items:flex-start;font-size:42px;font-weight:600;line-height:1.3;background:var(--card);border:2px solid var(--line);border-radius:28px;padding:26px 30px}',
      '.kps-dot{flex-shrink:0;width:56px;height:56px;border-radius:50%;background:var(--accent);color:var(--ink);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;margin-top:-2px}',
      '.kps-steps{position:relative;display:flex;flex-direction:column;gap:34px;padding-left:10px}',
      '.kps-steps:before{content:"";position:absolute;left:37px;top:30px;bottom:30px;width:4px;background:var(--line)}',
      '.kps-step{position:relative;display:flex;gap:30px;align-items:center;font-size:42px;font-weight:600;line-height:1.3}',
      '.kps-step .kps-dot{width:58px;height:58px;box-shadow:0 0 0 10px var(--bg)}',
      '.kps-note{font-size:30px;color:var(--soft);line-height:1.4}',
      '.kps-card{background:var(--card);border:2px solid var(--line);border-radius:30px;padding:34px 36px}',
      '.kps-card h4{font-size:30px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-bottom:14px}',
      '.kps-card p{font-size:42px;font-weight:600;line-height:1.35}',
      '.kps-myth h4{color:var(--down)}',
      '.kps-fact{border-color:var(--accent)}',
      '.kps-fact h4{color:var(--accent)}',
      '.kps-vs{display:grid;grid-template-columns:1fr 1fr;gap:22px}',
      '.kps-vs .kps-card{padding:30px 28px}',
      '.kps-vs h4{font-size:34px;letter-spacing:0;text-transform:none;color:var(--accent)}',
      '.kps-vs li{font-size:34px;font-weight:600;line-height:1.35;list-style:none;padding:10px 0;border-top:2px solid var(--line)}',
      '.kps-vs ul{padding:0}',
      '.kps-quote{font-size:74px;font-weight:800;line-height:1.15;letter-spacing:-.02em}',
      '.kps-quote em{font-style:normal;color:var(--accent)}',
      '.kps-qmark{font-size:220px;line-height:.6;font-weight:800;color:var(--accent);height:110px}',
      '.kps-rows{display:flex;flex-direction:column;gap:16px}',
      '.kps-row{display:flex;align-items:center;justify-content:space-between;gap:20px;background:var(--card);border:2px solid var(--line);border-radius:24px;padding:24px 30px;font-size:40px;font-weight:700}',
      '.kps-row small{display:block;font-size:28px;font-weight:600;color:var(--soft);margin-top:4px}',
      '.kps-chg{font-weight:800;white-space:nowrap}',
      '.kps-when{flex-shrink:0;min-width:190px;font-size:30px;font-weight:800;color:var(--accent);text-transform:uppercase;letter-spacing:.04em}',
      '.kps-bars{display:flex;flex-direction:column;gap:34px}',
      '.kps-bar-l{display:flex;justify-content:space-between;font-size:40px;font-weight:700;margin-bottom:14px}',
      '.kps-bar-t{height:64px;border-radius:32px;background:var(--card);overflow:hidden}',
      '.kps-bar-f{height:100%;border-radius:32px}',
      '.kps-cta-btn{align-self:flex-start;background:var(--accent);color:var(--ink);font-size:44px;font-weight:800;padding:30px 44px;border-radius:24px}',
      '.kps-foot{position:absolute;left:88px;right:88px;bottom:64px;display:flex;align-items:center;justify-content:space-between;font-size:30px;font-weight:700;color:var(--soft)}',
      '.kps-brand{display:flex;align-items:center;gap:16px;color:var(--text)}',
      '.kps-brand i{width:54px;height:54px;border-radius:14px;background:#0d1628 url(/icons/kapitaro-tile.svg) center/cover;display:block}',
      '.kps-page{display:flex;align-items:center;gap:14px}',
      '.kps-swipe{color:var(--accent)}',
      '.kps-disc{font-size:26px;line-height:1.4;color:var(--soft)}'
    ].join('\n');
    document.head.appendChild(css);
  }

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  // Espaces insécables dans les nombres (« 41 000 € » ne doit jamais être coupé en fin de ligne)
  var NBSP = ' ';
  var nb = function (s) {
    return String(s == null ? '' : s)
      .replace(/(\d) (?=\d)/g, '$1' + NBSP)
      .replace(/ (€|%)/g, NBSP + '$1')
      .replace(/(\d) (mois|ans?|jours?)\b/g, '$1' + NBSP + '$2')
      .replace(/≈ /g, '≈' + NBSP);
  };
  // *mot* → mot en couleur (titres) ; **mot** → gras (textes)
  var fmt = function (s) { return esc(nb(s)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>'); };
  var title = function (s, size) { return s ? '<div class="kps-title"' + (size ? ' style="font-size:' + size + 'px"' : '') + ' data-fit="' + (size || 84) + '">' + fmt(s) + '</div>' : ''; };

  function inner(s, th) {
    switch (s.t) {
      case 'cover':
        return (s.kicker ? '<div class="kps-badge">' + fmt(s.kicker) + '</div>' : '') + (s.emoji ? '<div class="kps-emoji">' + esc(s.emoji) + '</div>' : '') +
          title(s.title) + (s.sub ? '<div class="kps-sub" data-fit="40">' + fmt(s.sub) + '</div>' : '');
      case 'number':
        return (s.title ? '<div class="kps-kicker">' + fmt(s.title) + '</div>' : '') + '<div class="kps-big" data-fit="190">' + esc(nb(s.big)) + '</div>' + (s.body ? '<div class="kps-body" data-fit="44">' + fmt(s.body) + '</div>' : '');
      case 'list':
        return title(s.title, 66) + '<div class="kps-list">' +
          (s.items || []).map(function (it, i) { return '<div class="kps-item"><span class="kps-dot">' + (i + 1) + '</span><span data-fit="42">' + fmt(it) + '</span></div>'; }).join('') +
          '</div>' + (s.note ? '<div class="kps-note">' + fmt(s.note) + '</div>' : '');
      case 'steps':
        return title(s.title, 66) + '<div class="kps-steps">' +
          (s.items || []).map(function (it, i) { return '<div class="kps-step"><span class="kps-dot">' + (i + 1) + '</span><span data-fit="42">' + fmt(it) + '</span></div>'; }).join('') + '</div>';
      case 'myth':
        return title(s.title, 62) +
          '<div class="kps-card kps-myth"><h4>✗ Idée reçue</h4><p data-fit="42">' + fmt(s.myth) + '</p></div>' +
          '<div class="kps-card kps-fact"><h4>✓ En réalité</h4><p data-fit="42">' + fmt(s.fact) + '</p></div>';
      case 'versus': {
        var col = function (c) { c = c || {}; return '<div class="kps-card"><h4>' + fmt(c.title) + '</h4><ul>' + (c.items || []).map(function (x) { return '<li data-fit="34">' + fmt(x) + '</li>'; }).join('') + '</ul></div>'; };
        return title(s.title, 62) + '<div class="kps-vs">' + col(s.left) + col(s.right) + '</div>';
      }
      case 'quote':
        return '<div class="kps-qmark">“</div><div class="kps-quote" data-fit="74">' + fmt(s.title) + '</div>' + (s.sub ? '<div class="kps-sub" data-fit="40">' + fmt(s.sub) + '</div>' : '');
      case 'market':
        return title(s.title, 62) + '<div class="kps-rows">' + (s.rows || []).map(function (r) {
          var c = Number(r.change), color = c > 0 ? th.up : c < 0 ? th.down : th.muted;
          var txt = isFinite(c) ? (c > 0 ? '+' : '') + c.toFixed(1).replace('.', ',') + ' %' : '';
          return '<div class="kps-row"><span>' + fmt(r.label) + (r.value ? '<small>' + fmt(r.value) + '</small>' : '') + '</span><span class="kps-chg" style="color:' + color + '">' + (c > 0 ? '▲ ' : c < 0 ? '▼ ' : '') + esc(nb(txt)) + '</span></div>';
        }).join('') + '</div>' + (s.note ? '<div class="kps-note">' + fmt(s.note) + '</div>' : '');
      case 'agenda':
        return title(s.title, 62) + '<div class="kps-rows">' + (s.rows || []).map(function (r) {
          return '<div class="kps-row" style="justify-content:flex-start"><span class="kps-when">' + fmt(r.when) + '</span><span>' + fmt(r.label) + (r.detail ? '<small>' + fmt(r.detail) + '</small>' : '') + '</span></div>';
        }).join('') + '</div>' + (s.note ? '<div class="kps-note">' + fmt(s.note) + '</div>' : '');
      case 'compare': {
        var a = s.a || {}, b = s.b || {};
        var max = Math.max(a.amount || 0, b.amount || 0) || 1;
        var bar = function (x, color) { return '<div><div class="kps-bar-l"><span>' + esc(x.label) + '</span><span style="color:' + color + '">' + esc(nb(x.value)) + '</span></div><div class="kps-bar-t"><div class="kps-bar-f" style="width:' + Math.max(6, (x.amount || 0) / max * 100).toFixed(1) + '%;background:' + color + '"></div></div></div>'; };
        return title(s.title, 66) + '<div class="kps-bars">' + bar(a, th.soft) + bar(b, th.accent) + '</div>' + (s.note ? '<div class="kps-note">' + fmt(s.note) + '</div>' : '');
      }
      case 'cta':
        return title(s.title) + (s.body ? '<div class="kps-body" data-fit="44">' + fmt(s.body) + '</div>' : '') +
          '<div class="kps-cta-btn">kapitaro.fr</div><div class="kps-disc">Contenu éducatif, pas un conseil en investissement. Investir comporte un risque de perte en capital.</div>';
      default: // text
        return (s.kicker ? '<div class="kps-kicker">' + fmt(s.kicker) + '</div>' : '') + title(s.title, 72) + (s.body ? '<div class="kps-body" data-fit="44">' + fmt(s.body) + '</div>' : '');
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

  function renderSlide(slide, index, total, themeName) {
    injectAssets();
    slide = slide || {};
    var th = THEMES[themeName || slide.theme] || THEMES.nuit;
    var el = document.createElement('div');
    el.className = 'kps';
    Object.keys(th).forEach(function (k) { el.style.setProperty('--' + k, th[k]); });
    var last = index === total - 1;
    el.innerHTML = '<div class="kps-glow"></div><div class="kps-glow2"></div><div class="kps-main">' + inner(slide, th) + '</div>' +
      '<div class="kps-foot"><span class="kps-brand"><i></i>@kapitaro_app</span><span class="kps-page">' + (index + 1) + '/' + total + (last ? '' : ' <span class="kps-swipe">→</span>') + '</span></div>';
    return el;
  }

  window.KapitaroSocial = { W: W, H: H, THEMES: Object.keys(THEMES), renderSlide: renderSlide, fit: fit, fontsReady: function () { return document.fonts ? document.fonts.ready : Promise.resolve(); } };
})();
