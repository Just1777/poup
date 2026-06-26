import { useMemo } from 'react';
import { useLatestReading } from './useLatestReading';
import { useLastWaterChange } from './useLastWaterChange';
import { computeState } from '../plantState';
import { MOOD_THEME } from '../../config/poup';

// État courant + thème d'ambiance, partagé par l'Accueil et l'Historique
// (même couleur de fond selon l'humeur de Poup).
export function usePlantState() {
  const reading = useLatestReading();
  const water = useLastWaterChange();

  const state = useMemo(
    () => computeState(reading.data, water.data, new Date()),
    [reading.data, water.data],
  );

  const theme = MOOD_THEME[state.mood];

  return { state, theme, reading, water };
}
