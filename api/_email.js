// api/_email.js — outils partagés pour les e-mails automatiques (pas une route : préfixe « _ »).
// Envoi via Resend (clé RESEND_API_KEY, uniquement côté serveur), gabarit HTML commun,
// lien de désinscription signé (impossible à fabriquer pour le compte de quelqu'un d'autre).

import crypto from 'crypto';

const SITE = 'https://kapitaro.fr';
const FROM = process.env.EMAIL_FROM || 'Kapitaro <bonjour@kapitaro.fr>';
const REPLY_TO = 'contact@kapitaro.fr';

// Jeton de désinscription : HMAC de l'identifiant, clé = secret serveur (jamais transmis)
function unsubToken(userId) {
  const key = process.env.EMAIL_SECRET || process.env.SUPABASE_SERVICE_KEY || '';
  return crypto.createHmac('sha256', key).update('unsub:' + userId).digest('hex').slice(0, 32);
}
export function checkUnsubToken(userId, token) {
  const a = Buffer.from(String(token || '')), b = Buffer.from(unsubToken(userId));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function unsubUrl(userId) {
  return `${SITE}/api/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubToken(userId)}`;
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Gabarit : titre, paragraphes (texte simple, **gras** autorisé), bouton, pied de page légal + désinscription
export function renderEmail({ title, paragraphs, cta, userId, extraHtml = '', extraText = '' }) {
  const md = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const body = paragraphs.map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1f2937">${md(p)}</p>`).join('');
  const button = cta ? `<p style="margin:22px 0 8px"><a href="${esc(cta.url)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:10px">${esc(cta.label)}</a></p>` : '';
  const unsub = userId ? unsubUrl(userId) : null;
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#080e1e;padding:18px 24px"><span style="color:#ffffff;font-weight:800;font-size:18px">Kapitaro</span></td></tr>
<tr><td style="padding:28px 24px 12px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0b1220">${esc(title)}</h1>
${body}${extraHtml}${button}
</td></tr>
<tr><td style="padding:16px 24px 24px;border-top:1px solid #e5e7eb;font-size:11.5px;line-height:1.6;color:#6b7280">
Kapitaro est un outil d'aide à la décision et ne constitue pas un conseil en investissement. Investir comporte un risque de perte en capital.<br>
Maxence De Macedo, entrepreneur individuel (Quorvia) · contact@kapitaro.fr${unsub ? `<br><a href="${esc(unsub)}" style="color:#6b7280">Ne plus recevoir ces e-mails</a>` : ''}
</td></tr></table></td></tr></table></body></html>`;
  const text = `${title}\n\n${paragraphs.map(p => p.replace(/\*\*/g, '')).join('\n\n')}${extraText ? '\n\n' + extraText : ''}${cta ? `\n\n${cta.label} : ${cta.url}` : ''}\n\n--\nKapitaro · contact@kapitaro.fr${unsub ? `\nNe plus recevoir ces e-mails : ${unsub}` : ''}`;
  return { html, text, unsub };
}

export async function sendEmail({ to, subject, html, text, unsub }) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY manquante');
  const headers = unsub ? { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : undefined;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html, text, headers }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status} : ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

export { esc as escapeHtml };

// Contenu des e-mails automatiques
export const EMAILS = {
  welcome: {
    subject: 'Bienvenue sur Kapitaro 👋',
    title: 'Bienvenue sur Kapitaro !',
    paragraphs: [
      'Merci de nous avoir rejoints. Kapitaro t\'aide à suivre tes placements, à comprendre où tu en es et à garder le cap vers tes objectifs.',
      'Pour bien démarrer, trois choses suffisent :',
      '**1. Ajoute tes placements**, à la main ou en important le relevé de ton courtier (PDF, Excel ou CSV).',
      '**2. Fixe-toi un objectif** : Kapitaro te dit s\'il est réaliste et combien mettre de côté chaque mois.',
      '**3. Installe l\'app sur ton téléphone** pour recevoir ton briefing du matin : depuis kapitaro.fr, bouton « Installer l\'app » (ou Partager puis « Sur l\'écran d\'accueil » sur iPhone).',
      'Une question ? Réponds simplement à cet e-mail.',
    ],
    cta: { label: 'Ouvrir Kapitaro', url: SITE },
  },
  nudge_empty: {
    subject: 'Ton portefeuille t\'attend',
    title: 'Deux minutes pour démarrer',
    paragraphs: [
      'Tu as créé ton compte Kapitaro, mais ton portefeuille est encore vide.',
      'Si tu investis déjà, importe le relevé de ton courtier : Kapitaro retrouve tes lignes tout seul. Tu obtiens alors ton score de santé et ta répartition en un instant.',
      'Tu n\'as pas encore investi ? Pas de souci : fixe un objectif, et le tutoriel te propose un premier plan simple et adapté aux débutants.',
    ],
    cta: { label: 'Compléter mon portefeuille', url: SITE },
  },
  winback: {
    subject: 'Où en est ton objectif ?',
    title: 'On ne t\'a pas vu depuis quelques jours',
    paragraphs: [
      'Les marchés ont bougé depuis ta dernière visite. Jette un œil à ton portefeuille et à ton score de santé pour voir où tu en es.',
      'Astuce : active les notifications pour recevoir un briefing chaque matin et une alerte quand un prix passe sous ton seuil, sans avoir à ouvrir l\'app.',
    ],
    cta: { label: 'Voir mon portefeuille', url: SITE },
  },
};
