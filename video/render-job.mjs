// Fabrique la vidéo animée d'un post (lancé par GitHub Actions, workflow « reel.yml ») :
// lit social_posts.video_script, prépare la voix (fichiers ElevenLabs déjà créés par le serveur, sinon voix Microsoft gratuite),
// génère la musique, rend la vidéo avec Remotion, l'envoie dans le stockage public « social » et met à jour le post.
// Variables : POST_ID, SUPABASE_SERVICE_KEY (secret GitHub), SUPABASE_URL (facultatif),
// PIXABAY_API_KEY ou PEXELS_API_KEY (facultatifs : vidéos d'illustration gratuites, usage commercial autorisé sans mention).
import { createClient } from '@supabase/supabase-js';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co').trim();
const KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const ID = (process.env.POST_ID || '').trim();
if (!KEY) { console.error('::error::Secret SUPABASE_SERVICE_KEY absent (GitHub > Settings > Secrets and variables > Actions).'); process.exit(1); }
if (!/^[0-9a-f-]{36}$/i.test(ID)) { console.error('::error::POST_ID invalide'); process.exit(1); }
const sb = createClient(SUPABASE_URL, KEY);

async function patchScript(patch) {
  const { data } = await sb.from('social_posts').select('video_script').eq('id', ID).single();
  const { error } = await sb.from('social_posts').update({ video_script: { ...(data?.video_script || {}), ...patch } }).eq('id', ID);
  if (error) throw error;
}

// Voix gratuite de secours (tant qu'ElevenLabs n'est pas branché) : une phrase par scène, minutage des mots fourni par Microsoft
async function edgeVoice(beats, voices) {
  const segments = []; let cursor = 0.15;
  for (let i = 0; i < beats.length; i++) {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voices[beats[i].voice || 0] || voices[0], OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
    const dir = path.resolve('out', 'tts' + i); fs.mkdirSync(dir, { recursive: true });
    const safe = beats[i].say.replace(/&/g, 'et').replace(/[<>]/g, '');
    const { audioFilePath, metadataFilePath } = await tts.toFile(dir, safe, { rate: '+8%' });
    tts.close?.();
    const file = `seg-${i}.mp3`; fs.copyFileSync(audioFilePath, path.join('public', file));
    const meta = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));
    const words = (meta.Metadata || meta).filter(m => m.Type === 'WordBoundary').map(m => ({ w: m.Data.text.Text, t: m.Data.Offset / 1e7, d: m.Data.Duration / 1e7 }));
    const dur = words.length ? words[words.length - 1].t + words[words.length - 1].d : 1.5;
    const start = i === 0 ? 0 : cursor - 0.1;
    if (i > 0) beats[i - 1].end = start;
    beats[i].start = start;
    beats[i].words = words.map(w => ({ ...w, t: cursor + w.t - start }));
    beats[i].end = cursor + dur + 0.2;
    segments.push({ file, start: cursor });
    cursor += dur + 0.3;
  }
  return segments;
}

// Musique : un morceau de la bibliothèque public/music (Mixkit, licence gratuite commerciale), choisi au hasard ; à défaut, musique générée
function pickMusic(total) {
  const dir = path.join('public', 'music');
  const tracks = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.mp3')) : [];
  if (tracks.length) return 'music/' + tracks[Math.floor(Math.random() * tracks.length)];
  execSync(`node music.mjs ${Math.ceil(total + 1)} 96`, { stdio: 'inherit' });
  return 'music.wav';
}

// Vidéos d'illustration pour les scènes qui ont des mots-clés « broll » (Pixabay ou Pexels, le premier configuré).
// Candidats : { id, url } triés du plus adapté au moins adapté (vertical d'abord, puis horizontal recadré).
// Neutralité de la marque : aucune vidéo avec signe religieux ou sujet sensible (politique, armes, alcool, tabac, argent facile…)
const SENSITIVE = /\b(relig\w*|church|chapel|cathedral|cross|crucifix|jesus|christ\w*|bible|priest|nun|pope|rosary|pray\w*|prayer|worship|faith|god|angel|mosque|islam\w*|muslim|hijab|niqab|burqa|veil\w*|headscarf|ramadan|quran|koran|mecca|synagogue|jew\w*|kippah|torah|temple|buddh\w*|monk|hindu\w*|shrine|spiritual\w*|easter|christmas|nativity|halloween|flag|protest\w*|politic\w*|election|army|military|soldier|war|weapon|gun|rifle|police|beer|wine|alcohol\w*|drunk|cocktail|whisky|vodka|cigarette|smok\w*|cigar|casino|gambl\w*|poker|lottery|bitcoin|crypto\w*|lamborghini|ferrari|yacht|jet|bikini|lingerie|sexy)\b/i;
// Plans non réalistes (images de synthèse, effets, abstrait) : exclus du style « vidéo réelle »
const NOT_REAL = /\b(3d|render\w*|animation|animated|cartoon|cgi|illustration|abstract|fantasy|sci|fi|ufo|alien|spaceship|space|planet|galaxy|universe|nebula|particles?|bokeh|glitch|hologram|futuristic|neon|fractal|earth|globe|snowflakes?|stars|night sky)\b/i;
const STOP = new Set(['a', 'an', 'the', 'of', 'at', 'on', 'in', 'with', 'and', 'to', 'for', 'close', 'up']);
const stem = w => w.toLowerCase().replace(/(ing|ers|er|es|s)$/, '');
async function pixabaySearch(q, need, key) {
  const r = await fetch(`https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&video_type=film&safesearch=true&per_page=50`);
  const j = await r.json();
  const words = q.split(/\s+/).filter(w => w.length > 2 && !STOP.has(w.toLowerCase())).map(stem);
  const out = [];
  for (const h of j.hits || []) {
    if (h.duration < need + 0.5) continue;   // jamais plus court que la scène (sinon écran vide à la fin)
    // Pertinence : part des mots de la scène retrouvés dans les mots-clés de la vidéo
    const tags = String(h.tags || '').split(',').flatMap(t => t.trim().split(/\s+/)).map(stem);
    const hit = words.filter(w => tags.some(t => t === w || t.startsWith(w) || w.startsWith(t))).length;
    const rel = words.length ? hit / words.length : 0;
    if (rel < 0.5) continue;
    if (SENSITIVE.test(String(h.tags || '')) || NOT_REAL.test(String(h.tags || ''))) continue;
    if (words.length >= 3 && hit < 2) continue;   // au moins 2 mots de la scène retrouvés
    const files = Object.values(h.videos || {}).filter(v => v && v.url && v.width);
    const portrait = files.filter(v => v.height > v.width && v.height >= 1280).sort((a, b) => a.height - b.height)[0];
    const land = files.filter(v => v.width >= 1920).sort((a, b) => a.width - b.width)[0];
    if (portrait) out.push({ id: 'pixabay-' + h.id, url: portrait.url, score: (1 - rel) * 2 });
    else if (land) out.push({ id: 'pixabay-' + h.id, url: land.url, score: (1 - rel) * 2 + 0.6 });
  }
  return out.sort((a, b) => a.score - b.score);
}
async function pixabayCandidates(q, need, key) {
  let list = await pixabaySearch(q, need, key);
  // Rien de pertinent : on retire le premier mot (souvent un adjectif) puis on garde les 2 derniers
  const w = q.split(/\s+/);
  if (!list.length && w.length > 2) list = await pixabaySearch(w.slice(1).join(' '), need, key);
  if (!list.length && w.length > 2) list = await pixabaySearch(w.slice(-2).join(' '), need, key);
  return list;
}
async function pexelsCandidates(q, need, key) {
  const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&orientation=portrait&size=medium&per_page=15`, { headers: { Authorization: key } });
  const j = await r.json();
  return (j.videos || []).filter(v => v.duration >= need + 0.5).map(v => {
    const f = (v.video_files || []).filter(x => x.file_type === 'video/mp4' && x.height >= 1280 && x.height > x.width).sort((a, b) => a.height - b.height)[0];
    if (SENSITIVE.test(String(v.url || '').replace(/[-/]/g, ' '))) return null;
    return f ? { id: 'pexels-' + v.id, url: f.link } : null;
  }).filter(Boolean);
}
// Plans déjà utilisés dans les 40 dernières vidéos (pour ne pas revoir les mêmes images d'une vidéo à l'autre)
async function recentClips() {
  const { data } = await sb.from('social_posts').select('video_script').not('video_script', 'is', null).neq('id', ID).order('created_at', { ascending: false }).limit(40);
  return new Set((data || []).flatMap(p => (p.video_script && Array.isArray(p.video_script.clips)) ? p.video_script.clips : []));
}
const shuffleArr = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);

async function fetchBroll(beats) {
  const pixabay = (process.env.PIXABAY_API_KEY || '').trim(), pexels = (process.env.PEXELS_API_KEY || '').trim();
  if (!pixabay && !pexels) return [];
  const used = new Set(), recent = await recentClips();
  for (let i = 0; i < beats.length; i++) {
    const queries = Array.isArray(beats[i].broll_queries) && beats[i].broll_queries.length ? beats[i].broll_queries : (beats[i].broll ? [beats[i].broll] : []);
    if (!queries.length) continue;
    const q = queries.join(' / ');
    try {
      const need = beats[i].end - beats[i].start;
      // Les recherches du thème dans un ordre au hasard, jusqu'à avoir un bon choix de plans
      let pool = [];
      for (const one of shuffleArr(queries)) {
        const found = (pixabay ? await pixabayCandidates(one, need, pixabay) : await pexelsCandidates(one, need, pexels)).filter(x => !used.has(x.id) && !pool.some(p => p.id === x.id));
        pool.push(...found.slice(0, 10));
        if (pool.filter(x => !recent.has(x.id)).length >= 6) break;
      }
      // Priorité aux plans jamais vus récemment, tirés au hasard parmi les plus pertinents
      const fresh = pool.filter(x => !recent.has(x.id)).sort((a, b) => (a.score || 0) - (b.score || 0)).slice(0, 8);
      const list = shuffleArr(fresh.length ? fresh : pool.slice(0, 8));
      for (const c of list) {
        const res = await fetch(c.url);
        if (!res.ok) continue;
        const file = `broll-${i}.mp4`;
        fs.writeFileSync(path.join('public', file), Buffer.from(await res.arrayBuffer()));
        beats[i].broll_file = file; used.add(c.id);
        console.log(`Illustration scène ${i + 1} : « ${q} » → ${c.id}`);
        break;
      }
    } catch (e) { console.warn('Vidéo d\'illustration :', e.message); }
  }
  return [...used];
}

// ── Story d'actualité : photo réelle du secteur (Pixabay), texte par-dessus, publication tout de suite ──
// Sujet boursier : une photo doit vraiment parler de finance. « market » seul ramène des marchés alimentaires.
const OFF_TOPIC = /cheese|fromage|food|fruit|vegetable|meat|fish|bakery|bread|grocer|spice|farmer|flea|bazaar|stall|vendor|restaurant|kitchen|cooking|flower/i;
const FINANCE_TAGS = /stock|trading|trader|chart|graph|finance|financial|exchange|economy|investment|bank|currency|skyscraper/i;
async function storyPhoto(query) {
  const key = (process.env.PIXABAY_API_KEY || '').trim();
  if (!key) return null;
  const financeQuery = q => /stock|market|financ|trading|index|nasdaq|bourse/i.test(q);
  for (const q of [query, 'business district skyscrapers', 'stock exchange trading chart']) {
    if (!q) continue;
    const r = await fetch(`https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&image_type=photo&safesearch=true&per_page=40`);
    const j = await r.json().catch(() => ({}));
    const words = q.split(/\s+/).filter(w => w.length > 2 && !STOP.has(w.toLowerCase())).map(stem);
    const ok = (j.hits || []).filter(h => {
      const tags = String(h.tags || ''), toks = tags.split(',').flatMap(t => t.trim().split(/\s+/)).map(stem);
      if (SENSITIVE.test(tags) || NOT_REAL.test(tags) || OFF_TOPIC.test(tags)) return false;
      if (financeQuery(q) && !FINANCE_TAGS.test(tags)) return false;
      return words.some(w => toks.some(t => t === w || t.startsWith(w) || w.startsWith(t)));
    }).sort((a, b) => (b.imageHeight / b.imageWidth) - (a.imageHeight / a.imageWidth)).slice(0, 6);
    for (const h of shuffleArr(ok)) {
      const res = await fetch(h.largeImageURL);
      if (!res.ok) continue;
      fs.writeFileSync(path.join('public', 'story-photo.jpg'), Buffer.from(await res.arrayBuffer()));
      return 'story-photo.jpg';
    }
  }
  return null;
}
async function storyJob(post) {
  const s = (post.video_script && post.video_script.story) || {};
  const photo = await storyPhoto(s.photo);
  const when = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(',', ' ·');
  fs.writeFileSync(path.join('src', 'story.json'), JSON.stringify({ ...s, photo, when }));
  execSync('npx remotion still src/index.js Story out/story.jpg --image-format=jpeg --jpeg-quality=90 --log=warn', { stdio: 'inherit' });
  const buf = fs.readFileSync('out/story.jpg');
  const file = `${ID}/story-${Date.now()}.jpg`;
  const up = await sb.storage.from('social').upload(file, buf, { contentType: 'image/jpeg', upsert: true });
  if (up.error) throw up.error;
  const url = sb.storage.from('social').getPublicUrl(file).data.publicUrl;
  const { error } = await sb.from('social_posts').update({
    image_urls: [url], status: 'approved', scheduled_at: new Date().toISOString(),
    video_script: { ...post.video_script, status: 'done', done_at: new Date().toISOString(), error: null },
  }).eq('id', ID);
  if (error) throw error;
  console.log('Story prête :', url);
  // Publication immédiate (même passage que la publication automatique toutes les 15 min)
  const secret = (process.env.CRON_SECRET || '').trim(), app = (process.env.APP_URL || 'https://kapitaro.fr').trim().replace(/\/$/, '');
  if (secret) {
    const r = await fetch(`${app}/api/social-publish`, { headers: { Authorization: `Bearer ${secret}` } });
    console.log('Publication :', r.status, (await r.text()).slice(0, 300));
  }
}

// ── Diaporama d'un carrousel : images déjà en ligne, musique, carte de fin (sans voix) ──
async function slideshowJob(script) {
  await patchScript({ status: 'rendering', rendering_at: new Date().toISOString(), error: null });
  fs.mkdirSync('out', { recursive: true });
  const slides = [];
  for (let i = 0; i < (script.images || []).length; i++) {
    const r = await fetch(script.images[i]);
    if (!r.ok) throw new Error('Image ' + (i + 1) + ' introuvable (' + r.status + ')');
    const file = 'slide-' + i + (/\.png(\?|$)/i.test(script.images[i]) ? '.png' : '.jpg');
    fs.writeFileSync(path.join('public', file), Buffer.from(await r.arrayBuffer()));
    slides.push(file);
  }
  if (!slides.length) throw new Error('Aucune image : valide d’abord le carrousel');
  const perSlide = 3.4, total = slides.length * perSlide + 2;
  const chosen = typeof script.music_file === 'string' && /^[\w.-]+\.mp3$/.test(script.music_file) && fs.existsSync(path.join('public', 'music', script.music_file)) ? 'music/' + script.music_file : null;
  const musicFile = script.music === false ? null : (chosen || pickMusic(total));
  fs.writeFileSync(path.join('src', 'data.json'), JSON.stringify({ style: 'slideshow', beats: [], segments: [], slides, perSlide, musicFile, jingle: false }));
  execSync('npx remotion render src/index.js Reel out/reel.mp4 --codec=h264 --crf=20 --concurrency=100% --log=warn', { stdio: 'inherit' });
  const buf = fs.readFileSync('out/reel.mp4');
  const file = `${ID}/slideshow-${Date.now()}.mp4`;
  const up = await sb.storage.from('social').upload(file, buf, { contentType: 'video/mp4', upsert: true });
  if (up.error) throw up.error;
  const url = sb.storage.from('social').getPublicUrl(file).data.publicUrl;
  let coverUrl = script.images[0] || null;
  const { data: cur } = await sb.from('social_posts').select('video_script').eq('id', ID).single();
  const { error } = await sb.from('social_posts').update({
    video_url: url,
    video_script: { ...(cur?.video_script || {}), status: 'done', review: 'pending', cover_url: coverUrl, done_at: new Date().toISOString(), seconds: Math.round(total), size: buf.length, error: null },
  }).eq('id', ID);
  if (error) throw error;
  console.log('Diaporama prêt :', url);
}

// Musiques créées depuis le Studio (IA) : seulement dans le stockage, on les copie dans public/music avant le rendu
async function syncMusic() {
  try {
    const dir = path.join('public', 'music'); fs.mkdirSync(dir, { recursive: true });
    const { data } = await sb.storage.from('social').list('music', { limit: 200 });
    for (const f of data || []) {
      if (!/\.mp3$/i.test(f.name) || fs.existsSync(path.join(dir, f.name))) continue;
      const { data: blob } = await sb.storage.from('social').download('music/' + f.name);
      if (blob) fs.writeFileSync(path.join(dir, f.name), Buffer.from(await blob.arrayBuffer()));
    }
  } catch (e) { console.log('musiques en ligne :', e.message); }
}
// ── Pub « scènes réelles » : photos de public/pub/ (accroche, appli, clôture), textes du script, musique, carte de fin ──
async function pubJob(script) {
  await patchScript({ status: 'rendering', rendering_at: new Date().toISOString(), error: null });
  fs.mkdirSync('out', { recursive: true });
  const scenes = (script.scenes || []).filter(s => s && /^pub\/[\w-]+\.jpg$/.test(s.img || '') && fs.existsSync(path.join('public', s.img))).slice(0, 12)
    .map(s => ({ img: s.img, kicker: String(s.kicker || '').slice(0, 40), title: String(s.title || '').slice(0, 90), sub: String(s.sub || '').slice(0, 110), pos: s.pos === 'top' ? 'top' : 'bottom', dur: Math.max(1.4, Math.min(7, Number(s.dur) || 3)),
      chips: (Array.isArray(s.chips) ? s.chips : []).slice(0, 4).map(c => String(c).slice(0, 24)), fx: String(s.fx || '').slice(0, 12), words: Array.isArray(s.words) ? s.words : null,
      // Vraie vidéo d'illustration (mots-clés), enregistrement de l'appli dans le téléphone (screen = nom du tutoriel), mise en page
      broll_queries: (Array.isArray(s.broll_queries) ? s.broll_queries : []).slice(0, 4).map(q => String(q).slice(0, 60)),
      screen: /^[a-z_]{3,30}$/.test(s.screen || '') ? s.screen : null, screenFrom: Math.max(0, Number(s.screenFrom) || 0), screenRate: Math.max(0.5, Math.min(2.5, Number(s.screenRate) || 1)),
      layout: s.layout === 'phone' ? 'phone' : 'photo', rect: Array.isArray(s.rect) && s.rect.length === 5 ? s.rect.map(Number) : null }));
  if (!scenes.length) throw new Error('Aucune scène : les photos doivent être dans video/public/pub/');
  const end = { dur: 3.4, ...(script.end || {}) };
  const total = scenes.reduce((n, s) => n + s.dur, 0) + end.dur;
  // Vraies vidéos d'illustration (Pixabay ou Pexels) : la photo reste en secours si rien de pertinent n'est trouvé
  let t0 = 0;
  scenes.forEach(s => { s.start = t0; s.end = t0 + s.dur + 0.6; t0 += s.dur; });
  const clips = await fetchBroll(scenes);
  scenes.forEach((s, i) => { if (s.broll_file) { const f = `pubclip-${i}.mp4`; fs.renameSync(path.join('public', s.broll_file), path.join('public', f)); s.video = f; } delete s.broll_file; delete s.end; });
  // Enregistrements réels de l'appli (tutoriels du Studio) à montrer dans le téléphone
  for (const id of [...new Set(scenes.map(s => s.screen).filter(Boolean))]) {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/public/social/tuto/${id}.mp4`);
    if (r.ok) fs.writeFileSync(path.join('public', `screen-${id}.mp4`), Buffer.from(await r.arrayBuffer()));
    else scenes.forEach(s => { if (s.screen === id) s.screen = null; });
  }
  // Voix (ElevenLabs, déjà dans le stockage) : une piste par segment
  const segments = [];
  for (let k = 0; k < (script.segments || []).length; k++) {
    const r = await fetch(script.segments[k].url);
    if (!r.ok) throw new Error('Voix introuvable dans le stockage (' + r.status + ')');
    fs.writeFileSync(path.join('public', `seg-${k}.mp3`), Buffer.from(await r.arrayBuffer()));
    segments.push({ file: `seg-${k}.mp3`, start: script.segments[k].start });
  }
  const chosen = typeof script.music_file === 'string' && /^[\w.-]+\.mp3$/.test(script.music_file) && fs.existsSync(path.join('public', 'music', script.music_file)) ? 'music/' + script.music_file : null;
  const musicFile = script.music === false ? null : (chosen || pickMusic(total));
  fs.writeFileSync(path.join('src', 'data.json'), JSON.stringify({ style: 'pub', beats: [], segments, scenes, end, musicFile, jingle: false }));
  execSync('npx remotion render src/index.js Reel out/reel.mp4 --codec=h264 --crf=19 --concurrency=100% --log=warn', { stdio: 'inherit' });
  // Couverture : une image de la première scène, avec son texte
  execSync('npx remotion still src/index.js Reel out/cover.jpg --frame=55 --image-format=jpeg --jpeg-quality=88 --log=warn', { stdio: 'inherit' });
  const stamp = Date.now();
  const send = async (name, file, type) => {
    const up = await sb.storage.from('social').upload(`${ID}/${name}`, fs.readFileSync(file), { contentType: type, upsert: true });
    if (up.error) throw up.error;
    return sb.storage.from('social').getPublicUrl(`${ID}/${name}`).data.publicUrl;
  };
  const url = await send(`pub-${stamp}.mp4`, 'out/reel.mp4', 'video/mp4');
  const coverUrl = await send(`cover-${stamp}.jpg`, 'out/cover.jpg', 'image/jpeg');
  const { data: cur } = await sb.from('social_posts').select('video_script').eq('id', ID).single();
  const { error } = await sb.from('social_posts').update({
    video_url: url, image_urls: [coverUrl],
    video_script: { ...(cur?.video_script || {}), status: 'done', review: 'pending', clips, cover_url: coverUrl, done_at: new Date().toISOString(), seconds: Math.round(total), size: fs.statSync('out/reel.mp4').size, error: null },
  }).eq('id', ID);
  if (error) throw error;
  console.log('Pub prête :', url);
}

async function main() {
  await syncMusic();
  const { data: post, error } = await sb.from('social_posts').select('id, format, video_script').eq('id', ID).single();
  if (error) throw error;
  if (post.format === 'story') return storyJob(post);
  if ((post.video_script || {}).style === 'slideshow') return slideshowJob(post.video_script);
  if ((post.video_script || {}).style === 'pub') return pubJob(post.video_script);
  const script = post.video_script || {};
  if (!Array.isArray(script.beats) || !script.beats.length) throw new Error('Script vidéo absent : relance la création depuis le Studio');
  await patchScript({ status: 'rendering', rendering_at: new Date().toISOString(), error: null });
  fs.mkdirSync('out', { recursive: true });
  const beats = script.beats.map(b => ({ ...b }));

  let segments;
  if (Array.isArray(script.segments) && script.segments.length) {
    segments = [];
    for (let k = 0; k < script.segments.length; k++) {
      const r = await fetch(script.segments[k].url);
      if (!r.ok) throw new Error('Voix introuvable dans le stockage (' + r.status + ')');
      const file = `seg-${k}.mp3`;
      fs.writeFileSync(path.join('public', file), Buffer.from(await r.arrayBuffer()));
      segments.push({ file, start: script.segments[k].start });
    }
  } else {
    segments = await edgeVoice(beats, Array.isArray(script.edge_voices) && script.edge_voices.length ? script.edge_voices : ['fr-FR-RemyMultilingualNeural']);
  }

  const total = beats[beats.length - 1].end + 1.5;
  const chosen = typeof script.music_file === 'string' && /^[\w.-]+\.mp3$/.test(script.music_file) && fs.existsSync(path.join('public', 'music', script.music_file)) ? 'music/' + script.music_file : null;
  const musicFile = script.music === false ? null : (chosen || pickMusic(total));
  const clips = script.style === 'real' ? await fetchBroll(beats) : [];
  if (script.style !== 'real') beats.forEach(b => { delete b.broll; delete b.broll_file; });
  if (script.style === 'real') {
    // Plan manquant : on réutilise le plan précédent (ou suivant) plutôt que de casser le style
    beats.forEach((b, i) => { if (!b.broll_file) b.broll_file = (beats.slice(0, i).reverse().find(x => x.broll_file) || beats.find(x => x.broll_file) || {}).broll_file; });
    if (!beats.some(b => b.broll_file)) throw new Error('Aucune vidéo trouvée pour le style réel : vérifie la clé PIXABAY_API_KEY');
  }
  fs.writeFileSync(path.join('src', 'data.json'), JSON.stringify({ beats, segments, musicFile, style: script.style || 'motion', dossier: script.dossier || null, duo: script.duo || null, jingle: fs.existsSync(path.join('public', 'jingle.mp3')) }));

  execSync('npx remotion render src/index.js Reel out/reel.mp4 --codec=h264 --crf=20 --concurrency=100% --log=warn', { stdio: 'inherit' });
  const buf = fs.readFileSync('out/reel.mp4');
  const file = `${ID}/reel-${Date.now()}.mp4`;
  const up = await sb.storage.from('social').upload(file, buf, { contentType: 'video/mp4', upsert: true });
  if (up.error) throw up.error;
  const { data: pub } = sb.storage.from('social').getPublicUrl(file);
  // Couverture du Reel : l'accroche (1,5 s), texte affiché — sinon Instagram prend la 1re image, noire à cause du fondu
  let coverUrl = null;
  try {
    execSync('npx remotion still src/index.js Reel out/cover.jpg --frame=45 --image-format=jpeg --jpeg-quality=90 --log=warn', { stdio: 'inherit' });
    const cover = `${ID}/cover-${Date.now()}.jpg`;
    const upc = await sb.storage.from('social').upload(cover, fs.readFileSync('out/cover.jpg'), { contentType: 'image/jpeg', upsert: true });
    if (!upc.error) coverUrl = sb.storage.from('social').getPublicUrl(cover).data.publicUrl;
  } catch (e) { console.warn('Couverture :', e.message); }
  const { data: cur } = await sb.from('social_posts').select('video_script').eq('id', ID).single();
  const { error: e2 } = await sb.from('social_posts').update({
    video_url: pub.publicUrl,
    video_script: { ...(cur?.video_script || {}), status: 'done', review: 'pending', clips, cover_url: coverUrl, done_at: new Date().toISOString(), seconds: Math.round(total), size: buf.length, error: null },
  }).eq('id', ID);
  if (e2) throw e2;
  console.log('Vidéo prête :', pub.publicUrl, (buf.length / 1e6).toFixed(1) + ' Mo');
}

main().catch(async e => {
  console.error('::error::' + (e && e.message ? e.message : e));
  try { await patchScript({ status: 'error', error: String(e && e.message ? e.message : e).slice(0, 300) }); } catch {}
  process.exit(1);
});
