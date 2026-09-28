-- Remet à zéro TOUS les comptes SAUF celui de l'adresse ci-dessous (keep_email).
-- Supprime : portefeuille, transactions, objectifs, bilans, recommandations et historique d'usage de l'IA
-- (les 15 analyses offertes sont rendues), statistiques d'usage, historique des notifications.
-- Remet : préférences par défaut, aucun Premium, aucun identifiant Stripe.
-- Garde : les comptes eux-mêmes (e-mail + mot de passe) et les appareils inscrits aux notifications.
-- Au prochain passage, l'app efface aussi les copies locales sur l'appareil (bilan, dépenses, tutoriel).
-- IRRÉVERSIBLE. À exécuter une fois dans Supabase > SQL Editor > New query > Run.

alter table profiles add column if not exists data_reset_at timestamp with time zone;

do $$
declare
  keep_email text := 'maxencedemacedo@gmail.com';
  t text;
  n int;
begin
  foreach t in array array['positions', 'transactions', 'objectives', 'bilans', 'ai_recommendations',
                           'ai_usage_log', 'events', 'push_events'] loop
    begin
      execute format('delete from %I where user_id in (select id from auth.users where email is distinct from %L)', t, keep_email);
      get diagnostics n = row_count;
      raise notice '% : % ligne(s) supprimée(s)', t, n;
    exception when undefined_table or undefined_column then
      raise notice '% : table absente, ignorée', t;
    end;
  end loop;

  update profiles set
    bankroll = 5000, horizon = 'moyen', risk = 'faible', notif = 'daily',
    is_premium = false, premium_until = null, subscription_status = null, subscription_plan = null,
    stripe_customer_id = null, stripe_subscription_id = null,
    data_reset_at = now()
  where id in (select id from auth.users where email is distinct from keep_email);
  get diagnostics n = row_count;
  raise notice 'profils remis à zéro : %', n;

  begin
    execute format('update profiles set watchlist = null where id in (select id from auth.users where email is distinct from %L)', keep_email);
  exception when undefined_column then null;
  end;
end $$;
