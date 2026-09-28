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

    const DAY = 24 * 3600 * 1000;
    const dayOf = (iso) => String(iso).slice(0, 10);

    // ── Comptes (le compte admin est exclu de toutes les statistiques pour ne pas les fausser) ──
    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const allUsers = usersPage?.users || [];
    const adminId = allUsers.find(u => (u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase())?.id || null;
    const users = allUsers.filter(u => u.id !== adminId);
    const totalUsers = users.length;

    // Inscriptions par jour (90 j)
    const since = new Date(Date.now() - 90 * DAY).toISOString();
    const signupsByDay = {};
    for (const u of users) if (u.created_at >= since) signupsByDay[dayOf(u.created_at)] = (signupsByDay[dayOf(u.created_at)] || 0) + 1;
    const signups7 = users.filter(u => Date.now() - new Date(u.created_at) <= 7 * DAY).length;
    const signups30 = users.filter(u => Date.now() - new Date(u.created_at) <= 30 * DAY).length;

    // ── Abonnements en cours + revenu mensuel estimé (prix catalogue) ──
    const { data: premiumRows } = await supabaseAdmin
      .from('profiles').select('id, subscription_plan, subscription_status').eq('is_premium', true);
    const payingNow = (premiumRows || []).filter(p => p.id !== adminId);
    const monthlySubs = payingNow.filter(p => p.subscription_plan !== 'annual').length;
    const annualSubs = payingNow.filter(p => p.subscription_plan === 'annual').length;
    const mrr = Math.round((monthlySubs * 9.99 + annualSubs * 79.99 / 12) * 100) / 100;

    // ── Événements (90 derniers jours, hors signaux de présence, plafonné pour rester léger) ──
    let evQuery = supabaseAdmin.from('events').select('type, user_id, created_at, meta')
      .gte('created_at', since).neq('type', 'heartbeat').order('created_at', { ascending: true }).limit(20000);
    if (adminId) evQuery = evQuery.neq('user_id', adminId);
    const { data: events, error: evErr } = await evQuery;
    if (evErr) throw evErr;

    const byType = {};
    const dailyByType = {};   // { 'YYYY-MM-DD': { login: 3, page_view: 12, ... } }
    const dauSet = {};        // { 'YYYY-MM-DD': Set(user_id) }
    const lastSeenByUser = {}; // user_id → dernier événement (ISO)
    const funnel = { paywall_view: new Set(), checkout_started: new Set(), premium_paid: new Set(), premium_free: new Set() };
    for (const e of (events || [])) {
      const day = dayOf(e.created_at);
      byType[e.type] = (byType[e.type] || 0) + 1;
      dailyByType[day] = dailyByType[day] || {};
      dailyByType[day][e.type] = (dailyByType[day][e.type] || 0) + 1;
      (dauSet[day] = dauSet[day] || new Set()).add(e.user_id);
      lastSeenByUser[e.user_id] = e.created_at;
      if (e.type === 'paywall_view') funnel.paywall_view.add(e.user_id);
      if (e.type === 'checkout_started') funnel.checkout_started.add(e.user_id);
      if (e.type === 'premium_activated') (e.meta && e.meta.amount > 0 ? funnel.premium_paid : funnel.premium_free).add(e.user_id);
    }

    // ── Temps passé : 1 signal de présence = 2 minutes d'app ouverte (30 derniers jours) ──
    const HEARTBEAT_MIN = 2;
    const last30 = Array.from({ length: 30 }, (_, i) => dayOf(new Date(Date.now() - (29 - i) * DAY).toISOString()));
    const hbCounts = await Promise.all(last30.map(d => {
      let q = supabaseAdmin.from('events').select('id', { count: 'exact', head: true })
        .eq('type', 'heartbeat').gte('created_at', d + 'T00:00:00Z').lt('created_at', dayOf(new Date(new Date(d).getTime() + DAY).toISOString()) + 'T00:00:00Z');
      if (adminId) q = q.neq('user_id', adminId);
      return q.then(r => r.count || 0, () => 0);
    }));
    const minutesByDay = Object.fromEntries(last30.map((d, i) => [d, hbCounts[i] * HEARTBEAT_MIN]));
    const activeDays30 = last30.reduce((s, d) => s + (dauSet[d] ? dauSet[d].size : 0), 0);
    const avgMinutesPerActiveDay = activeDays30 ? Math.round(hbCounts.reduce((a, b) => a + b, 0) * HEARTBEAT_MIN / activeDays30 * 10) / 10 : 0;

    // ── Rétention : part des inscrits (assez anciens) revenus au moins N jours après leur inscription ──
    const eventsByUser = {};
    for (const e of (events || [])) (eventsByUser[e.user_id] = eventsByUser[e.user_id] || []).push(new Date(e.created_at).getTime());
    const retention = {};
    for (const n of [1, 7, 30]) {
      const eligible = users.filter(u => Date.now() - new Date(u.created_at) >= n * DAY);
      const back = eligible.filter(u => (eventsByUser[u.id] || []).some(t => t >= new Date(u.created_at).getTime() + n * DAY));
      retention['d' + n] = { eligible: eligible.length, returned: back.length, pct: eligible.length ? Math.round(back.length / eligible.length * 100) : null };
    }

    const days = [...new Set([...Object.keys(dailyByType), ...Object.keys(signupsByDay), ...last30])].sort();
    const daily = days.map(day => ({ day, ...(dailyByType[day] || {}), active_users: dauSet[day] ? dauSet[day].size : 0,
      signups: signupsByDay[day] || 0, minutes: minutesByDay[day] ?? null }));

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
      users: { total: totalUsers, premium: payingNow.length, signups_7j: signups7, signups_30j: signups30,
               inactive_14j: users.filter(u => !lastSeenByUser[u.id] || Date.now() - new Date(lastSeenByUser[u.id]) > 14 * DAY).length },
      revenue: { mrr_estime: mrr, abonnes_mensuels: monthlySubs, abonnes_annuels: annualSubs },
      funnel: {
        inscrits: totalUsers,
        ont_vu_offre: funnel.paywall_view.size,
        ont_clique_payer: funnel.checkout_started.size,
        ont_paye: funnel.premium_paid.size,
        offerts: funnel.premium_free.size,
        resiliations_programmees: byType.cancel_scheduled || 0,
        abonnements_termines: byType.subscription_ended || 0,
        paiements_echoues: byType.payment_failed || 0,
        renouvellements: byType.subscription_renewed || 0,
      },
      retention,
      temps: { minutes_moyennes_par_jour_actif: avgMinutesPerActiveDay },
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
