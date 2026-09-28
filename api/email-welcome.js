// api/email-welcome.js — SÉCURISÉ
// Envoie l'e-mail de bienvenue une seule fois, à la première connexion (appelé par l'app).
// L'adresse vient du compte vérifié par le jeton, jamais du navigateur : impossible d'écrire à quelqu'un d'autre.

import { createClient } from '@supabase/supabase-js';
import { EMAILS, renderEmail, sendEmail } from './_email.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_3_8eb6YbCfJ04Qihdy9ivw_NsQ4H_cu';
const supabaseAdmin = process.env.SUPABASE_SERVICE_KEY ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

const allowedOrigin = (o) => o === 'https://kapitaro.fr' || o === 'https://www.kapitaro.fr' || /^https:\/\/investiq-[a-z0-9-]+\.vercel\.app$/.test(o);

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (allowedOrigin(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseAdmin || !process.env.RESEND_API_KEY) return res.status(200).json({ sent: false, reason: 'e-mails non configurés' });

  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Connecte-toi.' });
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON, Authorization: auth } });
    if (!r.ok) return res.status(401).json({ error: 'Session expirée.' });
    const user = await r.json();
    if (!user?.id || !user.email) return res.status(400).json({ error: 'Compte sans e-mail.' });

    // Seulement les comptes récents (évite d'accueillir d'anciens utilisateurs lors de la mise en service)
    if (Date.now() - new Date(user.created_at).getTime() > 3 * 24 * 3600 * 1000) return res.status(200).json({ sent: false, reason: 'compte ancien' });

    const { data: prof } = await supabaseAdmin.from('profiles').select('email_opt_out').eq('id', user.id).maybeSingle();
    if (prof?.email_opt_out) return res.status(200).json({ sent: false, reason: 'désinscrit' });

    // Réserve l'envoi d'abord : la contrainte d'unicité empêche un double e-mail (deux onglets, rechargement…)
    const { error: logErr } = await supabaseAdmin.from('email_log').insert({ user_id: user.id, kind: 'welcome' });
    if (logErr) return res.status(200).json({ sent: false, reason: 'déjà envoyé' });

    const e = EMAILS.welcome;
    const { html, text, unsub } = renderEmail({ title: e.title, paragraphs: e.paragraphs, cta: e.cta, userId: user.id });
    try {
      await sendEmail({ to: user.email, subject: e.subject, html, text, unsub });
    } catch (err) {
      await supabaseAdmin.from('email_log').delete().eq('user_id', user.id).eq('kind', 'welcome');   // pour réessayer plus tard
      throw err;
    }
    return res.status(200).json({ sent: true });
  } catch (e) {
    console.error('[email-welcome]', e.message);
    return res.status(500).json({ error: 'Envoi impossible' });
  }
}
