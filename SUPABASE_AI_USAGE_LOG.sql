-- COLLE CE CODE DANS SUPABASE > SQL EDITOR > NEW QUERY > RUN
-- Crée la table utilisée par api/claude.js pour enregistrer le coût de chaque appel IA.
-- Écrite uniquement par le backend (clé service_role), jamais par le client — pas de policy publique nécessaire.

create table if not exists ai_usage_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10,6) not null default 0,
  call_label text,
  created_at timestamp with time zone default timezone('utc', now())
);

alter table ai_usage_log enable row level security;

create index if not exists ai_usage_log_user_id_idx on ai_usage_log(user_id);
create index if not exists ai_usage_log_created_at_idx on ai_usage_log(created_at);
