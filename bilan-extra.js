// bilan-extra.js — « Analyse détaillée » du Bilan : indicateurs, capacité d'emprunt, retraite.
// Tout est CALCULÉ à partir des réponses du questionnaire (rien n'est inventé par l'IA) et présenté comme une estimation.
// Dépend d'app.js : bilanData, bilanProject, fmtI.

const BX_DEBT_MAX = 35;   // % : part maximale de revenus consacrée aux mensualités de crédit (référence généralement retenue par les banques)
const bxE = n => Math.round(n).toLocaleString('fr-FR') + ' €';
const bxN = k => parseFloat((bilanData || {})[k]) || 0;
const bxGood = '#3fb950', bxWarn = '#f59e0b', bxBad = '#f87171';
let _bxT = { isDark: false, surf: '#f9fafb', bord: '#e4e4e7', txt: '#09090b', sub: '#71717a' };

function bilanMetrics() {
  const revenu = bxN('revenu'), loyer = bxN('loyer'), credits = bxN('credits'), charges = bxN('charges'), epargne = bxN('epargneMensuelle');
  const livret = bxN('livret'), av = bxN('assurance'), pea = bxN('pea'), bourse = bxN('bourse'), immo = bxN('immo'), autres = bxN('autresActifs');
  const patrimoine = livret + av + pea + bourse + immo + autres;
  const essentiel = loyer + credits + charges;
  return {
    revenu, loyer, credits, charges, epargne, livret, av, pea, bourse, immo, autres, patrimoine, essentiel,
    effort: revenu ? (loyer + credits) / revenu * 100 : null,
    resteAVivre: revenu - loyer - credits - charges,
    tauxEpargne: revenu ? epargne / revenu * 100 : null,
    moisSecurite: essentiel ? livret / essentiel : null,
    manqueSecurite: Math.max(0, essentiel * 3 - livret),
    partLiquide: patrimoine ? livret / patrimoine * 100 : null,
  };
}
// Mensualité maximale → capital empruntable
function bxLoan(m, ratePct, years) {
  const i = ratePct / 100 / 12, n = years * 12;
  if (m <= 0) return 0;
  return i === 0 ? m * n : m * (1 - Math.pow(1 + i, -n)) / i;
}

// Indicateurs de santé : [libellé, valeur, statut(couleur), explication]
function bxIndicators(M) {
  const list = [];
  if (M.effort != null) {
    const c = M.effort <= 33 ? bxGood : M.effort <= 40 ? bxWarn : bxBad;
    list.push(['Poids logement + crédits', M.effort.toFixed(0) + ' %', c,
      M.effort <= 33 ? 'Confortable : il te reste de la marge pour épargner et vivre.' : M.effort <= 40 ? 'Élevé : ton budget est déjà bien absorbé par le logement et les crédits.' : 'Très élevé : peu de marge pour épargner ou absorber un imprévu.']);
  }
  if (M.revenu) {
    const c = M.resteAVivre >= M.revenu * 0.35 ? bxGood : M.resteAVivre > 0 ? bxWarn : bxBad;
    list.push(['Reste à vivre', bxE(M.resteAVivre) + '/mois', c, 'Ce qui reste après loyer, crédits et charges fixes, pour les courses, les sorties et l\'épargne.']);
  }
  if (M.tauxEpargne != null) {
    const c = M.tauxEpargne >= 15 ? bxGood : M.tauxEpargne >= 5 ? bxWarn : bxBad;
    list.push(['Taux d\'épargne', M.tauxEpargne.toFixed(0) + ' %', c,
      M.tauxEpargne >= 15 ? 'Très bon niveau : c\'est ce qui construit un patrimoine.' : M.tauxEpargne >= 5 ? 'Correct. Viser 10 à 15 % accélère nettement le capital.' : 'Faible : même 50 € de plus par mois change la trajectoire sur 10 ans.']);
  }
  if (M.moisSecurite != null) {
    const tm = parseFloat(((bilanData.precisions || {}).securite || {}).mois) || 3;   // objectif choisi par l'utilisateur (3 mois par défaut)
    const c = M.moisSecurite >= tm ? bxGood : M.moisSecurite >= tm / 2 ? bxWarn : bxBad;
    list.push(['Épargne de précaution', M.moisSecurite.toFixed(1) + ' mois', c,
      M.moisSecurite >= tm ? `Ton livret couvre au moins ${tm} mois de charges : bon matelas.` : `Objectif : ${tm} mois de charges, soit ${bxE(M.essentiel * tm)}. Il manque ${bxE(Math.max(0, M.essentiel * tm - M.livret))}.`]);
  }
  return list;
}

function bilanExtraHTML(r, T) {
  _bxT = T || _bxT;
  const { surf, bord, txt, sub } = _bxT;
  const M = bilanMetrics();
  if (!M.revenu && !M.patrimoine) return '';
  const pill = (c, t) => `<span style="font-size:10px;font-weight:800;color:${c};background:${c}20;padding:2px 8px;border-radius:99px;white-space:nowrap">${t}</span>`;
  const ind = bxIndicators(M);
  const card = `background:${surf};border:1px solid ${bord};border-radius:16px;padding:18px;margin-bottom:16px`;
  const inp = `width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid ${bord};border-radius:9px;background:transparent;color:${txt};font:inherit;font-size:13px`;
  const lab = `font-size:10.5px;font-weight:700;color:${sub};text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;display:block`;

  const diag = ind.length ? `
  <div style="${card}">
    <div style="font-size:13px;font-weight:700;color:${txt};margin-bottom:12px">Diagnostic chiffré de ta situation</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
      ${ind.map(i => `<div style="border:1px solid ${bord};border-radius:12px;padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:11px;color:${sub};font-weight:600">${i[0]}</span>${pill(i[2], i[2] === bxGood ? 'OK' : i[2] === bxWarn ? 'À surveiller' : 'À corriger')}</div>
        <div style="font-size:20px;font-weight:900;color:${i[2]};letter-spacing:-0.03em">${i[1]}</div>
        <div style="font-size:11.5px;color:${sub};margin-top:4px;line-height:1.45">${i[3]}</div>
      </div>`).join('')}
    </div>
    ${M.patrimoine ? `<div style="margin-top:14px"><div style="font-size:11px;color:${sub};font-weight:600;margin-bottom:6px">Répartition de ton patrimoine (${bxE(M.patrimoine)})</div>
      <div style="display:flex;height:9px;border-radius:99px;overflow:hidden;background:${bord}">${[['livret', 'Livrets', '#38bdf8'], ['av', 'Assurance vie', '#a78bfa'], ['pea', 'PEA', '#3fb950'], ['bourse', 'Bourse', '#22c55e'], ['immo', 'Immobilier', '#f59e0b'], ['autres', 'Autres', '#94a3b8']].map(k => `<div title="${k[1]}" style="width:${M[k[0]] / M.patrimoine * 100}%;background:${k[2]}"></div>`).join('')}</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:7px;font-size:11px;color:${txt}">${[['livret', 'Livrets', '#38bdf8'], ['av', 'Assurance vie', '#a78bfa'], ['pea', 'PEA', '#3fb950'], ['bourse', 'Bourse', '#22c55e'], ['immo', 'Immobilier', '#f59e0b'], ['autres', 'Autres', '#94a3b8']].filter(k => M[k[0]] > 0).map(k => `<span><span style="color:${k[2]}">●</span> ${k[1]} ${Math.round(M[k[0]] / M.patrimoine * 100)} %</span>`).join('')}</div>
      ${M.partLiquide > 70 ? `<div style="font-size:11.5px;color:${bxWarn};margin-top:8px">Plus de 70 % de ton patrimoine dort sur des livrets : au-delà du matelas de sécurité, cet argent perd du pouvoir d'achat face à l'inflation.</div>` : ''}
    </div>` : ''}
  </div>` : '';

  const loan = M.revenu ? `
  <div style="${card}">
    <div style="font-size:13px;font-weight:700;color:${txt};margin-bottom:2px">Simulateur d'emprunt</div>
    <div style="font-size:11.5px;color:${sub};margin-bottom:12px;line-height:1.5">Ce que tu pourrais emprunter avec les règles habituelles des banques (${BX_DEBT_MAX} % de revenus maximum pour l'ensemble des crédits). Modifie les hypothèses.</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:12px">
      <label><span style="${lab}">Taux du prêt (%)</span><input id="bx-taux" type="number" step="0.1" min="0" max="15" value="3.5" oninput="bxLoanUpdate()" style="${inp}"></label>
      <label><span style="${lab}">Durée (ans)</span><select id="bx-years" onchange="bxLoanUpdate()" style="${inp}">${[10, 15, 20, 25].map(y => `<option value="${y}"${y === 20 ? ' selected' : ''}>${y} ans</option>`).join('')}</select></label>
      <label><span style="${lab}">Apport (€)</span><input id="bx-apport" type="number" step="1000" min="0" value="0" oninput="bxLoanUpdate()" style="${inp}"></label>
      <label><span style="${lab}">Crédits déjà en cours (€/mois)</span><input id="bx-exist" type="number" step="50" min="0" value="${Math.round(M.credits)}" oninput="bxLoanUpdate()" style="${inp}"></label>
      <label><span style="${lab}">Frais de notaire</span><select id="bx-bien" onchange="bxLoanUpdate()" style="${inp}"><option value="ancien">Ancien (7,5 %)</option><option value="neuf">Neuf (2,5 %)</option></select></label>
    </div>
    ${M.livret + M.bourse > 0 ? `<button type="button" onclick="document.getElementById('bx-apport').value=${Math.round(M.livret)};bxLoanUpdate()" style="background:none;border:none;color:${sub};font:inherit;font-size:12px;text-decoration:underline;cursor:pointer;padding:0;margin-bottom:12px">Utiliser mon épargne disponible comme apport (${bxE(M.livret)})</button>` : ''}
    <div id="bx-loan-out"></div>
    <div style="font-size:10.5px;color:${sub};margin-top:10px;line-height:1.5">Le taux est une hypothèse : il change chaque mois et dépend de ton profil, de ta durée et de ton apport. Compare plusieurs banques ou passe par un courtier, et consulte les taux publiés par les observatoires du crédit avant de décider. L'assurance emprunteur et les frais de dossier ne sont pas inclus. Estimation indicative, pas une offre de prêt.</div>
  </div>` : '';

  const age = bxN('age');
  const retire = age ? `
  <div style="${card}">
    <div style="font-size:13px;font-weight:700;color:${txt};margin-bottom:2px">Projection retraite</div>
    <div style="font-size:11.5px;color:${sub};margin-bottom:12px;line-height:1.5">Ce que ton épargne investie pourrait devenir à l'âge où tu veux arrêter de travailler, et le revenu qu'elle pourrait te verser.</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:12px">
      <label><span style="${lab}">Âge de départ</span><input id="bx-age" type="number" step="1" min="${Math.min(70, age + 1)}" max="75" value="${Math.max(age + 1, 64)}" oninput="bxRetireUpdate()" style="${inp}"></label>
      <label><span style="${lab}">Versement (€/mois)</span><input id="bx-vers" type="number" step="50" min="0" value="${Math.round(r.mensualite_recommandee || 0)}" oninput="bxRetireUpdate()" style="${inp}"></label>
      <label><span style="${lab}">Rendement (%/an)</span><input id="bx-rend" type="number" step="0.5" min="0" max="15" value="${r.projection_rate || 6}" oninput="bxRetireUpdate()" style="${inp}"></label>
    </div>
    <div id="bx-retire-out"></div>
    <div style="font-size:10.5px;color:${sub};margin-top:10px;line-height:1.5">Simulation avant frais et impôts, rendement non garanti. La rente théorique retire 4 % du capital par an (règle courante, sans épuiser le capital sur une longue période). Elle s'ajoute à ta pension de retraite légale, qui n'est pas calculée ici.</div>
  </div>` : '';

  return bxChecksHTML(_bxT) + diag + bxRiskHTML(r, _bxT) + bxObjectivesHTML(M, r) + bxPlanHTML(M, r) + bilanDeepHTML(r, _bxT) + loan + retire;
}

function bxLoanCompute() {
  const M = bilanMetrics();
  const v = id => parseFloat(String(document.getElementById(id)?.value || '0').replace(',', '.')) || 0;
  const taux = v('bx-taux'), years = v('bx-years') || 20, apport = v('bx-apport'), exist = v('bx-exist');
  const fees = document.getElementById('bx-bien')?.value === 'neuf' ? 0.025 : 0.075;
  const mmax = Math.max(0, M.revenu * BX_DEBT_MAX / 100 - exist);
  const P = bxLoan(mmax, taux, years);
  return { M, taux, years, apport, exist, fees, mmax, P, budget: P + apport, prix: (P + apport) / (1 + fees), interets: Math.max(0, mmax * years * 12 - P) };
}
function bxLoanUpdate() {
  const out = document.getElementById('bx-loan-out'); if (!out) return;
  const c = bxLoanCompute(), { surf, bord, txt, sub } = _bxT;
  const tile = (l, val, col) => `<div style="flex:1;min-width:120px;border:1px solid ${bord};border-radius:12px;padding:11px;text-align:center"><div style="font-size:10.5px;color:${sub};font-weight:600">${l}</div><div style="font-size:18px;font-weight:900;color:${col || txt};letter-spacing:-0.03em;margin-top:2px">${val}</div></div>`;
  if (c.mmax <= 0) {
    out.innerHTML = `<div style="font-size:12.5px;color:${bxBad};line-height:1.5;padding:10px;border:1px solid ${bxBad}40;border-radius:12px">Avec ${bxE(c.exist)} de crédits en cours pour ${bxE(c.M.revenu)} de revenus, tu dépasses déjà ${BX_DEBT_MAX} % : une banque refuserait sans doute un nouveau prêt. Rembourser un crédit ou augmenter tes revenus rouvre la porte.</div>`;
    return;
  }
  const rows = [-1, -0.5, 0, 0.5, 1].map(d => {
    const t = Math.max(0, c.taux + d), P = bxLoan(c.mmax, t, c.years);
    return `<tr style="${d === 0 ? 'font-weight:800' : ''}"><td style="padding:5px 0">${t.toFixed(1).replace('.', ',')} %${d === 0 ? ' (ton hypothèse)' : ''}</td><td style="text-align:right">${bxE(P)}</td><td style="text-align:right">${bxE((P + c.apport) / (1 + c.fees))}</td></tr>`;
  }).join('');
  const rowsY = [15, 20, 25].map(y => { const P = bxLoan(c.mmax, c.taux, y); return `<tr style="${y === c.years ? 'font-weight:800' : ''}"><td style="padding:5px 0">${y} ans</td><td style="text-align:right">${bxE(P)}</td><td style="text-align:right">${bxE(Math.max(0, c.mmax * y * 12 - P))}</td></tr>`; }).join('');
  out.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      ${tile('Mensualité maximale', bxE(c.mmax) + '/mois')}
      ${tile('Tu peux emprunter', bxE(c.P), bxGood)}
      ${tile('Prix du bien visé', bxE(c.prix), bxGood)}
    </div>
    <div style="font-size:11.5px;color:${sub};margin-bottom:12px;line-height:1.5">Budget total ${bxE(c.budget)} (emprunt + apport), dont environ ${bxE(c.budget - c.prix)} de frais de notaire. Sur ${c.years} ans à ${c.taux.toFixed(1).replace('.', ',')} %, les intérêts coûteraient environ <strong style="color:${txt}">${bxE(c.interets)}</strong>.</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;font-size:12px;color:${txt}"><style>#bx-loan-out td:not(:first-child),#bx-loan-out th:not(:first-child){padding-left:14px;white-space:nowrap}</style>
      <table style="width:100%;border-collapse:collapse"><thead><tr style="color:${sub};font-size:10.5px;text-align:right"><th style="text-align:left;padding-bottom:4px">Si le taux est de…</th><th>Emprunt</th><th>Prix du bien</th></tr></thead><tbody>${rows}</tbody></table>
      <table style="width:100%;border-collapse:collapse"><thead><tr style="color:${sub};font-size:10.5px;text-align:right"><th style="text-align:left;padding-bottom:4px">Selon la durée</th><th>Emprunt</th><th>Intérêts</th></tr></thead><tbody>${rowsY}</tbody></table>
    </div>`;
}
function bxRetireCompute() {
  const r = window._lastBilanResult || {}, age = bxN('age');
  const v = id => parseFloat(String(document.getElementById(id)?.value || '0').replace(',', '.')) || 0;
  const depart = v('bx-age'), vers = v('bx-vers'), rend = v('bx-rend'), years = Math.max(0, depart - age);
  const cap0 = r.projection_capital != null ? r.projection_capital : (bilanMetrics().patrimoine);
  const capital = bilanProject(cap0, vers, rend, years);
  return { age, depart, vers, rend, years, cap0, capital, rente: capital * 0.04 / 12 };
}
function bxRetireUpdate() {
  const out = document.getElementById('bx-retire-out'); if (!out) return;
  const c = bxRetireCompute(), M = bilanMetrics(), { bord, txt, sub } = _bxT;
  if (c.years <= 0) { out.innerHTML = `<div style="font-size:12.5px;color:${sub}">Choisis un âge de départ supérieur à ton âge actuel.</div>`; return; }
  const part = M.revenu ? Math.round(c.rente / M.revenu * 100) : null;
  const tile = (l, val, col) => `<div style="flex:1;min-width:120px;border:1px solid ${bord};border-radius:12px;padding:11px;text-align:center"><div style="font-size:10.5px;color:${sub};font-weight:600">${l}</div><div style="font-size:18px;font-weight:900;color:${col || txt};letter-spacing:-0.03em;margin-top:2px">${val}</div></div>`;
  out.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap">
      ${tile('Dans ' + c.years + ' ans', c.years + ' ans')}
      ${tile('Capital estimé à ' + c.depart + ' ans', bxE(c.capital), bxGood)}
      ${tile('Rente théorique', bxE(c.rente) + '/mois', bxGood)}
    </div>
    ${part != null ? `<div style="font-size:11.5px;color:${sub};margin-top:10px;line-height:1.5">Soit environ ${part} % de ton revenu actuel, en plus de ta pension de retraite.${c.rente < 300 ? ' Augmenter le versement ou partir plus tard fait vite la différence.' : ''}</div>` : ''}`;
}
function bilanExtraInit() { try { bxLoanUpdate(); bxRetireUpdate(); } catch (e) { console.warn('bilanExtra:', e); } }

// ── Section PDF : mêmes calculs, hypothèses par défaut (3,5 %, 20 ans, sans apport) ──
function bilanPdfExtra(doc, y, margin, colW, r) {
  const M = bilanMetrics();
  if (!M.revenu && !M.patrimoine) return y;
  const need = h => { if (y + h > 280) { doc.addPage(); y = 16; } };
  const title = t => { need(14); doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20); doc.text(t, margin, y); y += 6; };
  const line = (t, bold) => { const ls = doc.splitTextToSize(t, colW); need(ls.length * 4.2 + 2); doc.setFontSize(9); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(bold ? 20 : 70, bold ? 20 : 70, bold ? 20 : 70); doc.text(ls, margin, y); y += ls.length * 4.2 + 1.5; };
  const plain = s => String(s).replace(/[  ]/g, ' ').replace(/→/g, '->').replace(/[^\x20-\x7EÀ-ÿ€]/g, '');
  title('Analyse detaillee');
  bxInputChecks().forEach(t => line(plain('A verifier dans tes reponses : ' + t), true));
  bxIndicators(M).forEach(i => line(plain(`${i[0]} : ${i[1]} - ${i[3]}`)));
  y += 3;
  const RP = bilanRiskProfile();
  if (RP) {
    const share = bxEquityShare(r && r.allocation_cible), base = bilanRiskBase();
    title('Profil de risque');
    line(plain(`${RP.label} - part d'actions recommandee : ${RP.min} a ${RP.max} %.${RP.contradiction ? ' Tes reponses ne vont pas dans le meme sens : on retient la plus prudente.' : ''}${RP.capped ? ' Horizon court : niveau de risque limite.' : ''}`));
    if (r && r.allocation_ajustee) line(plain(`Allocation ajustee pour respecter ton profil : ${r.allocation_ajustee.de} % -> ${r.allocation_ajustee.vers} % d'actions.`));
    if (share) line(plain(`Allocation cible : ${Math.round(share)} % d'actions (${share >= RP.min - 2 && share <= RP.max + 2 ? 'dans la fourchette de ton profil' : share > RP.max ? 'AU-DESSUS de ton profil' : 'en dessous de ton profil'}). Si les marches actions baissaient de 30 %, perte estimee : environ ${bxE(base * share / 100 * 0.3)} (${(share * 0.3).toFixed(0)} % de ton patrimoine investi).`));
    y += 3;
  }
  if (M.revenu) {
    const mmax = Math.max(0, M.revenu * BX_DEBT_MAX / 100 - M.credits);
    const P = bxLoan(mmax, 3.5, 20);
    title('Capacite d\'emprunt (hypothese : 3,5 % sur 20 ans, sans apport)');
    if (mmax > 0) {
      line(plain(`Mensualite maximale (${BX_DEBT_MAX} % des revenus, hors credits en cours) : ${bxE(mmax)}/mois`));
      line(plain(`Emprunt possible : environ ${bxE(P)} - budget d'achat environ ${bxE(P / 1.075)} (ancien, frais de notaire inclus).`));
      line(plain(`Interets sur 20 ans : environ ${bxE(Math.max(0, mmax * 240 - P))}. Les taux reels changent chaque mois : compare plusieurs banques.`));
    } else line('Les credits en cours depassent deja le taux d\'endettement maximal habituel : un nouveau pret serait probablement refuse.');
    y += 3;
  }
  const objsPdf = bxObjectiveResults(M, r);
  if (objsPdf.length) {
    title('Tes objectifs, chiffres');
    objsPdf.forEach(o => { line(plain(o.label), true); o.lines.forEach(l => line(plain('- ' + l))); });
    y += 3;
    const plan = bxActionPlan(M, r);
    if (plan.steps.length || plan.rows.length) {
      title('Plan d\'action chiffre');
      plan.steps.forEach(s => line(plain(s.t + ' : ' + s.d)));
      plan.rows.forEach(x => line(plain(`${x.o.label} : il faudrait ${bxE(x.o.monthly)}/mois pour ${bxYrs(x.o.horizon)} - ${x.full ? (x.o.status === 'bad' ? 'epargne financee mais objectif difficile' : 'finance avec ton budget') : x.alloc > 0 ? 'avec ton budget : atteint en ' + bxYrs(x.years) : 'pas de budget disponible'}`)));
      if (plan.rows.length) line(plain(`Total ${bxE(plan.total)}/mois${plan.secMonthly ? ' (matelas inclus)' : ''} pour un budget d'epargne de ${bxE(plan.budget)}/mois${plan.gap > 0 ? ` : il manque ${bxE(plan.gap)}/mois. Concentre-toi sur 2 ou 3 priorites, repousse ou reduis les autres.` : '.'}`), true);
      y += 3;
    }
  }
  const age = bxN('age');
  if (age && r) {
    const depart = Math.max(age + 1, 64), years = depart - age;
    const capital = bilanProject(r.projection_capital || M.patrimoine, r.mensualite_recommandee || 0, r.projection_rate || 6, years);
    title('Projection retraite');
    line(plain(`A ${depart} ans (dans ${years} ans), avec ${bxE(r.mensualite_recommandee || 0)}/mois a ${r.projection_rate || 6} %/an : capital estime ${bxE(capital)}, soit une rente theorique d'environ ${bxE(capital * 0.04 / 12)}/mois (regle des 4 %), en plus de la pension de retraite.`));
    y += 3;
  }
  y = bilanPdfDeep(doc, y, margin, colW, r);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(120, 120, 120);
  const disc = doc.splitTextToSize('Estimations indicatives calculees a partir de tes reponses, avant frais et impots. Elles ne constituent ni un conseil en investissement, ni une offre de credit.', colW);
  need(disc.length * 3.5 + 2); doc.text(disc, margin, y); y += disc.length * 3.5 + 6;
  return y;
}


// ═══════════════════════════════════════════════════════════════
//  PRÉCISIONS PAR OBJECTIF  →  calculs  →  plan d'action chiffré
// ═══════════════════════════════════════════════════════════════
// Questions posées selon les objectifs cochés à l'étape « Objectifs de vie ».
const BX_Q = {
  immo: { title: 'Achat immobilier', icon: 'home', fields: [
    { id: 'type', label: 'Type d\'achat', kind: 'select', opts: [['rp', 'Résidence principale'], ['locatif', 'Investissement locatif'], ['secondaire', 'Résidence secondaire']] },
    { id: 'prix', label: 'Prix du bien visé (€)', kind: 'number', step: 5000, ph: 'Ex: 250 000' },
    { id: 'bien', label: 'Ancien ou neuf', kind: 'select', opts: [['ancien', 'Ancien (~7,5 % de frais)'], ['neuf', 'Neuf (~2,5 % de frais)']] },
    { id: 'apport', label: 'Apport disponible (€)', kind: 'number', step: 1000, ph: 'Ex: 20 000', fill: 'livret' },
    { id: 'delai', label: 'Achat dans combien d\'années ?', kind: 'select', opts: [[1, '1 an'], [2, '2 ans'], [3, '3 ans'], [5, '5 ans'], [8, '8 ans ou plus']], def: 3 },
    { id: 'duree', label: 'Durée du prêt souhaitée', kind: 'select', opts: [[15, '15 ans'], [20, '20 ans'], [25, '25 ans']], def: 20 },
  ] },
  retraite: { title: 'Retraite', icon: 'clock', fields: [
    { id: 'age', label: 'Âge de départ souhaité', kind: 'number', step: 1, min: 55, max: 75, def: 64 },
    { id: 'revenu', label: 'Revenu mensuel souhaité (€ net)', kind: 'number', step: 100, ph: 'Ex: 2 000' },
    { id: 'pension', label: 'Pension estimée (€ net/mois)', kind: 'number', step: 100, ph: 'Ex: 1 200', hint: 'Ton relevé de carrière sur info-retraite.fr donne une estimation.' },
  ] },
  revenus: { title: 'Revenus passifs', icon: 'dollar', fields: [
    { id: 'revenu', label: 'Revenu passif visé (€/mois)', kind: 'number', step: 100, ph: 'Ex: 1 000' },
    { id: 'horizon', label: 'Dans combien d\'années ?', kind: 'select', opts: [[5, '5 ans'], [10, '10 ans'], [15, '15 ans'], [20, '20 ans'], [30, '30 ans']], def: 15 },
  ] },
  capital: { title: 'Faire grossir mon capital', icon: 'up', fields: [
    { id: 'montant', label: 'Capital visé (€)', kind: 'number', step: 5000, ph: 'Ex: 100 000' },
    { id: 'horizon', label: 'Dans combien d\'années ?', kind: 'select', opts: [[5, '5 ans'], [10, '10 ans'], [15, '15 ans'], [20, '20 ans'], [30, '30 ans']], def: 10 },
  ] },
  projet: { title: 'Projet précis', icon: 'flag', fields: [
    { id: 'nature', label: 'Nature du projet', kind: 'select', opts: [['voyage', 'Voyage'], ['etudes', 'Études'], ['entreprise', 'Création d\'entreprise'], ['famille', 'Mariage / naissance'], ['travaux', 'Travaux'], ['autre', 'Autre']] },
    { id: 'montant', label: 'Montant nécessaire (€)', kind: 'number', step: 500, ph: 'Ex: 8 000' },
    { id: 'delai', label: 'Échéance', kind: 'select', opts: [[6, '6 mois'], [12, '1 an'], [24, '2 ans'], [36, '3 ans'], [60, '5 ans']], def: 24 },
  ] },
  securite: { title: 'Sécuriser mon épargne', icon: 'shield', fields: [
    { id: 'mois', label: 'Mois de charges à mettre de côté', kind: 'select', opts: [[3, '3 mois'], [6, '6 mois'], [9, '9 mois'], [12, '12 mois']], def: 6 },
    { id: 'mutuelle', label: 'Complémentaire santé', kind: 'select', opts: [['oui', 'Oui'], ['non', 'Non']], def: 'oui' },
    { id: 'prevoyance', label: 'Prévoyance (décès / invalidité)', kind: 'select', opts: [['oui', 'Oui'], ['non', 'Non'], ['nsp', 'Je ne sais pas']], def: 'nsp' },
  ] },
  credits: { title: 'Tes crédits en cours', icon: 'card', fields: [
    { id: 'duree', label: 'Durée restante (années)', kind: 'number', step: 1, min: 0, max: 40, ph: 'Ex: 12' },
    { id: 'taux', label: 'Taux moyen (%)', kind: 'number', step: 0.1, min: 0, max: 20, ph: 'Ex: 2,5' },
    { id: 'capital', label: 'Capital restant dû (€)', kind: 'number', step: 1000, ph: 'Ex: 60 000' },
  ] },
};
const bxActiveGroups = () => {
  const objs = (bilanData && bilanData.objectifs) || [];
  const g = ['immo', 'retraite', 'revenus', 'capital', 'projet', 'securite'].filter(k => objs.includes(k));
  if (bxN('credits') > 0) g.push('credits');
  return g;
};
const bilanNeedsPrecisions = () => bxActiveGroups().length > 0;

function bilanPrecisionsHTML(T) {
  const { txt, sub, bord, surf } = T;
  const P = (bilanData && bilanData.precisions) || {};
  const inp = `width:100%;box-sizing:border-box;padding:11px 12px;background:${surf};border:1px solid ${bord};border-radius:11px;font-size:14px;color:${txt};font-family:inherit`;
  const lab = `display:block;font-size:11px;font-weight:700;color:${sub};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:5px`;
  return bxActiveGroups().map(g => {
    const q = BX_Q[g], saved = P[g] || {};
    return `<div style="border:1px solid ${bord};border-radius:16px;padding:16px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span style="width:32px;height:32px;border-radius:9px;background:rgba(63,185,80,0.12);color:#3fb950;display:flex;align-items:center;justify-content:center">${bilanIco(q.icon, 17)}</span><span style="font-size:14.5px;font-weight:800;color:${txt}">${q.title}</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px">
        ${q.fields.map(f => {
          const id = `bp-${g}-${f.id}`;
          let val = saved[f.id];
          if (val == null || val === '') val = f.fill ? Math.round(bxN(f.fill)) || '' : (f.def != null ? f.def : '');
          if (f.kind === 'select') return `<label><span style="${lab}">${f.label}</span><select id="${id}" style="${inp}">${f.opts.map(o => `<option value="${o[0]}"${String(o[0]) === String(val) ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></label>`;
          return `<label><span style="${lab}">${f.label}</span><input id="${id}" type="number" ${f.min != null ? `min="${f.min}"` : 'min="0"'} ${f.max != null ? `max="${f.max}"` : ''} step="${f.step || 1}" placeholder="${f.ph || ''}" value="${val}" style="${inp}">${f.hint ? `<span style="display:block;font-size:11px;color:${sub};margin-top:4px;line-height:1.4">${f.hint}</span>` : ''}</label>`;
        }).join('')}
      </div>
    </div>`;
  }).join('') || `<div style="font-size:13px;color:${sub}">Rien à préciser : passe à la suite.</div>`;
}
function bilanPrecisionsCollect() {
  const out = {};
  bxActiveGroups().forEach(g => {
    out[g] = {};
    BX_Q[g].fields.forEach(f => { const v = document.getElementById(`bp-${g}-${f.id}`)?.value; if (v !== undefined && v !== '') out[g][f.id] = v; });
  });
  return out;
}
// Résumé texte envoyé à l'IA (pour qu'elle en tienne compte dans son analyse)
function bilanPrecisionsText() {
  const P = (bilanData && bilanData.precisions) || {};
  const parts = [];
  Object.keys(P).forEach(g => {
    const q = BX_Q[g]; if (!q) return;
    const items = q.fields.filter(f => P[g][f.id] != null).map(f => {
      let v = P[g][f.id];
      if (f.kind === 'select') { const o = f.opts.find(o => String(o[0]) === String(v)); v = o ? o[1] : v; }
      return `${f.label.replace(/\s*\(.*\)$/, '')} : ${v}`;
    });
    if (items.length) parts.push(`- ${q.title} : ${items.join(' ; ')}`);
  });
  return parts.length ? 'PRÉCISIONS SUR LES OBJECTIFS (à intégrer dans l\'analyse et les actions) :\n' + parts.join('\n') : '';
}

// ── Calculs ──
const bxPmt = (P, ratePct, years) => {
  const i = ratePct / 100 / 12, n = years * 12;
  if (P <= 0 || n <= 0) return 0;
  return i === 0 ? P / n : P * i / (1 - Math.pow(1 + i, -n));
};
// Versement mensuel nécessaire pour atteindre `target` dans `years` ans, à partir de `cap0`
function bxSolveMonthly(target, cap0, ratePct, years) {
  const n = Math.round(years * 12); if (n <= 0) return target > cap0 ? Infinity : 0;
  const r = ratePct / 100, grown = cap0 * Math.pow(1 + r, years), need = target - grown;
  if (need <= 0) return 0;
  const i = Math.pow(1 + r, 1 / 12) - 1;
  return i > 0 ? need * i / (Math.pow(1 + i, n) - 1) : need / n;
}
function bxObjectiveResults(M, r) {
  const P = (bilanData && bilanData.precisions) || {}, out = [];
  const rate = (r && r.projection_rate) || 6, cap0 = r && r.projection_capital != null ? r.projection_capital : M.patrimoine;
  const age = bxN('age'), num = (g, k) => parseFloat((P[g] || {})[k]) || 0;
  const objs = (bilanData && bilanData.objectifs) || [];
  const pct = n => n.toFixed(0) + ' %';

  if (objs.includes('immo') && num('immo', 'prix') > 0) {
    const prix = num('immo', 'prix'), fees = P.immo.bien === 'neuf' ? 0.025 : 0.075, apport = num('immo', 'apport');
    const delai = num('immo', 'delai') || 3, duree = num('immo', 'duree') || 20;
    const besoin = prix * (1 + fees), apportReco = prix * (fees + 0.10), emprunt = Math.max(0, besoin - apport);
    const mens = bxPmt(emprunt, 3.5, duree);
    const effort = M.revenu ? (M.credits + mens) / M.revenu * 100 : null;
    const monthly = bxSolveMonthly(apportReco, apport, 2, delai);
    const okAp = apport >= apportReco, okEf = effort != null && effort <= BX_DEBT_MAX;
    out.push({ id: 'immo', label: 'Achat immobilier', icon: 'home', horizon: delai, monthly, target: apportReco, cap0: apport, rate: 2, status: okAp && okEf ? 'ok' : okEf || okAp ? 'warn' : 'bad', lines: [
      `Budget total (prix + frais de notaire) : ${bxE(besoin)}`,
      `Apport recommandé (frais + 10 % du prix) : ${bxE(apportReco)} — tu en as ${bxE(apport)}${okAp ? ' ✓' : ` (il manque ${bxE(apportReco - apport)})`}`,
      `Emprunt nécessaire : ${bxE(emprunt)} → mensualité d'environ ${bxE(mens)} (3,5 % sur ${duree} ans, hypothèse)`,
      effort != null ? `Taux d'endettement après achat : ${pct(effort)} (limite habituelle ${BX_DEBT_MAX} %) — ${okEf ? 'accepté en général' : 'trop élevé : prix, apport ou durée à revoir'}` : '',
      monthly > 0 && isFinite(monthly) ? `Pour réunir l'apport recommandé en ${delai} an${delai > 1 ? 's' : ''} : ${bxE(monthly)}/mois (hypothèse 2 %/an)` : (okAp ? 'Ton apport est déjà suffisant.' : ''),
    ].filter(Boolean) });
  }
  if (objs.includes('retraite') && num('retraite', 'revenu') > 0 && age) {
    const depart = num('retraite', 'age') || 64, years = depart - age, revenu = num('retraite', 'revenu'), pension = num('retraite', 'pension');
    if (years > 0) {
      const gap = Math.max(0, revenu - pension), K = gap * 12 / 0.04, monthly = bxSolveMonthly(K, cap0, rate, years);
      out.push({ id: 'retraite', label: 'Retraite', icon: 'clock', horizon: years, monthly, target: K, cap0, rate, status: gap === 0 ? 'ok' : monthly <= ((r && r.mensualite_recommandee) || 0) ? 'ok' : 'warn', lines: [
        `Revenu souhaité ${bxE(revenu)}/mois, pension estimée ${bxE(pension)}/mois → il manque ${bxE(gap)}/mois`,
        `Capital nécessaire (règle des 4 %) : ${bxE(K)}`,
        gap > 0 ? `Versement nécessaire : ${bxE(monthly)}/mois pendant ${years} ans (rendement ${rate} %/an, avec ton capital actuel)` : 'Ta pension couvre déjà ton objectif.',
      ] });
    }
  }
  if (objs.includes('revenus') && num('revenus', 'revenu') > 0) {
    const revenu = num('revenus', 'revenu'), h = num('revenus', 'horizon') || 15, K = revenu * 12 / 0.04, monthly = bxSolveMonthly(K, cap0, rate, h);
    out.push({ id: 'revenus', label: 'Revenus passifs', icon: 'dollar', horizon: h, monthly, target: K, cap0, rate, status: monthly <= ((r && r.mensualite_recommandee) || 0) ? 'ok' : 'warn', lines: [
      `Pour ${bxE(revenu)}/mois de revenus passifs, il faut un capital d'environ ${bxE(K)} (rendement de 4 %/an)`,
      `Versement nécessaire : ${bxE(monthly)}/mois pendant ${h} ans (rendement ${rate} %/an)`,
    ] });
  }
  if (objs.includes('capital') && num('capital', 'montant') > 0) {
    const K = num('capital', 'montant'), h = num('capital', 'horizon') || 10, monthly = bxSolveMonthly(K, cap0, rate, h);
    out.push({ id: 'capital', label: 'Capital visé', icon: 'up', horizon: h, monthly, target: K, cap0, rate, status: monthly <= ((r && r.mensualite_recommandee) || 0) ? 'ok' : 'warn', lines: [
      `Pour atteindre ${bxE(K)} en ${h} ans : ${bxE(monthly)}/mois (rendement ${rate} %/an, avec ton capital actuel)`,
    ] });
  }
  if (objs.includes('projet') && num('projet', 'montant') > 0) {
    const K = num('projet', 'montant'), mois = num('projet', 'delai') || 24, rateP = mois <= 36 ? 0 : 2, monthly = bxSolveMonthly(K, 0, rateP, mois / 12);
    out.push({ id: 'projet', label: 'Projet précis', icon: 'flag', horizon: mois / 12, monthly, target: K, cap0: 0, rate: rateP, status: monthly <= ((r && r.mensualite_recommandee) || 0) ? 'ok' : 'warn', lines: [
      `Pour ${bxE(K)} dans ${mois >= 12 ? (mois / 12) + ' an' + (mois > 12 ? 's' : '') : mois + ' mois'} : ${bxE(monthly)}/mois`,
      mois <= 36 ? 'Horizon court : garde cet argent sur un support sans risque de perte (livret), pas en bourse.' : 'Horizon moyen : un support prudent reste préférable à la bourse pour ce projet.',
    ] });
  }
  if (objs.includes('securite')) {
    const mois = num('securite', 'mois') || 6, cible = mois * M.essentiel, gap = Math.max(0, cible - M.livret), monthly = gap / 12;
    const alerts = [];
    if (P.securite && P.securite.mutuelle === 'non') alerts.push('Pas de complémentaire santé : un poste de dépense imprévu important, à revoir.');
    if (P.securite && P.securite.prevoyance === 'non') alerts.push('Pas de prévoyance : en cas d\'invalidité ou de décès, ton budget (et celui de ta famille) n\'est pas protégé.');
    if (P.securite && P.securite.prevoyance === 'nsp') alerts.push('Vérifie si tu as une prévoyance (souvent via l\'employeur) : décès et invalidité sont les gros risques oubliés.');
    out.push({ id: 'securite', label: 'Sécuriser mon épargne', icon: 'shield', horizon: 1, monthly, target: cible, cap0: M.livret, rate: 0, status: gap === 0 ? 'ok' : 'warn', lines: [
      `Matelas visé : ${mois} mois de charges = ${bxE(cible)} — tu as ${bxE(M.livret)} sur livrets${gap > 0 ? ` (il manque ${bxE(gap)})` : ' ✓'}`,
      gap > 0 ? `Pour l'atteindre en 12 mois : ${bxE(monthly)}/mois` : '',
    ].filter(Boolean).concat(alerts) });
  }
  const C = P.credits;
  if (C && (parseFloat(C.duree) || parseFloat(C.capital))) {
    const duree = parseFloat(C.duree) || 0, taux = parseFloat(C.taux) || 0, capital = parseFloat(C.capital) || 0;
    const lines = [];
    if (duree > 0 && M.credits > 0) lines.push(`Fin de tes crédits dans ${duree} an${duree > 1 ? 's' : ''} : tu libères ${bxE(M.credits)}/mois (${bxE(M.credits * 12)}/an) pour épargner ou emprunter.`);
    if (taux > 0 && capital > 0) lines.push(taux > rate ? `Ton crédit à ${String(taux).replace('.', ',')} % coûte plus que ce que l'épargne investie rapporte en moyenne (${rate} %) : rembourser par anticipation est un rendement garanti.` : `Ton crédit à ${String(taux).replace('.', ',')} % coûte moins que le rendement visé (${rate} %) : garder le crédit et investir est cohérent (rendement non garanti).`);
    if (lines.length) out.push({ id: 'credits', label: 'Tes crédits en cours', icon: 'card', horizon: null, monthly: null, status: 'ok', lines });
  }
  return out;
}

// Plan d'action chiffré : matelas → objectifs par échéance → reste vers la stratégie long terme
// Nombre d'années pour atteindre `target` avec un versement mensuel donné (Infinity au-delà de 60 ans)
function bxYearsToReach(target, cap0, ratePct, monthly) {
  if (cap0 >= target) return 0;
  if (monthly <= 0) return Infinity;
  const i = Math.pow(1 + ratePct / 100, 1 / 12) - 1;
  for (let n = 1; n <= 720; n++) {
    const fv = cap0 * Math.pow(1 + ratePct / 100, n / 12) + (i > 0 ? monthly * (Math.pow(1 + i, n) - 1) / i : monthly * n);
    if (fv >= target) return n / 12;
  }
  return Infinity;
}
const bxYrs = y => !isFinite(y) ? 'plus de 60 ans' : y < 1 ? Math.max(1, Math.round(y * 12)) + ' mois' : (Math.round(y * 10) / 10 + '').replace('.', ',') + ' an' + (y >= 1.5 ? 's' : '');
function bxActionPlan(M, r) {
  const allObj = bxObjectiveResults(M, r);
  const res = allObj.filter(o => o.monthly != null && isFinite(o.monthly) && o.id !== 'securite');
  const budget = (r && r.mensualite_recommandee) || 0, steps = [];
  const sec = allObj.find(o => o.id === 'securite');
  const gap3 = M.essentiel ? M.manqueSecurite : 0;
  const needSecurite = sec ? Math.max(0, (parseFloat(((bilanData.precisions || {}).securite || {}).mois) || 6) * M.essentiel - M.livret) : gap3;
  const alloc = Math.max(50, Math.min(budget || 200, M.epargne || budget || 200));
  if (needSecurite > 0) steps.push({ t: 'Sécuriser ton matelas', d: `Il te manque ${bxE(needSecurite)} sur tes livrets. Pour le combler en 12 mois, mets ${bxE(needSecurite / 12)}/mois de côté (c'est ce que retient le tableau ci-dessous) ; à ton rythme d'épargne actuel de ${bxE(alloc)}/mois, ce serait fait en ${Math.ceil(needSecurite / alloc)} mois. Tant que ce n'est pas fait, ne prends pas de risque avec le reste.` });
  const sorted = res.slice().sort((a, b) => (a.horizon || 99) - (b.horizon || 99));
  const secMonthly = sec && sec.monthly > 0 ? sec.monthly : 0;
  const total = sorted.reduce((t, o) => t + o.monthly, 0) + secMonthly;
  // Ce que le budget permet réellement : matelas d'abord, puis les objectifs du plus proche au plus lointain
  // 1) on finance en entier tout ce que le budget permet de tenir (du plus proche au plus lointain),
  // 2) puis le reliquat va sur le premier objectif qui n'a pas pu être financé en entier.
  let remaining = Math.max(0, budget - Math.min(secMonthly, budget));
  const given = new Map();
  sorted.forEach(o => { if (o.monthly <= remaining + 0.5) { given.set(o, o.monthly); remaining -= o.monthly; } });
  // le reliquat va à l'objectif le PLUS PROCHE d'être financé (et non au premier de la liste : un objectif à 985 €/mois ne sera jamais sauvé par 11 €)
  sorted.filter(o => !given.has(o)).sort((a, b) => (a.monthly - remaining) - (b.monthly - remaining))
    .forEach(o => { if (remaining > 0) { const a = Math.min(o.monthly, remaining); given.set(o, a); remaining -= a; } });
  const rows = sorted.map(o => {
    const a = given.get(o) || 0, full = a >= o.monthly - 0.5;
    return { o, alloc: a, full, years: full ? o.horizon : bxYearsToReach(o.target, o.cap0, o.rate, a) };
  });
  return { steps, sorted, rows, secMonthly, total, budget, gap: Math.max(0, total - budget), needSecurite, alloc };
}

// ── Affichage ──
function bxObjectivesHTML(M, r) {
  const { surf, bord, txt, sub } = _bxT;
  const res = bxObjectiveResults(M, r);
  if (!res.length) return '';
  const col = s => s === 'ok' ? bxGood : s === 'warn' ? bxWarn : bxBad, lbl = s => s === 'ok' ? 'Réalisable' : s === 'warn' ? 'À ajuster' : 'Difficile';
  return `<div style="background:${surf};border:1px solid ${bord};border-radius:16px;padding:18px;margin-bottom:16px">
    <div style="font-size:13px;font-weight:700;color:${txt};margin-bottom:12px">Tes objectifs, chiffrés</div>
    ${res.map(o => `<div style="border:1px solid ${bord};border-radius:12px;padding:13px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="width:30px;height:30px;border-radius:8px;background:${col(o.status)}22;color:${col(o.status)};display:flex;align-items:center;justify-content:center">${bilanIco(o.icon, 16)}</span>
        <span style="font-size:14px;font-weight:800;color:${txt};flex:1">${o.label}</span>
        <span style="font-size:10px;font-weight:800;color:${col(o.status)};background:${col(o.status)}20;padding:2px 9px;border-radius:99px">${lbl(o.status)}</span>
      </div>
      ${o.lines.map(l => `<div style="font-size:12.5px;color:${txt};line-height:1.55;margin-bottom:3px">${l}</div>`).join('')}
    </div>`).join('')}
    <div style="font-size:10.5px;color:${sub};line-height:1.5">Chaque objectif est calculé séparément, avec ton capital actuel et le rendement estimé du bilan. Estimations indicatives, avant frais et impôts.</div>
  </div>`;
}
function bxPlanHTML(M, r) {
  const { surf, bord, txt, sub } = _bxT;
  const p = bxActionPlan(M, r);
  if (!p.steps.length && !p.sorted.length) return '';
  const num = (i, t, d) => `<div style="display:flex;gap:12px;margin-bottom:12px"><span style="width:26px;height:26px;border-radius:50%;background:${bxGood};color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i}</span><div style="min-width:0;flex:1"><div style="font-size:13.5px;font-weight:800;color:${txt}">${t}</div><div style="font-size:12.5px;color:${sub};line-height:1.55;margin-top:2px">${d}</div></div></div>`;
  const when = h => h == null ? '' : bxYrs(h);
  let i = 1, html = '';
  p.steps.forEach(s => { html += num(i++, s.t, s.d); });
  if (p.rows.length) {
    const cell = x => x.full ? (x.o.status === 'bad' ? `<span style="color:${bxWarn};font-weight:700">Épargne financée</span> <span style="color:${sub}">mais objectif difficile (voir plus haut)</span>` : `<span style="color:${bxGood};font-weight:700">Financé</span>`) : x.alloc > 0 ? `<span style="color:${bxWarn};font-weight:700">Atteint en ${bxYrs(x.years)}</span> <span style="color:${sub}">au lieu de ${when(x.o.horizon)}</span>` : `<span style="color:${bxBad};font-weight:700">Pas de budget</span>`;
    html += num(i++, 'Répartir ton budget entre tes objectifs', `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:12px;color:${txt};min-width:440px"><thead><tr style="color:${sub};font-size:10.5px;text-align:left"><th style="padding-bottom:4px">Objectif</th><th style="text-align:right">Échéance visée</th><th style="text-align:right">Il faudrait</th><th style="text-align:right">Avec ton budget</th></tr></thead><tbody>${p.rows.map(x => `<tr style="border-top:1px solid ${bord}"><td style="padding:7px 0">${x.o.label}</td><td style="text-align:right">${when(x.o.horizon)}</td><td style="text-align:right;font-weight:700">${bxE(x.o.monthly)}/mois</td><td style="text-align:right">${cell(x)}</td></tr>`).join('')}<tr style="border-top:2px solid ${bord};font-weight:800"><td style="padding:7px 0">Total${p.secMonthly ? ' (matelas inclus)' : ''}</td><td></td><td style="text-align:right">${bxE(p.total)}/mois</td><td style="text-align:right;color:${sub};font-weight:600">budget ${bxE(p.budget)}/mois</td></tr></tbody></table></div>`);
    const first = p.rows.filter(x => x.full).map(x => x.o.label.toLowerCase());
    const late = p.rows.filter(x => !x.full);
    html += num(i++, p.gap > 0 ? 'Ajuster : tes objectifs dépassent ton budget' : 'Ton budget suffit',
      p.gap > 0
        ? `Il te faudrait ${bxE(p.total)}/mois pour tout tenir à la date visée, pour un budget d'épargne recommandé de ${bxE(p.budget)}/mois (il manque ${bxE(p.gap)}/mois). ${first.length ? `Avec ton budget, ${first.join(', ')} ${first.length > 1 ? 'sont financés' : 'est financé'} dans les temps.` : 'Aucun objectif n\'est financé à la date visée avec ce budget.'} ${late.length ? `Pour les autres, choisis : repousser l'échéance (voir « Atteint en… »), réduire le montant visé, ou augmenter ton épargne — l'analyse de tes dépenses peut libérer de la marge. Concentre-toi sur 2 ou 3 priorités plutôt que de tout financer à moitié.` : ''}`
        : `Il te faut ${bxE(p.total)}/mois pour un budget de ${bxE(p.budget)}/mois : ${bxE(p.budget - p.total)}/mois restent pour ta stratégie long terme.`);
  }
  return `<div style="background:${surf};border:1px solid ${bord};border-radius:16px;padding:18px;margin-bottom:16px">
    <div style="font-size:13px;font-weight:700;color:${txt};margin-bottom:14px">Ton plan d'action chiffré</div>${html}
    <div style="font-size:10.5px;color:${sub};line-height:1.5">Le budget est la mensualité recommandée du bilan. Le matelas de sécurité est financé en premier, puis les objectifs que ton budget permet de tenir entièrement (du plus proche au plus lointain), et le reliquat va sur le suivant. C'est une répartition par défaut : à toi de choisir tes priorités.</div>
  </div>`;
}


// ═══════════════════════════════════════════════════════════════
//  APPROFONDISSEMENT PAR L'IA (2e appel) : objectif par objectif, plan 90 jours, enveloppes, risques
// ═══════════════════════════════════════════════════════════════
function bilanDeepPrompt(part) {
  const M = bilanMetrics(), d = bilanData || {};
  const objs = (d.objectifs || []).map(o => (BX_Q[o] || {}).title).filter(Boolean);
  const e = n => Math.round(n) + ' €';
  return `Tu es le copilote financier IA de Kapitaro. Tu écris la partie APPROFONDIE d'un bilan patrimonial : elle doit être explicite, concrète et complète, pas générique.
TON : tutoiement, chaleureux et direct, comme un ami compétent en finance. Commence par le positif, jamais alarmiste. Tu ne fournis pas de conseil réglementé.
RÈGLES STRICTES :
- N'invente AUCUN chiffre : utilise uniquement ceux fournis ci-dessous. Ne calcule pas de mensualités ni de projections (elles sont calculées ailleurs dans le rapport).
- Ne cite AUCUN taux, plafond ni règle fiscale chiffrée (ils changent) : dis plutôt « vérifie les plafonds et les taux en vigueur ».
- Chaque conseil doit être actionnable et adapté à CE profil (pas de généralités).

PROFIL :
- ${d.age || '?'} ans, ${d.famille || '?'}, ${d.enfants || 0} enfant(s), statut ${d.statut || '?'}
- Revenu net ${e(M.revenu)}/mois ; loyer/remboursement ${e(M.loyer)} ; autres crédits ${e(M.credits)} ; charges fixes ${e(M.charges)} ; épargne actuelle ${e(M.epargne)}/mois
- Patrimoine : livrets ${e(M.livret)}, assurance vie ${e(M.av)}, PEA ${e(M.pea)}, bourse/CTO ${e(M.bourse)}, immobilier ${e(M.immo)}, autres ${e(M.autres)} (total ${e(M.patrimoine)})
- Expérience : ${d.experience || '?'} ; réaction à une baisse de 20 % : ${d.reaction || '?'} ; perte maximale acceptée : ${d.perteMax || '?'} % ; horizon : ${d.horizon || '?'}
- Objectifs : ${objs.length ? objs.join(', ') : 'non précisés'}
${bilanPrecisionsText()}
${bilanRiskText()}
${bilanFactsText()}
${d.commentaires ? 'NOTES : ' + d.commentaires : ''}

${part === 2 ? `Réponds UNIQUEMENT avec ce JSON :
{
  "plan_90_jours": [ {"periode": "Semaine 1", "action": "action précise (1 phrase)", "pourquoi": "pourquoi maintenant (1 phrase)"} ],
  "enveloppes": [ {"enveloppe": "ex. Livret A / LDDS, PEA, assurance vie, PER", "role": "à quoi elle sert pour CE profil (1 phrase)", "conseil": "comment l'utiliser (1 phrase)"} ],
  "questions": ["question à te poser ou à poser à un conseiller (1 phrase)"]
}
Contraintes : plan_90_jours = 6 étapes ; enveloppes = 4 ; questions = 3. Phrases courtes.` : `Réponds UNIQUEMENT avec ce JSON :
{
  "analyse_objectifs": [ {"objectif": "nom exact d'un objectif ci-dessus", "verdict": "réaliste | ambitieux | à revoir", "analyse": "3 à 4 phrases : est-ce cohérent avec le revenu, le patrimoine et les précisions ? quels arbitrages ?", "conseils": ["conseil concret 1", "conseil concret 2", "conseil concret 3"]} ],
  "risques": [ {"risque": "risque réel de CE profil", "comment_reduire": "action concrète (1 phrase)"} ],
  "erreurs_a_eviter": ["erreur fréquente adaptée à ce profil (1 phrase)"]
}
Contraintes : un élément d'analyse_objectifs par objectif (max 6, tableau vide si aucun objectif) ; risques = 4 ; erreurs_a_eviter = 4. Phrases courtes.`}
FORMAT : n'utilise JAMAIS de guillemets doubles à l'intérieur des textes (utilise « » ou des apostrophes) et pas de retour à la ligne dans les textes.`;
}
function bilanDeepHTML(r, T) {
  const { surf, bord, txt, sub } = T || _bxT;
  const D = r && r.deep;
  const card = `background:${surf};border:1px solid ${bord};border-radius:16px;padding:18px;margin-bottom:16px`;
  const h = t => `<div style="font-size:13px;font-weight:700;color:${txt};margin-bottom:12px">${t}</div>`;
  const x = s => _escHtml(s == null ? '' : s);
  // Bandeau « certaines parties n'ont pas pu être générées » + relance des seules parties manquantes
  const failedBanner = r && r._deepFailed ? `<div id="bilan-deep-retry" style="${card};display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div style="font-size:12.5px;color:${txt};line-height:1.5;flex:1;min-width:200px"><strong>${D ? 'Une partie de l\'analyse approfondie n\'a pas pu être générée' : 'L\'analyse approfondie n\'a pas pu être générée'}</strong> (analyse par objectif, risques, plan des 90 jours, enveloppes). Le reste du bilan est complet.</div>
      <button onclick="bilanRetryDeep()" style="background:#16a34a;color:#fff;border:none;border-radius:9px;padding:9px 14px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer">Relancer cette partie</button></div>` : '';
  if (!D) return failedBanner;
  const vcol = v => /r[ée]aliste/i.test(v) ? bxGood : /ambitieux/i.test(v) ? bxWarn : bxBad;
  const objs = (D.analyse_objectifs || []).length ? `<div style="${card}">${h('Analyse de tes objectifs')}
    ${D.analyse_objectifs.map(o => `<div style="border:1px solid ${bord};border-radius:12px;padding:13px;margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px"><span style="font-size:14px;font-weight:800;color:${txt}">${x(o.objectif)}</span><span style="font-size:10px;font-weight:800;color:${vcol(o.verdict)};background:${vcol(o.verdict)}20;padding:2px 9px;border-radius:99px;white-space:nowrap">${x(o.verdict)}</span></div>
      <div style="font-size:12.5px;color:${txt};line-height:1.6;margin-bottom:8px">${x(o.analyse)}</div>
      ${(o.conseils || []).map(c => `<div style="display:flex;gap:8px;font-size:12.5px;color:${sub};line-height:1.55;margin-bottom:3px"><span style="color:${bxGood};flex-shrink:0">●</span><span>${x(c)}</span></div>`).join('')}
    </div>`).join('')}</div>` : '';
  const plan = (D.plan_90_jours || []).length ? `<div style="${card}">${h('Ton plan des 90 prochains jours')}
    ${D.plan_90_jours.map((s, i) => `<div style="display:flex;gap:12px;margin-bottom:12px"><span style="width:26px;height:26px;border-radius:50%;background:${bxGood};color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i + 1}</span>
      <div style="min-width:0"><div style="font-size:11px;font-weight:700;color:${bxGood};text-transform:uppercase;letter-spacing:.05em">${x(s.periode)}</div><div style="font-size:13.5px;font-weight:800;color:${txt};margin-top:1px">${x(s.action)}</div><div style="font-size:12px;color:${sub};line-height:1.5;margin-top:2px">${x(s.pourquoi)}</div></div></div>`).join('')}</div>` : '';
  const env = (D.enveloppes || []).length ? `<div style="${card}">${h('Quelles enveloppes utiliser')}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px">${D.enveloppes.map(v => `<div style="border:1px solid ${bord};border-radius:12px;padding:12px"><div style="font-size:13px;font-weight:800;color:${txt};margin-bottom:4px">${x(v.enveloppe)}</div><div style="font-size:12px;color:${sub};line-height:1.5;margin-bottom:6px">${x(v.role)}</div><div style="font-size:12px;color:${txt};line-height:1.5">${x(v.conseil)}</div></div>`).join('')}</div>
    <div style="font-size:10.5px;color:${sub};margin-top:10px;line-height:1.5">Vérifie les plafonds, les taux et la fiscalité en vigueur avant toute décision : ils changent régulièrement.</div></div>` : '';
  const risks = ((D.risques || []).length || (D.erreurs_a_eviter || []).length) ? `<div style="${card}">${h('Risques et erreurs à éviter')}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">
      <div>${(D.risques || []).map(k => `<div style="border-left:3px solid ${bxWarn};padding:2px 0 2px 10px;margin-bottom:10px"><div style="font-size:12.5px;font-weight:800;color:${txt}">${x(k.risque)}</div><div style="font-size:12px;color:${sub};line-height:1.5;margin-top:2px">${x(k.comment_reduire)}</div></div>`).join('')}</div>
      <div>${(D.erreurs_a_eviter || []).map(k => `<div style="display:flex;gap:8px;font-size:12.5px;color:${txt};line-height:1.55;margin-bottom:7px"><span style="color:${bxBad};flex-shrink:0">✕</span><span>${x(k)}</span></div>`).join('')}</div>
    </div></div>` : '';
  const qs = (D.questions || []).length ? `<div style="${card}">${h('Les questions à te poser (ou à poser à un conseiller)')}
    ${D.questions.map(k => `<div style="display:flex;gap:8px;font-size:12.5px;color:${txt};line-height:1.55;margin-bottom:6px"><span style="color:${bxGood};flex-shrink:0">?</span><span>${x(k)}</span></div>`).join('')}</div>` : '';
  return failedBanner + objs + plan + env + risks + qs;
}

// Section PDF de l'approfondissement IA
function bilanPdfDeep(doc, y, margin, colW, r) {
  const D = r && r.deep; if (!D) return y;
  const plain = s => String(s == null ? '' : s).replace(/[  ]/g, ' ').replace(/[’‘]/g, "'").replace(/[«»“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/œ/g, 'oe').replace(/Œ/g, 'Oe').replace(/→/g, '->').replace(/[^\x20-\x7EÀ-ÿ€]/g, '');
  const need = h => { if (y + h > 280) { doc.addPage(); y = 16; } };
  const title = t => { need(14); y += 2; doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20); doc.text(plain(t), margin, y); y += 6; };
  const line = (t, bold) => { const ls = doc.splitTextToSize(plain(t), colW); need(ls.length * 4.2 + 2); doc.setFontSize(9); doc.setFont('helvetica', bold ? 'bold' : 'normal'); const c = bold ? 20 : 70; doc.setTextColor(c, c, c); doc.text(ls, margin, y); y += ls.length * 4.2 + 1.5; };
  if ((D.analyse_objectifs || []).length) {
    title('Analyse de tes objectifs');
    D.analyse_objectifs.forEach(o => { line(`${o.objectif} (${o.verdict})`, true); line(o.analyse); (o.conseils || []).forEach(c => line('- ' + c)); y += 2; });
  }
  if ((D.plan_90_jours || []).length) {
    title('Ton plan des 90 prochains jours');
    D.plan_90_jours.forEach(s => { line(`${s.periode} : ${s.action}`, true); line(s.pourquoi); });
    y += 2;
  }
  if ((D.enveloppes || []).length) {
    title('Quelles enveloppes utiliser');
    D.enveloppes.forEach(v => { line(v.enveloppe, true); line(`${v.role} ${v.conseil}`); });
    line('Verifie les plafonds, les taux et la fiscalite en vigueur avant toute decision.');
    y += 2;
  }
  if ((D.risques || []).length || (D.erreurs_a_eviter || []).length) {
    title('Risques et erreurs a eviter');
    (D.risques || []).forEach(k => line(`${k.risque} - ${k.comment_reduire}`));
    (D.erreurs_a_eviter || []).forEach(k => line('A eviter : ' + k));
    y += 2;
  }
  if ((D.questions || []).length) { title('Questions a te poser'); D.questions.forEach(k => line('- ' + k)); y += 2; }
  return y;
}

// ═══════════════════════════════════════════════════════════════
//  PROFIL DE RISQUE : calculé à partir des réponses de l'étape « Tolérance au risque »
//  → fourchette de part d'actions, contrôle de l'allocation proposée, simulation de baisse
// ═══════════════════════════════════════════════════════════════
const BX_REACTION = { vendre_tout: 0, vendre_partiel: 1, attendre: 2, tenir: 3, renforcer: 4 };
const BX_REACTION_TXT = { vendre_tout: 'tu vendrais tout', vendre_partiel: 'tu vendrais une partie', attendre: 'tu attendrais sans rien faire', tenir: 'tu resterais investi', renforcer: 'tu en profiterais pour renforcer' };
const BX_LOSS = { '5': 0, '10': 1, '20': 2, '30': 3, '50': 4 };
const BX_LEVELS = [
  { label: 'Très prudent', min: 0, max: 20 }, { label: 'Prudent', min: 20, max: 35 }, { label: 'Équilibré', min: 40, max: 60 },
  { label: 'Dynamique', min: 60, max: 80 }, { label: 'Offensif', min: 80, max: 100 },
];
const BX_HORIZON_TXT = { court: 'moins de 3 ans', moyen: '3 à 7 ans', long: '7 à 15 ans', 'tres-long': '15 ans et plus' };
// Montant sur lequel on raisonne : patrimoine investi (bourse, PEA, assurance vie), à défaut les positions suivies, à défaut un exemple
function bilanRiskBase() {
  const M = bilanMetrics(), inv = M.bourse + M.pea + M.av;
  if (inv > 0) return inv;
  const pv = typeof positions !== 'undefined' ? positions.reduce((a, p) => a + p.qty * p.price, 0) : 0;
  return pv > 0 ? pv : 10000;
}
function bilanRiskProfile() {
  const d = bilanData || {};
  const a = BX_REACTION[d.reaction], b = BX_LOSS[String(d.perteMax)];
  const known = [a, b].filter(x => x != null);
  if (!known.length) return null;
  let level = Math.min(...known);                                   // on retient la réponse la plus prudente
  const contradiction = a != null && b != null && Math.abs(a - b) >= 2;
  const cap = d.horizon === 'court' ? 1 : d.horizon === 'moyen' ? 2 : d.horizon === 'long' ? 3 : 4;   // horizon court = pas de risque élevé
  const capped = level > cap; level = Math.min(level, cap);
  return { level, ...BX_LEVELS[level], a, b, contradiction, capped, horizon: d.horizon };
}
// Part « actions » d'une allocation cible (ETF monde et actions comptent ; obligations, livrets, monétaire, immobilier non)
function bxEquityShare(alloc) {
  return (alloc || []).reduce((t, x) => t + (/oblig|livret|mon[ée]taire|cash|fonds euro|\bor\b|immo|scpi/i.test(String(x.type || '')) ? 0 : (Number(x.pct) || 0)), 0);
}
function bilanRiskText() {
  const P = bilanRiskProfile(); if (!P) return '';
  return `PROFIL DE RISQUE CALCULÉ : ${P.label} — part d'actions recommandée ${P.min} à ${P.max} %. Ton allocation_cible DOIT respecter cette fourchette (les ETF actions et les actions comptent comme « actions »).`;
}
function bxRiskHTML(r, T) {
  const { surf, bord, txt, sub } = T || _bxT;
  const P = bilanRiskProfile(); if (!P) return '';
  const d = bilanData || {}, share = bxEquityShare(r && r.allocation_cible), base = bilanRiskBase();
  const col = P.level <= 1 ? '#38bdf8' : P.level === 2 ? bxGood : P.level === 3 ? bxWarn : bxBad;
  const inRange = share >= P.min - 2 && share <= P.max + 2;
  const loss30 = base * share / 100 * 0.30, lossPct = share * 0.30;
  const limit = parseFloat(d.perteMax) || null;
  const why = [];
  if (P.a != null) why.push(`Face à une baisse de 20 % en 1 mois, ${BX_REACTION_TXT[d.reaction]}.`);
  if (P.b != null) why.push(`Tu acceptes une perte maximale de ${d.perteMax} %${d.perteMax === '50' ? ' ou plus' : ''}.`);
  if (P.horizon) why.push(`Ton horizon : ${BX_HORIZON_TXT[P.horizon] || P.horizon}.`);
  const notes = [];
  if (P.contradiction) notes.push('Tes deux réponses ne vont pas dans le même sens : on retient la plus prudente, par sécurité.');
  if (P.capped) notes.push('Avec un horizon aussi court, on limite le niveau de risque : les actions peuvent baisser longtemps.');
  return `<div style="background:${surf};border:1px solid ${bord};border-radius:16px;padding:18px;margin-bottom:16px">
    <div style="font-size:13px;font-weight:700;color:${txt};margin-bottom:12px">Ton profil de risque</div>
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:12px">
      <span style="font-size:22px;font-weight:900;color:${col};letter-spacing:-0.03em">${P.label}</span>
      <span style="font-size:12.5px;color:${sub}">Part d'actions recommandée : <strong style="color:${txt}">${P.min} à ${P.max} %</strong></span>
    </div>
    <div style="height:8px;border-radius:99px;background:${bord};position:relative;margin-bottom:6px"><div style="position:absolute;left:${P.min}%;width:${P.max - P.min}%;height:100%;border-radius:99px;background:${col}"></div>${share ? `<div title="Ton allocation cible" style="position:absolute;left:calc(${Math.min(100, share)}% - 5px);top:-3px;width:10px;height:14px;border-radius:3px;background:${txt}"></div>` : ''}</div>
    <div style="display:flex;justify-content:space-between;font-size:10.5px;color:${sub};margin-bottom:12px"><span>0 % actions</span><span>100 % actions</span></div>
    ${why.map(w => `<div style="font-size:12.5px;color:${txt};line-height:1.55;margin-bottom:2px">• ${w}</div>`).join('')}
    ${notes.map(n => `<div style="font-size:12px;color:${bxWarn};line-height:1.5;margin-top:6px">${n}</div>`).join('')}
    ${share ? `<div style="border-top:1px solid ${bord};margin-top:12px;padding-top:12px;font-size:12.5px;color:${txt};line-height:1.6">
      Ton allocation cible contient <strong>${Math.round(share)} % d'actions</strong> : ${inRange ? `<span style="color:${bxGood};font-weight:700">dans la fourchette de ton profil.</span>` : share > P.max ? `<span style="color:${bxBad};font-weight:700">au-dessus de ce que ton profil supporte.</span> Réduis la part d'actions ou renforce les obligations.` : `<span style="color:${bxWarn};font-weight:700">en dessous de ton profil.</span> Tu pourrais prendre un peu plus de risque, si tes objectifs l'exigent.`}
      <br>Si les marchés actions baissaient de 30 %, tu perdrais environ <strong>${bxE(loss30)}</strong> (${lossPct.toFixed(0)} % de ton patrimoine investi de ${bxE(base)})${limit ? (lossPct > limit ? ` : <span style="color:${bxBad};font-weight:700">plus que ta limite de ${limit} %.</span>` : ` : <span style="color:${bxGood};font-weight:700">dans ta limite de ${limit} %.</span>`) : '.'}
    </div>` : ''}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
//  COHÉRENCE : l'IA reçoit les chiffres vérifiés, et l'allocation est ramenée dans la fourchette du profil de risque
// ═══════════════════════════════════════════════════════════════
// Chiffres calculés par l'application, fournis à l'IA pour qu'elle ne les recalcule (ni ne les confonde) pas
function bilanFactsText() {
  const M = bilanMetrics(); if (!M.revenu && !M.patrimoine) return '';
  const e = n => Math.round(n) + ' €';
  const inv = M.bourse + M.pea + M.av, capa = M.revenu - M.loyer - M.credits - M.charges;
  const pos = typeof positions !== 'undefined' ? positions : [], pv = pos.reduce((a, p) => a + p.qty * p.price, 0);
  return `CHIFFRES VÉRIFIÉS (calculés par l'application : utilise-les tels quels, ne fais AUCUNE somme toi-même et n'invente aucun autre chiffre) :
- Taux d'épargne RÉEL : ${M.tauxEpargne != null ? M.tauxEpargne.toFixed(0) : '?'} % (${e(M.epargne)}/mois sur ${e(M.revenu)} de revenu). N'emploie l'expression « taux d'épargne » que pour cette valeur.
- Capacité d'épargne théorique (revenu - loyer - crédits - charges fixes) : ${e(capa)}/mois${M.revenu ? ' (' + Math.round(capa / M.revenu * 100) + ' % du revenu, avant courses et sorties)' : ''}. Ce n'est PAS le taux d'épargne : ne dis jamais que l'utilisateur « épargne déjà » ce montant, son épargne réelle est de ${e(M.epargne)}/mois.
- Poids logement + crédits : ${M.effort != null ? M.effort.toFixed(0) : '?'} % du revenu
- Épargne de précaution : ${M.moisSecurite != null ? M.moisSecurite.toFixed(1) : '?'} mois de charges (livrets ${e(M.livret)})
- Patrimoine total ${e(M.patrimoine)} : livrets ${e(M.livret)}, assurance vie ${e(M.av)}, PEA ${e(M.pea)}, bourse/CTO ${e(M.bourse)}, immobilier ${e(M.immo)}, autres ${e(M.autres)}
- Patrimoine financier INVESTI (bourse + PEA + assurance vie) : ${e(inv)}. Ne dis jamais que le patrimoine total est « investi en bourse ».
- Positions suivies dans l'application : ${pos.length} ligne(s), valeur ${e(pv)}`;
}
// Si l'allocation proposée sort de la fourchette d'actions du profil de risque, on la ramène dedans (le reste va vers la poche prudente)
function bilanEnforceRisk(result) {
  const P = bilanRiskProfile();
  if (!P || !result || !Array.isArray(result.allocation_cible) || !result.allocation_cible.length) return;
  const alloc = result.allocation_cible, share = bxEquityShare(alloc);
  if (share >= P.min - 2 && share <= P.max + 2) return;
  const isEq = x => !/oblig|livret|mon[ée]taire|cash|fonds euro|\bor\b|immo|scpi/i.test(String(x.type || ''));
  const eq = alloc.filter(isEq), other = alloc.filter(x => !isEq(x));
  const target = share > P.max ? P.max : P.min;
  if (!eq.length) return;
  const factor = share > 0 ? target / share : 1;
  eq.forEach(x => { x.pct = Math.round((Number(x.pct) || 0) * factor); });
  let diff = 100 - alloc.reduce((t, x) => t + (Number(x.pct) || 0), 0);
  if (diff > 0) {                                       // trop d'actions retirées : la différence va en poche prudente
    let bond = other.find(x => /oblig/i.test(x.type)) || other[0];
    if (!bond) { bond = { type: 'Obligations / fonds euros', pct: 0, color: '#6366f1', explication: 'Poche prudente ajoutée pour respecter ton profil de risque' }; alloc.push(bond); }
    bond.pct = (Number(bond.pct) || 0) + diff;
  } else if (diff < 0) {                                // on a monté les actions : on retire la différence de la poche prudente
    other.sort((a, b) => (b.pct || 0) - (a.pct || 0)).forEach(x => { if (diff < 0) { const t = Math.min(x.pct || 0, -diff); x.pct -= t; diff += t; } });
  }
  result.allocation_cible = alloc.filter(x => (Number(x.pct) || 0) > 0);
  result.allocation_ajustee = { de: Math.round(share), vers: Math.round(bxEquityShare(result.allocation_cible)), profil: P.label };
}

// ═══════════════════════════════════════════════════════════════
//  POINTS À VÉRIFIER DANS LES RÉPONSES (contradictions détectées par le code, pas par l'IA)
// ═══════════════════════════════════════════════════════════════
function bxInputChecks() {
  const d = bilanData || {}, P = d.precisions || {}, M = bilanMetrics(), out = [];
  const objs = d.objectifs || [], n = (g, k) => parseFloat((P[g] || {})[k]) || 0, age = bxN('age');
  const capa = M.revenu - M.loyer - M.credits - M.charges;
  // Horizon déclaré court alors que les objectifs sont à long terme (cas vu en pratique : bride le profil de risque sans que l'utilisateur le sache)
  const longObjs = [];
  if (objs.includes('retraite') && age && (n('retraite', 'age') || 64) - age > 7) longObjs.push('la retraite');
  if (objs.includes('capital') && n('capital', 'horizon') >= 7) longObjs.push('ton capital visé');
  if (objs.includes('revenus') && n('revenus', 'horizon') >= 7) longObjs.push('tes revenus passifs');
  if ((d.horizon === 'court' || d.horizon === 'moyen') && longObjs.length)
    out.push(`Tu as déclaré un horizon d'investissement ${d.horizon === 'court' ? 'de moins de 3 ans' : 'de 3 à 7 ans'}, mais ${longObjs.join(', ')} ${longObjs.length > 1 ? 'sont' : 'est'} à plus de 7 ans. Cette réponse limite ton niveau de risque : si tes objectifs longs sont ta priorité, révise-la (étape « Horizon & contraintes »).`);
  if (M.revenu && M.epargne > capa + 1)
    out.push(`Tu déclares épargner ${bxE(M.epargne)}/mois, mais il ne te reste que ${bxE(Math.max(0, capa))}/mois après loyer, crédits et charges fixes : vérifie ces montants.`);
  if (objs.includes('immo') && n('immo', 'prix') > 0 && n('immo', 'apport') > n('immo', 'prix'))
    out.push('Ton apport pour l\'achat immobilier est supérieur au prix visé : vérifie ces deux montants.');
  if (objs.includes('retraite') && n('retraite', 'pension') > 0 && n('retraite', 'revenu') > 0 && n('retraite', 'pension') >= n('retraite', 'revenu'))
    out.push('Ta pension estimée couvre déjà le revenu souhaité à la retraite : cet objectif n\'a pas besoin d\'épargne supplémentaire.');
  if (P.credits && parseFloat(P.credits.capital) > 0 && M.credits <= 0)
    out.push('Tu indiques un capital restant dû sur un crédit, mais aucune mensualité de crédit à l\'étape « Revenus & charges » : les calculs d\'endettement en tiennent compte.');
  if (M.revenu && M.loyer + M.credits + M.charges > M.revenu)
    out.push('Tes charges dépassent ton revenu : le bilan ne peut pas calculer de capacité d\'épargne fiable. Vérifie tes montants.');
  return out;
}
function bxChecksHTML(T) {
  const { bord, txt, sub } = T || _bxT, list = bxInputChecks();
  if (!list.length) return '';
  return `<div style="background:rgba(245,158,11,0.10);border:1px solid rgba(245,158,11,0.4);border-radius:16px;padding:16px 18px;margin-bottom:16px">
    <div style="font-size:13px;font-weight:700;color:${txt};margin-bottom:8px">À vérifier dans tes réponses</div>
    ${list.map(t => `<div style="display:flex;gap:8px;font-size:12.5px;color:${txt};line-height:1.55;margin-bottom:5px"><span style="color:${bxWarn};flex-shrink:0">●</span><span>${_escHtml(t)}</span></div>`).join('')}
    <div style="font-size:11px;color:${sub};margin-top:6px">Corrige-les avec « Refaire mon bilan » : tes réponses sont pré-remplies, tu n'as qu'à modifier celles qui sont fausses.</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
//  CONTEXTE POUR LE TCHAT : le dernier bilan enregistré, résumé, pour que l'Agent IA puisse l'expliquer / le résumer / le retravailler
// ═══════════════════════════════════════════════════════════════
function bilanContextText() {
  const s = typeof loadSavedBilan === 'function' ? loadSavedBilan() : null;
  if (!s || !s.result) return '';
  const r = s.result, prev = bilanData;
  bilanData = s.data || {};                       // les calculs lisent bilanData : on le pointe sur le bilan enregistré, puis on le restaure
  try {
    const M = bilanMetrics(), d = bilanData, e = n => Math.round(n) + ' €';
    const L = [];
    L.push(`=== DERNIER BILAN PATRIMONIAL DE L'UTILISATEUR (fait le ${typeof bilanDateLabel === 'function' ? bilanDateLabel(s.ts) : ''}${r._fallback ? ', version simplifiée : l\'analyse IA n\'avait pas abouti' : ''}) ===`);
    L.push('Il peut te demander de l\'expliquer, le résumer, le comparer à son portefeuille ou d\'ajuster son plan. Appuie-toi UNIQUEMENT sur ce qui suit.');
    L.push(`Profil : ${d.age || '?'} ans, ${d.famille || '?'}, ${d.enfants || 0} enfant(s), statut ${d.statut || '?'}. Revenu ${e(M.revenu)}/mois, loyer/remboursement ${e(M.loyer)}, autres crédits ${e(M.credits)}, charges fixes ${e(M.charges)}, épargne actuelle ${e(M.epargne)}/mois.`);
    if (typeof bilanFactsText === 'function') L.push(bilanFactsText());
    L.push(`Résultat : score ${r.score_global}/10 (${r.score_label}). ${r.resume_executif || ''}`);
    L.push(`Mensualité recommandée : ${r.mensualite_recommandee} €/mois (min ${r.mensualite_min}, max ${r.mensualite_max}). ${r.mensualite_explication || ''}`);
    if ((r.allocation_cible || []).length) L.push('Allocation cible : ' + r.allocation_cible.map(a => `${a.type} ${a.pct} %`).join(', ') + (r.allocation_ajustee ? ` (ajustée à ${r.allocation_ajustee.vers} % d'actions pour respecter le profil de risque)` : '') + '.');
    const RP = typeof bilanRiskProfile === 'function' ? bilanRiskProfile() : null;
    if (RP) L.push(`Profil de risque : ${RP.label}, part d'actions recommandée ${RP.min} à ${RP.max} %.`);
    if ((r.points_forts || []).length) L.push('Points forts : ' + r.points_forts.join(' ; '));
    if ((r.points_attention || []).length) L.push('À surveiller : ' + r.points_attention.join(' ; '));
    if ((r.actions_prioritaires || []).length) L.push('Actions prioritaires : ' + r.actions_prioritaires.map(a => `[${a.priorite}] ${a.action}`).join(' ; '));
    if (typeof bxObjectiveResults === 'function') {
      const objs = bxObjectiveResults(M, r);
      if (objs.length) L.push('Objectifs chiffrés : ' + objs.map(o => `${o.label} → ${o.lines.join(' / ')}`).join(' | '));
      const plan = typeof bxActionPlan === 'function' ? bxActionPlan(M, r) : null;
      if (plan && plan.rows.length) L.push('Plan d\'action chiffré (budget ' + e(plan.budget) + '/mois, total nécessaire ' + e(plan.total) + '/mois) : ' + plan.rows.map(x => `${x.o.label} ${e(x.o.monthly)}/mois → ${x.full ? 'financé' : x.alloc > 0 ? 'financé partiellement' : 'pas de budget'}`).join(' ; '));
    }
    const D = r.deep;
    if (D) {
      if ((D.plan_90_jours || []).length) L.push('Plan des 90 jours : ' + D.plan_90_jours.map(p => `${p.periode} : ${p.action}`).join(' ; '));
      if ((D.risques || []).length) L.push('Risques : ' + D.risques.map(k => k.risque).join(' ; '));
      if ((D.analyse_objectifs || []).length) L.push('Verdict par objectif : ' + D.analyse_objectifs.map(o => `${o.objectif} (${o.verdict})`).join(' ; '));
    }
    if (r.verdict) L.push('Verdict : ' + r.verdict);
    return L.join('\n').slice(0, 7000) + '\n';
  } catch (err) { console.warn('bilanContextText:', err); return ''; }
  finally { bilanData = prev; }
}
