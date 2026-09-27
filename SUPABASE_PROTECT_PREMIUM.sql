-- Verrouille les colonnes d'abonnement de la table profiles.
-- Avant : un utilisateur connecté pouvait se passer Premium lui-même depuis la console de son navigateur
-- (la règle "Users manage own profile" autorise la modification de toute sa ligne).
-- Après : seul le serveur (clé service_role : webhook Stripe, création de paiement) peut modifier ces colonnes ;
-- depuis le navigateur, toute tentative est ignorée silencieusement (le reste du profil s'enregistre normalement).
-- À exécuter une fois dans Supabase > SQL Editor > New query > Run. Sans danger si tu le relances.

-- Garantit que les colonnes existent (sans effet si elles sont déjà là)
alter table profiles add column if not exists is_premium boolean default false;
alter table profiles add column if not exists premium_until timestamp with time zone;
alter table profiles add column if not exists subscription_status text;
alter table profiles add column if not exists subscription_plan text;
alter table profiles add column if not exists stripe_customer_id text;
alter table profiles add column if not exists stripe_subscription_id text;

create or replace function public.protect_profile_billing()
returns trigger
language plpgsql
as $$
declare
  jwt_role text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
begin
  -- Requêtes venant du navigateur (utilisateur connecté ou anonyme) : colonnes d'abonnement intouchables
  if jwt_role in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_premium := false;
      new.premium_until := null;
      new.subscription_status := null;
      new.subscription_plan := null;
      new.stripe_customer_id := null;
      new.stripe_subscription_id := null;
    else
      new.is_premium := old.is_premium;
      new.premium_until := old.premium_until;
      new.subscription_status := old.subscription_status;
      new.subscription_plan := old.subscription_plan;
      new.stripe_customer_id := old.stripe_customer_id;
      new.stripe_subscription_id := old.stripe_subscription_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_billing on profiles;
create trigger protect_profile_billing
  before insert or update on profiles
  for each row execute function public.protect_profile_billing();

-- Vérification (facultatif) : doit renvoyer une ligne "protect_profile_billing"
-- select tgname from pg_trigger where tgrelid = 'profiles'::regclass and tgname = 'protect_profile_billing';
