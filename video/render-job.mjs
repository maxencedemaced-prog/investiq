// Fabrique la vidéo animée d'un post (lancé par GitHub Actions, workflow « reel.yml ») :
// lit social_posts.video_script, prépare la voix (fichiers ElevenLabs déjà créés par le serveur, sinon voix Microsoft gratuite),
// génère la musique, rend la vidéo avec Remotion, l'envoie dans le stockage public « social » et met à jour le post.
// Variables : POST_ID, SUPABASE_SERVICE_KEY (secret GitHub), SUPABASE_URL (facultatif).
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
  execSync(`node music.mjs ${Math.ceil(total + 1)} 96`, { stdio: 'inherit' });
  fs.writeFileSync(path.join('src', 'data.json'), JSON.stringify({ beats, segments, music: script.music !== false }));

  execSync('npx remotion render src/index.js Reel out/reel.mp4 --codec=h264 --crf=20 --log=warn', { stdio: 'inherit' });
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
