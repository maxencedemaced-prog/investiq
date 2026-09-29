-- Studio : vidéos courtes (Reels / TikTok). Format de publication choisi par post + adresse de la vidéo.
-- À exécuter une fois dans Supabase > SQL Editor > New query > Run. Sans danger si tu le relances.

alter table social_posts add column if not exists format text default 'carousel';   -- 'carousel' ou 'reel'
alter table social_posts add column if not exists video_url text;
