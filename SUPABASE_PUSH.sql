-- Notifications push — à exécuter UNE fois dans Supabase > SQL Editor > New query > Run.
-- Sans danger si tu le relances (create ... if not exists).

-- 1) Appareils abonnés aux notifications (un utilisateur peut en avoir plusieurs : téléphone, ordinateur…)
create table if not exists push_devices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  endpoint text not null unique,
  subscription text not null,
  user_agent text,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);
create index if not exists push_devices_user_idx on push_devices (user_id);

-- Accès uniquement via le serveur (clé service) : RLS activée, aucune policy = aucun accès direct depuis le navigateur.
alter table push_devices enable row level security;

-- 2) Colonnes utilisées par les notifications (ne font rien si elles existent déjà)
alter table profiles  add column if not exists notif text default 'daily';          -- daily | weekly | off
alter table positions add column if not exists alert_price numeric;                  -- seuil d'alerte de prix
alter table positions add column if not exists alert_sent_at timestamp with time zone; -- dernière alerte envoyée (max 1 / 24 h)
