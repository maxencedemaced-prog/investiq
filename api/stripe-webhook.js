const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || ''
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (userId) {
          await sb.from('profiles').update({
            is_premium: true,
            premium_since: new Date().toISOString(),
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription
          }).eq('id', userId);
          console.log(`✓ Premium activé pour user ${userId}`);
        }
        break;
      }
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused': {
        const sub = event.data.object;
        const customerId = sub.customer;
        // Désactiver premium via customer ID
        await sb.from('profiles').update({ is_premium: false })
          .eq('stripe_customer_id', customerId);
        console.log(`✓ Premium désactivé pour customer ${customerId}`);
        break;
      }
      case 'invoice.payment_failed': {
        console.log('Paiement échoué:', event.data.object.customer);
        break;
      }
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: err.message });
  }
};
