// api/claude.js — SÉCURISÉ
// Exige un utilisateur Supabase authentifié + limites anti-abus

const ALLOWED_ORIGINS = [
  'https://investiq-kappa.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_3_8eb6YbCfJ04Qihdy9ivw_NsQ4H_cu';

// Rate limit simple en mémoire (par instance serverless — limite les bursts)
const hits = new Map();
function rateLimited(userId, max = 20, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(userId) || { count: 0, start: now };
  if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
  entry.count++;
  hits.set(userId, entry);
  return entry.count > max;
}

export default async function handler(req, res) {
  // CORS restreint au domaine de l'app
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // ── 1. AUTHENTIFICATION : vérifier le token Supabase de l'utilisateur ──
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Connecte-toi pour utiliser l\'assistant IA.' });
    }

    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${token}` }
    });
    if (!authRes.ok) {
      return res.status(401).json({ error: 'Session invalide ou expirée. Reconnecte-toi.' });
    }
    const user = await authRes.json();
    if (!user?.id) {
      return res.status(401).json({ error: 'Session invalide.' });
    }

    // ── 2. RATE LIMIT : max 20 requêtes / minute / utilisateur ──
    if (rateLimited(user.id)) {
      return res.status(429).json({ error: 'Trop de requêtes. Patiente une minute.' });
    }

    // ── 3. LIMITES DE TAILLE : éviter les prompts géants ──
    const { prompt, system } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt manquant.' });
    }
    if (prompt.length > 20_000 || (system && system.length > 10_000)) {
      return res.status(400).json({ error: 'Prompt trop long.' });
    }

    // ── 4. APPEL ANTHROPIC ──
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', // Sonnet : ~5x moins cher qu'Opus, largement suffisant ici
        max_tokens: 1024,
        system: system || 'Tu es le copilote financier IA d\'InvestIQ. Tutoie, sois chaleureux, direct et concret comme un ami compétent qui travaille en finance. Commence par le positif, jamais alarmiste. Réponds en français. Tu ne fournis pas de conseil financier réglementé.',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    res.status(200).json({ text: text || 'Aucune réponse.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur: ' + error.message });
  }
}
