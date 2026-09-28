-- E-mails automatiques (bienvenue, relances) : préférence de désinscription + journal des envois.
-- À exécuter une fois dans Supabase > SQL Editor > New query > Run. Sans danger si tu le relances.

-- L'utilisateur peut refuser les e-mails de conseils et de relance (lien en bas de chaque e-mail, ou Paramètres)
alter table profiles add column if not exists email_opt_out boolean default false;

-- Journal : chaque type d'e-mail n'est envoyé qu'une fois par personne
create table if not exists email_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  kind text not null,                                   -- 'welcome', 'nudge_empty', 'winback'
  sent_at timestamp with time zone default timezone('utc', now()),
  unique (user_id, kind)
);

-- Aucune règle d'accès : seul le serveur du site (clé service) lit et écrit ce journal.
alter table email_log enable row level security;
