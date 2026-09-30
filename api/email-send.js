// api/email-send.js — tâche quotidienne (cron Vercel, protégée par CRON_SECRET)
// Relances automatiques, chacune envoyée au plus une fois par personne :
//   - nudge_empty : compte créé il y a 3 à 7 jours, e-mail confirmé, aucune position
//   - winback     : aucune activité depuis 10 jours (compte de plus de 10 jours)
// Respecte la désinscription (profiles.email_opt_out) et plafonne le nombre d'envois par jour.
//   ?mode=newsletter (cron du dimanche) : la lettre de la semaine à tous les inscrits (articles du blog, agenda, point perso)
//   POST (compte admin) : m'envoyer un aperçu de la lettre de la semaine

import { createClient } from '@supabase/supabase-js';
import { EMAILS, renderEmail, sendEmail, escapeHtml as esc } from './_email.js';

const SITE = 'https://kapitaro.fr';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'maxencedemacedo@gmail.com';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_3_8eb6YbCfJ04Qihdy9ivw_NsQ4H_cu';
const eur = n => Math.round(n).toLocaleString('fr-FR').replace(/\s/g, '\u202f') + '\u00a0€';
// Numéro de semaine ISO (clé d'envoi : une seule lettre par personne et par semaine)
function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return t.getUTCFullYear() + '-S' + String(Math.ceil(((t - y0) / 86400000 + 1) / 7)).padStart(2, '0');
}

// Contenu commun de la semaine : derniers articles et guides du blog, rendez-vous économiques à venir
async function weeklyContent(sb) {
  const now = Date.now();
  const { data: rows } = await sb.from('social_posts').select('article, scheduled_at, published_at, status, slides')
    .in('status', ['approved', 'publishing', 'published']).gte('scheduled_at', new Date(now - 8 * DAY).toISOString()).lte('scheduled_at', new Date(now).toISOString())
    .order('scheduled_at', { ascending: false }).limit(60);
  const articles = (rows || []).filter(p => p.article && p.article.slug && Date.parse(p.published_at || p.scheduled_at) <= now).slice(0, 3)
    .map(p => ({ title: p.article.title, description: p.article.description, url: `${SITE}/blog/${p.article.slug}` }));
  // Agenda : tableau du post « agenda » de la semaine qui arrive (données réelles), s'il existe
  const { data: ag } = await sb.from('social_posts').select('slides, scheduled_at').eq('kind', 'actu').neq('status', 'rejected')
    .gte('scheduled_at', new Date(now - 2 * DAY).toISOString()).lte('scheduled_at', new Date(now + 3 * DAY).toISOString()).limit(10);
  const agendaSlide = (ag || []).flatMap(p => p.slides || []).find(s => s.t === 'agenda' && Array.isArray(s.rows) && s.rows.length);
  const agenda = agendaSlide ? agendaSlide.rows.slice(0, 5) : [];
  return { articles, agenda };
}

// Point personnel : valeur du portefeuille et progression vers l'objectif
async function personalLine(sb, userId) {
  const [{ data: pos }, { data: obj }] = await Promise.all([
    sb.from('positions').select('qty, price').eq('user_id', userId),
    sb.from('objectives').select('target').eq('user_id', userId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const value = (pos || []).reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.price) || 0), 0);
  const target = Number(obj?.target) || 0;
  if (value > 0 && target > 0) return `Ton portefeuille vaut environ **${eur(value)}**, soit **${Math.min(999, Math.round(value / target * 100))} %** de ton objectif de ${eur(target)}.`;
  if (value > 0) return `Ton portefeuille vaut environ **${eur(value)}**. Fixe-toi un objectif dans l'app pour voir ta progression chaque semaine.`;
  return "Ton portefeuille est encore vide : ajoute tes placements ou fixe-toi un premier objectif, ça prend deux minutes.";
}

function newsletterEmail(content, personal, userId) {
  const a = content.articles, g = content.agenda;
  const h2 = t => `<h2 style="margin:24px 0 10px;font-size:16px;color:#0b1220">${esc(t)}</h2>`;
  let html = '', text = '';
  if (a.length) {
    html += h2('📚 Cette semaine sur le blog') + a.map(x => `<p style="margin:0 0 14px;font-size:14.5px;line-height:1.5"><a href="${esc(x.url)}" style="color:#15803d;font-weight:700;text-decoration:none">${esc(x.title)}</a><br><span style="color:#4b5563">${esc(x.description)}</span></p>`).join('');
    text += 'Cette semaine sur le blog :\n' + a.map(x => `- ${x.title} : ${x.url}`).join('\n') + '\n\n';
  }
  if (g.length) {
    html += h2('📅 À suivre cette semaine') + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.45">' +
      g.map(r => `<tr><td style="padding:6px 10px 6px 0;color:#15803d;font-weight:700;white-space:nowrap;vertical-align:top">${esc(r.when || '')}</td><td style="padding:6px 0;color:#1f2937">${esc(r.label || '')}${r.detail ? `<br><span style="color:#6b7280;font-size:12.5px">${esc(r.detail)}</span>` : ''}</td></tr>`).join('') + '</table>';
    text += 'À suivre cette semaine :\n' + g.map(r => `- ${r.when} : ${r.label}`).join('\n') + '\n\n';
  }
  html += h2('🎯 Où tu en es') + `<p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#1f2937">${esc(personal).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`;
  text += 'Où tu en es : ' + personal.replace(/\*\*/g, '');
  return renderEmail({
    title: 'Ta semaine avec Kapitaro',
    paragraphs: ['Voici l\'essentiel de la semaine en 2 minutes : de quoi mieux comprendre ton épargne, et les rendez-vous qui peuvent faire bouger les marchés.'],
    extraHtml: html, extraText: text,
    cta: { label: 'Ouvrir Kapitaro', url: SITE }, userId,
  });
}

async function sendNewsletter(sb, { onlyEmail = null } = {}) {
  const content = await weeklyContent(sb);
  const week = isoWeek(), kind = 'newsletter:' + week;
  const subject = content.articles.length ? `Ta semaine Kapitaro : ${content.articles[0].title}` : 'Ta semaine avec Kapitaro';
  const { data: page } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let users = (page?.users || []).filter(u => u.email && u.email_confirmed_at);
  if (onlyEmail) users = users.filter(u => u.email.toLowerCase() === onlyEmail.toLowerCase());
  const { data: optOut } = await sb.from('profiles').select('id').eq('email_opt_out', true);
  const optedOut = new Set((optOut || []).map(p => p.id));
  let sent = 0; const errors = [];
  for (const u of users.slice(0, MAX_PER_RUN)) {
    if (!onlyEmail && optedOut.has(u.id)) continue;
    if (!onlyEmail) { const { error: logErr } = await sb.from('email_log').insert({ user_id: u.id, kind }); if (logErr) continue; }   // déjà reçue cette semaine
    try {
      const { html, text, unsub } = newsletterEmail(content, await personalLine(sb, u.id), u.id);
      await sendEmail({ to: u.email, subject: (onlyEmail ? '[Aperçu] ' : '') + subject, html, text, unsub });
      sent++;
    } catch (err) {
      if (!onlyEmail) await sb.from('email_log').delete().eq('user_id', u.id).eq('kind', kind);
      errors.push(err.message);
    }
  }
  return { week, articles: content.articles.length, agenda: content.agenda.length, sent, errors: errors.slice(0, 5) };
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co';
const DAY = 24 * 3600 * 1000;
const MAX_PER_RUN = 80;   // offre gratuite Resend : 100 e-mails par jour

export default async function handler(req, res) {
  // Aperçu de la lettre demandé depuis le tableau de bord (compte admin uniquement, envoyé à l'admin seulement)
  if (req.method === 'POST') {
    const auth = req.headers.authorization || '';
    const r = auth.startsWith('Bearer ') ? await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON, Authorization: auth } }) : null;
    const me = r && r.ok ? await r.json() : null;
    if (!me || (me.email || '').toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return res.status(403).json({ error: 'Accès réservé.' });
    const sb0 = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    try { return res.status(200).json(await sendNewsletter(sb0, { onlyEmail: ADMIN_EMAIL })); }
    catch (e) { return res.status(500).json({ error: e.message }); }
  }
  if (!process.env.CRON_SECRET || req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  if (!process.env.SUPABASE_SERVICE_KEY || !process.env.RESEND_API_KEY) {
    return res.status(200).json({ skipped: 'e-mails non configurés' });
  }
  const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  if (req.query.mode === 'newsletter') {
    try { return res.status(200).json(await sendNewsletter(sb)); }
    catch (e) { console.error('[newsletter]', e.message); return res.status(500).json({ error: e.message }); }
  }

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
