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

// Contenu commun de la semaine : derniers articles et guides du blog (avec image de couverture du post), marchés, agenda
async function weeklyContent(sb) {
  const now = Date.now();
  const { data: rows } = await sb.from('social_posts').select('article, scheduled_at, published_at, status, slides, image_urls, kind')
    .in('status', ['approved', 'publishing', 'published']).gte('scheduled_at', new Date(now - 8 * DAY).toISOString()).lte('scheduled_at', new Date(now).toISOString())
    .order('scheduled_at', { ascending: false }).limit(60);
  const visible = (rows || []).filter(p => Date.parse(p.published_at || p.scheduled_at) <= now);
  const articles = visible.filter(p => p.article && p.article.slug).slice(0, 3)
    .map(p => ({ title: p.article.title, description: p.article.description, url: `${SITE}/blog/${p.article.slug}`, image: (p.image_urls || [])[0] || null }));
  // Marchés : tableau réel du dernier bilan du vendredi (s'il a été publié cette semaine)
  const marketSlide = visible.filter(p => p.kind === 'actu').flatMap(p => p.slides || []).find(s => s.t === 'market' && Array.isArray(s.rows) && s.rows.length);
  const markets = marketSlide ? marketSlide.rows.slice(0, 5) : [];
  // Agenda : tableau du post « agenda » de la semaine qui arrive (données réelles), s'il existe
  const { data: ag } = await sb.from('social_posts').select('slides, scheduled_at').eq('kind', 'actu').neq('status', 'rejected')
    .gte('scheduled_at', new Date(now - 2 * DAY).toISOString()).lte('scheduled_at', new Date(now + 3 * DAY).toISOString()).limit(10);
  const agendaSlide = (ag || []).flatMap(p => p.slides || []).find(s => s.t === 'agenda' && Array.isArray(s.rows) && s.rows.length);
  const agenda = agendaSlide ? agendaSlide.rows.slice(0, 5) : [];
  return { articles, markets, agenda };
}

// Point personnel : valeur du portefeuille et progression vers l'objectif
async function personalData(sb, userId) {
  const [{ data: pos }, { data: obj }] = await Promise.all([
    sb.from('positions').select('qty, price').eq('user_id', userId),
    sb.from('objectives').select('target').eq('user_id', userId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const value = (pos || []).reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.price) || 0), 0);
  const target = Number(obj?.target) || 0;
  return { value, target, pct: value > 0 && target > 0 ? Math.min(100, Math.round(value / target * 100)) : null };
}

// ── Mise en page de la lettre (tableaux et styles en ligne : compatible Gmail, Outlook, Apple Mail) ──
const GREEN = '#16a34a', INK = '#0b1220', MUTED = '#6b7280', LINE = '#e5e7eb';
const section = (emoji, title) => `<tr><td style="padding:26px 0 10px;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${GREEN}">${emoji}&nbsp; ${esc(title)}</td></tr>`;

function personalCard(me) {
  let inner;
  if (me.pct != null) {
    inner = `<div style="font-size:13px;color:#94a3b8;margin-bottom:4px">Ton portefeuille</div>
      <div style="font-size:30px;font-weight:800;color:#ffffff;letter-spacing:-.5px">${esc(eur(me.value))}</div>
      <div style="font-size:14px;color:#cbd5e1;margin:10px 0 8px"><strong style="color:#34d399">${me.pct} %</strong> de ton objectif de ${esc(eur(me.target))}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:99px"><tr>
        <td width="${Math.max(3, me.pct)}%" style="background:#34d399;background-image:linear-gradient(90deg,#34d399,#22d3ee);height:12px;border-radius:99px;font-size:0;line-height:0">&nbsp;</td>
        <td style="font-size:0;line-height:0">&nbsp;</td></tr></table>`;
  } else if (me.value > 0) {
    inner = `<div style="font-size:13px;color:#94a3b8;margin-bottom:4px">Ton portefeuille</div>
      <div style="font-size:30px;font-weight:800;color:#ffffff">${esc(eur(me.value))}</div>
      <div style="font-size:14px;color:#cbd5e1;margin-top:8px">Fixe-toi un objectif dans l'app pour suivre ta progression chaque semaine.</div>`;
  } else {
    inner = `<div style="font-size:17px;font-weight:800;color:#ffffff">Ton portefeuille est encore vide</div>
      <div style="font-size:14px;color:#cbd5e1;margin-top:6px">Ajoute tes placements ou fixe-toi un premier objectif : ça prend deux minutes.</div>`;
  }
  return `<tr><td style="background:#0b1426;border-radius:16px;padding:20px 22px">${inner}</td></tr>`;
}

function articleCards(list) {
  return list.map(a => `<tr><td style="padding:0 0 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:14px;overflow:hidden">
    ${a.image ? `<tr><td><a href="${esc(a.url)}"><img src="${esc(a.image)}" width="510" alt="" style="display:block;width:100%;height:auto;max-height:240px;object-fit:cover;border:0"></a></td></tr>` : `<tr><td style="background:#0b1426;background-image:linear-gradient(90deg,#0b1426,#0f3a33);height:8px;font-size:0;line-height:0">&nbsp;</td></tr>`}
    <tr><td style="padding:14px 16px 16px">
      <a href="${esc(a.url)}" style="font-size:16.5px;font-weight:800;color:${INK};text-decoration:none;line-height:1.35">${esc(a.title)}</a>
      <div style="font-size:14px;color:#4b5563;line-height:1.5;margin-top:6px">${esc(a.description)}</div>
      <a href="${esc(a.url)}" style="display:inline-block;margin-top:10px;font-size:14px;font-weight:700;color:${GREEN};text-decoration:none">Lire l'article →</a>
    </td></tr></table></td></tr>`).join('');
}

function marketTable(rows) {
  return `<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:14px;font-size:14.5px">` +
    rows.map((r, k) => { const up = (r.change || 0) >= 0; return `<tr><td style="padding:11px 16px;${k ? `border-top:1px solid ${LINE};` : ''}font-weight:700;color:${INK}">${esc(r.label)}<div style="font-weight:400;font-size:12.5px;color:${MUTED}">${esc(r.value || '')}</div></td>
      <td align="right" style="padding:11px 16px;${k ? `border-top:1px solid ${LINE};` : ''}font-weight:800;white-space:nowrap;color:${up ? '#15803d' : '#dc2626'}">${up ? '▲ +' : '▼ '}${esc(String(r.change).replace('.', ','))} %</td></tr>`; }).join('') +
    `</table><div style="font-size:11.5px;color:${MUTED};margin-top:6px">Variations sur 5 séances. Les performances passées ne préjugent pas des performances futures.</div></td></tr>`;
}

function agendaTable(rows) {
  return `<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.45">` +
    rows.map(r => `<tr><td style="padding:7px 12px 7px 0;color:${GREEN};font-weight:800;white-space:nowrap;vertical-align:top">${esc(r.when || '')}</td><td style="padding:7px 0;color:#1f2937">${esc(r.label || '')}${r.detail ? `<div style="color:${MUTED};font-size:12.5px">${esc(r.detail)}</div>` : ''}</td></tr>`).join('') +
    `</table></td></tr>`;
}

function newsletterEmail(content, me, userId) {
  const a = content.articles, m = content.markets, g = content.agenda;
  let html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">` + section('🎯', 'Où tu en es') + personalCard(me);
  let text = 'Où tu en es : ' + (me.pct != null ? `ton portefeuille vaut environ ${eur(me.value)}, soit ${me.pct} % de ton objectif de ${eur(me.target)}.` : me.value > 0 ? `ton portefeuille vaut environ ${eur(me.value)}.` : 'ton portefeuille est encore vide.') + '\n\n';
  if (a.length) { html += section('📚', 'À lire cette semaine') + articleCards(a); text += 'À lire cette semaine :\n' + a.map(x => `- ${x.title} : ${x.url}`).join('\n') + '\n\n'; }
  if (m.length) { html += section('📈', 'La semaine des marchés') + marketTable(m); text += 'La semaine des marchés :\n' + m.map(r => `- ${r.label} : ${r.change > 0 ? '+' : ''}${r.change} %`).join('\n') + '\n\n'; }
  if (g.length) { html += section('📅', 'À suivre cette semaine') + agendaTable(g); text += 'À suivre cette semaine :\n' + g.map(r => `- ${r.when} : ${r.label}`).join('\n') + '\n\n'; }
  html += '</table>';
  return renderEmail({
    title: '', hero: `${SITE}/email/hero.gif`,
    paragraphs: ['Bonjour ! Voici l\'essentiel de ta semaine : où tu en es, de quoi mieux comprendre ton épargne, et ce qui peut faire bouger les marchés.'],
    extraHtml: html, extraText: text.trim(),
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
      const { html, text, unsub } = newsletterEmail(content, await personalData(sb, u.id), u.id);
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
