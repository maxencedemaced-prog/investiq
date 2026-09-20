-- COLLE CE CODE DANS SUPABASE > SQL EDITOR > NEW QUERY > RUN
-- Historique des bilans patrimoniaux Premium : un utilisateur retrouve ses bilans sur tous ses appareils.
-- Chaque bilan refait ajoute une ligne (on garde l'historique pour pouvoir comparer l'évolution plus tard).
-- "data" contient les réponses au questionnaire (revenus, épargne...) : donnée personnelle,
-- protégée par RLS (chaque utilisateur ne voit que ses propres lignes) et supprimée avec le compte.

create table if not exists bilans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  result jsonb not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default timezone('utc', now())
);

alter table bilans enable row level security;

drop policy if exists "bilans_select_own" on bilans;
drop policy if exists "bilans_insert_own" on bilans;
drop policy if exists "bilans_delete_own" on bilans;

create policy "bilans_select_own" on bilans for select using (auth.uid() = user_id);
create policy "bilans_insert_own" on bilans for insert with check (auth.uid() = user_id);
create policy "bilans_delete_own" on bilans for delete using (auth.uid() = user_id);

create index if not exists bilans_user_created_idx on bilans(user_id, created_at desc);
