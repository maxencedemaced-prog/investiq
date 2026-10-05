// glossary.js — lexique de Kapitaro : définitions simples des mots techniques.
// - kpTip('etf') : petit « ? » gris à placer à côté d'un mot ; un appui affiche la définition courte.
// - openGlossary() : bibliothèque complète des mots, avec recherche (Paramètres → Lexique).
// Les anciens « ? » (class="tooltip-icon" data-tip="…") s'ouvrent aussi d'un appui, sur téléphone.
// Chargé avant app.js.
const KP_GLOSSARY = {
  action: { t: 'Action', s: 'Une petite part d’une entreprise.', d: 'Acheter une action, c’est devenir copropriétaire d’une entreprise (Apple, LVMH…). Sa valeur monte ou baisse selon la santé de l’entreprise et le marché. Elle peut verser un dividende.' },
  etf: { t: 'ETF (tracker)', s: 'Un panier de centaines d’actions en un seul achat.', d: 'Un ETF (ou « tracker ») copie un indice comme le MSCI World : en une seule fois, tu investis dans des centaines ou des milliers d’entreprises. C’est simple, diversifié et peu coûteux en frais.' },
  obligation: { t: 'Obligation', s: 'Un prêt à un État ou une entreprise, qui te verse des intérêts.', d: 'Tu prêtes de l’argent à un État ou à une entreprise, qui te rembourse plus tard avec des intérêts. C’est en général moins risqué et moins rentable que les actions. Un ETF obligataire en regroupe beaucoup.' },
  etc: { t: 'ETC', s: 'Un titre adossé à une matière première (or, pétrole…).', d: 'Un ETC suit le prix d’une matière première, par exemple l’or physique, sans que tu doives la stocker toi-même.' },
  indice: { t: 'Indice', s: 'Un groupe d’entreprises qui sert de thermomètre au marché.', d: 'Le CAC 40 (40 grandes entreprises françaises) ou le S&P 500 (500 américaines) sont des indices. On les suit pour savoir si le marché monte ou baisse.' },
  msci: { t: 'MSCI World / All-World', s: 'Un indice d’environ 1 500 à 4 000 entreprises dans le monde.', d: 'Le MSCI World regroupe les grandes entreprises des pays développés ; le FTSE All-World ajoute les pays émergents. Un ETF qui les suit sert souvent de socle à un portefeuille.' },
  socle: { t: 'Socle', s: 'La grosse partie stable du portefeuille, souvent un ETF monde.', d: 'Le socle est le cœur du portefeuille : un placement large et diversifié (ETF monde) qui porte l’essentiel de ton épargne.' },
  satellite: { t: 'Satellite', s: 'Une petite partie pour diversifier autour du socle.', d: 'Les satellites complètent le socle : obligations, pays émergents, petites entreprises… On leur garde une petite part.' },
  repartition: { t: 'Répartition (allocation)', s: 'Comment ton argent est partagé entre actions, ETF, etc.', d: 'Par exemple 30 % d’actions et 70 % d’ETF. Plus il y a d’actions individuelles, plus le portefeuille peut monter, mais aussi baisser.' },
  diversification: { t: 'Diversification', s: 'Ne pas mettre tous ses œufs dans le même panier.', d: 'Répartir son argent sur beaucoup d’entreprises, de secteurs et de pays limite l’impact d’une mauvaise surprise sur une seule ligne.' },
  concentration: { t: 'Concentration', s: 'Une seule ligne qui pèse trop lourd dans le portefeuille.', d: 'Quand une action représente une grosse part du total (plus de 25 % par exemple), sa chute suffit à faire baisser fortement tout le portefeuille.' },
  pru: { t: 'PRU (prix de revient)', s: 'Le prix moyen auquel tu as acheté.', d: 'Si tu achètes 1 action à 100 € puis 1 à 120 €, ton PRU est de 110 €. On le compare au cours actuel pour connaître ta plus ou moins-value.' },
  plusvalue: { t: 'Plus-value', s: 'Ce que tu gagnes si tu revends plus cher que ton prix d’achat.', d: 'C’est la différence entre la valeur actuelle et ce que tu as payé. Tant que tu n’as pas vendu, elle est « latente ». À l’inverse, on parle de moins-value.' },
  dividende: { t: 'Dividende', s: 'Une part des bénéfices versée aux actionnaires.', d: 'Certaines entreprises reversent chaque année une partie de leurs bénéfices. Le rendement du dividende, c’est ce montant comparé au prix de l’action.' },
  volatilite: { t: 'Volatilité', s: 'L’ampleur des variations du prix.', d: 'Plus la volatilité est élevée, plus le prix bouge fort, dans les deux sens. Un ETF monde tourne autour de 12 %, une action seule souvent entre 20 et 40 %.' },
  baissemax: { t: 'Baisse maximale', s: 'La plus forte chute sur la période.', d: 'Par exemple « baisse max 1 an −20 % » : à un moment de l’année, le prix a perdu jusqu’à 20 % depuis son plus haut. Cela donne une idée du risque.' },
  rendement: { t: 'Rendement', s: 'Ce que rapporte un placement, en % par an.', d: 'Kapitaro utilise un rendement supposé pour ses projections (par exemple 7 % par an). Ce n’est pas une promesse : les marchés montent et baissent.' },
  interets: { t: 'Intérêts composés', s: 'Tes gains produisent à leur tour des gains.', d: 'Si tu réinvestis ce que tu gagnes, la somme qui travaille grossit chaque année : l’effet devient très fort sur le long terme.' },
  dca: { t: 'Investissement programmé (DCA)', s: 'Investir la même somme chaque mois, quoi qu’il arrive.', d: 'Investir régulièrement lisse ton prix d’achat : tu achètes plus quand c’est bas, moins quand c’est haut, sans chercher le bon moment.' },
  profil: { t: 'Profil de risque', s: 'Ce que tu acceptes de voir baisser.', d: 'Prudent, équilibré, dynamique ou agressif : plus le profil est élevé, plus la part d’actions est grande, avec plus de potentiel mais plus de secousses.' },
  glide: { t: 'Devenir plus prudent avec le temps', s: 'Moins d’actions à l’approche de l’objectif.', d: 'Plus ta date d’objectif approche, plus Kapitaro réduit la part d’actions au profit de placements plus calmes, pour éviter une grosse chute juste avant d’en avoir besoin.' },
  horizon: { t: 'Horizon de placement', s: 'Dans combien de temps tu auras besoin de cet argent.', d: 'Plus l’horizon est long, plus on peut accepter les variations, car le temps permet de les lisser.' },
  reequilibrage: { t: 'Rééquilibrage', s: 'Revenir à la répartition que tu as choisie.', d: 'Si les actions ont beaucoup monté, elles pèsent plus que prévu. Pour revenir à ta répartition, Kapitaro oriente tes prochains versements vers ce qui est sous-représenté, sans rien vendre.' },
  capitalisation: { t: 'Capitalisation boursière', s: 'La valeur totale d’une entreprise en Bourse.', d: 'Prix de l’action multiplié par le nombre d’actions. Les grandes capitalisations sont en général plus stables que les petites.' },
  per: { t: 'PER', s: 'Combien d’années de bénéfices coûte une action.', d: 'Un PER de 20 signifie que le prix vaut 20 années de bénéfices actuels. Un PER élevé indique que le marché attend beaucoup de l’entreprise.' },
  marge: { t: 'Marge nette', s: 'La part du chiffre d’affaires qui reste en bénéfice.', d: 'Une marge nette de 25 % veut dire que sur 100 € de ventes, l’entreprise garde 25 € de bénéfice.' },
  courtier: { t: 'Courtier', s: 'La plateforme où tu achètes et vends (Trade Republic, Boursorama…).', d: 'C’est lui qui garde tes titres et passe tes ordres. Kapitaro ne garde pas ton argent : il t’aide à suivre et à décider.' },
  pea: { t: 'PEA', s: 'Une enveloppe fiscale française pour les actions européennes.', d: 'Le Plan d’Épargne en Actions permet, après 5 ans, de ne payer que les prélèvements sociaux sur les gains. Il accepte surtout des actions et ETF européens.' },
  cto: { t: 'Compte-titres (CTO)', s: 'Un compte pour acheter toutes sortes de titres, sans avantage fiscal.', d: 'Le compte-titres ordinaire accepte presque tout (actions américaines, ETF du monde entier…), mais les gains sont imposés chaque année où tu vends.' },
  assurancevie: { t: 'Assurance-vie', s: 'Une enveloppe d’épargne avec avantages fiscaux après 8 ans.', d: 'Elle peut contenir un fonds en euros (garanti) et des unités de compte (ETF, fonds…). Elle a aussi des avantages pour la transmission.' },
  crypto: { t: 'Cryptomonnaie', s: 'Une monnaie numérique très volatile (Bitcoin…).', d: 'Les cryptos peuvent varier de plusieurs dizaines de pourcents en peu de temps. Kapitaro te permet seulement d’en suivre le cours, sans analyse ni avis.' },
  matiere: { t: 'Matière première', s: 'Or, argent, pétrole, gaz, cuivre…', d: 'Leur prix dépend de l’offre et de la demande mondiales. L’or sert souvent de petite protection dans un portefeuille.' },
  inflation: { t: 'Inflation', s: 'La hausse générale des prix, qui réduit ton pouvoir d’achat.', d: 'Avec 3 % d’inflation, 100 € aujourd’hui n’achètent plus que l’équivalent de 97 € dans un an. Investir sert aussi à ne pas perdre de pouvoir d’achat.' },
  precaution: { t: 'Épargne de précaution', s: 'L’argent de côté pour les imprévus, toujours disponible.', d: 'Avant d’investir en Bourse, on garde en général 3 à 6 mois de dépenses sur un livret, pour ne jamais devoir vendre au mauvais moment.' },
  liquidite: { t: 'Liquidité', s: 'La facilité à vendre rapidement un placement.', d: 'Un grand ETF se vend en quelques secondes en Bourse ; un bien immobilier peut prendre des mois.' },
};

// Petit « ? » gris à côté d'un mot technique
function kpTip(key) {
  const g = KP_GLOSSARY[key];
  if (!g) return '';
  return '<span class="kp-tip" role="button" tabindex="0" data-k="' + key + '" aria-label="Définition : ' + g.t.replace(/"/g, '&quot;') + '">?</span>';
}

(function () {
  const css = document.createElement('style');
  css.textContent = '.kp-tip{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;margin-left:4px;border-radius:50%;background:#e4e4e7;color:#71717a;font:800 10px/1 system-ui,sans-serif;cursor:pointer;vertical-align:middle;flex-shrink:0;text-transform:none;letter-spacing:0;user-select:none}'
    + '.kp-tip:hover,.kp-tip:focus{background:#d4d4d8;color:#3f3f46;outline:none}'
    + '[data-theme="dark"] .kp-tip{background:rgba(255,255,255,0.14);color:rgba(255,255,255,0.7)}'
    + '#kp-tip-pop{position:fixed;z-index:10070;max-width:min(300px,calc(100vw - 24px));background:#111827;color:#fff;border-radius:12px;padding:11px 13px;font:500 13px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,0.3)}'
    + '#kp-tip-pop b{display:block;font-size:13px;margin-bottom:3px}'
    + '#kp-tip-pop a{color:#4ade80;font-weight:700;text-decoration:none;display:inline-block;margin-top:6px;font-size:12px;cursor:pointer}';
  document.head.appendChild(css);

  function closePop() { const p = document.getElementById('kp-tip-pop'); if (p) p.remove(); }
  function openPop(el, title, text, key) {
    closePop();
    const p = document.createElement('div');
    p.id = 'kp-tip-pop';
    p.innerHTML = (title ? '<b>' + title + '</b>' : '') + text + (key ? '<br><a data-glo="' + key + '">Voir le lexique ›</a>' : '');
    document.body.appendChild(p);
    const r = el.getBoundingClientRect(), pw = p.offsetWidth, ph = p.offsetHeight;
    let left = Math.min(Math.max(12, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 12);
    let top = r.top - ph - 8; if (top < 8) top = r.bottom + 8;
    p.style.left = left + 'px'; p.style.top = top + 'px';
  }
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('#kp-tip-pop a[data-glo]');
    if (a) { e.preventDefault(); const k = a.getAttribute('data-glo'); closePop(); openGlossary(k); return; }
    const t = e.target.closest && e.target.closest('.kp-tip, .tooltip-icon');
    if (t) {
      e.preventDefault(); e.stopPropagation();
      if (document.getElementById('kp-tip-pop') && t.dataset.open === '1') { t.dataset.open = ''; closePop(); return; }
      document.querySelectorAll('.kp-tip,.tooltip-icon').forEach(x => { x.dataset.open = ''; });
      t.dataset.open = '1';
      if (t.classList.contains('kp-tip')) { const g = KP_GLOSSARY[t.dataset.k]; if (g) openPop(t, g.t, g.s, t.dataset.k); }
      else openPop(t, '', t.getAttribute('data-tip') || '', '');
      return;
    }
    if (!(e.target.closest && e.target.closest('#kp-tip-pop'))) closePop();
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('kp-tip')) { e.preventDefault(); e.target.click(); } });
  window.addEventListener('scroll', closePop, true);
})();

// Bibliothèque complète des mots (Paramètres → Lexique)
function openGlossary(focusKey) {
  document.getElementById('kp-glossary')?.remove();
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const surf = dark ? '#0f1629' : '#fff', txt = dark ? '#fff' : '#09090b', sub = dark ? 'rgba(255,255,255,0.65)' : '#52525b', bord = dark ? 'rgba(255,255,255,0.12)' : '#e4e4e7', soft = dark ? 'rgba(255,255,255,0.05)' : '#f4f4f5';
  const keys = Object.keys(KP_GLOSSARY).sort((a, b) => KP_GLOSSARY[a].t.localeCompare(KP_GLOSSARY[b].t, 'fr'));
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const o = document.createElement('div');
  o.id = 'kp-glossary';
  o.style.cssText = 'position:fixed;inset:0;z-index:10065;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:16px';
  o.onclick = e => { if (e.target === o) o.remove(); };
  o.innerHTML = '<div role="dialog" aria-label="Lexique" style="background:' + surf + ';width:100%;max-width:560px;max-height:90vh;border-radius:20px;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.4)">'
    + '<div style="padding:18px 18px 10px;border-bottom:1px solid ' + bord + '"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:19px;font-weight:900;color:' + txt + '">📚 Lexique de l’investissement</div><button type="button" aria-label="Fermer" onclick="document.getElementById(\'kp-glossary\').remove()" style="background:none;border:none;color:' + sub + ';font-size:22px;cursor:pointer;line-height:1">✕</button></div>'
    + '<input id="kp-glo-q" type="search" placeholder="Rechercher un mot (ETF, PRU, volatilité…)" style="width:100%;margin-top:10px;padding:10px 12px;border-radius:11px;border:1px solid ' + bord + ';background:' + soft + ';color:' + txt + ';font:inherit;font-size:14px;box-sizing:border-box"></div>'
    + '<div id="kp-glo-list" style="padding:10px 18px 18px;overflow-y:auto"></div></div>';
  document.body.appendChild(o);
  const list = o.querySelector('#kp-glo-list'), q = o.querySelector('#kp-glo-q');
  const draw = () => {
    const f = norm(q.value.trim());
    const ks = keys.filter(k => !f || norm(KP_GLOSSARY[k].t + ' ' + KP_GLOSSARY[k].s + ' ' + KP_GLOSSARY[k].d).includes(f));
    list.innerHTML = ks.length ? ks.map(k => { const g = KP_GLOSSARY[k]; return '<div id="kp-glo-' + k + '" style="padding:12px;border-radius:12px;margin-bottom:8px;background:' + (k === focusKey ? 'rgba(22,163,74,0.12)' : soft) + '"><div style="font-size:14.5px;font-weight:800;color:' + txt + '">' + g.t + '</div><div style="font-size:13px;color:' + txt + ';margin-top:2px">' + g.s + '</div><div style="font-size:12.5px;color:' + sub + ';margin-top:4px;line-height:1.5">' + g.d + '</div></div>'; }).join('')
      : '<div style="color:' + sub + ';font-size:13px;padding:12px 0">Aucun mot trouvé. Pose ta question à la bulle d’aide en bas à droite.</div>';
  };
  q.oninput = draw;
  draw();
  if (focusKey) setTimeout(() => { const el = document.getElementById('kp-glo-' + focusKey); if (el) el.scrollIntoView({ block: 'center' }); }, 50);
  else setTimeout(() => q.focus(), 50);
}
