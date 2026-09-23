// api/admin-stats.js — SÉCURISÉ
// Fournit les données agrégées du tableau de bord admin. Réservé au propriétaire du site
// (vérifié par email, jamais par simple appartenance à un domaine). Utilise la clé service_role
// (contourne RLS) uniquement côté serveur : elle ne quitte jamais cette fonction.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_3_8eb6YbCfJ04Qihdy9ivw_NsQ4H_cu';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'maxencedemacedo@gmail.com';

const supabaseAdmin = process.env.SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

export default async function handler(req, res) {
  // Page ouverte en local (file://) ou depuis le site : pas de cookies impliqués, seulement un
  // jeton Bearer vérifié ci-dessous, donc une origine ouverte ne crée pas de risque ici.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY manquante côté serveur' });
  }

  try {
    // ── Authentification + vérification que c'est bien l'admin ──
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Connecte-toi.' });

    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}` }
    });
    if (!authRes.ok) return res.status(401).json({ error: 'Session invalide ou expirée.' });
    const user = await authRes.json();
    if (!user?.email || user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: 'Accès réservé.' });
    }

    // ── Comptes ──
    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const totalUsers = usersPage?.users?.length || 0;

    const { count: premiumCount } = await supabaseAdmin
      .from('profiles').select('id', { count: 'exact', head: true }).eq('is_premium', true);

    // ── Événements (90 derniers jours, plafonné pour rester léger) ──
    const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    const { data: events, error: evErr } = await supabaseAdmin
      .from('events').select('type, user_id, created_at')
      .gte('created_at', since).order('created_at', { ascending: true }).limit(20000);
    if (evErr) throw evErr;

    const byType = {};
    const dailyByType = {};   // { 'YYYY-MM-DD': { login: 3, page_view: 12, ... } }
    const dauSet = {};        // { 'YYYY-MM-DD': Set(user_id) }
    for (const e of (events || [])) {
      const day = e.created_at.slice(0, 10);
      byType[e.type] = (byType[e.type] || 0) + 1;
      dailyByType[day] = dailyByType[day] || {};
      dailyByType[day][e.type] = (dailyByType[day][e.type] || 0) + 1;
      dauSet[day] = dauSet[day] || new Set();
      dauSet[day].add(e.user_id);
    }
    const days = Object.keys(dailyByType).sort();
    const daily = days.map(day => ({ day, ...dailyByType[day], active_users: dauSet[day].size }));

    // ── Usage produit ──
    const [{ count: positionsCount }, { count: objectivesCount }, { count: bilansCount }, { count: pushCount }] =
      await Promise.all([
        supabaseAdmin.from('positions').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('objectives').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('bilans').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('push_devices').select('endpoint', { count: 'exact', head: true }),
      ]);

    // ── Coût IA (Anthropic) ──
    const { data: aiRows } = await supabaseAdmin
      .from('ai_usage_log').select('cost_usd, created_at').gte('created_at', since);
    const aiTotalCost = (aiRows || []).reduce((s, r) => s + (r.cost_usd || 0), 0);
    const aiTotalCalls = (aiRows || []).length;

    res.status(200).json({
      generated_at: new Date().toISOString(),
      users: { total: totalUsers, premium: premiumCount || 0 },
      events_by_type: byType,
      daily,
      usage: {
        positions: positionsCount || 0,
        objectives: objectivesCount || 0,
        bilans: bilansCount || 0,
        push_devices: pushCount || 0,
      },
      ai: { total_calls_90j: aiTotalCalls, total_cost_usd_90j: Math.round(aiTotalCost * 100) / 100 },
    });
  } catch (e) {
    console.error('[admin-stats]', e.message);
    res.status(500).json({ error: e.message });
  }
}
