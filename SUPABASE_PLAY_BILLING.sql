-- Abonnement Premium acheté dans l'appli Android (Google Play).
-- Ajoute deux colonnes au profil et les protège comme les autres colonnes d'abonnement :
--   premium_source       : d'où vient l'abonnement ('play' pour Google Play ; vide pour Stripe ou l'App Store)
--   play_purchase_token  : jeton d'achat Google Play, pour relier les notifications de Google au bon compte
-- Seul le serveur (api/play-verify.js, clé service_role) peut les écrire ; depuis le navigateur, toute tentative est ignorée.
-- À exécuter une fois dans Supabase > SQL Editor > New query > Run, AVANT la mise en production. Sans danger si tu le relances.

alter table profiles add column if not exists premium_source text;
alter table profiles add column if not exists play_purchase_token text;
create index if not exists profiles_play_purchase_token_idx on profiles (play_purchase_token) where play_purchase_token is not null;

-- Même verrou que SUPABASE_PROTECT_PREMIUM.sql, avec les deux nouvelles colonnes
create or replace function public.protect_profile_billing()
returns trigger
language plpgsql
as $$
declare
  jwt_role text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
begin
  if jwt_role in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_premium := false;
      new.premium_until := null;
      new.subscription_status := null;
      new.subscription_plan := null;
      new.stripe_customer_id := null;
      new.stripe_subscription_id := null;
      new.premium_source := null;
      new.play_purchase_token := null;
    else
      new.is_premium := old.is_premium;
      new.premium_until := old.premium_until;
      new.subscription_status := old.subscription_status;
      new.subscription_plan := old.subscription_plan;
      new.stripe_customer_id := old.stripe_customer_id;
      new.stripe_subscription_id := old.stripe_subscription_id;
      new.premium_source := old.premium_source;
      new.play_purchase_token := old.play_purchase_token;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_billing on profiles;
create trigger protect_profile_billing
  before insert or update on profiles
  for each row execute function public.protect_profile_billing();
