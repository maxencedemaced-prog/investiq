-- COLLE CE CODE DANS SUPABASE > SQL EDITOR > NEW QUERY > RUN
-- Un nouveau compte ne doit PAS avoir d'objectif : c'est l'utilisateur qui le crée (questionnaire de départ).
-- Avant, cette fonction créait aussi un objectif « par défaut » (200 €/mois, 10 ans, 7 %, 50 k€) à chaque inscription.
-- On ne remplace que la fonction : le déclencheur on_auth_user_created continue de l'appeler.

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- FACULTATIF — nettoyer les objectifs « par défaut » déjà créés (jamais touchés par l'utilisateur).
-- Vérifie d'abord ce qui serait supprimé :
--   select id, user_id, capital, monthly, target, years, rate, risk, stock_pct from objectives
--   where target = 50000 and years = 10 and rate = 7 and monthly = 200 and coalesce(capital, 0) = 0 and risk is null and stock_pct is null;
-- puis supprime :
--   delete from objectives
--   where target = 50000 and years = 10 and rate = 7 and monthly = 200 and coalesce(capital, 0) = 0 and risk is null and stock_pct is null;
