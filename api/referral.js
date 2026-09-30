// api/referral.js — SÉCURISÉ : parrainage.
//   GET                          → mon lien de parrainage et mes statistiques (le code est créé au premier appel)
//   POST {action:'attach', code} → relie mon compte (créé il y a moins de 14 jours) à mon parrain
// Récompenses (dans api/stripe-webhook.js) : le filleul a −50 % sur son 1er mois (abonnement mensuel),
// le parrain gagne 1 mois offert quand le filleul a réellement payé. Table « referrals » lisible par le serveur seulement.
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const APP_URL = process.env.APP_URL || 'https://kapitaro.fr';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sans 0/O, 1/I pour éviter les confusions
const newCode = () => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

async function myCode(userId) {
  const { data } = await sb.from('profiles').select('referral_code').eq('id', userId).maybeSingle();
  if (data?.referral_code) return data.referral_code;
  for (let k = 0; k < 6; k++) {
    const code = newCode();
    const { error } = await sb.from('profiles').update({ referral_code: code }).eq('id', userId).is('referral_code', null);
    if (!error) { const { data: d2 } = await sb.from('profiles').select('referral_code').eq('id', userId).maybeSingle(); if (d2?.referral_code) return d2.referral_code; }
  }
  throw new Error('Code de parrainage indisponible, réessaie');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    if (!token) return res.status(401).json({ error: 'Connecte-toi.' });
    const { data: u, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !u?.user?.id) return res.status(401).json({ error: 'Session expirée. Reconnecte-toi.' });
    const user = u.user;

    if (req.method === 'GET') {
      const code = await myCode(user.id);
      const { data: rows } = await sb.from('referrals').select('paid_at, rewarded_at, reward').eq('referrer_id', user.id);
      const list = rows || [];
      return res.status(200).json({
        code, link: `${APP_URL}/?parrain=${code}`,
        invites: list.length,
        abonnes: list.filter(r => r.paid_at).length,
        mois_gagnes: list.filter(r => r.reward === 'credit' || r.reward === 'gift').length,
      });
    }

    if (req.method === 'POST' && req.body?.action === 'attach') {
      const code = String(req.body.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
      if (!code) return res.status(400).json({ error: 'Code invalide' });
      // Seulement pour un compte tout neuf (moins de 14 jours) qui n'a jamais été abonné
      if (Date.now() - new Date(user.created_at).getTime() > 14 * 86400000) return res.status(200).json({ attached: false, reason: 'compte trop ancien' });
      const [{ data: referrer }, { data: me }, { data: already }] = await Promise.all([
        sb.from('profiles').select('id').eq('referral_code', code).maybeSingle(),
        sb.from('profiles').select('stripe_subscription_id').eq('id', user.id).maybeSingle(),
        sb.from('referrals').select('id').eq('referee_id', user.id).maybeSingle(),
      ]);
      if (already) return res.status(200).json({ attached: true });
      if (!referrer || referrer.id === user.id) return res.status(200).json({ attached: false, reason: 'code inconnu' });
      if (me?.stripe_subscription_id) return res.status(200).json({ attached: false, reason: 'déjà abonné' });
      const { error } = await sb.from('referrals').insert({ referrer_id: referrer.id, referee_id: user.id });
      if (error && !/duplicate/i.test(error.message)) throw error;
      await sb.from('events').insert({ user_id: user.id, type: 'referral_signup', meta: { referrer: referrer.id } }).then(() => {}, () => {});
      return res.status(200).json({ attached: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[referral]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
