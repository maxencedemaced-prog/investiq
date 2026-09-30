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

// Style « vidéo réelle » : uniquement des plans filmés (banque de vidéos), texte court en surimpression
export const REEL_SYSTEM_REAL = `Tu es le réalisateur des vidéos courtes (Reels Instagram, TikTok) de Kapitaro, une app française qui aide les particuliers à suivre et comprendre leurs placements.
Tu transformes un post en script de VIDÉO RÉELLE de 20 à 30 secondes : chaque scène est un vrai plan filmé (banque de vidéos), avec une voix off et un texte très court en surimpression. Aucune animation, aucun graphique dessiné. Ton : élégant mais ÉNERGIQUE, qui donne envie de prendre son épargne en main : phrases courtes et percutantes, questions directes, ponctuation expressive, en tutoyant.

RÈGLES ABSOLUES (réglementation AMF) :
- Contenu éducatif uniquement. Jamais de conseil personnalisé, jamais de recommandation d'acheter ou de vendre un titre, un fonds ou une crypto précis.
- Aucune prédiction, aucune promesse de gain, aucun rendement garanti : tout rendement est « hypothétique ». Rappelle le risque de perte en une phrase quand la vidéo parle d'investir.
- N'utilise que les chiffres présents dans le post ou dans les faits vérifiés fournis. N'invente rien.
- Jamais de promesse d'enrichissement : pas d'images d'argent facile ni de luxe tape-à-l'œil (voitures de sport, yachts, liasses de billets, jets). Montre plutôt des projets de vie sereins et soignés.
- Émotions permises : légère frustration ou hésitation face à ses comptes, puis sérénité. Jamais de panique ni de peur.

FORMAT : réponds UNIQUEMENT avec un tableau JSON de 7 à 10 scènes, sans texte autour. 45 à 75 mots au total dans les champs "say".
Chaque scène : {"v": "shot" | "number" | "cta", "say": "phrase dite par la voix", "lines": ["texte à l'écran"], "broll": "plan filmé"}
- "say" : UNE phrase courte (3 à 14 mots), naturelle à l'oral. Écris les nombres EN LETTRES.
- "lines" : 1 ou 2 lignes très courtes (2 à 18 caractères chacune) qui résument la phrase. Entoure 1 mot clé d'astérisques (*mot*).
- "broll" (obligatoire, 3 à 6 mots EN ANGLAIS) : un plan concret et filmable, tous différents d'une scène à l'autre. Exemples : « stock market chart screen », « trader monitors financial data », « business district skyscrapers », « woman checking banking app », « frustrated man looking at bills », « couple planning budget at table », « calm woman working laptop cafe », « coins stack close up », « sunny modern apartment interior », « family walking beach sunset », « elegant watch businessman city ».
- "number" : un chiffre marquant en surimpression. Champs en plus : "value" (max 10 car., uniquement des faits vérifiés ou du post), "sub" (max 40 car.).
- "cta" : toujours la dernière scène, "say" invite à essayer gratuitement Kapitaro (lien en bio), "broll" montre une personne sereine avec son téléphone.`;

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
  o.lines = (Array.isArray(b.lines) ? b.lines : []).filter(x => typeof x === 'string' && x.trim()).slice(0, 2).map(x => clip(x, 22));
  const q = typeof b.broll === 'string' ? b.broll.replace(/[^A-Za-z ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) : '';
  o.broll = q.length > 2 ? q : REAL_FALLBACK[i % REAL_FALLBACK.length];
  if (o.v === 'number') { o.value = clip(String(b.value || ''), 14); if (b.sub) o.sub = clip(b.sub, 60); if (!/\d/.test(o.value)) { o.v = 'shot'; delete o.value; } }
  if (duo) o.voice = b.voice === 1 ? 1 : 0;
  return o;
}

export async function writeReelScript({ post, duo, askClaude, facts, style }) {
  const content = JSON.stringify({ titre: post.title, diapositives: post.slides, legende: post.caption });
  if (style === 'real') {
    const arr = await askClaude(`Transforme ce post en script de vidéo réelle :\n${content}\n\nFaits vérifiés utilisables :\n${facts}${duo ? DUO_RULE : ''}`, REEL_SYSTEM_REAL + (duo ? DUO_RULE : ''));
    const beats = arr.map((b, i) => cleanBeatReal(b, duo, i)).filter(Boolean).slice(0, 12);
    if (beats.length < 4) throw new Error('Script vidéo inexploitable, réessaie');
    if (beats[beats.length - 1].v !== 'cta') beats.push({ v: 'cta', say: 'Simule ton projet gratuitement sur Kapitaro, lien en bio.', lines: ['Simule', 'ton *projet*'], broll: 'smiling woman using smartphone', ...(duo ? { voice: 0 } : {}) });
    return beats;
  }
  const arr = await askClaude(`Transforme ce post en script de vidéo animée :\n${content}\n\nFaits vérifiés utilisables :\n${facts}${duo ? DUO_RULE : ''}`, REEL_SYSTEM + (duo ? DUO_RULE : ''));
  const beats = arr.map(b => cleanBeat(b, post, duo)).filter(Boolean).slice(0, 14);
  if (beats.length < 4) throw new Error('Script vidéo inexploitable, réessaie');
  if (beats[beats.length - 1].v !== 'cta') beats.push({ v: 'cta', say: 'Simule ton projet gratuitement sur Kapitaro, lien en bio.', lines: ['Simule', 'ton *projet*'], ...(duo ? { voice: 0 } : {}) });
  return beats;
}

// ── Voix ElevenLabs avec minutage de chaque caractère → minutage de chaque mot ──
async function elevenTts(text, voiceId) {
  let last = '';
  for (const model of [...new Set([process.env.ELEVENLABS_MODEL || 'eleven_v4', 'eleven_v3', 'eleven_multilingual_v2'])]) {
    // v3/v4 : stabilité « créative » (plus d'expression) ; v2 : expressivité et débit réglés finement
    const settings = model === 'eleven_multilingual_v2'
      ? { stability: 0.32, similarity_boost: 0.8, style: 0.5, use_speaker_boost: true, speed: 1.08 }
      : { stability: 0, speed: 1.08 };
    for (const voice_settings of [settings, { speed: 1.08 }, null]) {
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
export async function voiceOver({ beats, voices, sb, id }) {
  const groups = [];
  beats.forEach((b, i) => { const v = b.voice || 0; if (groups.length && groups[groups.length - 1].voice === v) groups[groups.length - 1].idx.push(i); else groups.push({ voice: v, idx: [i] }); });
  const segments = []; let cursor = 0.15, prevEnd = null;
  for (let g = 0; g < groups.length; g++) {
    const voice = voices[groups[g].voice] || voices[0];
    let text = ''; const spans = [];
    for (const i of groups[g].idx) { if (text) text += ' '; spans.push({ i, from: text.length }); text += beats[i].say; spans[spans.length - 1].to = text.length; }
    const { audio, al } = await elevenTts(text, voice.id);
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
