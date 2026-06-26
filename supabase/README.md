# Backend (Supabase)

L'app et l'ESP32 ne se parlent jamais directement : tout passe par Supabase.

```
ESP32 ──POST JSON──▶ Edge Function "ingest" ──insert──▶ Postgres
                                                          ▲   │
                                          app (lecture) ──┘   │
                                          app (care_log) ─────┘
```

## Composants
- **`sql/schema.sql`** — tables `readings` + `care_log` et leurs politiques RLS.
- **`functions/ingest/`** — Edge Function (Deno) qui reçoit les mesures de l'ESP32.
  Auth par secret partagé (`DEVICE_SECRET`), insertion en `service_role`.
- **`sql/readings_buckets.sql`** — fonction d'agrégation pour les graphes de l'app
  (regroupe les mesures par tranches de temps → évite le plafond de 1000 lignes).

## Mise en place (dans un projet Supabase neuf)
1. **SQL Editor** → exécuter `sql/schema.sql` (tables + RLS).
2. **SQL Editor** → exécuter `sql/readings_buckets.sql` (fonction des graphes).
3. **Edge Function** → déployer `functions/ingest` :
   ```bash
   supabase functions deploy ingest
   supabase secrets set DEVICE_SECRET="<un secret aléatoire>"
   ```
4. Côté ESP32 : mettre la même valeur de `DEVICE_SECRET` dans `firmware/.../secrets.h`.
5. Côté app : renseigner l'URL du projet + la clé **anon** dans `.env`.

> La clé `anon` est **publique par conception** (elle est embarquée dans toute app
> cliente) ; ce sont les **RLS** ci-dessus qui protègent les données. La clé
> `service_role` ne doit JAMAIS quitter le serveur (uniquement dans l'Edge Function).
