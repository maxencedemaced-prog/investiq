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
    const c = M.moisSecurite >= 3 ? bxGood : M.moisSecurite >= 1.5 ? bxWarn : bxBad;
    list.push(['Épargne de précaution', M.moisSecurite.toFixed(1) + ' mois', c,
      M.moisSecurite >= 3 ? 'Ton livret couvre au moins 3 mois de charges : bon matelas.' : `Objectif : 3 mois de charges, soit ${bxE(M.essentiel * 3)}. Il manque ${bxE(M.manqueSecurite)}.`]);
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
      <label><span style="${lab}">Type de bien</span><select id="bx-bien" onchange="bxLoanUpdate()" style="${inp}"><option value="ancien">Ancien (~7,5 % de frais)</option><option value="neuf">Neuf (~2,5 % de frais)</option></select></label>
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

  return diag + bxObjectivesHTML(M, r) + bxPlanHTML(M, r) + loan + retire;
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
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;font-size:12px;color:${txt}">
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
  const plain = s => String(s).replace(/→/g, '->').replace(/[^\x20-\x7EÀ-ÿ€]/g, '');
  title('Analyse detaillee');
  bxIndicators(M).forEach(i => line(plain(`${i[0]} : ${i[1]} - ${i[3]}`)));
  y += 3;
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
    if (plan.steps.length || plan.sorted.length) {
      title('Plan d\'action chiffre');
      plan.steps.forEach(s => line(plain(s.t + ' : ' + s.d)));
      plan.sorted.forEach(o => line(plain(`${o.label} : ${bxE(o.monthly)}/mois${o.horizon != null ? ' (echeance ' + (Math.round(o.horizon * 10) / 10) + ' an)' : ''}`)));
      if (plan.sorted.length) line(plain(`Total ${bxE(plan.total)}/mois pour un budget d'epargne de ${bxE(plan.budget)}/mois${plan.gap > 0 ? ` : il manque ${bxE(plan.gap)}/mois, decale ou reduis les objectifs les plus lointains.` : '.'}`), true);
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
    out.push({ id: 'immo', label: 'Achat immobilier', icon: 'home', horizon: delai, monthly, status: okAp && okEf ? 'ok' : okEf || okAp ? 'warn' : 'bad', lines: [
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
      out.push({ id: 'retraite', label: 'Retraite', icon: 'clock', horizon: years, monthly, status: gap === 0 ? 'ok' : monthly <= ((r && r.mensualite_recommandee) || 0) ? 'ok' : 'warn', lines: [
        `Revenu souhaité ${bxE(revenu)}/mois, pension estimée ${bxE(pension)}/mois → il manque ${bxE(gap)}/mois`,
        `Capital nécessaire (règle des 4 %) : ${bxE(K)}`,
        gap > 0 ? `Versement nécessaire : ${bxE(monthly)}/mois pendant ${years} ans (rendement ${rate} %/an, avec ton capital actuel)` : 'Ta pension couvre déjà ton objectif.',
      ] });
    }
  }
  if (objs.includes('revenus') && num('revenus', 'revenu') > 0) {
    const revenu = num('revenus', 'revenu'), h = num('revenus', 'horizon') || 15, K = revenu * 12 / 0.04, monthly = bxSolveMonthly(K, cap0, rate, h);
    out.push({ id: 'revenus', label: 'Revenus passifs', icon: 'dollar', horizon: h, monthly, status: monthly <= ((r && r.mensualite_recommandee) || 0) ? 'ok' : 'warn', lines: [
      `Pour ${bxE(revenu)}/mois de revenus passifs, il faut un capital d'environ ${bxE(K)} (rendement de 4 %/an)`,
      `Versement nécessaire : ${bxE(monthly)}/mois pendant ${h} ans (rendement ${rate} %/an)`,
    ] });
  }
  if (objs.includes('capital') && num('capital', 'montant') > 0) {
    const K = num('capital', 'montant'), h = num('capital', 'horizon') || 10, monthly = bxSolveMonthly(K, cap0, rate, h);
    out.push({ id: 'capital', label: 'Capital visé', icon: 'up', horizon: h, monthly, status: monthly <= ((r && r.mensualite_recommandee) || 0) ? 'ok' : 'warn', lines: [
      `Pour atteindre ${bxE(K)} en ${h} ans : ${bxE(monthly)}/mois (rendement ${rate} %/an, avec ton capital actuel)`,
    ] });
  }
  if (objs.includes('projet') && num('projet', 'montant') > 0) {
    const K = num('projet', 'montant'), mois = num('projet', 'delai') || 24, rateP = mois <= 36 ? 0 : 2, monthly = bxSolveMonthly(K, 0, rateP, mois / 12);
    out.push({ id: 'projet', label: 'Projet précis', icon: 'flag', horizon: mois / 12, monthly, status: monthly <= ((r && r.mensualite_recommandee) || 0) ? 'ok' : 'warn', lines: [
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
    out.push({ id: 'securite', label: 'Sécuriser mon épargne', icon: 'shield', horizon: 1, monthly, status: gap === 0 ? 'ok' : 'warn', lines: [
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
function bxActionPlan(M, r) {
  const res = bxObjectiveResults(M, r).filter(o => o.monthly != null && isFinite(o.monthly) && o.id !== 'securite');
  const budget = (r && r.mensualite_recommandee) || 0, steps = [];
  const sec = bxObjectiveResults(M, r).find(o => o.id === 'securite');
  const gap3 = M.essentiel ? M.manqueSecurite : 0;
  const needSecurite = sec ? Math.max(0, (parseFloat(((bilanData.precisions || {}).securite || {}).mois) || 6) * M.essentiel - M.livret) : gap3;
  const alloc = Math.max(50, Math.min(budget || 200, M.epargne || budget || 200));
  if (needSecurite > 0) steps.push({ t: 'Sécuriser ton matelas', d: `Il te manque ${bxE(needSecurite)} sur tes livrets. En y consacrant ${bxE(alloc)}/mois, c'est fait en ${Math.ceil(needSecurite / alloc)} mois. Tant que ce n'est pas fait, ne prends pas de risque avec le reste.` });
  const sorted = res.slice().sort((a, b) => (a.horizon || 99) - (b.horizon || 99));
  const total = sorted.reduce((t, o) => t + o.monthly, 0);
  return { steps, sorted, total, budget, gap: Math.max(0, total - budget), needSecurite, alloc };
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
  const num = (i, t, d) => `<div style="display:flex;gap:12px;margin-bottom:12px"><span style="width:26px;height:26px;border-radius:50%;background:${bxGood};color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i}</span><div><div style="font-size:13.5px;font-weight:800;color:${txt}">${t}</div><div style="font-size:12.5px;color:${sub};line-height:1.55;margin-top:2px">${d}</div></div></div>`;
  let i = 1, html = '';
  p.steps.forEach(s => { html += num(i++, s.t, s.d); });
  if (p.sorted.length) {
    html += num(i++, 'Financer tes objectifs, du plus proche au plus lointain', `<table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:12px;color:${txt}"><thead><tr style="color:${sub};font-size:10.5px;text-align:right"><th style="text-align:left;padding-bottom:4px">Objectif</th><th>Échéance</th><th>Versement nécessaire</th></tr></thead><tbody>${p.sorted.map(o => `<tr style="border-top:1px solid ${bord}"><td style="padding:6px 0">${o.label}</td><td style="text-align:right">${o.horizon != null ? (o.horizon >= 1 ? Math.round(o.horizon * 10) / 10 + ' an' + (o.horizon >= 1.5 ? 's' : '') : Math.round(o.horizon * 12) + ' mois') : ''}</td><td style="text-align:right;font-weight:700">${bxE(o.monthly)}/mois</td></tr>`).join('')}<tr style="border-top:2px solid ${bord};font-weight:800"><td style="padding:7px 0">Total</td><td></td><td style="text-align:right">${bxE(p.total)}/mois</td></tr></tbody></table>`);
    html += num(i++, p.gap > 0 ? 'Ajuster : tes objectifs dépassent ton budget' : 'Ton budget suffit', p.gap > 0
      ? `Tes objectifs demandent ${bxE(p.total)}/mois pour un budget d'épargne recommandé de ${bxE(p.budget)}/mois : il manque ${bxE(p.gap)}/mois. Décale les échéances les plus lointaines, réduis le montant visé ou augmente ton épargne (l'analyse de tes dépenses peut libérer de la marge).`
      : `Tes objectifs demandent ${bxE(p.total)}/mois pour un budget de ${bxE(p.budget)}/mois : ${bxE(p.budget - p.total)}/mois restent pour ta stratégie long terme.`);
  }
  return `<div style="background:${surf};border:1px solid ${bord};border-radius:16px;padding:18px;margin-bottom:16px">
    <div style="font-size:13px;font-weight:700;color:${txt};margin-bottom:14px">Ton plan d'action chiffré</div>${html}
  </div>`;
}
