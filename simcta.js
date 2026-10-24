// simcta.js — pages simulateurs publiques : appel à l'inscription juste après le calcul + barre fixe en bas sur téléphone.
// Le visiteur arrive souvent par Google (100 % mobile) : on lui propose de passer du calcul à son vrai suivi, sans gêner l'outil.
(function () {
  var TEXT = {
    'simulateur-interets-composes': 'Enregistre ce calcul comme objectif et suis ta vraie progression, mois après mois.',
    'calculateur-objectif-epargne': 'Transforme ce calcul en objectif : Kapitaro suit ta progression réelle avec les vrais cours.',
    'calculateur-frais-placement': 'Ajoute tes vrais placements et vois ce que les frais pèsent sur ton portefeuille.',
    'calculateur-inflation': 'Suis le rendement réel de tes placements et compare-le à l’inflation.',
    'epargne-de-precaution': 'Fixe ton objectif de réserve et suis toute ton épargne au même endroit.',
    'rendement-etf-msci-world': 'Suis tes ETF en direct, avec leur performance réelle et leurs frais.',
    'simulateur-investissement-programme': 'Fixe ton versement mensuel et suis chaque mois où tu en es par rapport à ton objectif.',
  };
  var page = location.pathname.replace(/^\/|\.html$/g, '');
  var msg = TEXT[page] || 'Passe de la simulation à ton vrai portefeuille : objectif chiffré, suivi en direct, assistant IA.';
  var HREF = '/?inscription=1';
  var track = function (where) { try { window.va && window.va('event', { name: 'seo_cta', data: { page: page, where: where } }); } catch (e) {} };

  var css = document.createElement('style');
  css.textContent =
    '.sim-cta{margin:18px 0 6px;padding:18px 18px 16px;border-radius:18px;background:linear-gradient(150deg,#0b1424,#0d2a20);color:#fff;display:grid;gap:10px;box-shadow:0 10px 30px rgba(11,20,36,.18)}' +
    '.sim-cta b{font-size:17px;line-height:1.3}' +
    '.sim-cta p{margin:0;color:#cbd5e1;font-size:14.5px;line-height:1.45}' +
    '.sim-cta a{display:block;text-align:center;background:#22c55e;color:#052e16;font-weight:800;font-size:16px;padding:14px 16px;border-radius:12px;text-decoration:none}' +
    '.sim-cta a:active{transform:scale(.98)}' +
    '.sim-cta small{color:#94a3b8;font-size:12.5px;text-align:center}' +
    '.sim-bar{position:fixed;left:10px;right:10px;bottom:10px;z-index:9000;display:none;align-items:center;gap:10px;padding:10px 10px 10px 14px;border-radius:14px;background:#0b1424;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.3);font-size:13.5px;line-height:1.3}' +
    '.sim-bar.on{display:flex}' +
    '.sim-bar span{flex:1;min-width:0}' +
    '.sim-bar a{flex-shrink:0;background:#22c55e;color:#052e16;font-weight:800;padding:10px 14px;border-radius:10px;text-decoration:none;white-space:nowrap}' +
    '.sim-bar button{flex-shrink:0;background:none;border:0;color:#94a3b8;font-size:20px;line-height:1;padding:4px;cursor:pointer}' +
    'body.sim-bar-on #kp-help-btn{bottom:84px!important;transition:bottom .2s}' +
    '@media (min-width:900px){.sim-bar{display:none!important}body.sim-bar-on #kp-help-btn{bottom:20px!important}}';
  document.head.appendChild(css);

  function start() {
    // 1. bloc juste après l'outil (avant les explications)
    var anchor = document.querySelector('article.content');
    if (anchor && !document.querySelector('.sim-cta')) {
      var box = document.createElement('div');
      box.className = 'sim-cta';
      box.innerHTML = '<b>Et maintenant, pour de vrai ?</b><p>' + msg + '</p><a href="' + HREF + '">Créer mon compte gratuit</a><small>Gratuit · sans carte bancaire · 2 minutes</small>';
      box.querySelector('a').addEventListener('click', function () { track('after-result'); });
      anchor.parentNode.insertBefore(box, anchor);
    }
    // 2. barre fixe sur téléphone, après une première utilisation de l'outil (ou après avoir fait défiler), refermable
    var closed = false; try { closed = sessionStorage.getItem('kp_simbar') === '0'; } catch (e) {}
    if (closed) return;
    var bar = document.createElement('div');
    bar.className = 'sim-bar';
    bar.innerHTML = '<span>Suis ton objectif pour de vrai, gratuitement</span><a href="' + HREF + '">S’inscrire</a><button type="button" aria-label="Fermer">×</button>';
    bar.querySelector('a').addEventListener('click', function () { track('sticky'); });
    bar.querySelector('button').addEventListener('click', function () { bar.remove(); document.body.classList.remove('sim-bar-on'); try { sessionStorage.setItem('kp_simbar', '0'); } catch (e) {} });
    document.body.appendChild(bar);
    var used = false;
    var show = function () {
      if (!bar.isConnected) return;
      var box = document.querySelector('.sim-cta'), r = box && box.getBoundingClientRect();
      var boxVisible = r && r.top < innerHeight && r.bottom > 0;   // pas de doublon quand le bloc est à l'écran
      var cookie = document.getElementById('kp-consent');          // ni par-dessus le bandeau cookies
      var on = (used || scrollY > 500) && !boxVisible && !cookie;
      bar.classList.toggle('on', on); document.body.classList.toggle('sim-bar-on', on);
    };
    document.addEventListener('input', function () { used = true; show(); }, true);
    addEventListener('scroll', show, { passive: true });
    setInterval(show, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
