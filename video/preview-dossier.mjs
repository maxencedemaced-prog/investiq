// Aperçu du style « Dossier décodé » sans voix : minutage fictif des mots, une image vers la fin de chaque scène,
// envoyées dans le stockage public (social/preview/<dossier>-p<scène>.jpg). Lancé par .github/workflows/dossier-preview.yml.
// TOPICS (facultatif) : dossiers à prévisualiser, séparés par des virgules ; sinon tous.
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { DOSSIERS } from '../api/_dossier.js';

const sb = createClient((process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co').trim(), (process.env.SUPABASE_SERVICE_KEY || '').trim());
const topics = (process.env.TOPICS || '').split(',').map(s => s.trim()).filter(Boolean);
fs.mkdirSync('out', { recursive: true });
for (const topic of topics.length ? topics : Object.keys(DOSSIERS)) {
  const d = DOSSIERS[topic]; if (!d) continue;
  let t = 0;
  const beats = d.beats.map(b => {
    const ws = b.say.split(/\s+/).filter(Boolean), start = t;
    const words = ws.map((w, k) => ({ w: w.replace(/[,.:;!?…]+$/, ''), t: k * 0.34, d: 0.3 }));
    t += ws.length * 0.34 + 0.3;
    return { ...b, start, end: t, words };
  });
  fs.writeFileSync(path.join('src', 'data.json'), JSON.stringify({ beats, segments: [], musicFile: null, style: 'dossier', dossier: { num: d.num, title: d.title, chapters: d.chapters }, jingle: false }));
  for (let i = 0; i < beats.length; i++) {
    const fr = Math.round((beats[i].end - 0.5) * 30), file = `out/${topic}-p${i}.jpg`;
    execSync(`npx remotion still src/index.js Reel ${file} --frame=${fr} --image-format=jpeg --jpeg-quality=80 --scale=0.5 --log=warn`, { stdio: 'inherit' });
    const up = await sb.storage.from('social').upload('preview/' + path.basename(file), fs.readFileSync(file), { contentType: 'image/jpeg', upsert: true, cacheControl: '0' });
    if (up.error) throw up.error;
  }
  console.log('Aperçus envoyés :', topic, beats.length);
}

// Diaporama : une image de test avec 2 diapositives d'un carrousel existant
if (!topics.length) {
  const imgs = ['https://soyyznyceqzimhoaffaw.supabase.co/storage/v1/object/public/social/39fd3b08-0c17-42a5-bea4-90859c6578a2/1-1791135241756.jpg', 'https://soyyznyceqzimhoaffaw.supabase.co/storage/v1/object/public/social/39fd3b08-0c17-42a5-bea4-90859c6578a2/2-1791135242543.jpg'];
  const slides = [];
  for (let i = 0; i < imgs.length; i++) { const r = await fetch(imgs[i]); if (!r.ok) continue; fs.writeFileSync(path.join('public', 'slide-' + i + '.jpg'), Buffer.from(await r.arrayBuffer())); slides.push('slide-' + i + '.jpg'); }
  fs.writeFileSync(path.join('src', 'data.json'), JSON.stringify({ style: 'slideshow', beats: [], segments: [], slides, perSlide: 3.4, musicFile: null, jingle: false }));
  for (const [tag, fr] of [['a', 50], ['b', 230]]) {
    const file = `out/slideshow-${tag}.jpg`;
    execSync(`npx remotion still src/index.js Reel ${file} --frame=${fr} --image-format=jpeg --jpeg-quality=80 --scale=0.5 --log=warn`, { stdio: 'inherit' });
    const up = await sb.storage.from('social').upload('preview/' + path.basename(file), fs.readFileSync(file), { contentType: 'image/jpeg', upsert: true, cacheControl: '0' });
    if (up.error) throw up.error;
  }
  console.log('Aperçu diaporama envoyé');
}
