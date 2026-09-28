// api/unsubscribe.js — désinscription des e-mails de conseils et de relance, en un clic.
// Lien signé présent en bas de chaque e-mail (GET), et désinscription « one-click » des messageries (POST).

import { createClient } from '@supabase/supabase-js';
import { checkUnsubToken } from './_email.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co';

const page = (title, text) => `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} — Kapitaro</title></head>
<body style="margin:0;background:#080e1e;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px">
<div style="max-width:420px;text-align:center"><div style="font-size:40px;margin-bottom:10px">✉️</div><h1 style="font-size:22px;margin:0 0 10px">${title}</h1>
<p style="color:rgba(255,255,255,.65);line-height:1.6;margin:0 0 22px">${text}</p>
<a href="https://kapitaro.fr" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">Retour à Kapitaro</a></div></body></html>`;

export default async function handler(req, res) {
  const u = String(req.query.u || ''), t = String(req.query.t || '');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!/^[0-9a-f-]{36}$/i.test(u) || !checkUnsubToken(u, t)) {
    return res.status(400).send(page('Lien invalide', 'Ce lien de désinscription n\'est pas valide. Tu peux aussi gérer tes e-mails dans Kapitaro, rubrique Paramètres → Notifications.'));
  }
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).send(page('Action impossible', ''));
  try {
    const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { error } = await sb.from('profiles').upsert({ id: u, email_opt_out: true });   // upsert : marche même si le profil n'existe pas encore
    if (error) throw error;
    return res.status(200).send(page('C\'est fait', 'Tu ne recevras plus nos e-mails de conseils et de rappel. Tu peux les réactiver à tout moment dans Paramètres → Notifications.'));
  } catch (e) {
    console.error('[unsubscribe]', e.message);
    return res.status(500).send(page('Un souci est survenu', 'Réessaie dans un instant, ou écris-nous à contact@kapitaro.fr.'));
  }
}
