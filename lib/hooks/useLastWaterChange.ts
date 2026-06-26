import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { DEVICE_ID } from '../../config/poup';
import type { CareEvent } from '../types';

// Dernier "j'ai changé l'eau" + action pour en enregistrer un nouveau.
export function useLastWaterChange() {
  const [data, setData] = useState<CareEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLast = useCallback(async () => {
    const { data, error } = await supabase
      .from('care_log')
      .select('*')
      .eq('device_id', DEVICE_ID)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) setError(error.message);
    else {
      setData(data as CareEvent | null);
      setError(null);
    }
    setLoading(false);
  }, []);

  // Insère un changement d'eau (le reste des colonnes prend les valeurs par défaut).
  const logWaterChange = useCallback(async () => {
    const { data, error } = await supabase
      .from('care_log')
      .insert({ device_id: DEVICE_ID })
      .select()
      .single();
    if (error) {
      setError(error.message);
      throw error;
    }
    setData(data as CareEvent);
    return data as CareEvent;
  }, []);

  useEffect(() => {
    fetchLast();
  }, [fetchLast]);

  return { data, loading, error, refetch: fetchLast, logWaterChange };
}
