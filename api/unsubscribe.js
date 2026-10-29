// api/unsubscribe.js — désinscription des e-mails de conseils et de relance, en un clic.
// Lien signé présent en bas de chaque e-mail (GET), et désinscription « one-click » des messageries (POST).
// Version anglaise : lien avec l=en (e-mails anglais) ou demande venant de kapitaro.com → page en anglais.

import { createClient } from '@supabase/supabase-js';
import { checkUnsubToken } from './_email.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co';

const TXT = {
  fr: { back: 'Retour à Kapitaro', site: 'https://kapitaro.fr',
    invalid: ['Lien invalide', 'Ce lien de désinscription n\'est pas valide. Tu peux aussi gérer tes e-mails dans Kapitaro, rubrique Paramètres → Notifications.'],
    method: ['Action impossible', ''],
    done: ['C\'est fait', 'Tu ne recevras plus nos e-mails de conseils et de rappel. Tu peux les réactiver à tout moment dans Paramètres → Notifications.'],
    error: ['Un souci est survenu', 'Réessaie dans un instant, ou écris-nous à contact@kapitaro.fr.'] },
  en: { back: 'Back to Kapitaro', site: 'https://kapitaro.com',
    invalid: ['Invalid link', 'This unsubscribe link isn’t valid. You can also manage your emails in Kapitaro, under Settings → Notifications.'],
    method: ['Action not possible', ''],
    done: ['Done', 'You won’t receive our tips and reminder emails anymore. You can turn them back on at any time in Settings → Notifications.'],
    error: ['Something went wrong', 'Please try again in a moment, or email us at contact@kapitaro.fr.'] },
};

const page = (L, [title, text]) => `<!DOCTYPE html><html lang="${L === TXT.en ? 'en' : 'fr'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} — Kapitaro</title></head>
<body style="margin:0;background:#080e1e;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px">
<div style="max-width:420px;text-align:center"><div style="font-size:40px;margin-bottom:10px">✉️</div><h1 style="font-size:22px;margin:0 0 10px">${title}</h1>
<p style="color:rgba(255,255,255,.65);line-height:1.6;margin:0 0 22px">${text}</p>
<a href="${L.site}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">${L.back}</a></div></body></html>`;

export default async function handler(req, res) {
  const u = String(req.query.u || ''), t = String(req.query.t || '');
  const L = (req.query.l === 'en' || /kapitaro\.com$/.test(String(req.headers.host || ''))) ? TXT.en : TXT.fr;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!/^[0-9a-f-]{36}$/i.test(u) || !checkUnsubToken(u, t)) {
    return res.status(400).send(page(L, L.invalid));
  }
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).send(page(L, L.method));
  try {
    const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { error } = await sb.from('profiles').upsert({ id: u, email_opt_out: true });   // upsert : marche même si le profil n'existe pas encore
    if (error) throw error;
    return res.status(200).send(page(L, L.done));
  } catch (e) {
    console.error('[unsubscribe]', e.message);
    return res.status(500).send(page(L, L.error));
  }
}
