import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { DEVICE_ID } from '../../config/poup';
import type { Reading } from '../types';

export type HistoryRange = '24h' | '7j' | '1m' | '1y';

const RANGE_MS: Record<HistoryRange, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7j': 7 * 24 * 60 * 60 * 1000,
  '1m': 30 * 24 * 60 * 60 * 1000,
  '1y': 365 * 24 * 60 * 60 * 1000,
};

// Taille des tranches d'agrégation côté serveur (alignée sur le sampleMs de
// aggregate.ts). Garde le nb de points bien sous le plafond Supabase de 1000.
const BUCKET_SECONDS: Record<HistoryRange, number> = {
  '24h': 10 * 60, // 1 point / 10 min  → ≤ 144 pts
  '7j': 60 * 60, //  1 point / heure   → ≤ 168 pts
  '1m': 6 * 60 * 60, // 1 point / 6 h  → ≤ 120 pts
  '1y': 24 * 60 * 60, // 1 point / jour → ≤ 365 pts
};

type BucketRow = {
  bucket: string;
  room_temp: number | null;
  humidity: number | null;
  water_temp: number | null;
};

// Historique AGRÉGÉ côté serveur (fonction SQL `readings_buckets`) : évite le
// plafond de 1000 lignes de Supabase qui masquait les mesures récentes. On
// renvoie des `Reading` "synthétiques" (un par tranche) pour que le reste de la
// chaîne (buildChartData, HistoryScreen) ne change pas. Les tranches vides ne
// reviennent pas → les trous (ESP32 débranché) restent visibles.
export function useHistory(range: HistoryRange) {
  const [data, setData] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - RANGE_MS[range]).toISOString();
    const { data, error } = await supabase.rpc('readings_buckets', {
      p_device: DEVICE_ID,
      p_since: since,
      p_bucket_seconds: BUCKET_SECONDS[range],
    });
    if (error) {
      setError(error.message);
    } else {
      const rows: Reading[] = ((data ?? []) as BucketRow[]).map((r, i) => ({
        id: i,
        device_id: DEVICE_ID,
        room_temp: r.room_temp,
        humidity: r.humidity,
        water_temp: r.water_temp,
        recorded_at: r.bucket,
      }));
      setData(rows);
      setError(null);
    }
    setLoading(false);
  }, [range]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { data, loading, error, refetch: fetchHistory };
}
