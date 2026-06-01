import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { priceId, userId, userEmail } = req.body;

  if (!priceId) {
    return res.status(400).json({ error: 'priceId is required' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      
      // ✅ CRITIQUE : envoyer user_id pour que le webhook sache qui mettre à jour
      metadata: {
        user_id: userId || '',
      },
      
      customer_email: userEmail || undefined,
      
      success_url: `${process.env.APP_URL || 'https://investiq-kappa.vercel.app'}?premium=success`,
      cancel_url: `${process.env.APP_URL || 'https://investiq-kappa.vercel.app'}?premium=cancel`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('❌ Stripe checkout error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
