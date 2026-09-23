-- Table d'événements pour le futur tableau de bord (conversion, rétention, usage).
-- À exécuter une fois dans Supabase > SQL Editor > New query > Run. Sans danger si tu le relances.

create table if not exists events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null,                                  -- ex: 'login', 'page_view', 'position_added'...
  meta jsonb,                                           -- détails optionnels, ex: {"page":"portfolio"}
  created_at timestamp with time zone default timezone('utc', now())
);
create index if not exists events_user_idx on events (user_id);
create index if not exists events_type_idx on events (type);
create index if not exists events_created_idx on events (created_at);

-- Chaque utilisateur ne voit que ses propres événements (toi, en tant que propriétaire du projet,
-- vois tout depuis l'éditeur SQL de Supabase, qui n'est pas soumis à cette restriction).
alter table events enable row level security;

drop policy if exists "events_select_own" on events;
create policy "events_select_own" on events for select using (auth.uid() = user_id);

drop policy if exists "events_insert_own" on events;
create policy "events_insert_own" on events for insert with check (auth.uid() = user_id);

-- Quelques requêtes utiles à garder sous le coude pour le futur tableau de bord :

-- Connexions par jour (30 derniers jours)
-- select date_trunc('day', created_at) as jour, count(*) as connexions
-- from events where type = 'login' and created_at > now() - interval '30 days'
-- group by 1 order by 1;

-- Rétention à J7 : utilisateurs inscrits il y a exactement 7 jours, encore actifs ce jour-là
-- select count(distinct user_id) from events
-- where type = 'login' and created_at::date = (current_date - 7);

-- Pages les plus visitées
-- select meta->>'page' as page, count(*) from events
-- where type = 'page_view' group by 1 order by 2 desc;

-- Utilisateurs inactifs depuis 14 jours (pour une relance)
-- select user_id, max(created_at) as derniere_activite from events
-- group by user_id having max(created_at) < now() - interval '14 days';
