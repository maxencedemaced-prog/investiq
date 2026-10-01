// api/parse-statement.js — SÉCURISÉ
// Transforme le texte d'un relevé de portefeuille (PDF de courtier, extrait côté navigateur) en
// positions structurées. Prompt système fixe et sortie JSON uniquement : ne peut pas servir de
// chat IA détourné, donc ne consomme pas le quota IA de l'utilisateur.

const ALLOWED_ORIGINS = [
  'https://kapitaro.fr',
  'https://www.kapitaro.fr',
  'https://investiq-kappa.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_3_8eb6YbCfJ04Qihdy9ivw_NsQ4H_cu';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TEXT = 40_000;
const DAILY_IMPORTS = 15;   // imports PDF par jour et par compte (chaque import est un appel IA payant)

// Compteur quotidien dans la table events (clé serveur) ; sans clé serveur, on laisse passer
async function importsToday(userId) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return 0;
  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/events?select=id&user_id=eq.${userId}&type=eq.pdf_import&created_at=gte.${since.toISOString()}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact', Range: '0-0' },
  });
  const total = Number((r.headers.get('content-range') || '').split('/')[1]);
  return Number.isFinite(total) ? total : 0;
}
function logImport(userId) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return Promise.resolve();
  return fetch(`${SUPABASE_URL}/rest/v1/events`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: userId, type: 'pdf_import' }),
  }).catch(() => {});
}

const SYSTEM = `Tu extrais les positions d'un relevé de portefeuille de courtier (Trade Republic, XTB, Boursorama, Degiro, Fortuneo, etc.).
Réponds UNIQUEMENT avec un tableau JSON, sans texte autour, sans bloc de code. Chaque élément :
{"name": string, "isin": string|null, "ticker": string|null, "qty": number, "pru": number|null, "price": number|null}
- name : nom lisible du titre tel qu'écrit dans le document (ex : "iShares Core MSCI World", "Apple Inc.").
- isin : code ISIN s'il figure dans le document, sinon null.
- ticker : symbole boursier UNIQUEMENT s'il est écrit dans le document, sinon null. N'invente jamais.
- qty : nombre de parts détenues (nombre décimal, point comme séparateur).
- pru : prix de revient unitaire / prix moyen d'achat en euros s'il figure dans le document, sinon null.
- price : cours actuel unitaire en euros s'il figure dans le document. Si seule la valeur totale de la ligne est donnée, divise-la par qty.
Ignore les liquidités, espèces, frais, dividendes, totaux et lignes d'historique de transactions. Si aucune position n'est trouvée, réponds [].`;

const hits = new Map();
function rateLimited(userId, max = 6, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(userId) || { count: 0, start: now };
  if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
  entry.count++;
  hits.set(userId, entry);
  return entry.count > max;
}

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Connecte-toi pour importer un PDF.' });
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}` }
    });
    if (!authRes.ok) return res.status(401).json({ error: 'Session expirée, reconnecte-toi.' });
    const user = await authRes.json();
    if (!user?.id) return res.status(401).json({ error: 'Session invalide.' });

    if (rateLimited(user.id)) return res.status(429).json({ error: 'Trop d\'imports d\'un coup. Patiente une minute.' });
    if (await importsToday(user.id).catch(() => 0) >= DAILY_IMPORTS) return res.status(429).json({ error: `Tu as atteint la limite de ${DAILY_IMPORTS} imports PDF pour aujourd'hui. Réessaie demain.` });

    const text = (req.body && req.body.text) || '';
    if (typeof text !== 'string' || text.trim().length < 20) return res.status(400).json({ error: 'Aucun texte lisible dans ce PDF.' });
    if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Configuration serveur : clé API manquante' });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM,
        messages: [{ role: 'user', content: text.slice(0, MAX_TEXT) }],
      }),
    });
    const data = await r.json();
    await logImport(user.id);
    if (!r.ok || data.error) {
      console.error('[parse-statement] Anthropic:', r.status, data?.error?.message);
      return res.status(502).json({ error: 'Analyse du PDF indisponible, réessaie dans un instant.' });
    }
    const out = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const match = out.match(/\[[\s\S]*\]/);
    let list = [];
    try { list = match ? JSON.parse(match[0]) : []; } catch { list = []; }

    const positions = (Array.isArray(list) ? list : []).map(p => ({
      name: String(p?.name || '').trim().slice(0, 60),
      isin: /^[A-Z]{2}[A-Z0-9]{10}$/.test(String(p?.isin || '')) ? p.isin : null,
      ticker: p?.ticker ? String(p.ticker).trim().slice(0, 15) : null,
      qty: num(p?.qty),
      pru: num(p?.pru),
      price: num(p?.price),
    })).filter(p => p.name && p.qty).slice(0, 60);

    res.status(200).json({ positions });
  } catch (e) {
    console.error('[parse-statement]', e.message);
    res.status(500).json({ error: 'Erreur pendant l\'analyse du PDF.' });
  }
}
