// help-bot.js — bulle d'aide en bas à droite : répond aux questions sur l'utilisation de Kapitaro.
// Aucune IA ni aucun serveur : reconnaissance de mots-clés sur la base faq-data.js (chargée à la première ouverture).
// Hors sujet ou demande de conseil d'investissement → réponse polie et renvoi vers l'app ou le contact.
(function () {
  if (window.__kpHelp) return; window.__kpHelp = true;

  var POPULAR = ['ajouter', 'importer', 'premium', 'installer', 'resilier'];
  // Mots trop courants pour aider à reconnaître une question
  var STOP = {};
  'le la les un une des de du d l a au aux et ou en est ce que qui quoi comment pourquoi je j tu il on mon ma mes ton ta tes son sa ses sur pour par avec dans pas ne plus se s y elle nous vous c ca faire fait peut peux puis veux voudrais kapitaro site'.split(' ').forEach(function (w) { STOP[w] = true; });
  var norm = function (s) { return ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim() + ' '; };
  var stem = function (w) { return w.length > 4 ? w.replace(/(es|s|x)$/, '') : w; };
  var tokens = function (s) { return norm(s).trim().split(' ').filter(function (w) { return w.length > 1 && !STOP[w]; }).map(stem); };

  function score(entry, q, qt) {
    var s = 0;
    entry.keys.forEach(function (k) {
      var nk = norm(k);
      if (q.indexOf(nk) >= 0) s += 2 + nk.trim().split(' ').length;          // expression entière reconnue
      else if (nk.trim().indexOf(' ') < 0 && qt.indexOf(stem(nk.trim())) >= 0) s += 1.5;
    });
    tokens(entry.q).forEach(function (w) { if (w.length > 3 && qt.indexOf(w) >= 0) s += 0.6; });
    return s;
  }

  function answer(text) {
    var q = norm(text), qt = tokens(text), faq = window.KAPITARO_FAQ || [];
    if (/^(bonjour|salut|hello|coucou|bonsoir|hey)\b/.test(q.trim()) && qt.length <= 1) return { html: 'Bonjour 👋 Pose-moi ta question sur l\'utilisation de Kapitaro, ou choisis une question ci-dessous.', chips: POPULAR };
    if (/ (merci|super|parfait|top|genial) /.test(q) && qt.length <= 3) return { html: 'Avec plaisir ! N\'hésite pas si tu as une autre question 🙂' };
    var ranked = faq.map(function (e) { return { e: e, s: score(e, q, qt) }; }).sort(function (a, b) { return b.s - a.s; });
    var advice = window.KAPITARO_FAQ_ADVICE, adviceHit = advice && advice.keys.some(function (k) { return q.indexOf(norm(k)) >= 0; });
    if (adviceHit && (!ranked[0] || ranked[0].s < 5)) return { html: advice.a, chips: ['decision', 'agent'], id: 'conseil-refus' };
    if (!ranked[0] || ranked[0].s < 2) {
      return { html: 'Je réponds uniquement aux questions sur l\'utilisation de Kapitaro, et je n\'ai pas trouvé de réponse à celle-ci. Essaie avec d\'autres mots, choisis une question ci-dessous, ou écris-nous à <a href="mailto:contact@kapitaro.fr">contact@kapitaro.fr</a>.', chips: POPULAR, id: 'aucune' };
    }
    var best = ranked[0].e, related = ranked.slice(1, 3).filter(function (r) { return r.s >= 2; }).map(function (r) { return r.e.id; });
    return { html: best.a, chips: related, id: best.id };
  }

  // ── Interface ──
  var css = document.createElement('style');
  css.textContent = [
    '#kp-help-btn{position:fixed;right:20px;bottom:20px;z-index:9000;width:58px;height:58px;border-radius:50%;border:none;background:#16a34a;color:#fff;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;transition:transform .15s}',
    '#kp-help-btn:hover{transform:scale(1.06)}',
    '#kp-help-btn svg{width:28px;height:28px}',
    '#kp-help{position:fixed;right:20px;bottom:90px;z-index:9001;width:370px;max-width:calc(100vw - 24px);height:540px;max-height:calc(100vh - 120px);background:#fff;color:#0b1220;border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.4);display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}',
    '#kp-help.open{display:flex}',
    '.kph-head{background:linear-gradient(135deg,#080e1e,#14532d);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}',
    '.kph-head img{width:34px;height:34px;border-radius:10px}',
    '.kph-head b{display:block;font-size:15px}',
    '.kph-head span{font-size:12px;opacity:.7}',
    '.kph-x{margin-left:auto;background:none;border:none;color:#fff;font-size:20px;cursor:pointer;opacity:.8;padding:4px}',
    '.kph-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f6f7f9}',
    '.kph-m{max-width:88%;font-size:14px;line-height:1.5;padding:10px 13px;border-radius:16px}',
    '.kph-bot{align-self:flex-start;background:#fff;border:1px solid #e5e7eb;border-bottom-left-radius:5px}',
    '.kph-bot a{color:#15803d;font-weight:600}',
    '.kph-me{align-self:flex-end;background:#16a34a;color:#fff;border-bottom-right-radius:5px}',
    '.kph-chips{display:flex;flex-wrap:wrap;gap:6px}',
    '.kph-chip{font:inherit;font-size:12.5px;font-weight:600;border:1px solid #bbf7d0;background:#f0fdf4;color:#15803d;border-radius:99px;padding:6px 11px;cursor:pointer;text-align:left}',
    '.kph-chip:hover{background:#dcfce7}',
    '.kph-form{display:flex;gap:8px;padding:10px;border-top:1px solid #e5e7eb;background:#fff}',
    '.kph-form input{flex:1;font:inherit;font-size:14px;border:1px solid #d1d5db;border-radius:12px;padding:10px 12px;color:#0b1220;background:#fff;outline:none}',
    '.kph-form input:focus{border-color:#16a34a}',
    '.kph-form button{border:none;background:#16a34a;color:#fff;border-radius:12px;padding:0 14px;font-weight:700;cursor:pointer}',
    '.kph-foot{font-size:11.5px;color:#6b7280;text-align:center;padding:0 10px 10px;background:#fff}',
    '.kph-foot a{color:#15803d}',
    // Dans l'app sur téléphone : au-dessus de la barre de navigation du bas
    '@media (max-width:768px){#app[style*="flex"] ~ #kp-help-btn{bottom:84px}#app[style*="flex"] ~ #kp-help{bottom:150px}#kp-help{right:12px;left:12px;width:auto;height:70vh}#kp-help-btn{right:14px;bottom:16px}}'
  ].join('\n');
  document.head.appendChild(css);

  var btn = document.createElement('button');
  btn.id = 'kp-help-btn'; btn.type = 'button'; btn.setAttribute('aria-label', 'Aide : poser une question sur Kapitaro');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var panel = document.createElement('div');
  panel.id = 'kp-help'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Aide Kapitaro');
  panel.innerHTML = '<div class="kph-head"><img src="/icons/kapitaro-tile.svg" alt=""><div><b>Aide Kapitaro</b><span>Questions sur l\'utilisation du site</span></div><button class="kph-x" type="button" aria-label="Fermer">✕</button></div>' +
    '<div class="kph-msgs" aria-live="polite"></div>' +
    '<form class="kph-form"><input type="text" maxlength="200" placeholder="Pose ta question…" aria-label="Ta question"><button type="submit">Envoyer</button></form>' +
    '<div class="kph-foot">Réponses automatiques · <a href="/faq">toute la FAQ</a> · <a href="mailto:contact@kapitaro.fr">nous écrire</a></div>';
  document.body.appendChild(btn);
  document.body.appendChild(panel);
  var msgs = panel.querySelector('.kph-msgs'), input = panel.querySelector('input');
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  function add(html, who) {
    var d = document.createElement('div');
    d.className = 'kph-m ' + (who === 'me' ? 'kph-me' : 'kph-bot');
    d.innerHTML = html;
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
  }
  function chips(ids) {
    var faq = window.KAPITARO_FAQ || [], list = (ids || []).map(function (id) { return faq.find(function (e) { return e.id === id; }); }).filter(Boolean);
    if (!list.length) return;
    var d = document.createElement('div'); d.className = 'kph-chips';
    list.forEach(function (e) {
      var c = document.createElement('button'); c.type = 'button'; c.className = 'kph-chip'; c.textContent = e.q;
      c.onclick = function () { ask(e.q, e.id); };
      d.appendChild(c);
    });
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
  }
  function ask(text, forcedId) {
    text = String(text || '').trim(); if (!text) return;
    add(esc(text), 'me');
    var faq = window.KAPITARO_FAQ || [], r;
    var forced = forcedId && faq.find(function (e) { return e.id === forcedId; });
    r = forced ? { html: forced.a, chips: [], id: forced.id } : answer(text);
    setTimeout(function () { add(r.html, 'bot'); chips(r.chips); }, 250);
    try { window.va && window.va('event', { name: 'help_question', data: { match: r.id || 'autre' } }); } catch (e) {}
  }

  var loaded = null;
  function loadData() {
    if (window.KAPITARO_FAQ) return Promise.resolve();
    if (!loaded) loaded = new Promise(function (ok) { var s = document.createElement('script'); s.src = '/faq-data.js?v=20260930'; s.onload = ok; s.onerror = ok; document.head.appendChild(s); });
    return loaded;
  }
  var started = false;
  function open() {
    panel.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
    loadData().then(function () {
      if (!started) { started = true; add('Bonjour 👋 Je réponds à tes questions sur l\'<b>utilisation de Kapitaro</b> : compte, portefeuille, outils, Premium, application… Choisis une question ou écris la tienne.', 'bot'); chips(POPULAR); }
      setTimeout(function () { input.focus(); }, 50);
    });
  }
  function close() { panel.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  btn.onclick = function () { panel.classList.contains('open') ? close() : open(); };
  panel.querySelector('.kph-x').onclick = close;
  panel.querySelector('form').onsubmit = function (e) { e.preventDefault(); var t = input.value; input.value = ''; ask(t); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });
  window.KapitaroHelp = { open: open, answer: function (t) { return answer(t); } };
})();
