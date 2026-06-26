-- ============================================================
--  Fonction d'agrégation des mesures pour les graphes de l'app.
--
--  POURQUOI : Supabase plafonne une requête REST à 1000 lignes. La requête
--  brute de l'historique (triée du plus ancien au plus récent) renvoyait donc
--  les 1000 lignes les PLUS VIEILLES et masquait tout le récent → "trous" et
--  données manquantes des dernières heures dans les graphes.
--
--  SOLUTION : on agrège côté serveur en tranches de temps régulières (buckets)
--  et on moyenne. Le graphe n'a besoin que de ~30-360 points, jamais 50 000.
--  Les tranches SANS mesure ne renvoient aucune ligne → les "trous" (ESP32
--  débranché) restent visibles dans la courbe.
--
--  À EXÉCUTER UNE FOIS dans Supabase → SQL Editor → coller → Run.
-- ============================================================

create or replace function public.readings_buckets(
  p_device text,
  p_since timestamptz,
  p_bucket_seconds int
)
returns table (
  bucket timestamptz,
  room_temp real,
  humidity real,
  water_temp real
)
language sql
stable
security invoker
as $$
  select
    to_timestamp(
      floor(extract(epoch from recorded_at) / p_bucket_seconds) * p_bucket_seconds
    ) as bucket,
    avg(room_temp)::real  as room_temp,
    avg(humidity)::real   as humidity,
    avg(water_temp)::real as water_temp
  from public.readings
  where device_id = p_device
    and recorded_at > p_since
  group by 1
  order by 1;
$$;

-- L'app utilise la clé anon : on autorise l'exécution.
grant execute on function public.readings_buckets(text, timestamptz, int) to anon, authenticated;
