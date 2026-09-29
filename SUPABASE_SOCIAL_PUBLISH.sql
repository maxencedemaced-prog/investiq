-- Publication automatique (étape 2) : jetons renouvelés automatiquement + verrou anti double publication.
-- À exécuter une fois dans Supabase > SQL Editor > New query > Run. Sans danger si tu le relances.

-- Jetons d'accès aux réseaux (ex. Instagram, renouvelé chaque semaine par le site)
create table if not exists app_tokens (
  name text primary key,
  value text not null,
  updated_at timestamp with time zone default timezone('utc', now())
);
-- Aucune règle d'accès : seul le serveur du site (clé service) peut lire ces jetons.
alter table app_tokens enable row level security;

-- Heure du verrou pendant une publication (débloque un post si la publication a été interrompue)
alter table social_posts add column if not exists locked_at timestamp with time zone;
