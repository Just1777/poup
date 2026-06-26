import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { DEVICE_ID } from '../../config/poup';
import type { Reading } from '../types';

// Dernière mesure connue. S'abonne à Realtime pour se rafraîchir quand l'ESP32
// insère une nouvelle ligne (cadence variable : ~30 s en test, ~30 min en prod).
export function useLatestReading() {
  const [data, setData] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    const { data, error } = await supabase
      .from('readings')
      .select('*')
      .eq('device_id', DEVICE_ID)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) setError(error.message);
    else {
      setData(data as Reading | null);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLatest();

    const channel = supabase
      .channel('readings-latest')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'readings' },
        (payload) => {
          const row = payload.new as Reading;
          if (row.device_id === DEVICE_ID) setData(row);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLatest]);

  return { data, loading, error, refetch: fetchLatest };
}
