-- Vidéos animées (Reels) du Studio : script, voix et état de fabrication de la vidéo de chaque post.
-- À exécuter une fois dans Supabase > SQL Editor.
alter table public.social_posts add column if not exists video_script jsonb;
