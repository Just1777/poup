import React from 'react';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import type { ChartPoint } from '../lib/aggregate';

// Graphe en ligne à AXE TEMPOREL FIXE : la position X de chaque point = son temps
// réel dans la fenêtre [xStart, xEnd]. La courbe se COUPE quand l'écart entre deux
// points dépasse `gapMs` (ESP32 débranché) → les trous restent visibles. Les
// mesures isolées sont marquées d'un point pour rester visibles.

type Series = { points: ChartPoint[]; color: string };

type Props = {
  width: number;
  height: number;
  xStart: number;
  xEnd: number;
  gapMs: number;
  ticks: { t: number; label: string }[];
  series: Series[];
  yMin?: number;
  yMax?: number;
  formatY: (v: number) => string;
  textColor: string;
  gridColor: string;
  noOfSections?: number;
};

const PAD = { left: 40, right: 10, top: 10, bottom: 22 };

export function LineChartSvg({
  width,
  height,
  xStart,
  xEnd,
  gapMs,
  ticks,
  series,
  yMin,
  yMax,
  formatY,
  textColor,
  gridColor,
  noOfSections = 4,
}: Props) {
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  // Domaine Y : fixe si fourni (humidité 0–100), sinon auto avec marge.
  const allV = series.flatMap((s) => s.points.map((p) => p.v));
  let lo = yMin ?? (allV.length ? Math.min(...allV) : 0);
  let hi = yMax ?? (allV.length ? Math.max(...allV) : 1);
  if (lo === hi) { lo -= 1; hi += 1; }
  if (yMin == null && yMax == null) {
    const m = (hi - lo) * 0.15;
    lo -= m;
    hi += m;
  }

  const xOf = (t: number) => PAD.left + ((t - xStart) / (xEnd - xStart)) * plotW;
  const yOf = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * plotH;

  // Lignes de grille + labels Y
  const grid = [];
  for (let i = 0; i <= noOfSections; i++) {
    const yy = PAD.top + (i / noOfSections) * plotH;
    const val = hi - (i / noOfSections) * (hi - lo);
    grid.push(
      <React.Fragment key={`g${i}`}>
        <Line x1={PAD.left} y1={yy} x2={PAD.left + plotW} y2={yy} stroke={gridColor} strokeWidth={1} />
        <SvgText x={PAD.left - 6} y={yy + 3.5} fontSize={9} fill={textColor} textAnchor="end">
          {formatY(val)}
        </SvgText>
      </React.Fragment>,
    );
  }

  return (
    <Svg width={width} height={height}>
      {grid}

      {/* Graduations temporelles (axe X fixe) */}
      {ticks.map((tk, i) => {
        const xx = xOf(tk.t);
        if (xx < PAD.left - 1 || xx > PAD.left + plotW + 1) return null;
        return (
          <SvgText key={`t${i}`} x={xx} y={height - 6} fontSize={9} fill={textColor} textAnchor="middle">
            {tk.label}
          </SvgText>
        );
      })}

      {/* Courbes : coupées aux trous, point pour les mesures isolées */}
      {series.map((s, si) => {
        const pts = s.points;
        let d = '';
        for (let i = 0; i < pts.length; i++) {
          const connected = i > 0 && pts[i].t - pts[i - 1].t <= gapMs;
          d += `${connected ? ' L' : ' M'}${xOf(pts[i].t).toFixed(1)} ${yOf(pts[i].v).toFixed(1)}`;
        }
        const dots = pts
          .map((p, i) => {
            const hasPrev = i > 0 && p.t - pts[i - 1].t <= gapMs;
            const hasNext = i < pts.length - 1 && pts[i + 1].t - p.t <= gapMs;
            return !hasPrev && !hasNext ? p : null;
          })
          .filter(Boolean) as ChartPoint[];
        return (
          <React.Fragment key={`s${si}`}>
            <Path d={d.trim()} stroke={s.color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {dots.map((p, di) => (
              <Circle key={di} cx={xOf(p.t)} cy={yOf(p.v)} r={2.5} fill={s.color} />
            ))}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}
