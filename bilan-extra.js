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
    const c = M.effort <= 30 ? bxGood : M.effort <= BX_DEBT_MAX ? bxWarn : bxBad;
    list.push(['Poids logement + crédits', M.effort.toFixed(0) + ' %', c,
      M.effort <= 30 ? 'Confortable : il te reste de la marge.' : M.effort <= BX_DEBT_MAX ? 'Proche de la limite : peu de place pour un nouveau crédit.' : `Au-dessus de ${BX_DEBT_MAX} %, les banques refusent en général un nouveau crédit.`]);
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

  return diag + loan + retire;
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
  const plain = s => String(s).replace(/[^\x20-\x7EÀ-ÿ€]/g, '');
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
