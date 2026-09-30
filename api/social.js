// api/social.js — SÉCURISÉ : Studio réseaux sociaux, réservé au compte admin.
//   GET                          → liste des posts
//   POST {action:'generate', mode, count, topic} → l'IA prépare des brouillons :
//        mode 'weekly' (agenda + pédagogie), 'pedago', 'agenda' (rendez-vous éco réels), 'recap' (marchés réels), topic = actu décrite
//   GET ?cron=recap                          → bilan des marchés du vendredi soir
//   POST {action:'update', id, fields}       → modifie un post (texte, date, réseaux, statut)
//   POST {action:'upload', id, index, png}   → enregistre une image finale (PNG en base64) dans le stockage public
//   POST {action:'delete', id}
//   POST {action:'reel-config'}             → voix disponibles pour les vidéos animées
//   POST {action:'reel-create', id, voice}  → script vidéo (IA) + voix off, puis fabrication sur GitHub Actions (voir api/_reel.js)
//   POST {action:'reel-render', id}         → relance la fabrication avec le script existant
//   GET ?cron=weekly (Authorization: Bearer CRON_SECRET) → lot automatique du dimanche
// La clé Anthropic et la clé service Supabase ne quittent jamais le serveur.

import { createClient } from '@supabase/supabase-js';
import { reelConfig, reelVoices, writeReelScript, voiceOver, dispatchRender } from './_reel.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_3_8eb6YbCfJ04Qihdy9ivw_NsQ4H_cu';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'maxencedemacedo@gmail.com';
const MODEL = 'claude-sonnet-5';
const sb = process.env.SUPABASE_SERVICE_KEY ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

const allowedOrigin = (o) => o === 'https://kapitaro.fr' || o === 'https://www.kapitaro.fr' || /^https:\/\/investiq-[a-z0-9-]+\.vercel\.app$/.test(o);
const TEMPLATES = ['cover', 'text', 'number', 'list', 'steps', 'myth', 'versus', 'quote', 'compare', 'market', 'agenda', 'cta'];
const COLOR_THEMES = ['nuit', 'clair', 'violet', 'ocean', 'soleil'];   // + 'actu' pour les posts d'actualité

// Sujets de fond, tirés au sort pour varier les lots (pédagogie, jamais de recommandation de titre)
const SUBJECTS = [
  'les intérêts composés', "l'investissement programmé (investir chaque mois)", "qu'est-ce qu'un ETF", 'la diversification',
  "l'épargne de précaution", 'les frais et leur impact sur le long terme', 'le PEA expliqué simplement', "l'assurance vie expliquée simplement",
  'la différence entre épargner et investir', "l'inflation et ton pouvoir d'achat", 'les erreurs de débutant', 'fixer un objectif financier',
  'la volatilité et les baisses de marché', "le temps, meilleur allié de l'investisseur", 'les dividendes et leur réinvestissement',
  'actions, obligations, livrets : les différences', 'garder son calme quand les marchés baissent', 'le budget et la règle 50/30/20',
  "les biais psychologiques de l'investisseur", 'lire la répartition de son portefeuille', 'les taux directeurs expliqués simplement',
  'une action, c\'est quoi exactement ?', 'le compte-titres expliqué simplement', 'combien investir quand on débute',
];

// Formats éditoriaux : chaque post du lot en reçoit un différent, pour que le fil ne se ressemble pas
const FORMATS = [
  { key: 'mythes', label: 'Idées reçues', hint: '3 diapositives « myth » (idée reçue / réalité), puis une conclusion' },
  { key: 'etapes', label: 'Pas à pas', hint: 'une diapositive « steps » avec 4 étapes concrètes, encadrée de diapositives « text »' },
  { key: 'versus', label: 'Comparatif', hint: 'au moins une diapositive « versus » (deux colonnes), puis ce qu\'il faut retenir' },
  { key: 'erreurs', label: 'Erreurs à éviter', hint: '3 diapositives « text » avec kicker « Erreur n°1/2/3 », puis une « list » récapitulative' },
  { key: 'question', label: 'Question de la communauté', hint: 'la couverture pose une vraie question de débutant, les diapositives y répondent simplement, une « quote » résume la réponse' },
  { key: 'checklist', label: 'Check-list', hint: 'une diapositive « list » de 4 points à vérifier, avec des diapositives « text » d\'explication' },
  { key: 'chiffre', label: 'Le chiffre qui parle', hint: 'une seule diapositive « number » avec un chiffre des faits vérifiés, expliqué ensuite' },
];

// Faits chiffrés vérifiés (calculés ici) : l'IA n'a le droit d'utiliser que ceux-là
function fv(monthly, years, ratePct) {
  const i = ratePct / 100 / 12, n = years * 12;
  return monthly * ((Math.pow(1 + i, n) - 1) / i);
}
function verifiedFacts() {
  const rows = [];
  for (const m of [50, 100, 200]) for (const y of [10, 20, 30]) for (const r of [3, 5, 7]) {
    rows.push(`${m} €/mois pendant ${y} ans à ${r} %/an : ${Math.round(m * 12 * y).toLocaleString('fr-FR')} € versés → ≈ ${Math.round(fv(m, y, r) / 100) * 100} € (arrondi)`);
  }
  rows.push('Épargne de précaution : règle courante de 3 à 6 mois de dépenses indispensables.');
  return rows.join('\n');
}

const SYSTEM = `Tu es le responsable éditorial de Kapitaro, une app française qui aide les particuliers à suivre et comprendre leurs placements.
Tu écris des carrousels pour Instagram, Facebook, LinkedIn et TikTok : pédagogiques, clairs, chaleureux, en français, en tutoyant. Chaque post doit avoir sa personnalité : varie les accroches, le ton (curieux, rassurant, direct, amusé) et la structure.

RÈGLES ABSOLUES (réglementation AMF) :
- Contenu éducatif uniquement. Jamais de conseil personnalisé, jamais de recommandation d'acheter ou de vendre un titre, un fonds ou une crypto précis.
- Aucune prédiction de marché, aucune promesse de gain, aucun rendement présenté comme garanti. Tout rendement est « hypothétique ».
- N'utilise des chiffres précis QUE s'ils figurent dans les données fournies (faits vérifiés, données de marché, agenda). N'invente jamais de statistique, d'étude, de source ni d'explication causale.
- Pas de sensationnalisme ni de peur (pas de « krach », « tout perdre », « urgent »).
- N'utilise PAS la « règle des 72 », et pas plus d'une diapositive « number » par post.

FORMAT : réponds UNIQUEMENT avec un tableau JSON, sans texte autour. Chaque post :
{"title": "titre interne court",
 "slides": [ 5 à 7 objets ],
 "caption": "légende AÉRÉE, blocs séparés par une ligne vide (\\n\\n) : accroche (1 phrase avec un emoji) \\n\\n 2 à 4 phrases utiles \\n\\n une question pour faire réagir \\n\\n « 👉 … (lien en bio) » \\n\\n « Contenu éducatif, pas un conseil en investissement. »",
 "hashtags": "8 à 12 hashtags français pertinents, séparés par des espaces, dont #kapitaro"}
Types de diapositives (champ "t") :
- {"t":"cover","title":"accroche forte, max 70 car.","sub":"max 70 car.","emoji":"1 emoji facultatif","kicker":"étiquette facultative, max 20 car."}  ← toujours la 1re
- {"t":"text","kicker":"max 25 car.","title":"max 60 car.","body":"max 190 car."}
- {"t":"number","title":"contexte, max 45 car.","big":"chiffre court avec unité, ex. « 41 100 € » ou « 3 à 6 mois », max 12 car.","body":"max 150 car."}
- {"t":"list","title":"max 50 car.","items":["3 ou 4 éléments, max 55 car."],"note":"facultatif, max 110 car."}
- {"t":"steps","title":"max 50 car.","items":["3 ou 4 étapes, max 55 car."]}
- {"t":"myth","title":"facultatif, max 40 car.","myth":"idée reçue, max 90 car.","fact":"la réalité, max 130 car."}
- {"t":"versus","title":"max 45 car.","left":{"title":"max 18 car.","items":["3 éléments, max 30 car."]},"right":{…}}
- {"t":"quote","title":"phrase clé à retenir, max 100 car.","sub":"facultatif, max 70 car."}
- {"t":"compare","title":"max 60 car.","a":{"label":"…","value":"texte affiché","amount":nombre},"b":{…},"note":"max 110 car."}
- {"t":"cta","title":"max 45 car.","body":"max 110 car., invite vers un outil gratuit de kapitaro.fr ou l'app"}  ← toujours la dernière
Dans les titres, entoure 1 à 3 mots clés d'astérisques simples (*mot*) pour les mettre en couleur. Dans les textes, **double astérisque** pour le gras.
Outils gratuits existants à citer en fin de post quand c'est pertinent : simulateur d'intérêts composés, calculateur d'objectif d'épargne, simulateur de rendement d'un ETF MSCI World, calculateur d'épargne de précaution. L'app : suivi de portefeuille, score de santé sur 10, objectifs, assistant IA.`;

async function isAdmin(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return false;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON, Authorization: auth } });
  if (!r.ok) return false;
  const u = await r.json();
  return (u?.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

const clip = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');
const shuffle = a => [...a].sort(() => Math.random() - 0.5);
function cleanSlide(s) {
  if (!s || !TEMPLATES.includes(s.t)) return null;
  const out = { t: s.t };
  for (const k of ['title', 'sub', 'kicker', 'body', 'big', 'note', 'myth', 'fact']) if (typeof s[k] === 'string') out[k] = clip(s[k], 260);
  if (typeof s.emoji === 'string') out.emoji = clip(s.emoji, 8);
  if ([...COLOR_THEMES, 'actu'].includes(s.theme)) out.theme = s.theme;
  if (Array.isArray(s.items)) out.items = s.items.filter(x => typeof x === 'string').slice(0, 5).map(x => clip(x, 90));
  for (const k of ['a', 'b']) if (s[k] && typeof s[k] === 'object') out[k] = { label: clip(s[k].label, 40), value: clip(s[k].value, 20), amount: Number(s[k].amount) || 0 };
  for (const k of ['left', 'right']) if (s[k] && typeof s[k] === 'object') out[k] = { title: clip(s[k].title, 30), items: (Array.isArray(s[k].items) ? s[k].items : []).filter(x => typeof x === 'string').slice(0, 4).map(x => clip(x, 50)) };
  if (Array.isArray(s.rows)) out.rows = s.rows.slice(0, 7).map(r => ({ label: clip(r?.label, 60), value: clip(r?.value, 40), when: clip(r?.when, 24), detail: clip(r?.detail, 80), change: Number.isFinite(Number(r?.change)) ? Number(r.change) : null }));
  // Un « grand chiffre » doit être un vrai chiffre court (évite les formules du type « 72 ÷ % »)
  if (out.t === 'number' && (!/\d/.test(out.big || '') || (out.big || '').length > 14 || /[÷×=]/.test(out.big || ''))) {
    return { t: 'text', kicker: out.title || '', title: out.big && out.big.length <= 60 ? out.big : (out.title || ''), body: out.body || '' };
  }
  return out;
}
function cleanPost(p, theme) {
  const slides = (Array.isArray(p?.slides) ? p.slides : []).map(cleanSlide).filter(Boolean).slice(0, 8);
  if (slides.length < 3) return null;
  slides.forEach(s => { s.theme = theme; });   // même ambiance sur tout le carrousel
  return { title: clip(p.title, 120) || 'Post', slides, caption: clip(p.caption, 2100), hashtags: clip(p.hashtags, 400) };
}

// Prochains créneaux de publication : lundi, mercredi, vendredi à 18 h 30 (heure de Paris ≈ 16 h 30 UTC)
function nextSlots(count) {
  const slots = [], d = new Date();
  d.setUTCHours(16, 30, 0, 0);
  while (slots.length < count) {
    d.setUTCDate(d.getUTCDate() + 1);
    if ([1, 3, 5].includes(d.getUTCDay())) slots.push(new Date(d).toISOString());
  }
  return slots;
}
// Samedi suivant à 9 h 30 UTC (bilan de la semaine)
function nextSaturday() {
  const d = new Date();
  d.setUTCHours(9, 30, 0, 0);
  do { d.setUTCDate(d.getUTCDate() + 1); } while (d.getUTCDay() !== 6);
  return d.toISOString();
}

// ── Données réelles pour les posts d'actualité (jamais de données de secours inventées) ──
const DAYS_FR = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
async function fetchAgenda() {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error('FMP_API_KEY manquante : agenda indisponible');
  const from = new Date(), to = new Date(Date.now() + 7 * 86400000);
  const url = `https://financialmodelingprep.com/stable/economic-calendar?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}&apikey=${key}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  const data = await r.json().catch(() => null);
  if (!r.ok || !Array.isArray(data)) throw new Error('Agenda économique indisponible pour le moment, réessaie plus tard');
  const zones = { US: 'États-Unis', EA: 'Zone euro', EMU: 'Zone euro', EU: 'Zone euro', FR: 'France', DE: 'Allemagne', GB: 'Royaume-Uni', UK: 'Royaume-Uni' };
  const events = data.filter(e => (e.impact || '').toLowerCase() === 'high' && zones[e.country])
    .sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 8)
    .map(e => {
      const d = new Date(String(e.date).replace(' ', 'T') + 'Z');
      const paris = new Date(d.getTime() + 2 * 3600000);   // heure de Paris (été) : approximation affichée
      return { when: `${DAYS_FR[paris.getUTCDay()]} ${String(paris.getUTCHours()).padStart(2, '0')}h${String(paris.getUTCMinutes()).padStart(2, '0')}`, event: e.event, zone: zones[e.country], estimate: e.estimate ?? null, previous: e.previous ?? null };
    });
  if (!events.length) throw new Error('Aucun rendez-vous économique majeur trouvé pour les 7 prochains jours');
  return events;
}
const MARKETS = [
  { sym: '^FCHI', label: 'CAC 40', unit: 'pts' }, { sym: '^STOXX50E', label: 'Euro Stoxx 50', unit: 'pts' },
  { sym: '^GSPC', label: 'S&P 500', unit: 'pts' }, { sym: '^IXIC', label: 'Nasdaq', unit: 'pts' },
  { sym: 'GC=F', label: 'Or', unit: '$ l\'once' }, { sym: 'EURUSD=X', label: 'Euro / dollar', unit: '$' },
];
async function fetchMarkets() {
  const rows = await Promise.all(MARKETS.map(async m => {
    try {
      const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(m.sym)}?range=1mo&interval=1d`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
      const j = await r.json();
      const closes = (j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []).filter(v => typeof v === 'number');
      if (closes.length < 6) return null;
      const last = closes[closes.length - 1], prev = closes[closes.length - 6];
      const value = m.sym === 'EURUSD=X' ? last.toFixed(3).replace('.', ',') : Math.round(last).toLocaleString('fr-FR');
      return { label: m.label, value: `${value} ${m.unit}`, change: Math.round((last / prev - 1) * 1000) / 10 };
    } catch { return null; }
  }));
  const ok = rows.filter(Boolean);
  if (ok.length < 3) throw new Error('Données de marché indisponibles pour le moment, réessaie plus tard');
  return ok;
}
async function fetchHeadlines() {
  if (!process.env.FINNHUB_API_KEY) return [];
  try {
    const r = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${process.env.FINNHUB_API_KEY}`, { signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    const since = Date.now() / 1000 - 5 * 86400;
    return (Array.isArray(j) ? j : []).filter(n => n.datetime > since && n.headline).slice(0, 8).map(n => `${n.headline} (${n.source})`);
  } catch { return []; }
}

async function askClaude(prompt, system = SYSTEM) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY manquante');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 8000, system, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || 'Erreur IA');
  const text = (data.content || []).map(c => c.text || '').join('');
  try { const arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)); return Array.isArray(arr) ? arr : []; }
  catch { throw new Error('Réponse IA illisible, réessaie'); }
}

// Posts pédagogiques : sujets, formats et ambiances tous différents dans le lot
async function pedagogical(count, used) {
  const subjects = shuffle(SUBJECTS).slice(0, count), formats = shuffle(FORMATS).slice(0, count), themes = shuffle(COLOR_THEMES).slice(0, count);
  const plan = subjects.map((s, i) => `Post ${i + 1} : sujet « ${s} », format « ${formats[i].label} » (${formats[i].hint}).`).join('\n');
  const arr = await askClaude(`Écris ${count} posts pédagogiques, dans cet ordre :\n${plan}\nChaque post doit être très différent des autres (accroche, ton, structure). Évite de refaire ces posts déjà publiés : ${used.slice(0, 25).join(' | ') || 'aucun'}.\nFaits vérifiés utilisables :\n${verifiedFacts()}`);
  return arr.slice(0, count).map((p, i) => cleanPost(p, themes[i % themes.length])).filter(Boolean);
}

// Agenda : les rendez-vous économiques majeurs des 7 prochains jours (données FMP réelles)
async function agendaPost() {
  const events = await fetchAgenda();
  const list = events.map(e => `- ${e.when} · ${e.zone} · ${e.event}${e.estimate != null ? ` (prévision ${e.estimate})` : ''}${e.previous != null ? ` (précédent ${e.previous})` : ''}`).join('\n');
  const arr = await askClaude(`Écris 1 post « Les rendez-vous économiques de la semaine » à partir de ces événements réels (heures de Paris) :\n${list}\n
Structure : couverture (kicker « L'agenda de la semaine », emoji 📅), puis UNE diapositive {"t":"agenda","title":"…","rows":[{"when":"Mar. 14h30","label":"nom de l'événement traduit en français simple","detail":"zone, max 40 car."}]} avec 4 à 6 événements choisis parmi la liste (recopie exactement les jours et heures), puis 2 ou 3 diapositives « text » qui expliquent simplement ce que mesurent les 2 événements les plus importants et pourquoi les marchés les regardent, sans rien prédire, puis la cta.
Ajoute dans la légende « Ce post ne prédit pas l'évolution des marchés. ».`);
  const p = cleanPost(arr[0], 'actu');
  if (!p) throw new Error('Post agenda inexploitable, réessaie');
  return { ...p, kind: 'actu' };
}

// Bilan de la semaine : variations réelles sur 5 séances (tableau généré par le serveur, jamais par l'IA)
async function recapPost() {
  const [rows, headlines] = await Promise.all([fetchMarkets(), fetchHeadlines()]);
  const table = rows.map(r => `- ${r.label} : ${r.change > 0 ? '+' : ''}${String(r.change).replace('.', ',')} % sur 5 séances (${r.value})`).join('\n');
  const arr = await askClaude(`Écris 1 post « La semaine des marchés » à partir de ces données réelles :\n${table}\n${headlines.length ? `Titres d'actualité de la semaine (en anglais, sources indiquées) :\n${headlines.join('\n')}\n` : ''}
Structure : couverture (kicker « Bilan de la semaine », emoji 📈 ou 📉 selon la tendance générale), puis 2 ou 3 diapositives « text » qui résument les mouvements en français simple (tu peux citer 1 ou 2 titres d'actualité en précisant la source, SANS affirmer de lien de cause à effet), puis une diapositive « quote » qui rappelle une règle de bon sens de l'investisseur de long terme, puis la cta.
NE crée PAS de tableau de marché : il sera ajouté automatiquement en 2e position. Ajoute dans la légende « Données sur 5 séances. Les performances passées ne préjugent pas des performances futures. ».`);
  const p = cleanPost(arr[0], 'actu');
  if (!p) throw new Error('Post bilan inexploitable, réessaie');
  p.slides.splice(1, 0, { t: 'market', title: 'La semaine des *marchés*', rows: rows.map(r => ({ label: r.label, value: r.value, change: r.change })), note: 'Variations sur 5 séances, données de marché.', theme: 'actu' });
  return { ...p, kind: 'actu' };
}

// Post d'actualité sur un événement décrit par l'admin
async function topicPost(topic) {
  const arr = await askClaude(`Écris 1 post d'actualité sur cet événement, publié aujourd'hui : « ${clip(topic, 400)} ».
Angle : explique simplement ce que c'est et ce que ça peut changer concrètement pour l'épargne d'un particulier, sans rien prédire et sans dire quoi faire. Reste factuel : n'affirme que ce qui est contenu dans la description ci-dessus ; si un détail manque, reste général. Couverture avec kicker « Actu ». Ajoute dans la légende « Ce post ne prédit pas l'évolution des marchés. ».
Faits vérifiés utilisables :\n${verifiedFacts()}`);
  const p = cleanPost(arr[0], 'actu');
  if (!p) throw new Error('Post inexploitable, réessaie');
  return { ...p, kind: 'actu' };
}

// mode : 'weekly' (agenda + pédagogiques), 'pedago', 'agenda', 'recap', 'topic'
async function generate({ mode = 'weekly', count = 3, topic = '' }) {
  const { data: recent } = await sb.from('social_posts').select('title').order('created_at', { ascending: false }).limit(40);
  const used = (recent || []).map(r => r.title).filter(Boolean);
  let rows = [];
  if (mode === 'topic') rows = [{ ...(await topicPost(topic)), scheduled_at: new Date(Date.now() + 15 * 60000).toISOString() }];
  else if (mode === 'recap') rows = [{ ...(await recapPost()), scheduled_at: nextSaturday() }];
  else if (mode === 'agenda') rows = [{ ...(await agendaPost()), scheduled_at: nextSlots(1)[0] }];
  else {
    const slots = nextSlots(count);
    let agenda = null;
    if (mode === 'weekly') { try { agenda = await agendaPost(); } catch (e) { console.warn('[social] agenda :', e.message); } }
    const pedago = await pedagogical(agenda ? count - 1 : count, used);
    const list = agenda ? [agenda, ...pedago] : pedago;
    rows = list.map((p, i) => ({ kind: 'weekly', ...p, scheduled_at: slots[i] }));
  }
  if (!rows.length) throw new Error('Aucun post exploitable, réessaie');
  const { data: inserted, error } = await sb.from('social_posts').insert(rows.map(r => ({ ...r, status: 'draft' }))).select();
  if (error) throw error;
  return inserted;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (allowedOrigin(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!sb) return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY manquante' });

  try {
    // Tâches automatiques (cron Vercel) : lot du dimanche (agenda + pédagogie), bilan des marchés du vendredi soir
    if (req.method === 'GET' && (req.query.cron === 'weekly' || req.query.cron === 'recap')) {
      if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Non autorisé' });
      const { count: pending } = await sb.from('social_posts').select('id', { count: 'exact', head: true }).eq('status', 'draft');
      if ((pending || 0) >= 6) return res.status(200).json({ skipped: 'déjà assez de brouillons à valider' });
      const posts = await generate(req.query.cron === 'recap' ? { mode: 'recap' } : { mode: 'weekly', count: 3 });
      return res.status(200).json({ generated: posts.length });
    }

    if (!(await isAdmin(req))) return res.status(403).json({ error: 'Accès réservé.' });

    if (req.method === 'GET') {
      const { data, error } = await sb.from('social_posts').select('*').neq('status', 'rejected')
        .order('scheduled_at', { ascending: true, nullsFirst: false }).limit(100);
      if (error) throw error;
      return res.status(200).json({ posts: data });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const b = req.body || {};
    if (b.action === 'generate') {
      const mode = b.topic ? 'topic' : (['weekly', 'pedago', 'agenda', 'recap'].includes(b.mode) ? b.mode : 'weekly');
      const posts = await generate({ mode, count: Math.min(Math.max(parseInt(b.count, 10) || 3, 1), 5), topic: b.topic ? String(b.topic) : '' });
      return res.status(200).json({ posts });
    }
    if (b.action === 'update') {
      const f = b.fields || {}, upd = {};
      if (Array.isArray(f.slides)) { const s = f.slides.map(cleanSlide).filter(Boolean); if (s.length) upd.slides = s; }
      for (const k of ['title', 'caption', 'hashtags']) if (typeof f[k] === 'string') upd[k] = clip(f[k], k === 'caption' ? 2100 : 400);
      if (['draft', 'approved', 'published', 'rejected'].includes(f.status)) upd.status = f.status;
      if (f.scheduled_at === null || !isNaN(Date.parse(f.scheduled_at))) upd.scheduled_at = f.scheduled_at;
      if (Array.isArray(f.platforms)) upd.platforms = f.platforms.filter(p => ['instagram', 'facebook', 'linkedin', 'tiktok'].includes(p));
      if (Array.isArray(f.image_urls)) upd.image_urls = f.image_urls.filter(u => typeof u === 'string' && u.startsWith(SUPABASE_URL)).slice(0, 10);
      if (f.format === 'carousel' || f.format === 'reel') upd.format = f.format;
      if (f.video_url === null || (typeof f.video_url === 'string' && f.video_url.startsWith(`${SUPABASE_URL}/storage/v1/object/public/social/`))) upd.video_url = f.video_url;
      if (f.status === 'published') upd.published_at = new Date().toISOString();
      const { data, error } = await sb.from('social_posts').update(upd).eq('id', b.id).select().single();
      if (error) throw error;
      return res.status(200).json({ post: data });
    }
    if (b.action === 'upload') {
      // JPEG (format exigé par Instagram) ; PNG accepté pour compatibilité
      const raw = typeof (b.image || b.png) === 'string' ? (b.image || b.png) : '';
      const buf = Buffer.from(raw.replace(/^data:image\/(png|jpeg);base64,/, ''), 'base64');
      if (!/^[0-9a-f-]{36}$/i.test(String(b.id)) || !Number.isInteger(b.index) || b.index < 0 || b.index > 9) return res.status(400).json({ error: 'Paramètres invalides' });
      const isJpeg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
      const isPng = buf.length > 4 && buf.readUInt32BE(0) === 0x89504e47;
      if (buf.length < 1000 || buf.length > 4_000_000 || !(isJpeg || isPng)) return res.status(400).json({ error: 'Image invalide' });
      const path = `${b.id}/${b.index + 1}-${Date.now()}.${isJpeg ? 'jpg' : 'png'}`;
      const { error } = await sb.storage.from('social').upload(path, buf, { contentType: isJpeg ? 'image/jpeg' : 'image/png', upsert: true });
      if (error) throw error;
      const { data } = sb.storage.from('social').getPublicUrl(path);
      return res.status(200).json({ url: data.publicUrl });
    }
    // Vidéo (trop lourde pour passer par ce serveur) : lien d'envoi signé, le navigateur l'envoie directement au stockage
    if (b.action === 'video-upload-url') {
      if (!/^[0-9a-f-]{36}$/i.test(String(b.id))) return res.status(400).json({ error: 'Post invalide' });
      const path = `${b.id}/video-${Date.now()}.mp4`;
      const { data, error } = await sb.storage.from('social').createSignedUploadUrl(path);
      if (error) throw error;
      const { data: pub } = sb.storage.from('social').getPublicUrl(path);
      return res.status(200).json({ path, token: data.token, publicUrl: pub.publicUrl });
    }
    // ── Vidéos animées (Reels) ──
    if (b.action === 'reel-config') return res.status(200).json(await reelConfig());
    if (b.action === 'reel-create' || b.action === 'reel-render') {
      if (!/^[0-9a-f-]{36}$/i.test(String(b.id))) return res.status(400).json({ error: 'Post invalide' });
      const { data: post, error } = await sb.from('social_posts').select('*').eq('id', b.id).single();
      if (error) throw error;
      let script = post.video_script || {};
      if (b.action === 'reel-create') {
        const voices = await reelVoices(), duo = b.voice === 'duo' && voices.length > 1;
        const pick = duo ? voices.slice(0, 2) : [voices[Math.min(Math.max(parseInt(b.voice, 10) || 0, 0), voices.length - 1)]];
        const style = b.style === 'real' ? 'real' : 'motion';
        const beats = await writeReelScript({ post, duo, askClaude, facts: verifiedFacts(), style });
        const segments = pick[0].id ? await voiceOver({ beats, voices: pick, sb, id: post.id }) : [];
        script = { v: 1, style, voice: pick.map(v => v.name).join(' + '), beats, segments, edge_voices: pick[0].id ? undefined : pick.map(v => v.edge), created_at: new Date().toISOString() };
      } else if (!Array.isArray(script.beats) || !script.beats.length) return res.status(400).json({ error: "Aucun script vidéo : crée d'abord la vidéo animée" });
      let status = 'queued', err = null;
      try { await dispatchRender(post.id); } catch (e) { status = 'error'; err = e.message; }
      const { data, error: e2 } = await sb.from('social_posts').update({ video_script: { ...script, status, error: err, queued_at: new Date().toISOString() } }).eq('id', post.id).select().single();
      if (e2) throw e2;
      return res.status(200).json({ post: data });
    }
    if (b.action === 'delete') {
      const { error } = await sb.from('social_posts').update({ status: 'rejected' }).eq('id', b.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: 'Action inconnue' });
  } catch (e) {
    console.error('[social]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
