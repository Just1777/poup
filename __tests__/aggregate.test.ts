import { buildChartData } from '../lib/aggregate';
import type { Reading } from '../lib/types';

const NOW = new Date('2026-06-16T12:00:00');
const DAY = 24 * 3600 * 1000;

function r(over: Partial<Reading>): Reading {
  return {
    id: 1,
    device_id: 'vase-chambre',
    room_temp: 20,
    humidity: 50,
    water_temp: 18,
    recorded_at: NOW.toISOString(),
    ...over,
  };
}

describe('buildChartData', () => {
  it('axe X FIXE sur la plage, même sans données', () => {
    const c = buildChartData([], '24h', NOW);
    expect(c.isEmpty).toBe(true);
    expect(c.xEnd - c.xStart).toBe(DAY);
    expect(c.room).toHaveLength(0);
  });

  it('moyenne les mesures d\'un même bucket', () => {
    const rows = [
      r({ recorded_at: '2026-06-16T11:01:00', room_temp: 20 }),
      r({ recorded_at: '2026-06-16T11:07:00', room_temp: 24 }),
    ];
    const c = buildChartData(rows, '24h', NOW);
    expect(c.room).toHaveLength(1);
    expect(c.room[0].v).toBeCloseTo(22, 5);
  });

  it('préserve les trous (pas d\'interpolation entre mesures éloignées)', () => {
    const rows = [
      r({ recorded_at: '2026-06-16T02:00:00' }),
      r({ recorded_at: '2026-06-16T11:00:00' }), // 9h plus tard
    ];
    const c = buildChartData(rows, '24h', NOW);
    expect(c.room).toHaveLength(2); // 2 points distincts, aucun point intercalé
    expect(c.room[1].t - c.room[0].t).toBeGreaterThan(c.gapMs);
  });

  it('exclut les mesures hors de la fenêtre', () => {
    const rows = [r({ recorded_at: '2026-06-14T12:00:00' })]; // > 24h avant NOW
    const c = buildChartData(rows, '24h', NOW);
    expect(c.isEmpty).toBe(true);
  });

  it('les 3 séries sont indépendantes (eau peut manquer sans casser le reste)', () => {
    const rows = [r({ recorded_at: '2026-06-16T11:00:00', water_temp: null })];
    const c = buildChartData(rows, '24h', NOW);
    expect(c.room).toHaveLength(1);
    expect(c.water).toHaveLength(0);
  });
});
