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
