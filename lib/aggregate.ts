// Prépare les données pour un graphe à AXE TEMPOREL FIXE (24h / 7j / 1m / 1y) qui
// n'affiche QUE les moments réellement mesurés. L'ESP32 étant débranché par
// moments, la base a des trous : on ne les comble PAS (pas d'interpolation), on
// laisse des coupures dans la courbe. Pur (aucune dépendance RN) → testable.

import type { Reading } from './types';
import type { HistoryRange } from './hooks/useHistory';

export type ChartPoint = { t: number; v: number };

export type ChartData = {
  xStart: number; // borne gauche FIXE de l'axe (now - plage)
  xEnd: number; // borne droite (now)
  gapMs: number; // au-delà de cet écart entre 2 points, on coupe la courbe
  ticks: { t: number; label: string }[];
  room: ChartPoint[];
  water: ChartPoint[];
  humidity: ChartPoint[];
  isEmpty: boolean;
};

const HOUR = 3600_000;
const DAY = 24 * HOUR;

const MONTHS = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
const WEEKDAYS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

// Par plage : durée totale, pas d'échantillonnage (pour limiter le nb de points
// sans fausser), et seuil de coupure (gap) au-delà duquel on considère une rupture.
const CFG: Record<HistoryRange, { rangeMs: number; sampleMs: number; gapMs: number }> = {
  '24h': { rangeMs: DAY, sampleMs: 10 * 60_000, gapMs: 25 * 60_000 },
  '7j': { rangeMs: 7 * DAY, sampleMs: HOUR, gapMs: 3 * HOUR },
  '1m': { rangeMs: 30 * DAY, sampleMs: 6 * HOUR, gapMs: 18 * HOUR },
  '1y': { rangeMs: 365 * DAY, sampleMs: DAY, gapMs: 3 * DAY },
};

type Field = 'room_temp' | 'humidity' | 'water_temp';

// Échantillonne un champ en moyennant par petits buckets, SANS combler les vides :
// un bucket sans mesure ne produit aucun point (→ trou dans la courbe).
function sample(readings: Reading[], field: Field, xStart: number, sampleMs: number): ChartPoint[] {
  const sum = new Map<number, number>();
  const cnt = new Map<number, number>();
  for (const r of readings) {
    const v = r[field];
    if (v == null) continue;
    const t = new Date(r.recorded_at).getTime();
    const b = Math.floor((t - xStart) / sampleMs);
    sum.set(b, (sum.get(b) ?? 0) + v);
    cnt.set(b, (cnt.get(b) ?? 0) + 1);
  }
  return [...cnt.keys()]
    .sort((a, b) => a - b)
    .map((b) => ({
      t: xStart + (b + 0.5) * sampleMs, // centre du bucket
      v: (sum.get(b) as number) / (cnt.get(b) as number),
    }));
}

// Graduations à intervalles fixes, alignées sur des frontières rondes.
function buildTicks(range: HistoryRange, xStart: number, xEnd: number): { t: number; label: string }[] {
  const ticks: { t: number; label: string }[] = [];
  const d = new Date(xStart);

  if (range === '24h') {
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    for (let t = d.getTime(); t <= xEnd; t += HOUR) {
      const hh = new Date(t).getHours();
      if (hh % 4 === 0) ticks.push({ t, label: `${pad(hh)}h` });
    }
  } else if (range === '7j' || range === '1m') {
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    for (let day = new Date(d); day.getTime() <= xEnd; day.setDate(day.getDate() + 1)) {
      if (range === '7j') {
        ticks.push({ t: day.getTime(), label: WEEKDAYS[day.getDay()] });
      } else if (day.getDate() % 5 === 1) {
        ticks.push({ t: day.getTime(), label: `${pad(day.getDate())}/${pad(day.getMonth() + 1)}` });
      }
    }
  } else {
    const m = new Date(xStart);
    m.setDate(1);
    m.setHours(0, 0, 0, 0);
    m.setMonth(m.getMonth() + 1);
    for (let mo = new Date(m); mo.getTime() <= xEnd; mo.setMonth(mo.getMonth() + 1)) {
      if (mo.getMonth() % 2 === 0) ticks.push({ t: mo.getTime(), label: MONTHS[mo.getMonth()] });
    }
  }
  return ticks;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function buildChartData(readings: Reading[], range: HistoryRange, now: Date = new Date()): ChartData {
  const { rangeMs, sampleMs, gapMs } = CFG[range];
  const xEnd = now.getTime();
  const xStart = xEnd - rangeMs;

  const inRange = readings.filter((r) => {
    const t = new Date(r.recorded_at).getTime();
    return t >= xStart && t <= xEnd;
  });

  const room = sample(inRange, 'room_temp', xStart, sampleMs);
  const water = sample(inRange, 'water_temp', xStart, sampleMs);
  const humidity = sample(inRange, 'humidity', xStart, sampleMs);

  return {
    xStart,
    xEnd,
    gapMs,
    ticks: buildTicks(range, xStart, xEnd),
    room,
    water,
    humidity,
    isEmpty: room.length === 0 && water.length === 0 && humidity.length === 0,
  };
}
