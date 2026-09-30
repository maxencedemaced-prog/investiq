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
const STOP = new Set(['a', 'an', 'the', 'of', 'at', 'on', 'in', 'with', 'and', 'to', 'for', 'close', 'up']);
const stem = w => w.toLowerCase().replace(/(ing|ers|er|es|s)$/, '');
async function pixabaySearch(q, need, key) {
  const r = await fetch(`https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&safesearch=true&per_page=50`);
  const j = await r.json();
  const words = q.split(/\s+/).filter(w => w.length > 2 && !STOP.has(w.toLowerCase())).map(stem);
  const out = [];
  for (const h of j.hits || []) {
    if (h.duration < Math.min(need, 5)) continue;
    // Pertinence : part des mots de la scène retrouvés dans les mots-clés de la vidéo
    const tags = String(h.tags || '').split(',').flatMap(t => t.trim().split(/\s+/)).map(stem);
    const hit = words.filter(w => tags.some(t => t === w || t.startsWith(w) || w.startsWith(t))).length;
    const rel = words.length ? hit / words.length : 0;
    if (rel < 0.5) continue;
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
  return (j.videos || []).filter(v => v.duration >= Math.min(need, 5)).map(v => {
    const f = (v.video_files || []).filter(x => x.file_type === 'video/mp4' && x.height >= 1280 && x.height > x.width).sort((a, b) => a.height - b.height)[0];
    return f ? { id: 'pexels-' + v.id, url: f.link } : null;
  }).filter(Boolean);
}
async function fetchBroll(beats) {
  const pixabay = (process.env.PIXABAY_API_KEY || '').trim(), pexels = (process.env.PEXELS_API_KEY || '').trim();
  if (!pixabay && !pexels) return;
  const used = new Set();
  for (let i = 0; i < beats.length; i++) {
    const q = beats[i].broll;
    if (!q) continue;
    try {
      const need = beats[i].end - beats[i].start;
      const list = pixabay ? await pixabayCandidates(q, need, pixabay) : await pexelsCandidates(q, need, pexels);
      for (const c of list.filter(x => !used.has(x.id))) {
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
}

async function main() {
  const { data: post, error } = await sb.from('social_posts').select('id, video_script').eq('id', ID).single();
  if (error) throw error;
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
  const musicFile = script.music === false ? null : pickMusic(total);
  if (script.style === 'real') await fetchBroll(beats);
  else beats.forEach(b => { delete b.broll; delete b.broll_file; });
  if (script.style === 'real') {
    // Plan manquant : on réutilise le plan précédent (ou suivant) plutôt que de casser le style
    beats.forEach((b, i) => { if (!b.broll_file) b.broll_file = (beats.slice(0, i).reverse().find(x => x.broll_file) || beats.find(x => x.broll_file) || {}).broll_file; });
    if (!beats.some(b => b.broll_file)) throw new Error('Aucune vidéo trouvée pour le style réel : vérifie la clé PIXABAY_API_KEY');
  }
  fs.writeFileSync(path.join('src', 'data.json'), JSON.stringify({ beats, segments, musicFile, style: script.style || 'motion', jingle: fs.existsSync(path.join('public', 'jingle.mp3')) }));

  execSync('npx remotion render src/index.js Reel out/reel.mp4 --codec=h264 --crf=20 --concurrency=100% --log=warn', { stdio: 'inherit' });
  const buf = fs.readFileSync('out/reel.mp4');
  const file = `${ID}/reel-${Date.now()}.mp4`;
  const up = await sb.storage.from('social').upload(file, buf, { contentType: 'video/mp4', upsert: true });
  if (up.error) throw up.error;
  const { data: pub } = sb.storage.from('social').getPublicUrl(file);
  const { data: cur } = await sb.from('social_posts').select('video_script').eq('id', ID).single();
  const { error: e2 } = await sb.from('social_posts').update({
    video_url: pub.publicUrl, format: 'reel',
    video_script: { ...(cur?.video_script || {}), status: 'done', done_at: new Date().toISOString(), seconds: Math.round(total), size: buf.length, error: null },
  }).eq('id', ID);
  if (e2) throw e2;
  console.log('Vidéo prête :', pub.publicUrl, (buf.length / 1e6).toFixed(1) + ' Mo');
}

main().catch(async e => {
  console.error('::error::' + (e && e.message ? e.message : e));
  try { await patchScript({ status: 'error', error: String(e && e.message ? e.message : e).slice(0, 300) }); } catch {}
  process.exit(1);
});
