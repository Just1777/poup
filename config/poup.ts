// ─────────────────────────────────────────────────────────────────────────────
// SOURCE DE VÉRITÉ UNIQUE de Poup.
// Seuils + correspondance état → (message à la voix de Poup, couleurs).
// Ce fichier est volontairement PUR (aucune dépendance React Native) pour être
// rejoué plus tard côté firmware OLED (J3) et notifications (J4).
// Les seuils sont des points de départ, ajustables.
// ─────────────────────────────────────────────────────────────────────────────

import type { Mood } from '../lib/types';

export const DEVICE_ID = 'vase-chambre';

// ⚠️ La sonde d'eau (DS18B20) est SIMULÉE par une sinusoïde jusqu'au branchement
// (vendredi). Tant que c'est vrai, la détection "à sec / soif" est peu fiable et
// reste DÉSACTIVÉE (cf. contexte.md §7). Passer à false une fois la vraie sonde en place.
export const WATER_TEMP_SIMULATED = true;

export const THRESHOLDS = {
  // Changement d'eau
  waterChangeDays: 3, // au-delà → "on change l'eau ?"
  waterChangeDaysWarmWater: 2, // si l'eau est tiède, on raccourcit
  warmWaterTempC: 22,
  // Détection "à sec" : eau ~= air de façon soutenue → vase probablement vide
  drynessGapC: 1.5,
  // Confort de la chambre
  hotRoomC: 27,
  coldRoomC: 15,
  // Nuit (heure locale) : Poup s'endort
  nightStartHour: 21,
  nightEndHour: 7,
} as const;

// Palette par humeur. `bg` = fond immersif de l'Accueil, `accent` = boutons/texte fort,
// `text` = couleur du texte. (La nuit, l'humeur `endormi` fournit déjà sa palette sombre.)
export type MoodTheme = {
  bg: string;
  accent: string;
  text: string;
};

export const MOOD_THEME: Record<Mood, MoodTheme> = {
  content: { bg: '#DDF3E4', accent: '#3FA66A', text: '#1F4F36' },
  soif: { bg: '#D9ECF7', accent: '#2E8BC0', text: '#1B4F6B' },
  change_eau: { bg: '#D6EBF5', accent: '#2F8FB3', text: '#194A5C' },
  chaud: { bg: '#FBE3D6', accent: '#E07A4B', text: '#6B3219' },
  froid: { bg: '#E2E8F5', accent: '#5C7AB0', text: '#293A5C' },
  endormi: { bg: '#20243A', accent: '#8E97C9', text: '#C9CFEA' },
};

// Messages à la voix de Poup — gardien bienveillant, parle DES fleurs (3e personne),
// ton doux et un peu espiègle. `ctx` permet d'injecter des détails (jours, °C).
export type MessageCtx = {
  daysSinceWaterChange: number | null;
  roomTemp: number | null;
};

// Plusieurs phrases possibles par humeur : Poup en pioche une au hasard à chaque
// fois → il paraît plus vivant. Pour AJOUTER une variante, ajoute simplement une
// ligne `() => '...'` dans le tableau de l'humeur concernée. `ctx` te donne
// `ctx.daysSinceWaterChange` (nb de jours) et `ctx.roomTemp` (°C).
export const MOOD_MESSAGES: Record<Mood, ((ctx: MessageCtx) => string)[]> = {
  content: [
    () => 'On est au PRIME de fou',
  ],
  soif: [
    () => 'On a soif de fou, pitié de l\'eau',
  ],
  change_eau: [
    (ctx) =>
      ctx.daysSinceWaterChange != null
        ? `L'eau commence à dater là, faut changer ça`
        : 'Faut changer l\'eau, c\'est cracra là',
    () => 'Faut changer l\'eau, c\'est cracra là',
  ],
  chaud: [
    () => 'Il fait chaud sa mère wsh',
    () => 'Mets nous au frigo pitié, on meurt de chaud',
  ],
  froid: [
    (ctx) =>
      ctx.roomTemp != null
        ? `${Math.round(ctx.roomTemp)}°C ??? C'est le pôle nord ou quoi ?`
        : 'Mets le chauffage on va clamser wsh',
    () => 'Mets le chauffage on va clamser wsh',
  ],
  endormi: [
    () => 'Ça pionce fort ici',
  ],
};

// Choisit une phrase au hasard parmi les variantes de l'humeur.
export function pickMoodMessage(mood: Mood, ctx: MessageCtx): string {
  const variants = MOOD_MESSAGES[mood];
  const fn = variants[Math.floor(Math.random() * variants.length)];
  return fn(ctx);
}
