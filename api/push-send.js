// api/push-send.js
// Appelé par le cron Vercel chaque matin à 8h
// Envoie le briefing + alertes à tous les utilisateurs Premium abonnés aux push

import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

webpush.setVapidDetails(
  'mailto:contact@investiq.fr',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  // Sécurité : seul le cron Vercel ou un appel avec le bon secret peut déclencher
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Récupère tous les abonnements push des users Premium
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription');

  if (error || !subs?.length) {
    return res.status(200).json({ sent: 0, error: error?.message });
  }

  // Récupère les positions de chaque user pour personnaliser le message
  let sent = 0, failed = 0;

  for (const sub of subs) {
    try {
      const subscription = JSON.parse(sub.subscription);

      // Récupère les positions du user
      const { data: positions } = await supabase
        .from('positions')
        .select('name, price, pru, qty')
        .eq('user_id', sub.user_id);

      // Calcule le P&L global
      let totalVal = 0, totalCost = 0;
      (positions || []).forEach(p => {
        totalVal  += (p.price || p.pru) * p.qty;
        totalCost += p.pru * p.qty;
      });
      const pnlPct = totalCost > 0 ? ((totalVal - totalCost) / totalCost * 100).toFixed(1) : 0;

      // Détecte les alertes
      const alerts = (positions || []).filter(p => {
        const pnl = p.pru > 0 ? (p.price - p.pru) / p.pru * 100 : 0;
        return pnl < -10;
      });

      // Construit le message
      let title = '📊 Briefing InvestIQ';
      let body  = `Portefeuille : ${pnlPct >= 0 ? '+' : ''}${pnlPct}%`;

      if (alerts.length > 0) {
        title = `⚠️ ${alerts.length} alerte${alerts.length > 1 ? 's' : ''} détectée${alerts.length > 1 ? 's' : ''}`;
        body  = `${alerts[0].name} en baisse de ${((alerts[0].price - alerts[0].pru) / alerts[0].pru * 100).toFixed(1)}% · ${body}`;
      }

      await webpush.sendNotification(subscription, JSON.stringify({
        title,
        body,
        icon:  '/icons/icon-192.png',
        url:   '/',
        tag:   'investiq-daily',
        requireInteraction: false,
      }));

      sent++;
    } catch (err) {
      failed++;
      // Si l'abonnement est expiré, on le supprime
      if (err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('user_id', sub.user_id);
      }
    }
  }

  return res.status(200).json({ sent, failed });
}
