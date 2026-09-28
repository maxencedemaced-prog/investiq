// api/log-error.js — SÉCURISÉ
// Reçoit les erreurs JavaScript rencontrées par les visiteurs (envoyées par errlog.js) et les
// enregistre dans la table client_errors, lue uniquement par le tableau de bord admin.
// Ouvert aux visiteurs non connectés (les bugs de la page de connexion comptent aussi), donc :
// origines limitées, champs tronqués, et limite d'envois par adresse IP.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_3_8eb6YbCfJ04Qihdy9ivw_NsQ4H_cu';

const supabaseAdmin = process.env.SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const allowedOrigin = (o) => o === 'https://kapitaro.fr' || o === 'https://www.kapitaro.fr' || /^https:\/\/investiq-[a-z0-9-]+\.vercel\.app$/.test(o);

const hits = new Map();
function rateLimited(key, max = 30, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(key) || { count: 0, start: now };
  if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
  entry.count++;
  hits.set(key, entry);
  if (hits.size > 5000) hits.clear();   // évite que la mémoire grossisse indéfiniment
  return entry.count > max;
}

const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const int = (v) => (Number.isInteger(v) && v >= 0 && v < 1e7 ? v : null);

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (allowedOrigin(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!allowedOrigin(origin)) return res.status(403).json({ error: 'Origine refusée' });
  if (!supabaseAdmin) return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY manquante côté serveur' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'inconnue';
  if (rateLimited(ip)) return res.status(429).json({ error: 'Trop d\'envois' });

  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const message = str(b.message, 300);
  if (!message) return res.status(400).json({ error: 'Message manquant' });

  // Rattache l'erreur au compte si un jeton valide est fourni (facultatif)
  let userId = null;
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON, Authorization: auth } });
      if (r.ok) userId = (await r.json())?.id || null;
    } catch {}
  }

  const { error } = await supabaseAdmin.from('client_errors').insert({
    user_id: userId,
    kind: b.kind === 'promise' ? 'promise' : 'error',
    message,
    source: str(b.source, 200),
    line: int(b.line),
    col: int(b.col),
    stack: str(b.stack, 800),
    page: str(b.page, 60),
    app_version: str(b.version, 30),
    user_agent: str(req.headers['user-agent'], 200),
  });
  if (error) {
    console.error('[log-error]', error.message);
    return res.status(500).json({ error: 'Enregistrement impossible' });
  }
  return res.status(204).end();
}
