// api/create-portal.js
// Ouvre le portail client Stripe : l'abonné y gère son moyen de paiement,
// consulte ses factures et résilie en autonomie (exigence légale en France).
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const ALLOWED_ORIGINS = [
  'https://investiq-kappa.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

const APP_URL = process.env.APP_URL || 'https://investiq-kappa.vercel.app';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Connecte-toi.' });

    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData?.user?.id) {
      return res.status(401).json({ error: 'Session expirée. Reconnecte-toi.' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'Aucun abonnement trouvé pour ce compte.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${APP_URL}?page=settings`,
      locale: 'fr',
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[create-portal]', err.message);
    return res.status(500).json({ error: 'Portail indisponible : ' + err.message });
  }
}
