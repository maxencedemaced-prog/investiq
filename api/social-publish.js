// api/social-publish.js — publication automatique des posts validés du Studio.
//   Cron Vercel toutes les 15 min (Authorization: Bearer CRON_SECRET) : publie les posts dont l'heure est arrivée.
//   POST {id} avec le jeton de l'admin : bouton « Publier maintenant » du Studio.
// Instagram : de préférence via la page Facebook avec la clé d'entreprise (utilisateur système), sinon connexion Instagram.
// Le jeton Instagram (60 jours) est renouvelé automatiquement et conservé dans la table app_tokens (jamais côté navigateur).
// Facebook : publication multi-photos sur la page Kapitaro, active dès que FACEBOOK_ACCESS_TOKEN est configuré dans Vercel.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_3_8eb6YbCfJ04Qihdy9ivw_NsQ4H_cu';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'maxencedemacedo@gmail.com';
const IG = 'https://graph.instagram.com';
const MAX_ATTEMPTS = 3;
const sb = process.env.SUPABASE_SERVICE_KEY ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function isAdmin(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return false;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON, Authorization: auth } });
  if (!r.ok) return false;
  return ((await r.json())?.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

// ── Jeton Instagram : celui de la base (renouvelé) en priorité, sinon celui de Vercel ──
async function igToken() {
  const { data } = await sb.from('app_tokens').select('value, updated_at').eq('name', 'instagram').maybeSingle();
  const token = data?.value || process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error('INSTAGRAM_ACCESS_TOKEN manquant dans Vercel');
  // Renouvelle une fois par semaine (le jeton dure 60 jours ; Instagram refuse s'il a moins de 24 h)
  const age = data?.updated_at ? Date.now() - new Date(data.updated_at).getTime() : Infinity;
  if (age > 7 * 24 * 3600 * 1000) {
    try {
      const r = await fetch(`${IG}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
      const j = await r.json();
      if (r.ok && j.access_token) {
        await sb.from('app_tokens').upsert({ name: 'instagram', value: j.access_token, updated_at: new Date().toISOString() });
        return j.access_token;
      }
      if (!data) await sb.from('app_tokens').upsert({ name: 'instagram', value: token, updated_at: new Date().toISOString() });
    } catch {}
  }
  return token;
}

// Client Graph générique : même forme d'appel pour graph.instagram.com et graph.facebook.com
function graphClient(base, token, label) {
  return async (path, params, method = 'POST') => {
    const body = new URLSearchParams({ ...(params || {}), access_token: token });
    const url = method === 'GET' ? `${base}/${path}?${body}` : `${base}/${path}`;
    const r = await fetch(url, method === 'GET' ? {} : { method, body });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error?.error_user_msg || j.error?.message || `${label} ${r.status}`);
    return j;
  };
}

// Accès Instagram, dans l'ordre :
//  1) via la page Facebook avec la clé d'entreprise (utilisateur système, FACEBOOK_ACCESS_TOKEN) : ne dépend d'aucun profil ;
//  2) repli : connexion Instagram (jeton 60 jours renouvelé, table app_tokens).
async function igClient() {
  let viaFacebookErr = null;
  if (process.env.FACEBOOK_ACCESS_TOKEN) {
    try {
      const page = await fbPage();
      const call = graphClient(FB, page.token, 'Instagram');
      const j = await call(page.id, { fields: 'instagram_business_account{id,username}' }, 'GET');
      const acc = j.instagram_business_account;
      if (acc?.id) return { call, userId: acc.id, username: acc.username || null, via: 'facebook' };
      viaFacebookErr = 'aucun compte Instagram relié à la page Facebook';
    } catch (e) { viaFacebookErr = e.message; }
  }
  try {
    const token = await igToken();
    const call = graphClient(IG, token, 'Instagram');
    const me = await call('me', { fields: 'user_id,username' }, 'GET');
    return { call, userId: me.user_id || me.id, username: me.username || null, via: 'instagram' };
  } catch (e) {
    throw new Error(e.message + (viaFacebookErr ? ` — via la page Facebook : ${viaFacebookErr}` : ''));
  }
}

// Attend qu'Instagram ait fini de traiter un conteneur (images ou vidéo téléchargées depuis notre stockage)
async function waitReady(id, call, tries = 15, what = 'les images') {
  for (let i = 0; i < tries; i++) {
    const s = await call(id, { fields: 'status_code' }, 'GET');
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram n'a pas pu traiter ${what}`);
    await sleep(3000);
  }
  throw new Error(`Instagram met trop de temps à traiter ${what}, nouvel essai au prochain passage`);
}
const isReel = p => p.format === 'reel' && typeof p.video_url === 'string' && p.video_url;
const isStory = p => p.format === 'story';

function buildCaption(p) {
  const tags = String(p.hashtags || '').split(/\s+/).filter(t => t.startsWith('#')).slice(0, 30).join(' ');
  return `${(p.caption || '').trim()}\n\n${tags}`.slice(0, 2200);
}

async function publishInstagram(p) {
  const urls = (p.image_urls || []).slice(0, 10);
  const reel = isReel(p);
  if (!reel && !urls.length) throw new Error('Aucune image : valide le post dans le Studio');
  if (!reel && urls.some(u => !/\.jpe?g(\?|$)/i.test(u))) throw new Error('Images au format PNG (validées avant la mise à jour) : repasse le post en brouillon puis revalide-le');
  const { call, userId, username, via } = await igClient();
  let creationId;
  if (isStory(p)) {
    // Story : une image verticale, sans légende
    creationId = (await call(`${userId}/media`, { media_type: 'STORIES', image_url: urls[0] })).id;
  } else if (reel) {
    // Reel : Instagram télécharge la vidéo depuis notre stockage puis la traite (jusqu'à ~2 min)
    const cover = p.video_script && p.video_script.cover_url;   // miniature : l'accroche plutôt que la 1re image (noire)
    creationId = (await call(`${userId}/media`, { media_type: 'REELS', video_url: p.video_url, caption: buildCaption(p), share_to_feed: 'true', ...(cover ? { cover_url: cover } : { thumb_offset: '1500' }) })).id;
    await waitReady(creationId, call, 45, 'la vidéo');
  } else if (urls.length === 1) {
    creationId = (await call(`${userId}/media`, { image_url: urls[0], caption: buildCaption(p) })).id;
  } else {
    const children = [];
    for (const u of urls) children.push((await call(`${userId}/media`, { image_url: u, is_carousel_item: 'true' })).id);
    for (const c of children) await waitReady(c, call);
    creationId = (await call(`${userId}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: buildCaption(p) })).id;
  }
  await waitReady(creationId, call);
  const pub = await call(`${userId}/media_publish`, { creation_id: creationId });
  let permalink = null;
  try { permalink = (await call(pub.id, { fields: 'permalink' }, 'GET')).permalink || null; } catch {}
  return { ok: true, id: pub.id, permalink, account: username, via };
}

// ── Facebook : publication multi-photos sur la page Kapitaro ──
// FACEBOOK_ACCESS_TOKEN peut être un jeton d'utilisateur système (recommandé, n'expire pas) ou directement un jeton de page.
const FB = 'https://graph.facebook.com';
async function fb(path, token, params, method = 'POST') {
  const body = new URLSearchParams({ ...(params || {}), access_token: token });
  const url = method === 'GET' ? `${FB}/${path}?${body}` : `${FB}/${path}`;
  const r = await fetch(url, method === 'GET' ? {} : { method, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error?.error_user_msg || j.error?.message || `Facebook ${r.status}`);
  return j;
}
async function fbPage() {
  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!token) throw new Error('clé FACEBOOK_ACCESS_TOKEN manquante ou vide dans Vercel');
  let accountsErr = 'aucune page Facebook accessible avec ce jeton';
  try {
    // Jeton d'utilisateur (ou système) : liste des pages gérées, on prend la page Kapitaro
    const { data } = await fb('me/accounts', token, { fields: 'id,name,access_token' }, 'GET');
    const page = (data || []).find(p => /kapitaro/i.test(p.name)) || (data || [])[0];
    if (page?.access_token) return { id: page.id, name: page.name, token: page.access_token };
  } catch (e) { accountsErr = e.message; }
  // Sinon, c'est peut-être déjà un jeton de page (une page a une « category », un utilisateur non)
  const me = await fb('me', token, { fields: 'id,name,category' }, 'GET');
  if (!me.category) throw new Error('Page Facebook introuvable : ' + accountsErr);
  return { id: me.id, name: me.name, token };
}
async function publishFacebook(p) {
  const urls = (p.image_urls || []).slice(0, 10);
  const page0 = isReel(p) ? await fbPage() : null;
  if (page0) {
    // Vidéo sur la page (Facebook la télécharge depuis notre stockage)
    const v = await fb(`${page0.id}/videos`, page0.token, { file_url: p.video_url, description: buildCaption(p) });
    // Miniature Facebook : même image de couverture (échec sans gravité)
    const cover = p.video_script && p.video_script.cover_url;
    if (cover) { try { await fb(`${v.id}/thumbnails`, page0.token, { source_url: cover, is_preferred: 'true' }); } catch {} }
    return { ok: true, id: v.id, permalink: `https://www.facebook.com/${v.id}`, account: page0.name };
  }
  if (!urls.length) throw new Error('Aucune image : valide le post dans le Studio');
  const page = await fbPage();
  if (isStory(p)) {
    // Story de page : photo envoyée sans publication, puis mise en story
    const photo = await fb(`${page.id}/photos`, page.token, { url: urls[0], published: 'false' });
    const st = await fb(`${page.id}/photo_stories`, page.token, { photo_id: photo.id });
    return { ok: true, id: st.post_id || st.id || photo.id, permalink: null, account: page.name };
  }
  const media = [];
  for (const u of urls) media.push((await fb(`${page.id}/photos`, page.token, { url: u, published: 'false' })).id);
  const params = { message: buildCaption(p) };
  media.forEach((m, i) => { params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: m }); });
  const post = await fb(`${page.id}/feed`, page.token, params);
  return { ok: true, id: post.id, permalink: `https://www.facebook.com/${post.id}`, account: page.name };
}

// Traduit les blocages Meta les plus courants (le message d'origine est conservé entre parenthèses)
function explainError(pl, msg) {
  const m = String(msg || '');
  if (/api access blocked/i.test(m)) return 'Meta a bloqué temporairement l’accès automatique (souvent après beaucoup de publications rapprochées) : réessaie plus tard avec « Publier maintenant », ou regarde les alertes de l’app Meta et de ton compte Instagram. (' + m + ')';
  if (/session has expired|error validating access token|invalid oauth/i.test(m)) return 'Clé de connexion ' + (pl === 'instagram' ? 'Instagram' : 'Facebook') + ' expirée ou invalide : à régénérer dans Meta puis à remettre dans Vercel. (' + m + ')';
  if (/application request limit|rate limit|too many/i.test(m)) return 'Trop de demandes envoyées à Meta : nouvel essai automatique plus tard. (' + m + ')';
  return m;
}

// Réseaux publiés automatiquement (Facebook seulement si sa clé est configurée)
const AUTOMATED = { instagram: publishInstagram, facebook: publishFacebook };
// Un réseau coché mais non configuré (clé absente ou vide) produit une erreur visible dans le Studio, jamais un oubli silencieux
const automatedFor = platforms => (platforms || []).filter(pl => AUTOMATED[pl]);

// Publie un post : verrouillage (évite un double envoi cron + bouton), puis chaque réseau automatisé
// manual = bouton du Studio : peut aussi compléter un post déjà publié sur les réseaux manquants
async function publishPost(id, manual = false) {
  const { data: locked } = await sb.from('social_posts').update({ status: 'publishing', locked_at: new Date().toISOString() })
    .eq('id', id).in('status', manual ? ['approved', 'published'] : ['approved']).select().maybeSingle();
  if (!locked) return { skipped: 'déjà en cours ou pas validé' };
  const log = { ...(locked.publish_log || {}) };
  const targets = automatedFor(locked.platforms);
  for (const pl of targets) {
    if (log[pl]?.ok) continue;                        // déjà publié sur ce réseau lors d'un essai précédent
    const attempts = (log[pl]?.attempts || 0) + 1;
    try {
      log[pl] = { ...(await AUTOMATED[pl](locked)), attempts, at: new Date().toISOString() };
    } catch (e) {
      log[pl] = { ok: false, error: explainError(pl, e.message), attempts, at: new Date().toISOString() };
    }
  }
  const allOk = targets.length > 0 && targets.every(pl => log[pl]?.ok);
  const upd = { publish_log: log, status: allOk ? 'published' : 'approved' };
  if (allOk) upd.published_at = new Date().toISOString();
  await sb.from('social_posts').update(upd).eq('id', id);
  return { id, status: upd.status, log };
}

export default async function handler(req, res) {
  if (!sb) return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY manquante' });
  try {
    // Cron : posts validés dont l'heure est passée, pas encore en échec définitif
    if (req.method === 'GET') {
      if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Non autorisé' });
      // Interrupteur de pause (ligne « social_pause » = 1 dans app_tokens) : aucun envoi automatique tant qu'elle existe
      const { data: pause } = await sb.from('app_tokens').select('value').eq('name', 'social_pause').maybeSingle();
      if (pause?.value === '1') return res.status(200).json({ processed: 0, paused: true });
      // Débloque un post resté « en cours » (publication interrompue par un délai dépassé)
      await sb.from('social_posts').update({ status: 'approved' }).eq('status', 'publishing').lt('locked_at', new Date(Date.now() - 10 * 60000).toISOString());
      const { data: due } = await sb.from('social_posts').select('id, publish_log, platforms')
        .eq('status', 'approved').lte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(3);
      const results = [];
      for (const p of due || []) {
        // Réseaux automatisés encore à publier, sans avoir épuisé les essais
        const pending = automatedFor(p.platforms).filter(pl => !p.publish_log?.[pl]?.ok && (p.publish_log?.[pl]?.attempts || 0) < MAX_ATTEMPTS);
        if (!pending.length) continue;
        results.push(await publishPost(p.id));
      }
      return res.status(200).json({ processed: results.length, results });
    }
    // Bouton « Publier maintenant » (admin)
    if (req.method === 'POST') {
      if (!(await isAdmin(req))) return res.status(403).json({ error: 'Accès réservé.' });
      const id = String(req.body?.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Post invalide' });
      const result = await publishPost(id, true);
      const { data: post } = await sb.from('social_posts').select('*').eq('id', id).single();
      return res.status(200).json({ result, post });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[social-publish]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
