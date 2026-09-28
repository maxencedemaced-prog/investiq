-- Table des erreurs rencontrées par les visiteurs (bugs JavaScript), affichées dans le tableau de bord admin.
-- À exécuter une fois dans Supabase > SQL Editor > New query > Run. Sans danger si tu le relances.

create table if not exists client_errors (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default timezone('utc', now()),
  user_id uuid references auth.users on delete set null,   -- vide pour un visiteur non connecté
  kind text,                                                -- 'error' ou 'promise'
  message text not null,
  source text,                                              -- fichier où l'erreur s'est produite
  line int,
  col int,
  stack text,
  page text,                                                -- page de l'app (portfolio, objectif…) ou adresse
  app_version text,
  user_agent text
);
create index if not exists client_errors_created_idx on client_errors (created_at);

-- Aucune règle d'accès : personne ne peut lire ni écrire depuis le navigateur.
-- Seul le serveur du site (clé service) enregistre et lit ces erreurs.
alter table client_errors enable row level security;
