import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// ⚠️ IMPORTANT : Vercel doit recevoir le raw body pour valider la signature Stripe
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // service_role pour bypasser RLS
);

// Helper pour lire le raw body
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let event;
  const rawBody = await getRawBody(req);
  const signature = req.headers['stripe-signature'];

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log('✅ Webhook reçu :', event.type);

  // ✅ Événement principal : paiement réussi
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    console.log('Session data:', {
      customer_email: session.customer_email,
      metadata: session.metadata,
      payment_status: session.payment_status,
    });

    // Récupérer l'user_id depuis les metadata (envoyé lors de la création du checkout)
    const userId = session.metadata?.user_id;
    const customerEmail = session.customer_email || session.customer_details?.email;

    if (!userId && !customerEmail) {
      console.error('❌ Aucun user_id ni email dans la session');
      return res.status(400).json({ error: 'No user identifier found' });
    }

    let updateResult;

    if (userId) {
      // Mise à jour par user_id (recommandé)
      console.log('🔄 Mise à jour is_premium pour userId:', userId);
      updateResult = await supabase
        .from('profiles')
        .update({
          is_premium: true,
          premium_since: new Date().toISOString(),
          stripe_customer_id: session.customer,
        })
        .eq('id', userId);
    } else {
      // Fallback : mise à jour par email
      console.log('🔄 Mise à jour is_premium pour email:', customerEmail);
      updateResult = await supabase
        .from('profiles')
        .update({
          is_premium: true,
          premium_since: new Date().toISOString(),
          stripe_customer_id: session.customer,
        })
        .eq('email', customerEmail);
    }

    if (updateResult.error) {
      console.error('❌ Supabase update error:', updateResult.error);
      return res.status(500).json({ error: 'Database update failed', details: updateResult.error });
    }

    console.log('✅ is_premium mis à jour avec succès !', updateResult.data);
  }

  // Gérer l'annulation d'abonnement
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    console.log('🔄 Annulation abonnement pour customer:', customerId);

    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: false })
      .eq('stripe_customer_id', customerId);

    if (error) console.error('❌ Erreur annulation:', error);
    else console.log('✅ Premium désactivé après annulation');
  }

  return res.status(200).json({ received: true });
}
