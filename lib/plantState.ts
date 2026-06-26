// Moteur d'état PUR de Poup : entrée = dernière mesure + dernier changement d'eau,
// sortie = humeur + détails. Aucune dépendance React Native → testable et
// rejouable côté OLED/notifs plus tard.

import {
  THRESHOLDS,
  WATER_TEMP_SIMULATED,
} from '../config/poup';
import type { CareEvent, Mood, Reading } from './types';

export type PlantState = {
  mood: Mood;
  isNight: boolean;
  daysSinceWaterChange: number | null;
  // true si l'humeur s'appuie sur une donnée encore peu fiable (eau simulée)
  provisional: boolean;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_DAY;
}

export function isNightAt(date: Date): boolean {
  const h = date.getHours();
  const { nightStartHour, nightEndHour } = THRESHOLDS;
  // Plage qui enjambe minuit (ex. 21h → 7h)
  return h >= nightStartHour || h < nightEndHour;
}

/**
 * Calcule l'état courant des fleurs.
 *
 * Priorité des écrans (du plus prioritaire au moins) :
 *   1. BESOIN PRESSANT / actionnable : soif, changement d'eau
 *      → s'affiche AVANT tout, y compris la nuit (c'est une action à faire).
 *   2. NUIT : si aucun besoin pressant, Poup dort.
 *   3. CONFORT ambiant : trop chaud / trop froid (n'écrase pas la nuit).
 *   4. Tout va bien (content).
 */
export function computeState(
  latest: Reading | null,
  lastWaterChange: CareEvent | null,
  now: Date = new Date(),
): PlantState {
  const isNight = isNightAt(now);

  const daysSinceWaterChange = lastWaterChange
    ? daysBetween(new Date(lastWaterChange.occurred_at), now)
    : null;

  const urgent = computeUrgent(latest, daysSinceWaterChange);
  const ambient = computeAmbient(latest);

  // 1. besoin pressant > 2. nuit > 3. confort ambiant > 4. content
  let mood: Mood;
  if (urgent) mood = urgent.mood;
  else if (isNight) mood = 'endormi';
  else mood = ambient;

  return {
    mood,
    isNight,
    daysSinceWaterChange:
      daysSinceWaterChange == null ? null : Math.floor(daysSinceWaterChange),
    provisional: urgent ? urgent.provisional : false,
  };
}

// Besoins PRESSANTS / actionnables — prioritaires sur la nuit.
function computeUrgent(
  latest: Reading | null,
  daysSinceWaterChange: number | null,
): { mood: Mood; provisional: boolean } | null {
  if (!latest) return null;
  const { room_temp, water_temp } = latest;

  // À sec / soif — DÉSACTIVÉ tant que l'eau est simulée (peu fiable).
  if (
    !WATER_TEMP_SIMULATED &&
    room_temp != null &&
    water_temp != null &&
    Math.abs(water_temp - room_temp) < THRESHOLDS.drynessGapC
  ) {
    return { mood: 'soif', provisional: false };
  }

  // Changer l'eau — seuil raccourci si l'eau est tiède.
  if (daysSinceWaterChange != null) {
    const warm = water_temp != null && water_temp > THRESHOLDS.warmWaterTempC;
    const limit = warm
      ? THRESHOLDS.waterChangeDaysWarmWater
      : THRESHOLDS.waterChangeDays;
    if (daysSinceWaterChange > limit) {
      return { mood: 'change_eau', provisional: warm && WATER_TEMP_SIMULATED };
    }
  }

  return null;
}

// Confort AMBIANT — n'écrase pas la nuit.
function computeAmbient(latest: Reading | null): Mood {
  if (!latest) return 'content';
  const { room_temp } = latest;
  if (room_temp != null && room_temp > THRESHOLDS.hotRoomC) return 'chaud';
  if (room_temp != null && room_temp < THRESHOLDS.coldRoomC) return 'froid';
  return 'content';
}
