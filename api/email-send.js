// api/email-send.js — tâche quotidienne (cron Vercel, protégée par CRON_SECRET)
// Relances automatiques, chacune envoyée au plus une fois par personne :
//   - nudge_empty : compte créé il y a 3 à 7 jours, e-mail confirmé, aucune position
//   - winback     : aucune activité depuis 10 jours (compte de plus de 10 jours)
// Respecte la désinscription (profiles.email_opt_out) et plafonne le nombre d'envois par jour.

import { createClient } from '@supabase/supabase-js';
import { EMAILS, renderEmail, sendEmail } from './_email.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co';
const DAY = 24 * 3600 * 1000;
const MAX_PER_RUN = 80;   // offre gratuite Resend : 100 e-mails par jour

export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  if (!process.env.SUPABASE_SERVICE_KEY || !process.env.RESEND_API_KEY) {
    return res.status(200).json({ skipped: 'e-mails non configurés' });
  }
  const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    const { data: page } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = (page?.users || []).filter(u => u.email && u.email_confirmed_at);
    const now = Date.now();
    const age = u => now - new Date(u.created_at).getTime();

    const [{ data: optOut }, { data: logs }] = await Promise.all([
      sb.from('profiles').select('id').eq('email_opt_out', true),
      sb.from('email_log').select('user_id, kind'),
    ]);
    const optedOut = new Set((optOut || []).map(p => p.id));
    const already = new Set((logs || []).map(l => l.user_id + '|' + l.kind));

    // Positions par utilisateur et dernière activité (hors signaux de présence)
    const [{ data: posRows }, { data: evRows }] = await Promise.all([
      sb.from('positions').select('user_id'),
      sb.from('events').select('user_id, created_at').neq('type', 'heartbeat').gte('created_at', new Date(now - 60 * DAY).toISOString()).order('created_at', { ascending: false }).limit(20000),
    ]);
    const hasPositions = new Set((posRows || []).map(p => p.user_id));
    const lastSeen = {};
    for (const e of evRows || []) if (!lastSeen[e.user_id]) lastSeen[e.user_id] = new Date(e.created_at).getTime();

    const todo = [];
    for (const u of users) {
      if (optedOut.has(u.id)) continue;
      const a = age(u);
      if (a >= 3 * DAY && a < 7 * DAY && !hasPositions.has(u.id) && !already.has(u.id + '|nudge_empty')) {
        todo.push({ u, kind: 'nudge_empty' });
        continue;   // une seule relance par jour et par personne
      }
      const seen = lastSeen[u.id] || new Date(u.last_sign_in_at || u.created_at).getTime();
      if (a >= 10 * DAY && now - seen >= 10 * DAY && now - seen < 60 * DAY && !already.has(u.id + '|winback')) {
        todo.push({ u, kind: 'winback' });
      }
    }

    let sent = 0; const errors = [];
    for (const { u, kind } of todo.slice(0, MAX_PER_RUN)) {
      const { error: logErr } = await sb.from('email_log').insert({ user_id: u.id, kind });
      if (logErr) continue;   // déjà envoyé entre-temps
      const e = EMAILS[kind];
      const { html, text, unsub } = renderEmail({ title: e.title, paragraphs: e.paragraphs, cta: e.cta, userId: u.id });
      try {
        await sendEmail({ to: u.email, subject: e.subject, html, text, unsub });
        sent++;
      } catch (err) {
        await sb.from('email_log').delete().eq('user_id', u.id).eq('kind', kind);
        errors.push(err.message);
      }
    }
    return res.status(200).json({ candidates: todo.length, sent, errors: errors.slice(0, 5) });
  } catch (e) {
    console.error('[email-send]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
