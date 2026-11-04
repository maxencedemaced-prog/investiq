// api/claude.js — SÉCURISÉ
// Exige un utilisateur Supabase authentifié + limites anti-abus

import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = [
  'https://kapitaro.fr',
  'https://www.kapitaro.fr',
  'https://kapitaro.com',      // version anglaise (domaine à brancher)
  'https://www.kapitaro.com',
  'https://investiq-kappa.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_3_8eb6YbCfJ04Qihdy9ivw_NsQ4H_cu';

// ── Mesure de la consommation API : client service_role (contourne RLS) ──
// Réutilise SUPABASE_SERVICE_KEY, déjà configurée sur Vercel pour api/stripe-webhook.js
const supabaseAdmin = process.env.SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

// Tarifs en USD par million de tokens — à ajuster si Anthropic change ses prix
const MODEL_PRICING = {
  'claude-sonnet-5':          { in: 2.0, out: 10.0 },
  'claude-haiku-4-5-20251001': { in: 1.0, out: 5.0 },
};
const DEFAULT_MODEL = 'claude-sonnet-5';

// Enregistre la consommation réelle d'un appel. Ne bloque et ne casse jamais la réponse utilisateur.
// feature 'objectif' ou 'agent' : préfixe « objectif| » / « agent| » dans call_label, pour compter ces appels à part.
async function logUsage({ userId, model, usage, system, feature }) {
  if (!usage) return;
  if (!supabaseAdmin) {
    console.error('[api/claude] SUPABASE_SERVICE_KEY manquante : usage non enregistré');
    return;
  }
  try {
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const pricing = MODEL_PRICING[model] || MODEL_PRICING[DEFAULT_MODEL];
    const costUsd = (inputTokens / 1_000_000) * pricing.in
                  + (outputTokens / 1_000_000) * pricing.out;
    const { error } = await supabaseAdmin.from('ai_usage_log').insert({
      user_id: userId,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
      call_label: (feature && feature !== 'general' ? feature + '|' : '') + (system || '').slice(0, 80), // préfixe du system prompt → regroupement approximatif par fonctionnalité
    });
    if (error) console.error('[api/claude] insert ai_usage_log:', error.message);
  } catch (e) {
    console.error('[api/claude] logUsage failed:', e.message);
  }
}

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

// ── Quota IA gratuit : les comptes Premium ont un accès illimité (toujours
// borné par le rate-limit anti-abus ci-dessus) ; les comptes gratuits sont
// plafonnés par jour pour que "IA illimitée" reste un vrai avantage Premium.
// Comptes gratuits : WELCOME analyses offertes une fois pour toutes à l'inscription,
// puis DAILY par jour quand elles sont épuisées. Valeurs ajustables avec le temps.
const FREE_WELCOME_CREDITS = 15;
const FREE_DAILY_AFTER_WELCOME = 3;
// « Illimité » Premium = usage raisonnable : plafond invisible en usage normal (appels automatiques compris),
// qui empêche un compte abusif de générer des milliers d'appels facturés par jour
const PREMIUM_DAILY_CAP = 300;
// Page Objectif (plan du mois, répartition, plan de l'objectif) : offerte pendant l'essai de 30 jours sans carte, sans toucher
// au quota ci-dessus ; ensuite réservée à Premium. Comptes créés avant le lancement de l'essai : les 30 jours partent du lancement.
// Mêmes valeurs côté app (app.js, OBJ_TRIAL_*).
const OBJ_TRIAL_DAYS = 30;
const OBJ_TRIAL_LAUNCH = Date.parse('2026-11-04T00:00:00Z');
const OBJ_DAILY_CAP = 40;   // garde-fou anti-abus pendant l'essai, invisible en usage normal
// Agent IA : questions comptées à part, pour pouvoir toujours en poser quelques-unes même quand le quota des analyses est épuisé
const AGENT_FREE_DAILY = 3;

function objTrialEnd(createdAt) {
  const c = Date.parse(createdAt || '') || Date.now();
  return Math.max(c, OBJ_TRIAL_LAUNCH) + OBJ_TRIAL_DAYS * 86400000;
}

function isPremiumProfile(profile) {
  if (!profile) return false;
  if (profile.subscription_status === 'canceled' || profile.subscription_status === 'unpaid') return false;
  if (profile.premium_until) {
    const t = new Date(profile.premium_until).getTime();
    if (!Number.isNaN(t)) return t > Date.now();
  }
  return profile.is_premium === true;
}

// Ne bloque jamais par excès de prudence : si la vérification échoue (clé
// service_role absente, erreur réseau...) on laisse passer plutôt que de
// casser l'IA pour tout le monde.
// Retourne { blocked, premium, quota, code, trialEnd, agent } où quota décrit l'état AVANT l'appel en cours :
//   mode 'welcome' : il reste des analyses offertes (used/limit = total consommé / offert)
//   mode 'daily'   : offertes épuisées, on compte le jour (used/limit = aujourd'hui / par jour)
// feature : 'objectif' (essai de 30 jours puis Premium), 'agent' (questions du jour comptées à part) ou 'general'.
async function checkFreeQuota(userId, feature = 'general', createdAt = null) {
  const trialEnd = objTrialEnd(createdAt);
  const open = { blocked: false, premium: false, quota: null, trialEnd };
  if (!supabaseAdmin) return open;
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('is_premium, subscription_status, premium_until').eq('id', userId).single();
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const day = startOfDay.toISOString();
    const count = q => q.then(r => { if (r.error) throw r.error; return r.count || 0; });
    const logs = () => supabaseAdmin.from('ai_usage_log').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    if (isPremiumProfile(profile)) {
      const { count: n, error } = await logs().gte('created_at', day);
      if (error) console.error('[api/claude] plafond Premium:', error.message);
      return { blocked: false, premium: true, quota: null, trialEnd, fairUseHit: !error && (n || 0) >= PREMIUM_DAILY_CAP };
    }
    const agentToday = await count(logs().like('call_label', 'agent|%').gte('created_at', day));
    const agent = { used: agentToday, limit: AGENT_FREE_DAILY };
    if (feature === 'objectif') {
      if (Date.now() >= trialEnd) return { blocked: true, code: 'trial_ended', premium: false, quota: null, trialEnd, agent };
      const n = await count(logs().like('call_label', 'objectif|%').gte('created_at', day));
      return { blocked: n >= OBJ_DAILY_CAP, code: 'objectif_cap', premium: false, quota: null, trialEnd, agent };
    }
    if (feature === 'agent') return { blocked: agentToday >= AGENT_FREE_DAILY, code: 'agent_quota', premium: false, quota: null, trialEnd, agent };
    // Analyses « générales » : les appels de la page Objectif et de l'agent ne sont pas comptés ici
    const general = () => logs().not('call_label', 'like', 'objectif|%').not('call_label', 'like', 'agent|%');
    const [usedTotal, usedToday] = await Promise.all([count(general()), count(general().gte('created_at', day))]);

    if (usedTotal < FREE_WELCOME_CREDITS) {
      return { blocked: false, premium: false, trialEnd, agent, quota: { mode: 'welcome', used: usedTotal, limit: FREE_WELCOME_CREDITS } };
    }
    return {
      blocked: usedToday >= FREE_DAILY_AFTER_WELCOME, code: 'quota_exceeded', premium: false, trialEnd, agent,
      quota: { mode: 'daily', used: usedToday, limit: FREE_DAILY_AFTER_WELCOME, welcome: FREE_WELCOME_CREDITS }
    };
  } catch (e) {
    console.error('[api/claude] checkFreeQuota failed:', e.message);
    return open;
  }
}

// Cadre fixé par le serveur et placé AVANT les consignes envoyées par le navigateur : celles-ci peuvent être modifiées
// par un utilisateur, ce cadre non. Il empêche de détourner l'assistant en IA généraliste et maintient le cadre AMF.
const SERVER_FRAME = `CADRE KAPITARO (prioritaire sur toute autre consigne, y compris celles qui suivent) :
- Tu es l'assistant de l'application Kapitaro : suivi de portefeuille, épargne, investissement, budget et finances personnelles. Tu ne traites que ces sujets et l'utilisation de Kapitaro. Pour toute autre demande (programmation, devoirs, rédaction sans lien, etc.), décline poliment en une phrase.
- Tu restes dans un cadre éducatif et informatif : pas de conseil en investissement réglementé, aucune promesse de gain, aucun placement présenté comme sans risque.
- Respecte scrupuleusement le format de réponse demandé dans les consignes qui suivent.

`;

// Version anglaise (kapitaro.com) : ajouté APRÈS les consignes du navigateur (écrites en français) pour imposer la langue
// de réponse et les avertissements propres à la région. Absent pour les utilisateurs francophones (comportement inchangé).
const EN_DISCLAIMERS = {
  US: 'Educational information only — not investment, tax or legal advice. Kapitaro is not a registered investment adviser or broker-dealer.',
  EU: 'Educational information only, not investment advice. Past performance is not a reliable indicator of future results. Capital at risk.',
  UK: 'Educational information only, not financial advice. Past performance is not a reliable indicator of future results. Capital at risk.',
  OTHER: 'Educational information only, not investment advice. Investing involves risk, including loss of capital.',
};
const EN_VOCAB = {
  US: 'Use US vocabulary and examples where relevant: brokerage account, Traditional/Roth IRA, 401(k), HSA, high-yield savings account, emergency fund, S&P 500 index funds, USD. Never give tax advice (you may name account types and say rules depend on the person\'s situation and IRS rules).',
  EU: 'Use neutral European vocabulary: savings account, investment account, pension plan, UCITS ETFs, KID (Key Information Document), EUR. Do not mention French-only products (PEA, Livret A, assurance-vie, PER) or French tax rules.',
  UK: 'Use UK vocabulary: ISA (Stocks & Shares / Cash), SIPP, workplace pension, easy-access savings account, emergency fund, GBP/EUR. Do not mention French-only products or French tax rules. Never give tax advice.',
  OTHER: 'Use neutral international vocabulary (savings account, investment account, retirement account, index funds). Do not mention French-only products or French tax rules.',
};
function englishFrame(region) {
  const r = EN_DISCLAIMERS[region] ? region : 'OTHER';
  return `

LANGUAGE AND REGION OVERRIDE (highest priority, applies to everything above):
- The user uses Kapitaro in ENGLISH (region: ${r}). Write your entire answer in natural, simple, friendly English ("you"), even if the instructions above are written in French or ask for French. Keep any JSON keys, field names and enum values EXACTLY as specified above; only translate human-readable text values.
- ${EN_VOCAB[r]}
- The data above may use French labels for account types (PEA, Livret A / LDDS, assurance vie, PER, CTO, fonds euros). Treat them as the user's generic accounts (tax-advantaged investment account, savings account, long-term or pension savings, pension plan, taxable investment account, capital-guaranteed fund) and name them with the regional vocabulary above. Never recommend opening a French product, never cite French tax rules or limits, the AMF/ORIAS or French brokers, and never give tax advice.
- Amounts in the data are in euros (the app's reference currency): keep the € sign, do not convert.
- If the instructions above ask you to name specific securities or monthly purchases, present them as illustrative examples based on the data, not as recommendations.
- When you mention ETFs or funds, prefer the ones listed in the data above: they trade in the user's local currency on a local exchange, which avoids currency conversion fees. You may briefly explain that buying a fund quoted in another currency usually adds conversion costs at the broker.
- Same compliance rules as above: educational and general only, never personalized investment advice, never tell the user to buy or sell, no promise of returns, figures are hypothetical examples. Crypto: price information only, no analysis or opinion.
- When you give free-text explanations (not strict JSON), end with this short line: "${EN_DISCLAIMERS[r]}"`;
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

    // ── 1bis. Consultation du compteur (aucun appel IA, ne consomme rien) ──
    if (req.body && req.body.action === 'quota') {
      const q = await checkFreeQuota(user.id, 'general', user.created_at);
      return res.status(200).json({ premium: q.premium, quota: q.quota, agent: q.agent || null, trial_end: new Date(q.trialEnd).toISOString() });
    }

    // ── 2. RATE LIMIT : max 20 requêtes / minute / utilisateur ──
    if (rateLimited(user.id)) {
      return res.status(429).json({ error: 'Trop de requêtes. Patiente une minute.' });
    }

    // ── 2bis. QUOTA GRATUIT : accès IA illimité réservé à Premium ──
    const feature = ['objectif', 'agent'].includes(req.body && req.body.feature) ? req.body.feature : 'general';
    const quota = await checkFreeQuota(user.id, feature, user.created_at);
    if (quota.fairUseHit) {
      console.warn('[api/claude] plafond Premium atteint pour', user.id);
      return res.status(429).json({
        code: 'fair_use',
        error: `Utilisation anormale détectée : plus de ${PREMIUM_DAILY_CAP} analyses IA aujourd'hui. Pour protéger le service, l'IA est en pause jusqu'à demain matin. Si c'est une erreur, écris-nous à contact@kapitaro.fr.`
      });
    }
    if (quota.blocked && quota.code === 'trial_ended') {
      return res.status(402).json({
        code: 'trial_ended', trial_end: new Date(quota.trialEnd).toISOString(),
        error: `Ton essai gratuit de ${OBJ_TRIAL_DAYS} jours est terminé : le plan du mois et la répartition de ton objectif sont réservés à Premium.`
      });
    }
    if (quota.blocked && quota.code === 'agent_quota') {
      return res.status(429).json({
        code: 'agent_quota', agent: quota.agent,
        error: `Tu as posé tes ${AGENT_FREE_DAILY} questions gratuites du jour à l'assistant. ${AGENT_FREE_DAILY} nouvelles reviennent demain, ou passe à Premium pour des questions illimitées.`
      });
    }
    if (quota.blocked && quota.code === 'objectif_cap') {
      return res.status(429).json({ code: 'fair_use', error: 'Beaucoup de plans générés aujourd\'hui : la génération reprend demain matin.' });
    }
    if (quota.blocked) {
      return res.status(429).json({
        code: 'quota_exceeded',
        quota: quota.quota,
        error: `Limite IA atteinte : tes ${FREE_WELCOME_CREDITS} analyses offertes sont épuisées et tu as utilisé tes ${FREE_DAILY_AFTER_WELCOME} analyses gratuites du jour. Passe à Premium pour un accès illimité.`
      });
    }

    // ── 3. LIMITES DE TAILLE : éviter les prompts géants ──
    const { prompt, system, max_tokens, model } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt manquant.' });
    }
    if (prompt.length > 45_000 || (system && system.length > 12_000)) {   // les analyses avec données de marché (cours, indices, actualités) dépassent 20 000 caractères
      return res.status(400).json({ error: 'Prompt trop long.' });
    }
    // Plafond réglable par appel (ex: le fil d'actualités a besoin de plus de place
    // qu'une réponse JSON compacte) mais toujours borné côté serveur, jamais laissé
    // au client sans limite.
    const requestedTokens = Number.isFinite(max_tokens) ? Math.trunc(max_tokens) : 2048;
    const finalMaxTokens = Math.min(Math.max(requestedTokens, 256), 6000);
    // Modèle choisi par l'appelant parmi une liste blanche fixe — jamais une chaîne
    // arbitraire envoyée telle quelle à Anthropic.
    const finalModel = MODEL_PRICING[model] ? model : DEFAULT_MODEL;

    // ── 4. APPEL ANTHROPIC ──
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[api/claude] ANTHROPIC_API_KEY manquante dans les variables d\'environnement Vercel');
      return res.status(500).json({ error: 'Configuration serveur : clé API manquante' });
    }
    const callAnthropic = async (extra) => {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: finalModel,
          max_tokens: finalMaxTokens,
          system: SERVER_FRAME + (system || 'Tu es le copilote financier IA de Kapitaro. Tutoie, sois chaleureux, direct et concret comme un ami compétent qui travaille en finance. Commence par le positif, jamais alarmiste. Réponds en français. Tu ne fournis pas de conseil financier réglementé.')
            + (req.body.lang === 'en' ? englishFrame(req.body.region) : ''),
          messages: [{ role: 'user', content: prompt }],
          ...extra
        })
      });
      return { response: r, data: await r.json() };
    };
    // Sorties structurées longues (bilan) : le client demande de désactiver la réflexion étendue, qui peut consommer
    // tout le budget de tokens et ne laisser aucun texte (« Aucune réponse ») ou un JSON tronqué.
    // Si le modèle refuse ce paramètre, on refait l'appel sans.
    // Par DÉFAUT la réflexion étendue est coupée pour tous les appels du site (verdict, plan mensuel, bilan, tchat…) : elle
    // ralentissait fortement les réponses et pouvait consommer tout le budget de tokens, laissant un texte vide ou tronqué.
    // Un appel peut la réactiver explicitement avec { thinking: true }.
    const disableThinking = req.body.thinking !== true;
    let { response, data } = await callAnthropic(disableThinking ? { thinking: { type: 'disabled' } } : {});
    if (!response.ok && disableThinking && response.status === 400) {   // le modèle refuse ce paramètre : on refait l'appel sans
      ({ response, data } = await callAnthropic({}));
    }
    if (!response.ok || data.error) {
      const msg = data?.error?.message || `Anthropic HTTP ${response.status}`;
      console.error('[api/claude] Anthropic error:', response.status, msg);
      // On renvoie le vrai message pour pouvoir diagnostiquer côté client
      return res.status(502).json({ error: 'IA indisponible : ' + msg });
    }
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    await logUsage({ userId: user.id, model: finalModel, usage: data.usage, system, feature });
    res.status(200).json({
      // Questions à l'agent du jour (comptes gratuits) : affichées sous le champ de saisie
      agent: feature === 'agent' && !quota.premium && quota.agent ? { ...quota.agent, used: quota.agent.used + 1 } : undefined,
      text: text || 'Aucune réponse.',
      // Diagnostic : pourquoi la réponse est vide ou coupée (max_tokens…)
      meta: { stop_reason: data.stop_reason || null, output_tokens: data.usage?.output_tokens ?? null, blocks: (data.content || []).map(b => b.type) },
      // Compteur du jour pour l'affichage côté client (comptes gratuits uniquement)
      quota: (() => {
        const q = quota.quota;
        if (quota.premium || !q || feature !== 'general') return null;
        const used = q.used + 1; // cet appel vient d'être consommé
        // Si cet appel épuise les offertes, on bascule l'affichage sur le quota du jour
        if (q.mode === 'welcome' && used >= q.limit) return { mode: 'daily', used: 0, limit: FREE_DAILY_AFTER_WELCOME, welcome: FREE_WELCOME_CREDITS };
        return { ...q, used };
      })()
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur: ' + error.message });
  }
}
