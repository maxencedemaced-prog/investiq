// api/admin-stats.js — SÉCURISÉ
// Fournit les données agrégées du tableau de bord admin. Réservé au propriétaire du site
// (vérifié par email, jamais par simple appartenance à un domaine). Utilise la clé service_role
// (contourne RLS) uniquement côté serveur : elle ne quitte jamais cette fonction.

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_3_8eb6YbCfJ04Qihdy9ivw_NsQ4H_cu';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'maxencedemacedo@gmail.com';

const supabaseAdmin = process.env.SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

// Coûts IA : utilisateurs, ton propre compte, Studio (posts, vidéos, stories), voix ElevenLabs (abonnement fixe)
async function coutsIA() {
  const DAY = 86400000, start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();
  const { data: rows } = await supabaseAdmin.from('ai_usage_log').select('user_id, model, input_tokens, cost_usd, call_label, created_at').gte('created_at', start < new Date(since30) ? start.toISOString() : since30).limit(50000);
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const adminId = (list?.users || []).find(u => (u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase())?.id || null;
  const bucket = r => String(r.call_label || '').startsWith('studio:') ? (r.call_label === 'studio:voix' ? 'voix' : 'studio') : r.user_id && r.user_id === adminId ? 'toi' : 'utilisateurs';
  const sum = (from) => {
    const o = { utilisateurs: 0, toi: 0, studio: 0, voix_caracteres: 0, detail_studio: {} };
    for (const r of rows || []) {
      if (r.created_at < from) continue;
      const b = bucket(r);
      if (b === 'voix') { o.voix_caracteres += r.input_tokens || 0; continue; }
      o[b] += r.cost_usd || 0;
      if (b === 'studio') o.detail_studio[r.call_label.slice(7)] = (o.detail_studio[r.call_label.slice(7)] || 0) + (r.cost_usd || 0);
    }
    const r2 = x => Math.round(x * 100) / 100;
    Object.keys(o.detail_studio).forEach(k => { o.detail_studio[k] = r2(o.detail_studio[k]); });
    return { ...o, utilisateurs: r2(o.utilisateurs), toi: r2(o.toi), studio: r2(o.studio), anthropic_total: r2(o.utilisateurs + o.toi + o.studio) };
  };
  const elevenUsd = Number(process.env.ELEVENLABS_PLAN_USD || 6);
  let usdEur = 0.92;
  try { const fx = await (await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR', { signal: AbortSignal.timeout(4000) })).json(); if (fx?.rates?.EUR) usdEur = fx.rates.EUR; } catch {}
  const mois = sum(start.toISOString()), j30 = sum(since30);
  const fixes = String(process.env.FIXED_COSTS || `ElevenLabs (voix):${elevenUsd}:USD`).split(';').map(s => s.trim()).filter(Boolean).map(s => {
    const [nom, montant, devise] = s.split(':').map(x => (x || '').trim());
    const cur = (devise || 'EUR').toUpperCase(), amount = Number(String(montant).replace(',', '.')) || 0;
    return { nom, montant: amount, devise: cur, eur: Math.round((cur === 'USD' ? amount * usdEur : amount) * 100) / 100 };
  });
  const fixesEur = fixes.reduce((s, f) => s + f.eur, 0);
  return { mois_en_cours: mois, jours_30: j30, elevenlabs_abonnement_usd: elevenUsd, elevenlabs_credits_mois: 30000, abonnements_fixes: fixes,
    total_mois_usd: Math.round((mois.anthropic_total + elevenUsd) * 100) / 100, taux_usd_eur: usdEur,
    total_mois_eur: Math.round((mois.anthropic_total * usdEur + fixesEur) * 100) / 100,
    note: "Studio et voix enregistrés depuis le 30/09/2026 ; ton compte et les utilisateurs depuis le début." };
}

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
    let mrr = Math.round((monthlySubs * 9.99 + annualSubs * 79.99 / 12) * 100) / 100;
    // Revenu réel : abonnements Stripe actifs, réductions en cours comprises (ex. code AMIS2026 = 0 € ce mois-ci)
    const stripeRev = await (async () => {
      if (!process.env.STRIPE_SECRET_KEY) return null;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      let reel = 0, plein = 0, payants = 0, promo = 0, total = 0;
      for (const status of ['active', 'trialing', 'past_due']) {
        for await (const sub of stripe.subscriptions.list({ status, limit: 100 })) {
          let full = 0;
          for (const it of sub.items?.data || []) {
            const price = it.price || {}, amount = (price.unit_amount || 0) / 100 * (it.quantity || 1);
            const months = price.recurring?.interval === 'year' ? 12 * (price.recurring?.interval_count || 1) : (price.recurring?.interval_count || 1);
            full += amount / months;
          }
          const d = sub.discount, active = d && d.coupon && (!d.end || d.end * 1000 > Date.now());
          let now = full;
          if (status === 'trialing') now = 0;
          else if (active) now = d.coupon.percent_off ? full * (1 - d.coupon.percent_off / 100) : Math.max(0, full - (d.coupon.amount_off || 0) / 100);
          total++; plein += full; reel += now;
          if (now > 0) payants++; else promo++;
        }
      }
      const r2 = x => Math.round(x * 100) / 100;
      return { mrr_reel: r2(reel), mrr_apres_promos: r2(plein), abonnes_stripe: total, abonnes_payants: payants, abonnes_offerts: promo };
    })().catch(e => ({ erreur: e.message }));
    if (stripeRev && stripeRev.mrr_reel != null) mrr = stripeRev.mrr_reel;

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
    const sourceUsers = {};   // provenance des inscrits (événement signup_source) → personnes
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
      if (e.type === 'signup_source') { const s = String((e.meta && e.meta.source) || 'direct').slice(0, 60); (sourceUsers[s] = sourceUsers[s] || new Set()).add(e.user_id); }
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
    const notAdmin = (q) => adminId ? q.neq('user_id', adminId) : q;
    const [{ count: positionsCount }, { count: objectivesCount }, { count: bilansCount }, { count: pushCount }] =
      await Promise.all([
        notAdmin(supabaseAdmin.from('positions').select('id', { count: 'exact', head: true })),
        notAdmin(supabaseAdmin.from('objectives').select('id', { count: 'exact', head: true })),
        notAdmin(supabaseAdmin.from('bilans').select('id', { count: 'exact', head: true })),
        notAdmin(supabaseAdmin.from('push_devices').select('endpoint', { count: 'exact', head: true })),
      ]);

    // ── Coût IA (Anthropic) des utilisateurs, hors compte admin (la facture réelle totale est sur la console Anthropic) ──
    const { data: aiRows } = await notAdmin(supabaseAdmin
      .from('ai_usage_log').select('cost_usd, created_at').gte('created_at', since));
    const aiTotalCost = (aiRows || []).reduce((s, r) => s + (r.cost_usd || 0), 0);
    const aiTotalCalls = (aiRows || []).length;

    // ── Bugs rencontrés par les visiteurs (30 derniers jours), regroupés par erreur identique ──
    const errors = await (async () => {
      const since30 = new Date(Date.now() - 30 * DAY).toISOString();
      // Ménage : on ne garde que 90 jours d'erreurs
      supabaseAdmin.from('client_errors').delete().lt('created_at', new Date(Date.now() - 90 * DAY).toISOString()).then(() => {}, () => {});
      const { data: rows, error } = await supabaseAdmin.from('client_errors')
        .select('created_at, user_id, kind, message, source, line, page, app_version, user_agent, stack')
        .gte('created_at', since30).order('created_at', { ascending: false }).limit(5000);
      if (error) return { disponible: false, raison: error.message };
      const groups = {};
      const daily = {};
      for (const r of rows || []) {
        const key = `${r.message}|${r.source || ''}|${r.line || ''}`;
        const g = groups[key] = groups[key] || { message: r.message, source: r.source, line: r.line, kind: r.kind, count: 0, users: new Set(), pages: new Set(), last_seen: r.created_at, version: r.app_version, user_agent: r.user_agent, stack: r.stack };
        g.count++;
        g.users.add(r.user_id || 'visiteur');
        if (r.page) g.pages.add(r.page);
        daily[dayOf(r.created_at)] = (daily[dayOf(r.created_at)] || 0) + 1;
      }
      const top = Object.values(groups).sort((a, b) => b.count - a.count).slice(0, 25)
        .map(g => ({ ...g, users: g.users.size, pages: [...g.pages].slice(0, 5) }));
      const since24 = Date.now() - DAY, since7 = Date.now() - 7 * DAY;
      return {
        disponible: true,
        total_24h: (rows || []).filter(r => new Date(r.created_at) >= since24).length,
        total_7j: (rows || []).filter(r => new Date(r.created_at) >= since7).length,
        total_30j: (rows || []).length,
        par_jour: last30.map(d => ({ day: d, count: daily[d] || 0 })),
        top,
      };
    })().catch(e => ({ disponible: false, raison: e.message }));

    res.status(200).json({
      generated_at: new Date().toISOString(),
      users: { total: totalUsers, premium: payingNow.length, signups_7j: signups7, signups_30j: signups30,
               inactive_14j: users.filter(u => !lastSeenByUser[u.id] || Date.now() - new Date(lastSeenByUser[u.id]) > 14 * DAY).length },
      revenue: { mrr_estime: mrr, abonnes_mensuels: monthlySubs, abonnes_annuels: annualSubs, stripe: stripeRev },
      couts: await coutsIA(),
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
      sources: (() => {
        const paying = new Set(payingNow.map(p => p.id));
        return Object.entries(sourceUsers).map(([source, set]) => ({ source, inscrits: set.size, premium: [...set].filter(id => paying.has(id)).length }))
          .sort((a, b) => b.inscrits - a.inscrits).slice(0, 15);
      })(),
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
      errors,
    });
  } catch (e) {
    console.error('[admin-stats]', e.message);
    res.status(500).json({ error: e.message });
  }
}
