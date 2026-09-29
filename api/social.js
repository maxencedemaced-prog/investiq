// api/social.js — SÉCURISÉ : Studio réseaux sociaux, réservé au compte admin.
//   GET                          → liste des posts
//   POST {action:'generate', count, topic}   → l'IA prépare des brouillons (topic = post d'actualité)
//   POST {action:'update', id, fields}       → modifie un post (texte, date, réseaux, statut)
//   POST {action:'upload', id, index, png}   → enregistre une image finale (PNG en base64) dans le stockage public
//   POST {action:'delete', id}
//   GET ?cron=weekly (Authorization: Bearer CRON_SECRET) → lot automatique du dimanche
// La clé Anthropic et la clé service Supabase ne quittent jamais le serveur.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_3_8eb6YbCfJ04Qihdy9ivw_NsQ4H_cu';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'maxencedemacedo@gmail.com';
const MODEL = 'claude-sonnet-5';
const sb = process.env.SUPABASE_SERVICE_KEY ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

const allowedOrigin = (o) => o === 'https://kapitaro.fr' || o === 'https://www.kapitaro.fr' || /^https:\/\/investiq-[a-z0-9-]+\.vercel\.app$/.test(o);
const TEMPLATES = ['cover', 'text', 'number', 'list', 'compare', 'cta'];

// Sujets de fond, tirés au sort pour varier les lots (pédagogie, jamais de recommandation de titre)
const THEMES = [
  'les intérêts composés', "l'investissement programmé (investir chaque mois)", "qu'est-ce qu'un ETF", 'la diversification',
  "l'épargne de précaution", 'les frais et leur impact sur le long terme', 'le PEA expliqué simplement', "l'assurance vie expliquée simplement",
  'la différence entre épargner et investir', "l'inflation et ton pouvoir d'achat", 'les erreurs de débutant', 'fixer un objectif financier',
  'la volatilité et les baisses de marché', "le temps, meilleur allié de l'investisseur", 'les dividendes et leur réinvestissement',
  'actions, obligations, livrets : les différences', 'se préparer à une baisse des marchés sans paniquer', 'le budget et la règle 50/30/20',
  'les biais psychologiques de l’investisseur', 'lire la répartition de son portefeuille',
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
  rows.push('Règle des 72 : 72 ÷ rendement annuel ≈ années pour doubler (6 %/an → ≈ 12 ans).');
  rows.push('Épargne de précaution : règle courante de 3 à 6 mois de dépenses indispensables.');
  return rows.join('\n');
}

const SYSTEM = `Tu es le responsable éditorial de Kapitaro, une app française qui aide les particuliers à suivre et comprendre leurs placements.
Tu écris des carrousels pour Instagram, Facebook, LinkedIn et TikTok : pédagogiques, clairs, chaleureux, en français, en tutoyant.

RÈGLES ABSOLUES (réglementation AMF) :
- Contenu éducatif uniquement. Jamais de conseil personnalisé, jamais de recommandation d'acheter ou de vendre un titre, un fonds ou une crypto précis.
- Aucune prédiction de marché, aucune promesse de gain, aucun rendement présenté comme garanti. Tout rendement est « hypothétique ».
- N'utilise des chiffres précis QUE s'ils figurent dans la liste « Faits vérifiés » fournie, ou s'ils sont de simples règles générales bien connues. N'invente jamais de statistique, d'étude ni de source.
- Pas de sensationnalisme ni de peur (pas de « krach », « tout perdre », « urgent »).

FORMAT : réponds UNIQUEMENT avec un tableau JSON, sans texte autour. Chaque post :
{"title": "titre interne court",
 "slides": [ 5 à 7 objets ],
 "caption": "légende AÉRÉE, blocs séparés par une ligne vide (\\n\\n) : accroche (1 phrase avec un emoji) \\n\\n 2 à 4 phrases utiles \\n\\n une question pour faire réagir \\n\\n « 👉 … (lien en bio) » \\n\\n « Contenu éducatif, pas un conseil en investissement. »",
 "hashtags": "8 à 12 hashtags français pertinents, séparés par des espaces, dont #kapitaro"}
Types de diapositives (champ "t") :
- {"t":"cover","title":"accroche forte, max 70 caractères","sub":"max 70 caractères"}  ← toujours la 1re
- {"t":"text","kicker":"max 25 caractères","title":"max 60 caractères","body":"max 190 caractères"}
- {"t":"number","title":"contexte, max 45 caractères","big":"le chiffre, max 10 caractères","body":"max 150 caractères"}
- {"t":"list","title":"max 50 caractères","items":["3 ou 4 éléments, max 55 caractères chacun"],"note":"facultatif, max 110 caractères"}
- {"t":"compare","title":"max 60 caractères","a":{"label":"…","value":"texte affiché","amount":nombre},"b":{…},"note":"max 110 caractères"}
- {"t":"cta","title":"max 45 caractères","body":"max 110 caractères, invite vers un outil gratuit de kapitaro.fr ou l'app"}  ← toujours la dernière
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
function cleanSlide(s) {
  if (!s || !TEMPLATES.includes(s.t)) return null;
  const out = { t: s.t };
  for (const k of ['title', 'sub', 'kicker', 'body', 'big', 'note']) if (typeof s[k] === 'string') out[k] = clip(s[k], 260);
  if (Array.isArray(s.items)) out.items = s.items.filter(x => typeof x === 'string').slice(0, 5).map(x => clip(x, 90));
  for (const k of ['a', 'b']) if (s[k] && typeof s[k] === 'object') out[k] = { label: clip(s[k].label, 40), value: clip(s[k].value, 20), amount: Number(s[k].amount) || 0 };
  return out;
}
function cleanPost(p) {
  const slides = (Array.isArray(p?.slides) ? p.slides : []).map(cleanSlide).filter(Boolean).slice(0, 8);
  if (slides.length < 3) return null;
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

async function generate({ count, topic }) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY manquante');
  const { data: recent } = await sb.from('social_posts').select('title').order('created_at', { ascending: false }).limit(40);
  const used = (recent || []).map(r => r.title).filter(Boolean);
  const themes = [...THEMES].sort(() => Math.random() - 0.5).slice(0, Math.max(count + 2, 4));
  const prompt = topic
    ? `Écris 1 post d'actualité sur cet événement, publié aujourd'hui : « ${clip(topic, 400)} ».
Angle : explique simplement ce que c'est et ce que ça peut changer concrètement pour l'épargne d'un particulier, sans rien prédire et sans dire quoi faire. Reste factuel : n'affirme que ce qui est contenu dans la description de l'événement ci-dessus ; si un détail manque, reste général. Ajoute dans la légende « Ce post ne prédit pas l'évolution des marchés. ».
Faits vérifiés utilisables :\n${verifiedFacts()}`
    : `Écris ${count} posts différents pour la semaine, chacun sur un de ces sujets (un sujet par post) : ${themes.join(' ; ')}.
Varie les formats de diapositives et les accroches. Évite de refaire ces posts déjà publiés : ${used.slice(0, 25).join(' | ') || 'aucun'}.
Faits vérifiés utilisables :\n${verifiedFacts()}`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 8000, system: SYSTEM, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || 'Erreur IA');
  const text = (data.content || []).map(c => c.text || '').join('');
  let arr;
  try { arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)); } catch { throw new Error('Réponse IA illisible, réessaie'); }
  const posts = (Array.isArray(arr) ? arr : []).map(cleanPost).filter(Boolean).slice(0, topic ? 1 : count);
  if (!posts.length) throw new Error('Aucun post exploitable, réessaie');
  const slots = topic ? [new Date(Date.now() + 15 * 60000).toISOString()] : nextSlots(posts.length);
  const rows = posts.map((p, i) => ({ ...p, kind: topic ? 'actu' : 'weekly', status: 'draft', scheduled_at: slots[i] }));
  const { data: inserted, error } = await sb.from('social_posts').insert(rows).select();
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
    // Lot automatique du dimanche (cron Vercel)
    if (req.method === 'GET' && req.query.cron === 'weekly') {
      if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Non autorisé' });
      const { count: pending } = await sb.from('social_posts').select('id', { count: 'exact', head: true }).eq('status', 'draft');
      if ((pending || 0) >= 6) return res.status(200).json({ skipped: 'déjà assez de brouillons à valider' });
      const posts = await generate({ count: 3 });
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
      const posts = await generate({ count: Math.min(Math.max(parseInt(b.count, 10) || 3, 1), 5), topic: b.topic ? String(b.topic) : '' });
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
