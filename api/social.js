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
//   GET ?cron=weekly (Authorization: Bearer CRON_SECRET) → semaine suivante préparée le dimanche (1 Reel par jour + carrousel du mercredi)
//   GET ?cron=reels                          → crée les vidéos prévues (2 par passage, toutes les 10 min)
//   GET ?cron=stories                        → stories d'actualité automatiques (dépêches + mouvements d'indices, 10 par jour max)
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
- N'affirme jamais que le temps efface ou compense les pertes, que les hausses compensent les baisses, ou que les baisses « pèsent moins » sur longue durée : le long terme ne garantit rien.
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
// Heure de Paris → instant UTC (heure d'été et d'hiver gérées)
const PARIS_FMT = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
function parisParts(ts) { const p = Object.fromEntries(PARIS_FMT.formatToParts(new Date(ts)).map(x => [x.type, x.value])); return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute }; }
function parisISO(y, m, d, h, mi) {
  const guess = Date.UTC(y, m - 1, d, h, mi), p = parisParts(guess);
  const offset = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - guess;
  return new Date(guess - offset).toISOString();
}
// Samedi suivant à 11 h 30, heure de Paris (bilan de la semaine)
function nextSaturday() {
  const t = parisParts(Date.now()), base = Date.UTC(t.y, t.m - 1, t.d), dow = new Date(base).getUTCDay();
  const dt = new Date(base + (((6 - dow + 7) % 7) || 7) * 86400000);
  return parisISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), 11, 30);
}

// Semaine type : un Reel par jour à 18 h 30 (styles alternés), un carrousel « à enregistrer » le mercredi midi,
// le bilan des marchés le samedi matin (préparé le vendredi soir avec les vrais chiffres).
const WEEK_PLAN = [
  { dow: 1, h: 18, m: 30, kind: 'agenda', reel: 'motion' },
  { dow: 2, h: 18, m: 30, kind: 'pedago', reel: 'real' },
  { dow: 3, h: 12, m: 30, kind: 'pedago', formats: ['checklist', 'erreurs'] },
  { dow: 3, h: 18, m: 30, kind: 'pedago', reel: 'motion', formats: ['chiffre', 'versus'] },
  { dow: 4, h: 18, m: 30, kind: 'pedago', reel: 'real' },
  { dow: 5, h: 18, m: 30, kind: 'pedago', reel: 'motion' },
  { dow: 6, h: 11, m: 30, kind: 'recap' },
  { dow: 6, h: 18, m: 30, kind: 'pedago', reel: 'real', angle: 'le bon réflexe du week-end' },
  { dow: 0, h: 18, m: 30, kind: 'pedago', reel: 'real', angle: 'les projets de vie et la sérénité (épargner pour un projet, se sentir serein avec son argent)' },
];
// Vidéo prévue : créée automatiquement par le passage « cron=reels » (duo de voix en style animé, voix principale en style réel)
const plannedVideo = style => ({ status: 'planned', style, voice_pick: style === 'motion' ? 'duo' : '0', planned_at: new Date().toISOString() });

// ── Données réelles pour les posts d'actualité (jamais de données de secours inventées) ──
const DAYS_FR = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
// Calendrier économique : FMP si la formule le permet, sinon le calendrier public ForexFactory (semaine en cours + suivante)
async function fetchAgenda() {
  try { return await fetchAgendaFmp(); } catch (e) { console.warn('[social] agenda FMP :', e.message); }
  const feeds = ['thisweek', 'nextweek'].map(w => `https://nfs.faireconomy.media/ff_calendar_${w}.json`);
  const all = [];
  for (const u of feeds) {
    try { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) }); const j = await r.json(); if (Array.isArray(j)) all.push(...j); } catch {}
  }
  const zones = { USD: 'États-Unis', EUR: 'Zone euro', GBP: 'Royaume-Uni' };
  const now = Date.now(), until = now + 7 * 86400000;
  const pick = level => all.filter(e => zones[e.country] && level.includes(e.impact) && Date.parse(e.date) > now && Date.parse(e.date) < until);
  let list = pick(['High']);
  if (list.length < 4) list = pick(['High', 'Medium']);
  const seen = new Set();
  const events = list.sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .filter(e => { const k = e.title + e.date; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 8)
    .map(e => {
      const p = parisParts(Date.parse(e.date)), d = new Date(Date.UTC(p.y, p.m - 1, p.d));
      return { when: `${DAYS_FR[d.getUTCDay()]} ${String(p.h).padStart(2, '0')}h${String(p.mi).padStart(2, '0')}`, event: e.title, zone: zones[e.country], estimate: e.forecast || null, previous: e.previous || null };
    });
  if (!events.length) throw new Error('Aucun rendez-vous économique majeur trouvé pour les 7 prochains jours');
  return events;
}
async function fetchAgendaFmp() {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error('FMP_API_KEY manquante');
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

// Coût des appels IA du Studio, enregistré dans ai_usage_log (user_id vide, étiquette « studio: ») pour le tableau de bord
const PRICING = { 'claude-sonnet-5': { in: 2.0, out: 10.0 }, 'claude-haiku-4-5-20251001': { in: 1.0, out: 5.0 } };
function logStudioUsage(model, usage, system) {
  if (!usage || !sb) return;
  const p = PRICING[model] || PRICING['claude-sonnet-5'];
  const label = system === SYSTEM ? 'studio:posts' : /^Tu es l'éditeur des stories/.test(system) ? 'studio:stories' : /^Tu es le réalisateur/.test(system) ? 'studio:videos' : 'studio:autre';
  sb.from('ai_usage_log').insert({ user_id: null, model, input_tokens: usage.input_tokens || 0, output_tokens: usage.output_tokens || 0,
    cost_usd: (usage.input_tokens || 0) / 1e6 * p.in + (usage.output_tokens || 0) / 1e6 * p.out, call_label: label }).then(() => {}, () => {});
}
async function askClaude(prompt, system = SYSTEM, model = MODEL) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY manquante');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: model === MODEL ? 8000 : 2000, system, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || 'Erreur IA');
  logStudioUsage(model, data.usage, system);
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

// Posts pédagogiques pour des créneaux précis (format imposé ou angle donné), écrits par paquets de 4 en parallèle
async function pedagogicalFor(specs, used) {
  const subjects = shuffle(SUBJECTS);
  const chunks = [];
  for (let i = 0; i < specs.length; i += 4) chunks.push(specs.slice(i, i + 4).map((s, k) => ({ ...s, subject: subjects[(i + k) % subjects.length] })));
  const out = await Promise.all(chunks.map(async ch => {
    const plan = ch.map((s, i) => {
      const f = FORMATS.find(x => s.formats && x.key === s.formats[Math.floor(Math.random() * s.formats.length)]) || shuffle(FORMATS)[0];
      return `Post ${i + 1} : sujet « ${s.subject} »${s.angle ? `, angle : ${s.angle}` : ''}, format « ${f.label} » (${f.hint}).${s.reel ? ' Il servira aussi de base à une vidéo courte : une idée centrale simple et concrète.' : ''}`;
    }).join('\n');
    try {
      const arr = await askClaude(`Écris ${ch.length} posts pédagogiques, dans cet ordre :\n${plan}\nChaque post doit être très différent des autres (accroche, ton, structure). Évite de refaire ces posts déjà publiés : ${used.slice(0, 25).join(' | ') || 'aucun'}.\nFaits vérifiés utilisables :\n${verifiedFacts()}`);
      return ch.map((s, i) => cleanPost(arr[i], shuffle(COLOR_THEMES)[0]));
    } catch (e) { console.warn('[social] pédagogie :', e.message); return ch.map(() => null); }
  }));
  return out.flat();
}

// Semaine suivante (lancée le dimanche) : ne remplit que les créneaux encore libres
async function weeklyPlan() {
  const t = parisParts(Date.now()), base = Date.UTC(t.y, t.m - 1, t.d), dow = new Date(base).getUTCDay();
  const toMonday = ((8 - dow) % 7) || 7;
  const slots = WEEK_PLAN.filter(s => s.kind !== 'recap').map(s => {
    const dt = new Date(base + (toMonday + (s.dow + 6) % 7) * 86400000);
    return { ...s, at: parisISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), s.h, s.m) };
  });
  const times = slots.map(s => Date.parse(s.at));
  const { data: taken } = await sb.from('social_posts').select('scheduled_at').neq('status', 'rejected').neq('format', 'story')
    .gte('scheduled_at', new Date(Math.min(...times) - 3600000).toISOString()).lte('scheduled_at', new Date(Math.max(...times) + 3600000).toISOString());
  const free = slots.filter(s => !(taken || []).some(p => Math.abs(Date.parse(p.scheduled_at) - Date.parse(s.at)) < 45 * 60000));
  if (!free.length) return [];
  const { data: recent } = await sb.from('social_posts').select('title').order('created_at', { ascending: false }).limit(40);
  const used = (recent || []).map(r => r.title).filter(Boolean);
  const agendaSlot = free.find(s => s.kind === 'agenda');
  const pedSlots = free.filter(s => s.kind === 'pedago');
  const [agenda, peds] = await Promise.all([
    agendaSlot ? agendaPost().catch(e => { console.warn('[social] agenda :', e.message); return null; }) : null,
    pedagogicalFor(agendaSlot ? [...pedSlots, { ...agendaSlot, kind: 'pedago', backup: true }] : pedSlots, used),
  ]);
  const rows = [];
  const row = (p, s) => ({ ...p, scheduled_at: s.at, status: 'draft', ...(s.reel ? { video_script: plannedVideo(s.reel) } : {}) });
  pedSlots.forEach((s, i) => { if (peds[i]) rows.push(row({ kind: 'weekly', ...peds[i] }, s)); });
  if (agendaSlot) { const p = agenda || peds[pedSlots.length]; if (p) rows.push(row(agenda ? p : { kind: 'weekly', ...p }, agendaSlot)); }
  if (!rows.length) throw new Error('Aucun post exploitable pour la semaine');
  const { data: inserted, error } = await sb.from('social_posts').insert(rows).select();
  if (error) throw error;
  return inserted;
}

// ── Stories d'actualité : ce qui peut faire bouger les marchés, publié automatiquement ──
const STORY_MODEL = process.env.STORY_MODEL || 'claude-haiku-4-5-20251001';   // tri rapide et peu coûteux
const STORIES_PER_DAY = 10;
const STORY_SYSTEM = `Tu es l'éditeur des stories Instagram « actu » de Kapitaro, une app française qui aide les particuliers à suivre leurs placements.
On te donne des dépêches récentes (souvent en anglais) et des mouvements d'indices. Sélectionne UNIQUEMENT les informations qui peuvent vraiment influencer les marchés suivis par des particuliers français : grandes entreprises (CAC 40, grandes valeurs européennes et américaines), banques centrales, chiffres économiques majeurs, fusions et rachats, gros contrats, résultats marquants, forte variation d'un indice. Ignore tout le reste (people, faits divers, petites sociétés, cryptomonnaies, opinions, analyses, promotions). S'il n'y a rien d'important, réponds [].

RÈGLES ABSOLUES (réglementation AMF) :
- Uniquement des faits présents dans la dépêche. N'invente aucun chiffre, aucune cause, aucune conséquence.
- Aucune prédiction, aucune recommandation (jamais « acheter », « vendre », « opportunité »), aucun avis.
- Ton neutre et sobre, pas de sensationnalisme ni de mot qui fait peur (pas « krach », « panique », « effondrement »).

FORMAT : un tableau JSON, sans texte autour :
[{"ref": numéro de la dépêche, "company": "nom court de l'entreprise ou de l'indice", "kicker": "ACTU" ou "MARCHÉS",
  "title": "titre factuel en français, max 60 caractères", "facts": "1 ou 2 phrases factuelles en français, max 170 caractères",
  "source": "nom du média source", "value": "variation chiffrée si elle est fournie, ex. « −1,8 % » (sinon vide)",
  "photo": "2 à 4 mots EN ANGLAIS décrivant une vraie photo du SECTEUR d'activité, jamais la marque ni un logo : ex. « computer chips close up », « oil refinery », « airplane assembly line », « pharmaceutical laboratory », « luxury boutique window », « stock market screen »"}]`;

async function newsStories() {
  const now = parisParts(Date.now());
  if (now.h < 7 || now.h >= 22) return { skipped: 'hors horaires (7 h – 22 h)' };
  const midnight = parisISO(now.y, now.m, now.d, 0, 0);
  const { data: recent } = await sb.from('social_posts').select('created_at, video_script').eq('format', 'story').gte('created_at', new Date(Date.now() - 3 * 86400000).toISOString());
  const today = (recent || []).filter(p => p.created_at >= midnight);
  const left = STORIES_PER_DAY - today.length;
  if (left <= 0) return { skipped: 'limite de ' + STORIES_PER_DAY + ' stories atteinte aujourd\'hui' };
  if (today.some(p => Date.now() - Date.parse(p.created_at) < 20 * 60000)) return { skipped: 'story récente (moins de 20 min)' };
  const seen = new Set((recent || []).map(p => p.video_script && p.video_script.news_id).filter(Boolean));

  // Candidats : mouvements forts d'indices (± 1,5 % sur la séance) et dépêches des 90 dernières minutes
  const items = [];
  const day = `${now.y}${String(now.m).padStart(2, '0')}${String(now.d).padStart(2, '0')}`;
  for (const m of [{ sym: '^FCHI', label: 'CAC 40' }, { sym: '^GSPC', label: 'S&P 500' }, { sym: '^IXIC', label: 'Nasdaq' }]) {
    try {
      const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(m.sym)}?range=1d&interval=5m`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
      const meta = (await r.json())?.chart?.result?.[0]?.meta || {};
      const last = meta.regularMarketPrice, prev = meta.chartPreviousClose || meta.previousClose;
      if (!last || !prev) continue;
      const chg = Math.round((last / prev - 1) * 1000) / 10;
      const id = `idx-${m.sym}-${day}-${chg >= 0 ? 'up' : 'down'}`;
      if (Math.abs(chg) >= 1.5 && !seen.has(id)) items.push({ id, text: `${m.label} : ${chg > 0 ? '+' : ''}${String(chg).replace('.', ',')} % sur la séance du jour (niveau ${Math.round(last).toLocaleString('fr-FR')} points). Données de marché.`, source: 'Données de marché' });
    } catch {}
  }
  if (process.env.FINNHUB_API_KEY) {
    try {
      const r = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${process.env.FINNHUB_API_KEY}`, { signal: AbortSignal.timeout(8000) });
      const j = await r.json();
      const since = Date.now() / 1000 - 90 * 60;
      (Array.isArray(j) ? j : []).filter(n => n.datetime > since && n.headline && !seen.has('fh-' + n.id)).slice(0, 15)
        .forEach(n => items.push({ id: 'fh-' + n.id, text: `${n.headline}. ${String(n.summary || '').slice(0, 280)}`, source: n.source || '' }));
    } catch {}
  }
  if (!items.length) return { skipped: 'aucune nouvelle info' };

  const list = items.map((it, i) => `${i + 1}. [${it.source}] ${it.text}`).join('\n');
  const picks = (await askClaude(`Au plus ${Math.min(2, left)} stories. Dépêches et mouvements :\n${list}`, STORY_SYSTEM, STORY_MODEL)).slice(0, Math.min(2, left));
  const made = [];
  for (const s of picks) {
    const it = items[(parseInt(s.ref, 10) || 0) - 1];
    if (!it || !s.title || !s.company) continue;
    const story = { kicker: s.kicker === 'MARCHÉS' ? 'MARCHÉS' : 'ACTU', company: clip(s.company, 30), title: clip(s.title, 80), facts: clip(s.facts, 200), source: clip(s.source || it.source, 40), value: clip(s.value || '', 12), photo: clip(String(s.photo || '').replace(/[^A-Za-z ]/g, ' '), 50) };
    if (/panique|krach|effondr|ach[eè]te|vend(s|ez)\b|opportunit/i.test(story.title + ' ' + story.facts)) continue;   // garde-fou AMF
    const { data: row, error } = await sb.from('social_posts').insert({
      kind: 'story', format: 'story', status: 'draft', title: `Story · ${story.company} : ${story.title}`,
      slides: [{ t: 'text', kicker: story.kicker, title: story.title, body: story.facts }], caption: '', hashtags: '',
      platforms: ['instagram', 'facebook'], scheduled_at: new Date().toISOString(),
      video_script: { type: 'story', status: 'queued', news_id: it.id, story, queued_at: new Date().toISOString() },
    }).select().single();
    if (error) { console.warn('[stories]', error.message); continue; }
    try { await dispatchRender(row.id); made.push(story.title); }
    catch (e) { await sb.from('social_posts').update({ video_script: { ...row.video_script, status: 'error', error: e.message } }).eq('id', row.id); }
  }
  return { stories: made };
}

// Vidéo d'un post : script (IA) + voix, puis fabrication lancée sur GitHub Actions
async function createReel(post, { voice, style }) {
  const voices = await reelVoices(), duo = voice === 'duo' && voices.length > 1;
  const pick = duo ? voices.slice(0, 2) : [voices[Math.min(Math.max(parseInt(voice, 10) || 0, 0), voices.length - 1)]];
  const st = style === 'real' ? 'real' : 'motion';
  const beats = await writeReelScript({ post, duo, askClaude, facts: verifiedFacts(), style: st });
  const segments = pick[0].id ? await voiceOver({ beats, voices: pick, sb, id: post.id }) : [];
  const script = { v: 1, style: st, voice: pick.map(v => v.name).join(' + '), beats, segments, edge_voices: pick[0].id ? undefined : pick.map(v => v.edge), created_at: new Date().toISOString() };
  let status = 'queued', err = null;
  try { await dispatchRender(post.id); } catch (e) { status = 'error'; err = e.message; }
  const { data, error } = await sb.from('social_posts').update({ video_script: { ...script, status, error: err, queued_at: new Date().toISOString() } }).eq('id', post.id).select().single();
  if (error) throw error;
  return data;
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
    if (req.method === 'GET' && ['weekly', 'recap', 'reels', 'stories'].includes(req.query.cron)) {
      if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Non autorisé' });
      if (req.query.cron === 'weekly') { const posts = await weeklyPlan(); return res.status(200).json({ generated: posts.length }); }
      if (req.query.cron === 'stories') return res.status(200).json(await newsStories());
      if (req.query.cron === 'recap') {
        const at = nextSaturday();
        const { count } = await sb.from('social_posts').select('id', { count: 'exact', head: true }).neq('status', 'rejected').eq('kind', 'actu').gte('scheduled_at', new Date(Date.parse(at) - 3600000).toISOString()).lte('scheduled_at', new Date(Date.parse(at) + 3600000).toISOString());
        if (count) return res.status(200).json({ skipped: 'bilan déjà préparé' });
        const posts = await generate({ mode: 'recap' });
        return res.status(200).json({ generated: posts.length });
      }
      // Vidéos prévues : 2 par passage, les plus proches de leur date de publication d'abord
      const { data: todo } = await sb.from('social_posts').select('*').eq('video_script->>status', 'planned').neq('status', 'rejected')
        .order('scheduled_at', { ascending: true }).limit(2);
      let made = 0;
      for (const p of todo || []) {
        try { await createReel(p, { voice: p.video_script.voice_pick || '0', style: p.video_script.style }); made++; }
        catch (e) { await sb.from('social_posts').update({ video_script: { ...p.video_script, status: 'error', error: 'Création automatique : ' + String(e.message).slice(0, 200) } }).eq('id', p.id); }
      }
      return res.status(200).json({ reels: made });
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
      if (b.action === 'reel-create') return res.status(200).json({ post: await createReel(post, { voice: b.voice, style: b.style }) });
      const script = post.video_script || {};
      if (!Array.isArray(script.beats) || !script.beats.length) return res.status(400).json({ error: "Aucun script vidéo : crée d'abord la vidéo animée" });
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
