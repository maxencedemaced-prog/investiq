-- Studio réseaux sociaux : posts générés (brouillons, validés, publiés) + stockage public des images.
-- À exécuter une fois dans Supabase > SQL Editor > New query > Run. Sans danger si tu le relances.

create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc', now()),
  status text not null default 'draft',              -- 'draft' (à valider), 'approved' (validé), 'published', 'rejected'
  kind text not null default 'weekly',               -- 'weekly' (lot de la semaine), 'actu' (événement du jour)
  title text,
  slides jsonb not null,                             -- contenu des images du carrousel
  caption text,
  hashtags text,
  platforms text[] default array['instagram', 'facebook', 'linkedin'],
  scheduled_at timestamp with time zone,             -- date de publication prévue
  published_at timestamp with time zone,
  image_urls text[],                                 -- images définitives (générées à la validation)
  publish_log jsonb                                  -- résultat de la publication par réseau
);
create index if not exists social_posts_status_idx on social_posts (status, scheduled_at);

-- Aucune règle d'accès : seul le serveur du site (clé service) lit et écrit, pour le compte admin uniquement.
alter table social_posts enable row level security;

-- Dossier d'images public (Instagram et Facebook exigent une adresse publique pour publier une image)
insert into storage.buckets (id, name, public)
values ('social', 'social', true)
on conflict (id) do nothing;
