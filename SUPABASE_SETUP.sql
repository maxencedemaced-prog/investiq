-- COLLE CE CODE DANS SUPABASE > SQL EDITOR > NEW QUERY > RUN

-- Table profils utilisateurs
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  bankroll numeric default 5000,
  horizon text default 'moyen',
  risk text default 'faible',
  created_at timestamp with time zone default timezone('utc', now())
);

-- Table positions du portefeuille
create table positions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text not null,
  qty numeric not null,
  pru numeric not null,
  price numeric not null,
  sector text,
  platform text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- Table objectif financier
create table objectives (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  target numeric default 50000,
  years integer default 10,
  rate numeric default 7,
  monthly numeric default 200,
  updated_at timestamp with time zone default timezone('utc', now())
);

-- Sécurité : chaque utilisateur voit seulement ses propres données
alter table profiles enable row level security;
alter table positions enable row level security;
alter table objectives enable row level security;

create policy "Users manage own profile" on profiles for all using (auth.uid() = id);
create policy "Users manage own positions" on positions for all using (auth.uid() = user_id);
create policy "Users manage own objectives" on objectives for all using (auth.uid() = user_id);

-- Auto-création du profil + objectif à l'inscription
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.objectives (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
