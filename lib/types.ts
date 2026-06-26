// Contrat de données — miroir des tables Supabase (voir contexte.md §4).

export type Reading = {
  id: number;
  device_id: string;
  room_temp: number | null;
  humidity: number | null;
  water_temp: number | null;
  recorded_at: string; // ISO timestamptz
};

export type CareEvent = {
  id: number;
  device_id: string;
  event: string; // "water_changed"
  occurred_at: string; // ISO timestamptz
};

// Les humeurs de Poup. Servent à la fois à l'app (illustration couleur)
// et plus tard à l'OLED 128x64 (sprite monochrome dérivé).
export type Mood =
  | 'content'
  | 'soif'
  | 'change_eau'
  | 'chaud'
  | 'froid'
  | 'endormi';
