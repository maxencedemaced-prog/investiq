// Aperçu du style « Dossier décodé » sans voix : minutage fictif des mots, une image au milieu de chaque scène,
// envoyées dans le stockage public (social/preview/). Lancé par .github/workflows/dossier-preview.yml.
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { DOSSIERS } from '../api/_dossier.js';

const sb = createClient((process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co').trim(), (process.env.SUPABASE_SERVICE_KEY || '').trim());
const topic = process.env.TOPIC || 'interets-composes';
const d = DOSSIERS[topic];
let t = 0;
const beats = d.beats.map(b => {
  const ws = b.say.split(/\s+/).filter(Boolean), start = t;
  const words = ws.map((w, k) => ({ w: w.replace(/[,.:;!?…]+$/, ''), t: k * 0.34, d: 0.3 }));
  t += ws.length * 0.34 + 0.3;
  return { ...b, start, end: t, words };
});
fs.writeFileSync(path.join('src', 'data.json'), JSON.stringify({ beats, segments: [], musicFile: null, style: 'dossier', dossier: { num: d.num, title: d.title, chapters: d.chapters }, jingle: false }));
fs.mkdirSync('out', { recursive: true });
const shots = [];
beats.forEach((b, i) => {
  const mid = Math.round(((b.start + b.end) / 2) * 30), late = Math.round((b.end - 0.4) * 30);
  for (const [tag, fr] of [['a', mid], ['b', late]]) {
    const file = `out/p${i}${tag}.jpg`;
    execSync(`npx remotion still src/index.js Reel ${file} --frame=${fr} --image-format=jpeg --jpeg-quality=80 --scale=0.5 --log=warn`, { stdio: 'inherit' });
    shots.push(file);
  }
});
for (const f of shots) {
  const up = await sb.storage.from('social').upload('preview/dossier-' + path.basename(f), fs.readFileSync(f), { contentType: 'image/jpeg', upsert: true, cacheControl: '0' });
  if (up.error) throw up.error;
}
console.log('Aperçus envoyés :', shots.length);
