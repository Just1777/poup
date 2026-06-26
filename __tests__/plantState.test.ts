import { computeState, isNightAt, daysBetween } from '../lib/plantState';
import { WATER_TEMP_SIMULATED } from '../config/poup';
import type { CareEvent, Reading } from '../lib/types';

const NOON = new Date('2026-06-16T12:00:00');
const NIGHT = new Date('2026-06-16T23:00:00');

function reading(over: Partial<Reading> = {}): Reading {
  return {
    id: 1,
    device_id: 'vase-chambre',
    room_temp: 21,
    humidity: 50,
    water_temp: 18,
    recorded_at: NOON.toISOString(),
    ...over,
  };
}

function waterChange(daysAgo: number, from: Date = NOON): CareEvent {
  return {
    id: 1,
    device_id: 'vase-chambre',
    event: 'water_changed',
    occurred_at: new Date(from.getTime() - daysAgo * 86400000).toISOString(),
  };
}

describe('helpers', () => {
  it('daysBetween calcule un écart en jours', () => {
    expect(daysBetween(waterChangeDate(2), NOON)).toBeCloseTo(2, 5);
  });
  it('isNightAt détecte la plage nocturne enjambant minuit', () => {
    expect(isNightAt(new Date('2026-06-16T22:00:00'))).toBe(true);
    expect(isNightAt(new Date('2026-06-16T06:00:00'))).toBe(true);
    expect(isNightAt(new Date('2026-06-16T12:00:00'))).toBe(false);
  });
});

function waterChangeDate(daysAgo: number): Date {
  return new Date(NOON.getTime() - daysAgo * 86400000);
}

describe('computeState', () => {
  it('content quand tout va bien le jour', () => {
    const s = computeState(reading(), waterChange(1), NOON);
    expect(s.mood).toBe('content');
  });

  it('Poup dort la nuit quand tout va bien', () => {
    const s = computeState(reading(), waterChange(1), NIGHT);
    expect(s.mood).toBe('endormi');
  });

  it("change_eau au-delà de 3 jours", () => {
    const s = computeState(reading(), waterChange(4), NOON);
    expect(s.mood).toBe('change_eau');
    expect(s.daysSinceWaterChange).toBe(4);
  });

  it("eau tiède → seuil raccourci à 2 jours", () => {
    const s = computeState(reading({ water_temp: 24 }), waterChange(2.5), NOON);
    expect(s.mood).toBe('change_eau');
  });

  it('trop chaud au-delà du seuil', () => {
    const s = computeState(reading({ room_temp: 31 }), waterChange(1), NOON);
    expect(s.mood).toBe('chaud');
  });

  it('trop froid < 15°C', () => {
    const s = computeState(reading({ room_temp: 12 }), waterChange(1), NOON);
    expect(s.mood).toBe('froid');
  });

  it('la nuit prime sur le confort ambiant (pièce chaude → dort)', () => {
    const s = computeState(reading({ room_temp: 31 }), waterChange(1), NIGHT);
    expect(s.mood).toBe('endormi');
  });

  it('un besoin pressant (changer l\'eau) prime sur la nuit', () => {
    const s = computeState(reading({ room_temp: 21 }), waterChange(4), NIGHT);
    expect(s.mood).toBe('change_eau');
  });

  it("détection 'soif' désactivée tant que l'eau est simulée", () => {
    // eau ≈ air : déclencherait 'soif' si la sonde était réelle
    const s = computeState(
      reading({ room_temp: 21, water_temp: 21 }),
      waterChange(1),
      NOON,
    );
    expect(WATER_TEMP_SIMULATED).toBe(true);
    expect(s.mood).toBe('content');
  });

  it('sans données reste neutre', () => {
    const s = computeState(null, null, NOON);
    expect(s.mood).toBe('content');
    expect(s.daysSinceWaterChange).toBeNull();
  });
});
