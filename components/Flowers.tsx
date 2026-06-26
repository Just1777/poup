import React from 'react';
import Svg, { Path, Ellipse, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { Mood } from '../lib/types';

// Le vase de fleurs que Poup garde. Les fleurs RÉAGISSENT fortement à l'état :
// - glissement de COULEUR des pétales (vif → jauni → bruni → givré → terne) ;
// - posture (droop) et ouverture ;
// - skins spéciaux : givre (froid), boutons fermés (nuit).
// (L'ambiance autour — soleil, flocons, pétales qui tombent — est dans PlantAmbiance.)

type Skin = {
  petals: [string, string, string]; // couleur des 3 fleurs
  center: string;
  droop: number; // 0 = droit, 1 = très tombant
  open: number; // 1 = épanoui, 0 = fermé
  opacity: number;
  frost?: boolean; // givre (froid)
  buds?: boolean; // boutons fermés (nuit)
};

const SKIN: Record<Mood, Skin> = {
  content: { petals: ['#F4A6C2', '#F6D06B', '#C3A6E8'], center: '#FFE08A', droop: 0.02, open: 1, opacity: 1 },
  soif: { petals: ['#CDA28C', '#CBB184', '#BE9DAE'], center: '#C9A24B', droop: 0.95, open: 0.5, opacity: 0.92 },
  change_eau: { petals: ['#C8A188', '#CDB084', '#BC9BAC'], center: '#C9A24B', droop: 0.8, open: 0.6, opacity: 0.92 },
  chaud: { petals: ['#E7C264', '#E2B557', '#D7A64C'], center: '#B9863C', droop: 0.55, open: 0.62, opacity: 0.95 },
  froid: { petals: ['#C2D6EE', '#D2E2F3', '#D9CBEF'], center: '#E7EEF7', droop: 0.3, open: 0.4, opacity: 0.95, frost: true },
  endormi: { petals: ['#7E6F94', '#8A7A63', '#6E6486'], center: '#5A5070', droop: 0.15, open: 0.3, opacity: 0.8, buds: true },
};

const FLOWERS = [
  { baseX: 92, headX: 72, headY: 60 },
  { baseX: 100, headX: 100, headY: 46 },
  { baseX: 108, headX: 130, headY: 64 },
];

export function Flowers({ mood, size = 140 }: { mood: Mood; size?: number }) {
  const skin = SKIN[mood];
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <LinearGradient id="vase" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#CFEAF5" stopOpacity={0.7} />
          <Stop offset="1" stopColor="#9FD2E6" stopOpacity={0.85} />
        </LinearGradient>
      </Defs>

      <Ellipse cx="100" cy="193" rx="46" ry="6" fill="#000" opacity={0.08} />

      <G opacity={skin.opacity}>
        {FLOWERS.map((f, i) => (
          <Stem key={i} flower={f} skin={skin} color={skin.petals[i]} />
        ))}
      </G>

      {/* Vase en verre translucide */}
      <Path
        d="M74 150 L126 150 L120 188 Q120 194 114 194 L86 194 Q80 194 80 188 Z"
        fill="url(#vase)"
        stroke="#FFFFFF"
        strokeOpacity={0.6}
        strokeWidth={1.5}
      />
      <Path d="M82 168 L118 168 L116 186 Q116 190 112 190 L88 190 Q84 190 84 186 Z" fill="#BFE6F2" opacity={0.6} />
      <Ellipse cx="88" cy="160" rx="3" ry="10" fill="#FFFFFF" opacity={0.4} />
    </Svg>
  );
}

function Stem({
  flower,
  skin,
  color,
}: {
  flower: (typeof FLOWERS)[number];
  skin: Skin;
  color: string;
}) {
  const { baseX, headX, headY } = flower;
  const { droop, open, center, frost, buds } = skin;
  const side = headX - 100;
  const hx = headX + side * droop * 0.6;
  const hy = headY + droop * 52;
  const ctrlX = (baseX + hx) / 2 + side * droop * 0.5;
  const ctrlY = (150 + hy) / 2;
  const rot = side * droop * 32 + (side === 0 ? droop * 10 : 0);
  const stemColor = buds ? '#4C6B53' : '#5DA86B';
  const leafColor = buds ? '#587A60' : '#6FB97E';

  return (
    <G>
      <Path
        d={`M${baseX} 150 Q${ctrlX} ${ctrlY} ${hx} ${hy}`}
        stroke={stemColor}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
      <Ellipse cx={ctrlX - side * 0.2} cy={ctrlY} rx={7} ry={3.5} fill={leafColor} transform={`rotate(${rot - 20} ${ctrlX} ${ctrlY})`} />
      {buds ? (
        <Bud cx={hx} cy={hy} color={color} rot={rot} />
      ) : (
        <FlowerHead cx={hx} cy={hy} color={color} center={center} open={open} rot={rot} frost={frost} />
      )}
    </G>
  );
}

function FlowerHead({
  cx,
  cy,
  color,
  center,
  open,
  rot,
  frost,
}: {
  cx: number;
  cy: number;
  color: string;
  center: string;
  open: number;
  rot: number;
  frost?: boolean;
}) {
  const ry = 7 * open + 2;
  const rx = 3.4 * open + 1;
  return (
    <G transform={`rotate(${rot} ${cx} ${cy})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <Ellipse key={a} cx={cx} cy={cy - (ry + 1)} rx={rx} ry={ry} fill={color} transform={`rotate(${a} ${cx} ${cy})`} />
      ))}
      <Circle cx={cx} cy={cy} r={3.6} fill={center} />
      {frost && (
        <G>
          <Circle cx={cx - 3} cy={cy - 3} r={1.3} fill="#FFFFFF" opacity={0.9} />
          <Circle cx={cx + 4} cy={cy - 1} r={1} fill="#FFFFFF" opacity={0.8} />
          <Circle cx={cx} cy={cy + 4} r={1.1} fill="#FFFFFF" opacity={0.8} />
        </G>
      )}
    </G>
  );
}

// Bouton fermé (la nuit) : une goutte/teardrop refermée.
function Bud({ cx, cy, color, rot }: { cx: number; cy: number; color: string; rot: number }) {
  return (
    <G transform={`rotate(${rot} ${cx} ${cy})`}>
      <Path d={`M${cx} ${cy - 9} Q${cx + 5} ${cy - 4} ${cx + 3} ${cy + 3} Q${cx} ${cy + 6} ${cx - 3} ${cy + 3} Q${cx - 5} ${cy - 4} ${cx} ${cy - 9} Z`} fill={color} />
      <Path d={`M${cx} ${cy - 9} L${cx} ${cy + 5}`} stroke="#4C6B53" strokeWidth={0.8} opacity={0.5} />
    </G>
  );
}
