// api/_reel.js — Vidéos animées (Reels) : script écrit par l'IA à partir d'un post, voix off, lancement du rendu sur GitHub Actions.
// Module interne (le « _ » empêche Vercel d'en faire une route) utilisé par api/social.js.
// Variables Vercel : ELEVENLABS_API_KEY (facultatif, voix naturelles : les voix de « Mes voix » sont retrouvées automatiquement),
// ELEVENLABS_VOICES (facultatif) : ordre des voix, par noms ou « Nom:voiceId », séparés par des virgules (1re = voix par défaut, 2 premières = duo),
// ELEVENLABS_MODEL (défaut eleven_v4, puis v3 et multilingual v2 en secours), GITHUB_DISPATCH_TOKEN (jeton GitHub « Actions : lecture et écriture » sur le dépôt), GITHUB_REPO.

const clip = (s, n) => (typeof s === 'string' ? s.trim().slice(0, n) : '');
const TYPES = ['hook', 'title', 'number', 'chart', 'compare', 'steps', 'list', 'warn', 'quote', 'market', 'agenda', 'cta'];
const ICONS = ['bulb', 'shield', 'chart', 'rocket', 'bank', 'coin', 'money', 'calendar', 'phone', 'balance', 'sparkles', 'hourglass', 'house', 'down', 'search', 'lock', 'bars', 'globe'];
const RATE_WORDS = { 3: 'trois', 5: 'cinq', 7: 'sept' };
const EDGE_VOICES = [{ name: 'Rémy (voix gratuite)', edge: 'fr-FR-RemyMultilingualNeural' }, { name: 'Vivienne (voix gratuite)', edge: 'fr-FR-VivienneMultilingualNeural' }];

// Voix disponibles : ElevenLabs si configuré, sinon les voix Microsoft gratuites
// Voix ElevenLabs du compte (« Mes voix », hors voix de base), dans l'ordre choisi par ELEVENLABS_VOICES si renseigné
let voicesWarning = '';
const nk = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
export async function reelVoices() {
  if (!process.env.ELEVENLABS_API_KEY) return EDGE_VOICES;
  const wanted = String(process.env.ELEVENLABS_VOICES || '').split(',').map(x => x.trim()).filter(Boolean);
  const explicit = wanted.map(x => { const i = x.lastIndexOf(':'); return i > 0 && /^[A-Za-z0-9]{10,40}$/.test(x.slice(i + 1).trim()) ? { name: x.slice(0, i).trim(), id: x.slice(i + 1).trim() } : null; });
  let mine = []; voicesWarning = '';
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }, signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    if (!r.ok) voicesWarning = r.status === 401 ? "La clé ElevenLabs n'a pas le droit « Voix : Lire » (ou elle est invalide) : modifie-la dans ElevenLabs > Clés API." : 'ElevenLabs a répondu ' + r.status + ' : ' + String(j?.detail?.message || j?.detail || '').slice(0, 120);
    else if (!(j.voices || []).some(v => v.category !== 'premade')) voicesWarning = 'Aucune voix dans « Mes voix » sur ElevenLabs : ajoute-les depuis la bibliothèque.';
    mine = (j.voices || []).filter(v => v.category !== 'premade').map(v => ({ name: String(v.name).split(' - ')[0].trim(), id: v.voice_id }));
  } catch (e) { voicesWarning = 'ElevenLabs injoignable : ' + e.message; console.warn('[reel] voix ElevenLabs :', e.message); }
  let list = [];
  wanted.forEach((w, k) => {
    if (explicit[k]) { list.push(explicit[k]); return; }
    const v = mine.find(m => nk(m.name) === nk(w)) || mine.find(m => nk(m.name).startsWith(nk(w)));
    if (v && !list.some(x => x.id === v.id)) list.push(v);
  });
  mine.forEach(v => { if (!list.some(x => x.id === v.id)) list.push(v); });
  return list.length ? list : EDGE_VOICES;
}
export async function reelConfig() {
  const voices = await reelVoices();
  return { voices: voices.map(v => v.name), eleven: !!voices[0].id, dispatch: !!process.env.GITHUB_DISPATCH_TOKEN, hasKey: !!process.env.ELEVENLABS_API_KEY, warning: voicesWarning };
}

export const REEL_SYSTEM = `Tu es le réalisateur des vidéos courtes (Reels Instagram, TikTok) de Kapitaro, une app française qui aide les particuliers à suivre et comprendre leurs placements.
Tu transformes un post en script de vidéo verticale de 25 à 30 secondes, lu par une voix off, avec une scène animée par phrase. Style visuel sobre, mais voix ÉNERGIQUE et vivante : phrases courtes et percutantes, questions directes, relances (« Et là ? », « Résultat : »), ponctuation expressive (points d'exclamation, points de suspension), en tutoyant.

RÈGLES ABSOLUES (réglementation AMF) :
- Contenu éducatif uniquement. Jamais de conseil personnalisé, jamais de recommandation d'acheter ou de vendre un titre, un fonds ou une crypto précis.
- Aucune prédiction, aucune promesse de gain, aucun rendement garanti : tout rendement est « hypothétique ».
- N'utilise que les chiffres présents dans le post ou dans les faits vérifiés fournis. N'invente rien.
- Pas de sensationnalisme ni de peur.
- N'affirme jamais que le temps efface les pertes, que les hausses compensent les baisses ou que le marché finit toujours par remonter.

FORMAT : réponds UNIQUEMENT avec un tableau JSON de 8 à 12 scènes, sans texte autour. 55 à 85 mots au total dans les champs "say".
Chaque scène : {"v": type, "say": "phrase dite par la voix", "lines": ["texte à l'écran"], …champs du type}
- "say" : UNE phrase courte (3 à 14 mots), naturelle à l'oral, sans parenthèses ni abréviations. Écris les nombres EN LETTRES (« cinquante euros », « sept pour cent », « seize mille quatre cents euros »).
- "lines" : 1 à 3 lignes très courtes (2 à 16 caractères chacune) qui résument la phrase en 2 à 5 mots, sans la recopier. Entoure 1 mot clé d'astérisques (*mot*).
Types :
- "hook" : toujours la 1re scène, accroche forte (question ou constat qui intrigue). Champs : lines, "sub" facultatif (max 60 car.).
- "title" : idée clé. Champs : lines, "sub" facultatif, "icon" facultatif.
- "number" : un chiffre marquant. Champs : "value" (max 10 car., ex. « 50 € », « 3 à 6 mois »), "sub" (max 40 car.), "icon" facultatif.
- "chart" : graphique d'intérêts composés dessiné à l'écran. Champs : lines (1 ligne), "monthly" (50, 100 ou 200), "years" (10, 20 ou 30), "rates" (deux taux parmi 3, 5, 7, le plus petit d'abord), "step" : 1 = la voix annonce le premier montant, 2 = le second montant, 3 = l'écart. Enchaîne 2 ou 3 scènes chart consécutives (step 1, 2, puis 3) avec les mêmes paramètres. Les montants prononcés sont ceux des faits vérifiés.
- "compare" : deux barres. Champs : lines, "rows" : 2 objets {"label": max 24 car., "value": texte affiché max 14 car., "amount": nombre}.
- "steps" : 2 ou 3 étapes numérotées. Champs : lines (1 ligne), "items" (max 30 car. chacun).
- "list" : 3 ou 4 points à cocher. Champs : lines (1 ligne), "items" (max 30 car. chacun).
- "warn" : rappel du risque, obligatoire dès que la vidéo parle d'investir. Champs : lines (ex. ["Rien n'est", "*garanti*"]), "sub" facultatif.
- "quote" : phrase à retenir. Champs : lines (2 ou 3 lignes).
- "market" / "agenda" : UNIQUEMENT si le post contient déjà un tableau de marchés ou un agenda (données réelles) : ne remplis pas "rows", le serveur recopie les données. Champs : lines, say.
- "cta" : toujours la dernière scène. "say" invite à essayer gratuitement Kapitaro (lien en bio) ; lines : 2 lignes courtes, ex. ["Simule", "ton *projet*"].
Varie les types : jamais deux fois de suite le même type (sauf les scènes chart). "icon" facultatif (au plus une scène sur trois) parmi : ${ICONS.join(', ')}.`;

// Bibliothèque de plans filmés : pour chaque idée, des recherches de banque de vidéos qui donnent des plans cohérents.
// L'IA choisit le thème selon le SENS de la phrase dite ; le rendu essaie les recherches dans l'ordre et garde la vidéo la plus pertinente.
export const SHOT_THEMES = {
  securite:       { fr: 'sécurité, protection, filet de sécurité, havre de paix', q: ['family hugging at home', 'cozy home family evening', 'mother holding baby home', 'umbrella rain protection', 'father hugging daughter', 'couple on couch smiling', 'warm living room fireplace'] },
  serenite:       { fr: 'sérénité, calme, esprit tranquille', q: ['woman relaxing on sofa', 'calm lake sunrise', 'man reading book relaxing', 'peaceful nature morning', 'woman drinking tea window', 'man walking forest', 'yoga at sunrise'] },
  famille:        { fr: 'famille, enfants, transmission', q: ['family walking park', 'parents playing with children', 'family dinner table', 'family laughing together'] },
  bourse:         { fr: 'bourse, marchés financiers, cotations, actions', q: ['stock market chart screen', 'stock exchange trading screen', 'financial data monitor', 'trader looking at charts', 'stock ticker board', 'businessman analyzing charts laptop', 'finance office screens'] },
  baisse:         { fr: 'baisse, chute, volatilité, marché qui descend', q: ['stormy sea waves', 'dark storm clouds', 'worried man looking at phone', 'stock market screen red', 'heavy rain window', 'man thinking worried desk', 'foggy landscape'] },
  hausse:         { fr: 'hausse, croissance, progression, rendement', q: ['growing plant timelapse', 'green sprout soil', 'hiker reaching mountain summit', 'sunrise over city', 'plant growing sun', 'runner sunrise', 'city lights evening skyline'] },
  temps:          { fr: 'temps, long terme, patience, années', q: ['clock time lapse', 'hourglass sand time', 'tree seasons timelapse', 'watch ticking close up', 'wall clock ticking', 'time lapse city day night', 'old pocket watch'] },
  epargne:        { fr: 'épargne, économiser, mettre de côté, livret', q: ['piggy bank coins', 'saving coins jar', 'putting coins in piggy bank', 'coins stack close up', 'coins jar savings', 'hand putting coin piggy bank', 'wallet savings'] },
  argent:         { fr: 'argent, budget, compter, dépenser', q: ['counting money hands', 'calculator budget planning', 'wallet cash payment', 'euro banknotes counting'] },
  frais:          { fr: 'frais, coûts, factures, commissions', q: ['paying bills desk', 'receipt shopping bill', 'credit card payment terminal', 'man reading invoice'] },
  appli:          { fr: 'application, téléphone, suivre ses comptes', q: ['woman using smartphone app', 'banking app on phone', 'man scrolling phone', 'hands holding smartphone'] },
  projet:         { fr: 'projet, objectif, rêve, futur', q: ['couple planning future', 'new house keys', 'travel airplane window', 'woman writing goals notebook', 'couple looking at house', 'woman planning trip map', 'family moving new home'] },
  retraite:       { fr: 'retraite, plus tard, vieillir', q: ['senior couple walking beach', 'retired couple smiling', 'elderly man garden', 'grandparents relaxing'] },
  debutant:       { fr: 'débuter, apprendre, comprendre', q: ['young woman laptop learning', 'student studying notes', 'person taking notes laptop', 'reading book library'] },
  diversification:{ fr: 'diversification, répartition, panier, ne pas tout miser', q: ['fruit basket market', 'colorful puzzle pieces', 'assorted vegetables market stall', 'eggs in basket'] },
  monde:          { fr: 'monde, international, économie mondiale', q: ['city skyline aerial', 'container ship harbor', 'busy city street crowd', 'airplane taking off sunset'] },
  hesitation:     { fr: 'hésitation, doute, stress, frustration', q: ['man stressed laptop', 'woman worried looking at bills', 'thoughtful man window', 'frustrated woman computer', 'woman thinking laptop', 'man confused paperwork', 'person sighing desk'] },
  reussite:       { fr: 'satisfaction, réussite, bonne décision', q: ['happy woman laptop', 'man smiling phone', 'friends celebrating', 'woman satisfied coffee', 'woman smiling success office', 'couple celebrating home', 'man happy laptop'] },
  entreprises:    { fr: 'entreprises, sociétés, économie réelle', q: ['office team meeting', 'factory production line', 'business district skyscrapers', 'people working office'] },
  immobilier:     { fr: 'immobilier, logement, maison', q: ['modern house exterior', 'apartment interior sunny', 'house keys hand', 'city apartments buildings'] },
  inflation:      { fr: 'inflation, prix, pouvoir d\'achat, courses', q: ['supermarket shopping cart', 'grocery shopping prices', 'woman checking receipt supermarket', 'woman shopping groceries'] },
  banque:         { fr: 'banque, compte, conseiller', q: ['bank building exterior', 'bank counter', 'atm cash withdrawal', 'bank card close up'] },
  kapitaro:       { fr: 'conclusion : essayer Kapitaro sur son téléphone', q: ['smiling woman using smartphone', 'man smiling phone sofa', 'woman phone coffee shop', 'young man using phone', 'woman smiling phone street', 'man using phone cafe', 'young woman scrolling phone smiling'] },
};
// Secours sans IA : repère le thème d'après les mots de la phrase
const THEME_WORDS = [
  ['securite', /s[ée]curit|prot[ée]g|filet|pr[ée]caution|abri/i], ['baisse', /baiss|chut|descend|volatil|recul/i], ['hausse', /hauss|cro[iî]|monte|progress|rendement/i],
  ['bourse', /bourse|march[ée]|action|cotation|indice|etf/i], ['frais', /frais|co[uû]t|commission|facture/i], ['epargne', /[ée]pargn|[ée]conom|livret|de c[ôo]t[ée]/i],
  ['temps', /temps|long terme|ann[ée]e|patien|dur[ée]e/i], ['diversification', /diversif|r[ée]parti|panier|m[ée]lang/i], ['projet', /projet|objectif|r[êe]ve|futur/i],
  ['retraite', /retrait/i], ['famille', /famille|enfant/i], ['inflation', /inflation|prix|pouvoir d'achat/i], ['appli', /appli|t[ée]l[ée]phone|kapitaro/i],
  ['hesitation', /doute|h[ée]sit|stress|peur|inqui/i], ['argent', /argent|budget|euro|€/i],
];
const BANNED = /(le temps|long terme|longue dur[ée]e).{0,20}(absorbe|efface|gomme|lisse|compense|rattrape)|(long terme|longue dur[ée]e|le temps|historiquement).{0,60}(baisses?|pertes?|variations?|à-coups).{0,30}(p[èe]s|compt|s.estomp|s.att[ée]nu|absorb|lisse|moins)|(baisses?|pertes?).{0,40}(long terme|longue dur[ée]e).{0,20}(moins|p[èe]s)|compens|rattrap|finit (toujours )?par remonter|remonte(nt)? toujours|efface(nt)? (les )?(pertes|baisses)|sans (aucun )?risque|garanti(e|s)? (de|à) (gagner|gain)|argent facile|devenir riche|panique/i;
const safeBeats = beats => beats.filter(b => !BANNED.test(b.say || '') && !BANNED.test((b.lines || []).join(' ')));
const themeOf = say => (THEME_WORDS.find(([, re]) => re.test(say)) || ['bourse'])[0];

// Style « vidéo réelle » : uniquement des plans filmés (banque de vidéos), texte court en surimpression
export const REEL_SYSTEM_REAL = `Tu es le réalisateur des vidéos courtes (Reels Instagram, TikTok) de Kapitaro, une app française qui aide les particuliers à suivre et comprendre leurs placements.
Tu transformes un post en script de VIDÉO RÉELLE de 20 à 30 secondes : chaque scène est un vrai plan filmé (banque de vidéos), avec une voix off et un texte très court en surimpression. Aucune animation, aucun graphique dessiné. Ton : élégant mais ÉNERGIQUE, qui donne envie de prendre son épargne en main : phrases courtes et percutantes, questions directes, ponctuation expressive, en tutoyant.

RÈGLES ABSOLUES (réglementation AMF) :
- Contenu éducatif uniquement. Jamais de conseil personnalisé, jamais de recommandation d'acheter ou de vendre un titre, un fonds ou une crypto précis.
- Aucune prédiction, aucune promesse de gain, aucun rendement garanti : tout rendement est « hypothétique ». Rappelle le risque de perte en une phrase quand la vidéo parle d'investir.
- N'utilise que les chiffres présents dans le post ou dans les faits vérifiés fournis. N'invente rien.
- Jamais de promesse d'enrichissement : pas d'images d'argent facile ni de luxe tape-à-l'œil (voitures de sport, yachts, liasses de billets, jets). Montre plutôt des projets de vie sereins et soignés.
- Émotions permises : légère frustration ou hésitation face à ses comptes, puis sérénité. Jamais de panique ni de peur (pas le mot « panique »).
- N'affirme jamais que le temps efface les pertes, que les hausses compensent les baisses ou que le marché finit toujours par remonter : le long terme réduit l'effet des variations mais ne garantit rien.
- Le texte à l'écran et la phrase dite doivent correspondre au plan filmé choisi pour la scène.

FORMAT : réponds UNIQUEMENT avec un tableau JSON de 7 à 10 scènes, sans texte autour. 45 à 75 mots au total dans les champs "say".
Chaque scène : {"v": "shot" | "number" | "cta", "say": "phrase dite par la voix", "lines": ["texte à l'écran"], "theme": "thème du plan filmé"}
- "say" : UNE phrase courte (3 à 14 mots), naturelle à l'oral. Écris les nombres EN LETTRES.
- "lines" : 1 ou 2 lignes très courtes (2 à 18 caractères chacune) qui résument la phrase. Entoure 1 mot clé d'astérisques (*mot*).
- "theme" (obligatoire) : le plan filmé qui illustre LE SENS de la phrase dite, choisi dans cette liste (clé : idée illustrée) :
${Object.entries(SHOT_THEMES).map(([k, t]) => `  ${k} : ${t.fr}`).join('\n')}
  Exemples : « ton épargne de sécurité » → securite ; « le marché baisse » → baisse ; « les frais grignotent ton rendement » → frais ; « sur vingt ans » → temps. Évite le même thème deux scènes de suite.
- "number" : un chiffre marquant en surimpression. Champs en plus : "value" (max 10 car., uniquement des faits vérifiés ou du post), "sub" (max 40 car.).
- "cta" : toujours la dernière scène, "say" invite à essayer gratuitement Kapitaro (lien en bio), "theme" : kapitaro.`;

const DUO_RULE = `
MODE DUO : ajoute à chaque scène "voice": 0 ou 1. La voix 1 accroche et relance (questions, réactions courtes), la voix 0 explique. La 1re scène est en voix 1, la conclusion en voix 0, et chaque voix parle au moins 3 fois.`;

function cleanBeat(b, post, duo) {
  if (!b || !TYPES.includes(b.v) || !/[\p{L}\p{N}]/u.test(b.say || '')) return null;
  const o = { v: b.v, say: clip(b.say, 180).replace(/\s+/g, ' ') };
  o.lines = (Array.isArray(b.lines) ? b.lines : []).filter(x => typeof x === 'string' && x.trim()).slice(0, 3).map(x => clip(x, 24));
  if (b.sub) o.sub = clip(b.sub, 90);
  if (ICONS.includes(b.icon)) o.icon = b.icon;
  if (duo) o.voice = b.voice === 1 ? 1 : 0;
  if (o.v === 'number') {
    o.value = clip(String(b.value || ''), 14);
    if (!/\d/.test(o.value)) { o.v = 'title'; if (!o.lines.length) o.lines = [o.value]; delete o.value; }
  }
  if (o.v === 'chart') {
    const m = Number(b.monthly), y = Number(b.years), r = (Array.isArray(b.rates) ? b.rates : []).map(Number).filter(x => [3, 5, 7].includes(x)).sort((a, c) => a - c);
    if (![50, 100, 200].includes(m) || ![10, 20, 30].includes(y) || r.length !== 2 || r[0] === r[1]) { o.v = 'title'; }
    else { Object.assign(o, { monthly: m, years: y, rates: r, step: [1, 2, 3].includes(Number(b.step)) ? Number(b.step) : 3, cues: r.map(x => RATE_WORDS[x]) }); }
  }
  if (o.v === 'compare') {
    o.rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, 2).map(r => ({ label: clip(r?.label, 30), value: clip(String(r?.value ?? ''), 16), amount: Math.max(0, Number(r?.amount) || 0) }));
    if (o.rows.length !== 2 || !o.rows.every(r => r.label && r.value)) { o.v = 'title'; delete o.rows; }
  }
  if (o.v === 'steps' || o.v === 'list') {
    o.items = (Array.isArray(b.items) ? b.items : []).filter(x => typeof x === 'string' && x.trim()).slice(0, 4).map(x => clip(x, 44));
    if (o.items.length < 2) { o.v = 'title'; delete o.items; }
  }
  if (o.v === 'market' || o.v === 'agenda') {
    const slide = (post.slides || []).find(s => s.t === o.v && Array.isArray(s.rows) && s.rows.length);
    if (!slide) o.v = 'title';
    else { o.rows = slide.rows.slice(0, o.v === 'market' ? 6 : 5); if (slide.note) o.note = clip(slide.note, 110); }
  }
  if (!o.lines.length && ['hook', 'title', 'warn', 'quote'].includes(o.v)) o.lines = [clip(o.say.split(' ').slice(0, 3).join(' '), 24)];
  return o;
}

// Script de la vidéo à partir du post (l'IA ne voit que le contenu du post et les faits vérifiés)
const REAL_FALLBACK = ['business district skyscrapers', 'stock market chart screen', 'woman checking banking app', 'calm man working laptop', 'coins stack close up', 'city street evening lights'];
function cleanBeatReal(b, duo, i) {
  if (!b || !['shot', 'number', 'cta'].includes(b.v) || !/[\p{L}\p{N}]/u.test(b.say || '')) return null;
  const o = { v: b.v, say: clip(b.say, 180).replace(/\s+/g, ' ') };
  o.lines = (Array.isArray(b.lines) ? b.lines : []).filter(x => typeof x === 'string' && x.trim()).slice(0, 2).map(x => clip(x, 30));
  const theme = SHOT_THEMES[b.theme] ? b.theme : (b.v === 'cta' ? 'kapitaro' : themeOf(o.say));
  o.theme = theme; o.broll_queries = SHOT_THEMES[theme].q; o.broll = o.broll_queries[0];
  if (o.v === 'number') { o.value = clip(String(b.value || ''), 14); if (b.sub) o.sub = clip(b.sub, 60); if (!/\d/.test(o.value)) { o.v = 'shot'; delete o.value; } }
  if (duo) o.voice = b.voice === 1 ? 1 : 0;
  return o;
}

export async function writeReelScript({ post, duo, askClaude, facts, style }) {
  const content = JSON.stringify({ titre: post.title, diapositives: post.slides, legende: post.caption });
  if (style === 'real') {
    const arr = await askClaude(`Transforme ce post en script de vidéo réelle :\n${content}\n\nFaits vérifiés utilisables :\n${facts}${duo ? DUO_RULE : ''}`, REEL_SYSTEM_REAL + (duo ? DUO_RULE : ''));
    const beats = safeBeats(arr.map((b, i) => cleanBeatReal(b, duo, i)).filter(Boolean)).slice(0, 12);
    if (beats.length < 4) throw new Error('Script vidéo inexploitable, réessaie');
    if (beats[beats.length - 1].v !== 'cta') beats.push({ v: 'cta', say: 'Simule ton projet gratuitement sur Kapitaro, lien en bio.', lines: ['Simule', 'ton *projet*'], theme: 'kapitaro', broll_queries: SHOT_THEMES.kapitaro.q, broll: SHOT_THEMES.kapitaro.q[0], ...(duo ? { voice: 0 } : {}) });
    return beats;
  }
  const arr = await askClaude(`Transforme ce post en script de vidéo animée :\n${content}\n\nFaits vérifiés utilisables :\n${facts}${duo ? DUO_RULE : ''}`, REEL_SYSTEM + (duo ? DUO_RULE : ''));
  const beats = safeBeats(arr.map(b => cleanBeat(b, post, duo)).filter(Boolean)).slice(0, 14);
  if (beats.length < 4) throw new Error('Script vidéo inexploitable, réessaie');
  if (beats[beats.length - 1].v !== 'cta') beats.push({ v: 'cta', say: 'Simule ton projet gratuitement sur Kapitaro, lien en bio.', lines: ['Simule', 'ton *projet*'], ...(duo ? { voice: 0 } : {}) });
  return beats;
}

// ── Voix ElevenLabs avec minutage de chaque caractère → minutage de chaque mot ──
async function elevenTts(text, voiceId, speed = 1.08) {
  let last = '';
  for (const model of [...new Set([process.env.ELEVENLABS_MODEL || 'eleven_v4', 'eleven_v3', 'eleven_multilingual_v2'])]) {
    // v3/v4 : stabilité « créative » (plus d'expression) ; v2 : expressivité et débit réglés finement
    const settings = model === 'eleven_multilingual_v2'
      ? { stability: speed > 1.1 ? 0.25 : 0.32, similarity_boost: 0.8, style: speed > 1.1 ? 0.7 : 0.5, use_speaker_boost: true, speed }
      : { stability: 0, speed };
    for (const voice_settings of [settings, { speed }, null]) {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
        method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(voice_settings ? { text, model_id: model, voice_settings } : { text, model_id: model }), signal: AbortSignal.timeout(60000),
      });
      if (r.ok) { const j = await r.json(); return { audio: Buffer.from(j.audio_base64, 'base64'), al: j.alignment || j.normalized_alignment, model }; }
      last = (await r.text()).slice(0, 200);
      if (r.status === 401 || r.status === 402) throw new Error('Voix ElevenLabs indisponible : ' + last);
      if (r.status !== 400 && r.status !== 422) break;   // réglage refusé → on réessaie sans ; autre erreur → modèle suivant
    }
  }
  throw new Error('Voix ElevenLabs indisponible : ' + last);
}

// Regroupe les scènes consécutives d'une même voix (intonation naturelle), place les voix bout à bout, minute chaque mot
export async function voiceOver({ beats, voices, sb, id, speed }) {
  const groups = [];
  beats.forEach((b, i) => { const v = b.voice || 0; if (groups.length && groups[groups.length - 1].voice === v) groups[groups.length - 1].idx.push(i); else groups.push({ voice: v, idx: [i] }); });
  const segments = []; let cursor = 0.15, prevEnd = null;
  for (let g = 0; g < groups.length; g++) {
    const voice = voices[groups[g].voice] || voices[0];
    let text = ''; const spans = [];
    for (const i of groups[g].idx) { if (text) text += ' '; spans.push({ i, from: text.length }); text += beats[i].say; spans[spans.length - 1].to = text.length; }
    const { audio, al, model } = await elevenTts(text, voice.id, speed);
    sb.from('ai_usage_log').insert({ user_id: null, model: 'elevenlabs:' + (model || ''), input_tokens: text.length, output_tokens: 0, cost_usd: 0, call_label: 'studio:voix' }).then(() => {}, () => {});
    const starts = al?.character_start_times_seconds || [], ends = al?.character_end_times_seconds || [];
    const exact = starts.length === text.length;
    const total = ends.length ? ends[ends.length - 1] : 2;
    const at = k => exact ? starts[k] : (k / text.length) * total, until = k => exact ? ends[k] : ((k + 1) / text.length) * total;
    for (const s of spans) {
      const b = beats[s.i], words = [];
      const re = /\S+/g; let m;
      while ((m = re.exec(b.say))) {
        const a = s.from + m.index, z = a + m[0].length - 1;
        words.push({ w: m[0].replace(/[,.:;!?…]+$/, ''), t: cursor + at(a), e: cursor + until(z) });
      }
      const first = words.length ? words[0].t : cursor, lastEnd = words.length ? words[words.length - 1].e : cursor + 1;
      b.start = s.i === 0 ? 0 : Math.max(prevEnd ?? 0, first - 0.12);
      if (s.i > 0) beats[s.i - 1].end = b.start;
      b.end = lastEnd + 0.2;
      b.words = words.filter(w => w.w).map(w => ({ w: w.w, t: w.t - b.start, d: Math.max(0.08, w.e - w.t) }));
      prevEnd = b.start;
    }
    const path = `${id}/voice-${Date.now()}-${g}.mp3`;
    const up = await sb.storage.from('social').upload(path, audio, { contentType: 'audio/mpeg', upsert: true });
    if (up.error) throw up.error;
    segments.push({ url: sb.storage.from('social').getPublicUrl(path).data.publicUrl, start: cursor });
    cursor += total + 0.35;
  }
  return segments;
}

// Lance la fabrication sur GitHub Actions (même branche que ce déploiement : dev pour la version d'essai, main en production)
export async function dispatchRender(id) {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) throw new Error('Fabrication non branchée : ajoute GITHUB_DISPATCH_TOKEN dans Vercel');
  const repo = process.env.GITHUB_REPO || 'maxencedemaced-prog/investiq';
  const ref = process.env.VERCEL_GIT_COMMIT_REF || 'main';
  const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/reel.yml/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'kapitaro-studio', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref, inputs: { post_id: id } }),
  });
  if (r.status !== 204) throw new Error(`GitHub a refusé le lancement (${r.status}) : ${(await r.text()).slice(0, 160)}`);
}

export { EDGE_VOICES };
