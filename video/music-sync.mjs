// Met en ligne les musiques de fond (public/music) dans le stockage public « social/music/ »,
// pour que le Studio puisse les faire écouter avant de fabriquer une vidéo. Lancé par .github/workflows/music-sync.yml.
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const sb = createClient((process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co').trim(), (process.env.SUPABASE_SERVICE_KEY || '').trim());
const dir = path.join('public', 'music');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp3'));
for (const f of files) {
  const up = await sb.storage.from('social').upload('music/' + f, fs.readFileSync(path.join(dir, f)), { contentType: 'audio/mpeg', upsert: true, cacheControl: '86400' });
  if (up.error) throw up.error;
  console.log('Musique en ligne :', f);
}
