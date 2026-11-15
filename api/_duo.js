// api/_duo.js — Reels « Duo » écrits par l'IA : choix de sujets jamais traités, consignes de scénario, contrôle du résultat.
// Module interne (le « _ » empêche Vercel d'en faire une route) utilisé par api/social.js (action 'duo-batch').
// Le scénario a la même forme que les dossiers duo écrits à la main (api/_dossier.js) et se rend avec video/src/Duo.jsx.

// Sujets du quotidien ({A} fait le bon choix, {B} non). key = identifiant gardé dans video_script.duo_topic pour ne jamais refaire un sujet.
export const DUO_SUBJECTS = [
  { key: 'abonnements', title: 'LES ABONNEMENTS', brief: '{A} fait le tri dans ses abonnements une fois par an, {B} paie des abonnements oubliés (streaming, salle de sport, applis) chaque mois.' },
  { key: 'petites-depenses', title: 'LES PETITES DÉPENSES', brief: 'un petit achat quotidien (café, snack, livraison) : {A} le limite et place la différence, {B} ne se rend pas compte du total sur un an.' },
  { key: 'se-payer-en-premier', title: 'SE PAYER EN PREMIER', brief: '{A} programme un virement automatique vers son épargne le jour de la paie, {B} épargne « ce qui reste » en fin de mois (souvent rien).' },
  { key: 'credit-conso', title: 'LE CRÉDIT CONSO', brief: '{A} met de côté quelques mois avant un achat plaisir (téléphone, TV), {B} l’achète tout de suite à crédit et paie des intérêts.' },
  { key: 'argent-qui-dort', title: 'L’ARGENT QUI DORT', brief: '{B} laisse une grosse somme sur son compte courant, grignotée par l’inflation ; {A} met son épargne de côté sur un livret rémunéré et disponible.' },
  { key: 'achat-impulsif', title: 'L’ACHAT IMPULSIF', brief: '{A} applique la règle des 48 heures avant un achat non prévu, {B} achète sur un coup de tête et le regrette.' },
  { key: 'decouvert', title: 'LE DÉCOUVERT', brief: '{B} est souvent à découvert et paie agios et frais bancaires ; {A} garde un petit coussin sur son compte et ne paie rien.' },
  { key: 'diversifier', title: 'NE PAS TOUT MISER', brief: '{B} met toutes ses économies sur un seul placement ; {A} répartit son épargne. Principe général de diversification, sans citer de produit, de titre ni de crypto.' },
  { key: 'panique', title: 'PANIQUER OU PAS', brief: 'les marchés baissent : {B} panique et vend au plus bas, {A} garde son plan à long terme. Rappeler que les marchés peuvent baisser et que rien n’est garanti.' },
  { key: 'budget-50-30-20', title: 'LE BUDGET 50/30/20', brief: '{A} répartit son salaire : 50 % besoins, 30 % envies, 20 % épargne ; {B} n’a aucun repère et ne sait pas où part son argent.' },
  { key: 'augmentation', title: 'L’AUGMENTATION', brief: 'tous les deux ont une augmentation : {A} en épargne une partie, {B} augmente toutes ses dépenses et n’a pas plus d’épargne qu’avant.' },
  { key: 'promos', title: 'LES PROMOS', brief: '{B} achète pendant les soldes des choses dont il n’a pas besoin « pour économiser », {A} n’achète que ce qui était prévu.' },
  { key: 'objectif', title: 'UN OBJECTIF PRÉCIS', brief: '{A} épargne pour un projet chiffré et daté (voyage, permis), {B} épargne « quand il peut » sans but et n’y arrive jamais.' },
  { key: 'comparer', title: 'COMPARER AVANT DE SIGNER', brief: '{A} compare ses contrats (box internet, assurance, forfait mobile) une fois par an, {B} garde les mêmes depuis des années et paie trop cher.' },
  { key: 'suivre-budget', title: 'SUIVRE SES DÉPENSES', brief: '{A} regarde ses dépenses chaque semaine et repère les fuites, {B} découvre son solde à la fin du mois.' },
  { key: 'dettes-cheres', title: 'LES DETTES CHÈRES', brief: '{A} rembourse d’abord ses dettes les plus chères (crédit renouvelable), {B} les laisse traîner et les intérêts s’accumulent.' },
  { key: 'regulier', title: 'LA RÉGULARITÉ', brief: '{A} investit un petit montant chaque mois, {B} attend « le bon moment » pour tout placer d’un coup et ne commence jamais.' },
  { key: 'courses', title: 'LES COURSES', brief: '{A} fait ses courses avec une liste et un budget, {B} y va sans liste, le ventre vide, et dépense beaucoup plus.' },
  { key: 'paiement-4-fois', title: 'LE PAIEMENT EN 4 FOIS', brief: '{B} enchaîne les paiements fractionnés et ne sait plus combien il doit chaque mois, {A} n’achète que ce qu’il peut payer.' },
  { key: 'livraisons', title: 'LES LIVRAISONS DE REPAS', brief: '{B} se fait livrer plusieurs fois par semaine, {A} cuisine le plus souvent et garde la livraison pour le plaisir.' },
];
// Outils réels de Kapitaro vers lesquels un Reel peut renvoyer (pages gratuites ou fonctions de l'app) : la fin du Reel ne promet
// que ce qui existe. Sujet sans outil : on en parle, sans prétendre que Kapitaro le règle.
export const DUO_TOOLS = {
  petites: { name: 'le calculateur de petites dépenses (gratuit)', cta: 'Calcule le coût de tes petites dépenses sur kapitaro.fr' },
  abonnements: { name: 'le calculateur d’abonnements (gratuit)', cta: 'Calcule ce que te coûtent tes abonnements sur kapitaro.fr' },
  budget: { name: 'le calculateur de budget 50/30/20 (gratuit)', cta: 'Fais ton budget 50/30/20 sur kapitaro.fr' },
  credit: { name: 'le calculateur du coût d’un crédit conso (gratuit)', cta: 'Calcule le vrai coût d’un crédit sur kapitaro.fr' },
  dettes: { name: 'le calculateur de remboursement de dettes (gratuit)', cta: 'Vois dans quel ordre rembourser tes dettes sur kapitaro.fr' },
  inflation: { name: 'le calculateur d’inflation (gratuit)', cta: 'Calcule ce que l’inflation coûte à ton épargne sur kapitaro.fr' },
  reserve: { name: 'le calculateur d’épargne de précaution (gratuit)', cta: 'Calcule ta réserve idéale sur kapitaro.fr' },
  programme: { name: 'le simulateur d’investissement programmé (gratuit)', cta: 'Simule un investissement chaque mois sur kapitaro.fr' },
  objectif: { name: 'l’objectif de l’app Kapitaro (offert 30 jours)', cta: 'Crée ton objectif sur Kapitaro' },
  sante: { name: 'le score de santé du portefeuille dans l’app Kapitaro', cta: 'Vérifie la répartition de ton portefeuille sur Kapitaro' },
};
const TOOL_OF = {
  abonnements: 'abonnements', comparer: 'abonnements', 'petites-depenses': 'petites', livraisons: 'petites', courses: 'petites', 'achat-impulsif': 'petites', promos: 'petites',
  'se-payer-en-premier': 'budget', 'budget-50-30-20': 'budget', augmentation: 'budget', 'suivre-budget': 'budget', 'credit-conso': 'credit', 'paiement-4-fois': 'credit',
  'dettes-cheres': 'dettes', decouvert: 'dettes', 'argent-qui-dort': 'inflation', objectif: 'objectif', regulier: 'programme', diversifier: 'sante',
  // « Duo décodé » : un Dossier décodé repris en Duo (clé 'decode-' + id du dossier)
  'decode-interets-composes': 'objectif', 'decode-inflation': 'inflation', 'decode-livret': 'inflation', 'decode-dca': 'programme',
  'decode-etf': 'sante', 'decode-krach': 'objectif',
};
export const duoToolFor = key => DUO_TOOLS[TOOL_OF[key]] || null;
// Sujets déjà faits à la main (api/_dossier.js) : jamais repris par l'IA
export const DUO_DONE = ['commencer-tot', 'frais', 'reserve'];

// Objets 3D disponibles (video/public/duo/<nom>.webp) pour le plan « show »
export const DUO_OBJECTS = ['anneau', 'baisse', 'balance', 'billets', 'bouclier', 'bouclier-2', 'budget', 'caddie', 'calculatrice', 'calendrier', 'calendrier-2', 'camembert', 'camembert-3d',
  'carte', 'cible', 'cible-2', 'coffre', 'coffre-pourcent', 'facture', 'fusee', 'hausse', 'hausse-pieces', 'hausse-verte', 'horloge', 'idee', 'immeuble', 'immeuble-2', 'inflation', 'livres',
  'maison', 'maison-2', 'outils', 'panier', 'parapluie', 'piece', 'pieces', 'pousse', 'sablier', 'sablier-2', 'sac', 'sac-pieces', 'tableau', 'tirelire', 'tirelire-cassee', 'tirelire-piece', 'voiture', 'voiture-2'];
const POSES = ['montre', 'reflechit', 'choque', 'victoire'];
const BGS = ['light', 'dark', 'orange', 'green', 'blue'];
const VISUALS = ['duo', 'coins', 'columns', 'gauge', 'leak', 'block', 'hourglass', 'car', 'months', 'big', 'show'];

// Chiffres vérifiés (calculés ici) : l'IA ne doit utiliser que ceux-là pour les placements
function fv(m, y, r) { const i = r / 100 / 12, n = y * 12; return m * ((Math.pow(1 + i, n) - 1) / i); }
export function duoFacts() {
  const rows = [];
  for (const m of [50, 100, 150, 200]) for (const y of [10, 20, 30]) for (const r of [3, 5]) rows.push(`${m} €/mois pendant ${y} ans à ${r} %/an : ${(m * 12 * y).toLocaleString('fr-FR')} € versés → ≈ ${(Math.round(fv(m, y, r) / 100) * 100).toLocaleString('fr-FR')} €`);
  rows.push('Inflation : avec 2 % d’inflation par an, 10 000 € perdent environ 1 800 € de pouvoir d’achat en 10 ans (≈ 8 200 € d’aujourd’hui).');
  rows.push('Épargne de précaution : repère courant de 3 à 6 mois de dépenses indispensables.');
  rows.push('Découvert : en France, la commission d’intervention bancaire est plafonnée à 8 € par opération et 80 € par mois (agios en plus, selon la banque).');
  rows.push('Pour les petites dépenses, tu peux faire des multiplications simples et exactes (ex. 4 € × 5 jours × 52 semaines = 1 040 €/an). Garde des nombres ronds.');
  return rows.join('\n');
}

export const DUO_SYSTEM = `Tu es le réalisateur des Reels « Duo » de Kapitaro, une app française qui aide les débutants à comprendre leur argent.
Format : deux personnages, {A} (fait le bon choix) et {B} (non), dans la même situation. Ton vivant, concret, bienveillant (on ne se moque pas de {B}), en français, en tutoyant. Environ 35 secondes de voix.

RÈGLES ABSOLUES (réglementation AMF) :
- Éducatif uniquement : jamais de conseil personnalisé, jamais de produit, fonds, action ou crypto précis, jamais de promesse de gain.
- Tout rendement est un « exemple » ou une « hypothèse », jamais garanti ; si tu parles de placement, la note de fin rappelle le risque de perte en capital.
- Pas de crypto, pas de sujet religieux, politique ou sensible.
- Chiffres : uniquement ceux des faits vérifiés fournis, ou des multiplications simples et exactes de montants du quotidien.
- Ne prétends jamais que Kapitaro fait quelque chose qui n'est pas dans l'outil indiqué : la fin du Reel (say, cta, caption) renvoie EXACTEMENT à l'outil donné, ou, s'il n'y en a pas, ne promet rien (« Suis Kapitaro pour d'autres astuces »).

FORME DU SCÉNARIO (JSON) :
{ "title": "{A} ET {B} · SUJET COURT EN MAJUSCULES",
  "caption": "légende Instagram : accroche, question « Et toi, tu es plutôt {A} ou {B} ? 👇 », mention « Exemple pédagogique » + hypothèses, puis une phrase d'appel complète qui finit par « sur kapitaro.fr » (jamais de « … » à la place du texte)",
  "hashtags": "6 à 8 hashtags dont #kapitaro",
  "beats": [ 3 ou 4 scènes, puis la scène de fin ] }
Scène : { "say": "texte lu par la voix (1 à 3 phrases, nombres écrits EN LETTRES, ex. « cent cinquante euros »)", "shots": [ 2 à 5 plans ] }
Un nouveau plan toutes les 2 secondes environ. Le 1er plan d'une scène n'a pas de "at" ; chaque plan suivant a "at" = un mot EXACT du "say" de cette scène, dans l'ordre (le plan apparaît quand la voix dit ce mot ; "=et" pour le mot « et » seul).
Plan : { "bg": light|dark|orange|green|blue (alterne), "intro": "petite phrase ≤ 18 caractères, minuscules", "head": "gros titre ≤ 20 caractères, le mot clé entre *étoiles*", "v": visuel, + réglages du visuel }
Visuels et réglages :
- duo : les deux personnages côte à côte. pillA, pillB (étiquettes ≤ 14 car.). Pour la fin heureuse : armA: 1, jumpA: true, wave: false, moodB: "neutral".
- coins : fiche du personnage + pile de pièces. who: "A"|"B", sub (≤ 22 car. MAJUSCULES), soit pill (texte), soit label + value (nombre en euros, défile) ; n (0 à 9, hauteur de la pile) ; pour {B} en difficulté : mood: "sad", top: "#e5383b", col: "r".
- columns : deux colonnes qui montent. left (montant de {A}), right (montant de {B}), colB: "r" si {B} perd.
- gauge : compteur. value, max, text (ex. "2 % / AN"), label (≤ 26 car.).
- leak : coffre qui perd des pièces. pill, et éventuellement from / to (montant qui baisse).
- block : un bloc rouge (dette, crédit) tombe à côté de {B}. pill (ex. "CRÉDIT : −800 €").
- hourglass : sablier (le temps qui passe). Rien à régler.
- car : voiture en panne (imprévu). Rien à régler.
- months : cases de mois qui se remplissent. n (≤ 6), min, label.
- big : gros chiffre plein écran. text (ex. "1 040 €", "×3") ; count: false si ce n'est pas un nombre qui défile.
- show : un personnage + un objet 3D. who, pose: montre|reflechit|choque|victoire, o: un objet de la liste fournie, pill (≤ 24 car.).
Scène de fin (toujours la dernière) : { "visual": "end", "cta": "Action courte · kapitaro.fr", "note": "Exemple : hypothèses utilisées (1 phrase)", "say": "… Et toi, tu es plutôt {A} ou {B} ? … sur Kapitaro." }
Varie les visuels (au moins 5 différents, au moins un « show »).
Les personnages s'écrivent TOUJOURS exactement {A} et {B}, avec les accolades (dans "say", "head", "intro", "caption", "title") : jamais « A » ou « B » seuls, jamais de vrais prénoms. Les prénoms sont ajoutés ensuite.
Réponds uniquement par un tableau JSON contenant UN scénario : [ { … } ].`;

export function duoPrompt(subject, used) {
  const tool = DUO_TOOLS[TOOL_OF[subject.key]];
  const toolTxt = tool
    ? `Outil Kapitaro à mettre en avant à la fin : ${tool.name}. Phrase d'appel (cta, fin de la voix et de la légende) : « ${tool.cta} ».`
    : subject.title
      ? 'Pas d\'outil Kapitaro pour ce sujet : parle du sujet et du bon réflexe, sans dire que Kapitaro le règle. Fin de la voix : « Et toi, tu es plutôt {A} ou {B} ? Suis Kapitaro pour d\'autres astuces. », cta : « Suis Kapitaro · kapitaro.fr ».'
      : `Si un de ces outils correspond vraiment au sujet que tu inventes, utilise sa phrase d'appel ; sinon ne promets rien (« Suis Kapitaro pour d'autres astuces ») : ${Object.values(DUO_TOOLS).map(t => t.name + ' → « ' + t.cta + ' »').join(' ; ')}.`;
  return `Écris le scénario du Reel Duo sur ce sujet :\n${subject.title ? subject.title + ' — ' : ''}${subject.brief}\n${toolTxt}\n` +
    `Sujets déjà traités, à ne pas refaire : ${used.join(' | ') || 'aucun'}.\n` +
    `Objets 3D disponibles pour « show » : ${DUO_OBJECTS.join(', ')}.\nFaits vérifiés :\n${duoFacts()}`;
}

// Choisit n sujets jamais traités (au hasard) ; s'il n'en reste plus assez, l'IA en invente (brief libre).
export function pickDuoSubjects(n, usedKeys) {
  const free = DUO_SUBJECTS.filter(s => !usedKeys.includes(s.key) && !DUO_DONE.includes(s.key));
  for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
  const out = free.slice(0, n);
  while (out.length < n) out.push({ key: 'libre-' + Date.now().toString(36) + out.length, title: '', brief: 'invente un sujet d’argent du quotidien NOUVEAU (différent de tous les sujets déjà traités ci-dessous) où {A} fait le bon choix et {B} non.' });
  return out;
}

// « Duo décodé » : Dossiers décodés (api/_dossier.js) pas encore repris en Duo. Les dossiers déjà faits en Duo à la main
// (commencer-tot, frais-caches, precaution) et les versions pub sont exclus. Le brief contient le texte et les chiffres vérifiés du dossier.
const DECODE_SKIP = ['commencer-tot', 'frais-caches', 'precaution'];
export function pickDecodeSubjects(dossiers, n, usedKeys) {
  const free = Object.entries(dossiers).filter(([id, d]) => d.style !== 'duo' && !/^pub-/.test(id) && !DECODE_SKIP.includes(id) && !usedKeys.includes('decode-' + id));
  for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
  return free.slice(0, n).map(([id, d]) => {
    const scenes = d.beats.filter(b => b.visual !== 'end');
    const end = d.beats.find(b => b.visual === 'end') || {};
    const figures = scenes.map(b => [b.hud && b.hud + ' (' + (b.hudLabel || '') + ')', b.leftValue && (b.left || 'gauche') + ' = ' + b.leftValue + ' €', b.rightValue && (b.right || 'droite') + ' = ' + b.rightValue + ' €']
      .filter(Boolean).join(', ')).filter(Boolean).join(' ; ');
    return {
      key: 'decode-' + id, title: 'DÉCODÉ · ' + d.title,
      brief: `adapte le « Dossier décodé » n° ${d.num} (${d.title}) en Reel Duo : {A} applique le bon réflexe expliqué dans le dossier, {B} tombe dans le piège. ` +
        `Garde le même message pédagogique, les mêmes exemples et UNIQUEMENT les chiffres et hypothèses du dossier (ils sont vérifiés), sans en inventer d'autres. ` +
        `Texte du dossier : « ${scenes.map(b => b.say).join(' ')} » Chiffres du dossier : ${figures || 'aucun'}. Note d'hypothèses : « ${end.note || ''} ».`,
    };
  });
}

// ── « Duo décodé » : le Dossier décodé réécrit avec {A} et {B}, rendu avec le décor d'enquête (video/src/Dossier.jsx, visuels duo / solo en plus).
// L'IA garde les scènes chiffrées du dossier (mêmes valeurs) ; le contrôle refuse tout chiffre absent du dossier.
export const DECODE_SYSTEM = `Tu es le réalisateur des Reels « Duo décodé » de Kapitaro, une app française qui aide les débutants à comprendre leur argent.
Tu reçois un « Dossier décodé » (Reel façon enquête : chapitres, compteur en haut, mots-clés en très gros) et tu le réécris en histoire à deux personnages :
{A} applique le bon réflexe, {B} tombe dans le piège. Ton vivant et bienveillant (on ne se moque pas de {B}), en français, en tutoyant le spectateur.

RÈGLES ABSOLUES (réglementation AMF) : éducatif uniquement, jamais de conseil personnalisé ni de produit, fonds, action ou crypto précis, jamais de promesse de gain ;
tout rendement est un exemple ou une hypothèse ; si le dossier parle de placement ou de bourse, une scène rappelle que rien n'est garanti.
CHIFFRES : uniquement ceux du dossier, avec les mêmes hypothèses. N'invente aucun nombre.

FORME (JSON) : { "hook": "1 à 2 phrases d'accroche pour la légende Instagram, avec {A} et {B}", "beats": [ 5 à 7 scènes, puis la scène de fin ] }
Scène : { "chapter": 0|1|2 (dans l'ordre, comme le dossier), "visual": …, "hud": "≤ 10 car.", "hudLabel": "≤ 26 car. MAJUSCULES", "hudColor": "green" (optionnel, pour le bon réflexe),
  "kw": [ 2 à 4 × ["MOT-CLÉ AFFICHÉ ≤ 18 car.", "mot déclencheur présent tel quel dans say"] ], "say": "1 à 3 phrases, nombres écrits EN LETTRES" }
Visuels :
- duo : les deux personnages côte à côte. pillA, pillB (≤ 22 car. MAJUSCULES), moodA, moodB parmi neutre|joie|triste|surpris|choque|reflechit|victoire|montre. OBLIGATOIRE en 1re scène.
- solo : un personnage en grand. who: "A"|"B", mood (même liste), label (≤ 18 car.), sub (≤ 30 car.). Au moins un solo.
- et les visuels chiffrés du dossier, recopiés avec EXACTEMENT les mêmes réglages (result, rule, leak, shrink, dca, compare, curve, snowball, title) ;
  pour compare / result, left = "{A}" et right = "{B}" (ou l'inverse selon qui a le bon résultat), leftSub / rightSub courts.
Scène de fin (dernière) : { "visual": "end", "hud": "DÉCODÉ", "hudLabel": "DOSSIER CLOS", "hudColor": "green", "cta": celui du dossier, "note": celle du dossier,
  "say": "… Et toi, tu es plutôt {A} ou {B} ? " + la phrase d'appel du dossier }
Les personnages s'écrivent TOUJOURS {A} et {B} avec les accolades, jamais de vrais prénoms, jamais « A » ou « B » seuls.
Les prénoms ajoutés ensuite peuvent être masculins ou féminins : n'utilise JAMAIS il, elle, lui, celui-ci pour {A} ou {B} (répète le prénom), et aucun accord masculin/féminin les concernant.
Pas de « chacun / chacune », « tous les deux / toutes les deux » : écris « {A} et {B} ».
Chaque scène apporte une idée nouvelle : ne répète jamais une phrase ou une idée d'une scène à l'autre.
Dans "say", écris « Kapitaro » (jamais « kapitaro.fr », la voix le lirait mal), et la scène de fin ne contient qu'UNE phrase d'appel.
Réponds uniquement par un tableau JSON contenant UN objet : [ { … } ].`;

export function decodePrompt(id, dossier, tool) {
  return `Dossier décodé n° ${dossier.num} « ${dossier.title} » (chapitres : ${dossier.chapters.join(' / ')}) :\n${JSON.stringify(dossier.beats)}\n` +
    (tool ? `Phrase d'appel de fin : « ${tool.cta} ».` : '');
}

// Contrôle du scénario « Duo décodé » : visuels connus, chiffres tous présents dans le dossier d'origine, {A}/{B} dans la voix.
const DECODE_VISUALS = ['duo', 'solo', 'result', 'rule', 'leak', 'shrink', 'dca', 'compare', 'curve', 'snowball', 'title'];
export function cleanDecodeScript(raw, dossier) {
  if (!raw || !Array.isArray(raw.beats)) throw new Error('Scénario Duo décodé illisible');
  const orig = dossier.beats.filter(b => b.visual !== 'end'), oend = dossier.beats.find(b => b.visual === 'end') || {};
  const okNums = new Set(JSON.stringify(dossier.beats).match(/\d+(?:[.,]\d+)?/g) || []);
  const numsOk = o => Object.entries(o).every(([k, v]) => !['leftValue', 'rightValue', 'shrinkFrom', 'shrinkTo', 'shrinkYears', 'amount'].includes(k) || okNums.has(String(v)))
    && (!o.prices || o.prices.every(p => okNums.has(String(p))));
  const scenes = raw.beats.filter(b => b && b.visual !== 'end' && DECODE_VISUALS.includes(b.visual) && typeof b.say === 'string' && b.say.trim()).slice(0, 8);
  if (scenes.length < 3 || scenes[0].visual !== 'duo') throw new Error('Scénario Duo décodé incomplet');
  const voice = scenes.map(b => b.say).join(' ');
  if (!/\{A\}/.test(voice) || !/\{B\}/.test(voice) || /(^|[\s,.;:!?«(])[AB](?=[\s,.;:!?»)]|$)/.test(voice.replace(/\{[AB]\}/g, ''))) throw new Error('Scénario Duo décodé sans {A} / {B}');
  // Accords impossibles à garantir (prénoms masculins ou féminins) : « Léa, lui », « chacune »… → scénario refusé (2e tentative)
  if (/\{[AB]\},? (lui|elle)\b|\bchacune?\b|\b(tous|toutes) les deux\b/i.test(voice)) throw new Error('Scénario Duo décodé avec il/elle');
  // Nombres de la voix (écrits en lettres) non contrôlables ici : les nombres en chiffres des réglages et du compteur doivent venir du dossier
  const beats = [];
  let ch = 0;
  for (const b of scenes) {
    const o = { chapter: Math.max(ch, Math.min(2, Math.round(+b.chapter) || 0)), visual: b.visual, say: txt(b.say, 320), hud: txt(b.hud, 12), hudLabel: txt(b.hudLabel, 30).toUpperCase() };
    ch = o.chapter;
    if (b.hudColor === 'green') o.hudColor = 'green';
    if ((o.hud.match(/\d+(?:[.,]\d+)?/g) || []).some(n => !okNums.has(n.replace(/\s/g, '')) && !okNums.has(n))) o.hud = '';
    const words = o.say.split(/\s+/).map(norm);
    o.kw = (Array.isArray(b.kw) ? b.kw : []).filter(k => Array.isArray(k) && typeof k[0] === 'string' && typeof k[1] === 'string' && words.some(w => w.includes(norm(k[1])) && norm(k[1])))
      .slice(0, 4).map(k => [k[0].slice(0, 22).toUpperCase(), k[1]]);
    if (b.visual === 'duo') {
      for (const f of ['pillA', 'pillB']) if (typeof b[f] === 'string') o[f] = txt(b[f], 24).toUpperCase();
      o.moodA = b.moodA; o.moodB = b.moodB;
    } else if (b.visual === 'solo') {
      o.who = b.who === 'B' ? 'B' : 'A'; o.mood = b.mood; o.label = txt(b.label, 20).toUpperCase(); o.sub = txt(b.sub, 32).toUpperCase();
    } else {
      // Visuel chiffré : on reprend les réglages du dossier pour ce visuel (jamais ceux inventés), seuls les libellés changent
      const src = orig.find(x => x.visual === b.visual && (!b.leftValue || x.leftValue === b.leftValue)) || orig.find(x => x.visual === b.visual);
      if (!src && !['title', 'compare'].includes(b.visual)) continue;
      const keep = ['leftValue', 'rightValue', 'rows', 'caption', 'rate', 'years', 'shrinkFrom', 'shrinkTo', 'shrinkYears', 'prices', 'amount', 'showParts', 'leakLabel', 'leakSub'];
      if (src) for (const f of keep) if (src[f] !== undefined) o[f] = src[f];
      for (const f of ['left', 'leftSub', 'right', 'rightSub']) if (typeof b[f] === 'string') o[f] = txt(b[f], 24).toUpperCase(); else if (src && src[f]) o[f] = src[f];
      if (!numsOk(o)) continue;
    }
    beats.push(o);
  }
  if (beats.length < 3) throw new Error('Scénario Duo décodé trop court');
  const end = raw.beats.find(b => b && b.visual === 'end') || {};
  beats.push({ chapter: 2, visual: 'end', hud: 'DÉCODÉ', hudLabel: 'DOSSIER CLOS', hudColor: 'green', cta: oend.cta || 'Essaie Kapitaro · kapitaro.fr', note: oend.note || '',
    say: (/\{A\}/.test(end.say || '') && /\{B\}/.test(end.say || '') ? txt(end.say, 240) : 'Et toi, tu es plutôt {A} ou {B} ? ' + (oend.say || '').split('. ').pop()).replace(/kapitaro\.fr/gi, 'Kapitaro') });
  for (const b of beats) b.say = b.say.replace(/kapitaro\.fr/gi, 'Kapitaro');
  // Légende : accroche de l'IA + question, puis les paragraphes du dossier (hypothèses, risques, appel), inchangés
  const rest = String(dossier.caption || '').split('\n\n').slice(1).join('\n\n');
  return {
    style: 'dossier', duoDecode: true, num: dossier.num, dossierTitle: dossier.title, chapters: dossier.chapters, title: '{A} ET {B} · ' + dossier.title, beats,
    caption: (txt(raw.hook, 300) || '{A} et {B} face au même choix… mais pas la même fin.') + ' 🕵️\n\nEt toi, tu es plutôt {A} ou {B} ? 👇' + (rest ? '\n\n' + rest : ''),
    hashtags: dossier.hashtags,
  };
}

const norm = w => String(w).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const txt = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const num = v => (Number.isFinite(+v) ? +v : undefined);

// Contrôle et nettoie un scénario de l'IA : visuels connus, réglages bornés, mots déclencheurs présents dans la voix, scène de fin.
export function cleanDuoScript(raw) {
  if (!raw || !Array.isArray(raw.beats)) throw new Error('Scénario Duo illisible');
  const scenes = raw.beats.filter(b => b && b.visual !== 'end' && typeof b.say === 'string' && b.say.trim()).slice(0, 5);
  const end = raw.beats.find(b => b && b.visual === 'end');
  if (scenes.length < 2) throw new Error('Scénario Duo trop court');
  // Les prénoms remplacent {A} et {B} : un scénario qui écrit « A » / « B » à la place ferait dire « A » à la voix
  const voice = scenes.map(b => b.say).join(' ');
  if (!/\{A\}/.test(voice) || !/\{B\}/.test(voice) || /(^|[\s,.;:!?«(])[AB](?=[\s,.;:!?»)]|$)/.test(voice.replace(/\{[AB]\}/g, ''))) throw new Error('Scénario Duo sans {A} / {B}');
  const beats = scenes.map(b => {
    const say = txt(b.say, 320), words = say.split(/\s+/).map(norm);
    let from = 0;
    const shots = (Array.isArray(b.shots) ? b.shots : []).slice(0, 6).map((s, k) => {
      if (!s || !VISUALS.includes(s.v)) return null;
      const o = { v: s.v, bg: BGS.includes(s.bg) ? s.bg : 'light', intro: txt(s.intro, 24), head: txt(s.head, 28) || ' ' };
      if (k && typeof s.at === 'string') {
        const exact = s.at[0] === '=', key = norm(exact ? s.at.slice(1) : s.at);
        const j = key ? words.findIndex((w, i) => i >= from && (exact ? w === key : w.includes(key))) : -1;
        if (j >= 0) { o.at = s.at; from = j + 1; }
      }
      for (const f of ['pillA', 'pillB', 'pill', 'sub', 'label', 'text']) if (typeof s[f] === 'string') o[f] = txt(s[f], f === 'label' ? 30 : 26);
      for (const f of ['value', 'left', 'right', 'from', 'to', 'max', 'min']) if (num(s[f]) !== undefined) o[f] = Math.abs(num(s[f]));
      if (num(s.n) !== undefined) o.n = Math.max(0, Math.min(s.v === 'months' ? 6 : 9, Math.round(num(s.n))));
      if (s.v === 'gauge' && num(s.value) !== undefined) o.value = Math.min(num(s.value), o.max || 10);
      if (s.who === 'A' || s.who === 'B') o.who = s.who;
      if (['sad', 'neutral', 'happy', 'wow'].includes(s.mood)) o.mood = s.mood;
      if (['sad', 'neutral', 'happy', 'wow'].includes(s.moodB)) o.moodB = s.moodB;
      if (s.top === '#e5383b') o.top = s.top;
      if (s.col === 'r') o.col = 'r';
      if (s.colB === 'r') o.colB = 'r';
      if (s.armA) o.armA = 1;
      if (s.jumpA) o.jumpA = true;
      if (s.wave === false) o.wave = false;
      if (s.count === false) o.count = false;
      if (s.v === 'show') {
        if (!DUO_OBJECTS.includes(s.o)) return null;
        o.o = s.o; o.pose = POSES.includes(s.pose) ? s.pose : 'montre'; o.who = o.who || 'A';
      }
      if (s.v === 'columns' && !(o.left > 0 && o.right > 0)) return null;
      if (s.v === 'big' && !o.text) return null;
      return o;
    }).filter(Boolean);
    if (!shots.length) shots.push({ v: 'duo', bg: 'light', intro: '', head: '{A} et *{B}*' });
    delete shots[0].at;
    return { say, shots };
  });
  beats.push({
    visual: 'end', cta: txt(end && end.cta, 40) || 'Essaie Kapitaro · kapitaro.fr', note: txt(end && end.note, 160),
    say: txt(end && end.say, 220) || 'Et toi, tu es plutôt {A} ou {B} ? Retrouve plus d’astuces sur Kapitaro.',
  });
  let title = txt(raw.title, 60).toUpperCase();
  if (!/\{A\}/.test(title)) title = '{A} ET {B} · ' + (title || 'LE BON RÉFLEXE');
  return {
    style: 'duo', title, beats,
    caption: (txt(raw.caption, 1200) || 'Et toi, tu es plutôt {A} ou {B} ? 👇').replace(/kapitora/gi, 'kapitaro')
      .replace(/(^|\s)…\s*sur kapitaro\.fr/i, '$1Fais le point gratuitement sur kapitaro.fr'),
    hashtags: txt(raw.hashtags, 200) || '#epargne #budget #financepersonnelle #argent #kapitaro',
  };
}
