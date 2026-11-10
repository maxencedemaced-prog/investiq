-- Historique des signaux « valeurs à découvrir » pour mesurer leur fiabilité (api/feed.js).
-- À exécuter une fois dans Supabase > SQL Editor > New query > Run. Sans danger si tu le relances.
-- Accès serveur seulement : RLS activé SANS aucune politique, donc invisible pour les comptes utilisateurs ;
-- seule la clé service (api/feed.js) lit et écrit. Le bilan affiché dans l'appli passe par shared_feed (kind = 'signals_track').
--
-- Règle d'évaluation (détaillée dans api/feed.js) : à l'échéance (date du signal + horizon, borne haute),
-- on compare la performance de l'action à celle de l'indice de sa zone (CAC 40, Euro Stoxx 50, S&P 500).
-- acheter = juste si l'action a fait mieux ; vendre / eviter = juste si elle a fait moins bien ; attendre = neutre (hors taux).

create table if not exists signal_history (
  id bigint generated always as identity primary key,
  ticker text not null,
  name text,
  zone text,                                            -- France, Europe, États-Unis
  signal text not null check (signal in ('acheter', 'attendre', 'vendre', 'eviter')),
  conviction text,
  horizon text,                                         -- tel qu'affiché, ex. '2-4 semaines'
  horizon_days integer not null check (horizon_days between 1 and 366),
  week_start date not null,                             -- lundi de la semaine (Paris) : un seul signal par action et par semaine
  signaled_at timestamp with time zone not null default now(),
  due_at timestamp with time zone not null,             -- échéance = signaled_at + horizon_days
  price_start numeric not null check (price_start > 0), -- cours au moment du signal, devise locale
  currency text,
  bench_symbol text not null,                           -- ^FCHI, ^STOXX50E ou ^GSPC
  bench_start numeric,                                  -- niveau de l'indice au moment du signal (complété à l'évaluation s'il manque)
  price_end numeric,
  bench_end numeric,
  perf numeric,                                         -- performance de l'action (0,05 = +5 %)
  bench_perf numeric,                                   -- performance de l'indice sur la même période
  excess numeric,                                       -- perf - bench_perf
  outcome text check (outcome in ('juste', 'faux', 'neutre', 'indispo')),   -- null = pas encore évalué
  evaluated_at timestamp with time zone,
  unique (ticker, week_start)
);
create index if not exists signal_history_pending_idx on signal_history (due_at) where outcome is null;
create index if not exists signal_history_outcome_idx on signal_history (outcome, signaled_at);

alter table signal_history enable row level security;
-- Volontairement aucune politique : aucun accès avec la clé publique (anon / authenticated).
revoke all on signal_history from anon, authenticated;

-- Vérification après quelques jours :
-- select signal, outcome, count(*), round(avg(excess) * 100, 2) as ecart_moyen_pts
-- from signal_history group by 1, 2 order by 1, 2;
