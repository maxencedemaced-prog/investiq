// inapp.js — Ouverture depuis un navigateur intégré (Instagram, Facebook, TikTok…).
// Ces navigateurs ne permettent ni d'installer l'app ni d'activer les notifications. On propose donc d'ouvrir
// Kapitaro dans le vrai navigateur : bouton direct sur Android, instruction claire sur iPhone (Apple l'interdit par bouton).
(function () {
  try {
    var ua = navigator.userAgent || '';
    var inApp = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|Snapchat|Pinterest|TikTok|musical_ly|BytedanceWebview/i.test(ua);
    if (!inApp) return;
    try { if (sessionStorage.getItem('kp_inapp_hide')) return; } catch (e) {}

    var isAndroid = /Android/i.test(ua);
    var isIOS = /iPhone|iPad|iPod/i.test(ua);
    var where = location.pathname + location.search;

    var bar = document.createElement('div');
    bar.id = 'kp-inapp';
    bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:40000;background:#0b1220;color:#fff;border-bottom:1px solid rgba(255,255,255,0.14);padding:12px 14px;font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,0.35)';

    var msg, action;
    if (isAndroid) {
      msg = 'Pour installer l’app et activer les notifications :';
      action = '<button id="kp-inapp-open" style="flex:none;padding:9px 16px;border:none;border-radius:10px;background:#16a34a;color:#fff;font-weight:800;font-size:13px;cursor:pointer;white-space:nowrap">Ouvrir dans Chrome</button>';
    } else if (isIOS) {
      msg = 'Pour installer l’app : touche ⋯ en haut à droite, puis « Ouvrir dans le navigateur ».';
      action = '';
    } else {
      msg = 'Ouvre Kapitaro dans ton navigateur pour installer l’app.';
      action = '';
    }

    bar.innerHTML = '<div style="display:flex;align-items:center;gap:12px;max-width:620px;margin:0 auto">'
      + '<img src="/icons/kapitaro-tile.svg" width="34" height="34" alt="" style="border-radius:9px;flex:none">'
      + '<div style="flex:1;min-width:0">' + msg + '</div>'
      + action
      + '<button id="kp-inapp-x" aria-label="Fermer" style="flex:none;background:none;border:none;color:rgba(255,255,255,0.5);font-size:18px;cursor:pointer;padding:2px 4px">✕</button>'
      + '</div>';

    function show() {
      if (document.getElementById('kp-inapp')) return;
      document.body.appendChild(bar);
      // Ne pas masquer le haut de la page
      var h = bar.offsetHeight;
      document.body.style.scrollPaddingTop = h + 'px';
      var x = document.getElementById('kp-inapp-x');
      if (x) x.onclick = function () { try { sessionStorage.setItem('kp_inapp_hide', '1'); } catch (e) {} bar.remove(); document.body.style.scrollPaddingTop = ''; };
      var open = document.getElementById('kp-inapp-open');
      if (open) open.onclick = function () {
        // Android : ouverture directe dans Chrome via une intention, avec repli sur l'URL normale
        var url = location.host + where;
        var fallback = encodeURIComponent('https://' + url);
        window.location.href = 'intent://' + url + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + fallback + ';end';
      };
    }
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
  } catch (e) {}
})();
