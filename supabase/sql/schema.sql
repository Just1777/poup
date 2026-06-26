-- ============================================================
--  Schéma de base de Poup : tables + RLS.
--  À exécuter dans Supabase → SQL Editor (avant ingest + readings_buckets).
-- ============================================================

-- Mesures envoyées par l'ESP32 (l'app LIT, l'Edge Function ÉCRIT).
create table if not exists public.readings (
  id          bigint generated always as identity primary key,
  device_id   text not null,
  room_temp   real,
  humidity    real,
  water_temp  real,
  recorded_at timestamptz not null default now()
);
create index if not exists readings_device_time_idx
  on public.readings (device_id, recorded_at desc);

-- Journal des soins (l'app LIT + ÉCRIT : bouton « j'ai changé l'eau »).
create table if not exists public.care_log (
  id          bigint generated always as identity primary key,
  device_id   text not null,
  event       text not null default 'water_changed',
  occurred_at timestamptz not null default now()
);
create index if not exists care_log_device_time_idx
  on public.care_log (device_id, occurred_at desc);

-- ---------- Row Level Security ----------
alter table public.readings enable row level security;
alter table public.care_log enable row level security;

-- L'app utilise la clé ANON (publique). On n'autorise que le strict nécessaire.
-- readings : lecture seule pour anon (l'insertion passe par l'Edge Function en service_role).
create policy "anon reads readings"
  on public.readings for select to anon using (true);

-- care_log : lecture + insertion pour anon (le bouton « j'ai changé l'eau »).
create policy "anon reads care_log"
  on public.care_log for select to anon using (true);
create policy "anon inserts care_log"
  on public.care_log for insert to anon with check (true);
