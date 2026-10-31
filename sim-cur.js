// sim-cur.js — simulateurs publics français : choix de la devise affichée (€ par défaut, ou CHF pour la Suisse).
// Simple changement de symbole : ces calculs ne dépendent pas de la devise (on saisit et on lit dans la même devise).
// Choix mémorisé dans localStorage (kp_sim_cur_fr). Les textes d'explication de la page restent en euros.
(function () {
  var C = 'EUR';
  try { C = localStorage.getItem('kp_sim_cur_fr') === 'CHF' ? 'CHF' : 'EUR'; } catch (e) {}
  window.kpSimSym = function () { return C === 'CHF' ? 'CHF' : '€'; };
  function apply(recalc) {
    var s = window.kpSimSym();
    document.querySelectorAll('.unit.cur-sym').forEach(function (e) { e.textContent = s; });
    document.querySelectorAll('.presets button[data-label]').forEach(function (b) { b.textContent = b.getAttribute('data-label').replace(/€/g, s); });
    document.querySelectorAll('[data-simcur]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-simcur') === C); });
    if (recalc) { var i = document.querySelector('.sim input[type=number]'); if (i) i.dispatchEvent(new Event('input', { bubbles: true })); }
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.unit').forEach(function (e) { if (e.textContent.trim() === '€') e.classList.add('cur-sym'); });
    document.querySelectorAll('.presets button').forEach(function (b) { if (b.textContent.indexOf('€') >= 0) b.setAttribute('data-label', b.textContent); });
    var pre = document.querySelector('.presets');
    if (!pre || pre.querySelector('.cur-switch')) return;
    var st = document.createElement('style');
    st.textContent = '.cur-switch{display:inline-flex;gap:4px;margin-left:auto}.cur-switch button{border:1px solid var(--border,#e4e4e7);background:transparent;color:inherit;border-radius:8px;padding:3px 9px;font-weight:700;cursor:pointer}.cur-switch button.on{background:var(--green,#16a34a);border-color:var(--green,#16a34a);color:#fff}';
    document.head.appendChild(st);
    pre.style.alignItems = 'center';
    pre.insertAdjacentHTML('beforeend', '<span class="cur-switch" role="group" aria-label="Devise"><button type="button" data-simcur="EUR">€</button><button type="button" data-simcur="CHF">CHF</button></span>');
    pre.querySelectorAll('[data-simcur]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        C = b.getAttribute('data-simcur');
        try { localStorage.setItem('kp_sim_cur_fr', C); } catch (err) {}
        apply(true);
      });
    });
    apply(C !== 'EUR');
  });
})();
