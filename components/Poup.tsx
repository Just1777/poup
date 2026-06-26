import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Ellipse,
  Circle,
  Rect,
  Line,
  G,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import type { Mood } from '../lib/types';

type Props = { mood: Mood; size?: number };

// Poup : petit slime vert translucide, arrondi, kawaii. La SILHOUETTE du blob ne
// change pas (identité + lisibilité OLED 128x64). Ce qui change selon l'humeur :
// l'EXPRESSION, une TENUE/posture (écharpe l'hiver, lunettes + fonte quand il fait
// chaud, bonnet de nuit…) et un détail animé. Les tenues sont des silhouettes
// fortes, pensées pour rester lisibles même en monochrome.

const BLOB =
  'M50 18 C72 18 86 34 86 56 C86 76 72 86 50 86 C28 86 14 76 14 56 C14 34 28 18 50 18 Z';

const BODY: Record<Mood, { top: string; bottom: string }> = {
  content: { top: '#9BE7B4', bottom: '#5CC487' },
  soif: { top: '#A9DCF0', bottom: '#5FB4DE' },
  change_eau: { top: '#A6DDEE', bottom: '#5AB6D6' },
  chaud: { top: '#F2C3A4', bottom: '#E59B6E' },
  froid: { top: '#BFD0EE', bottom: '#8AA6D8' },
  endormi: { top: '#3A4063', bottom: '#262B45' },
};

// Posture statique (penché, affaissé, fondu…) appliquée au corps.
const POSTURE: Record<Mood, { scaleY: number; translateY: number; rotate: number }> = {
  content: { scaleY: 1, translateY: 0, rotate: 0 },
  soif: { scaleY: 0.97, translateY: 1, rotate: 0 },
  change_eau: { scaleY: 1, translateY: 0, rotate: 0 },
  chaud: { scaleY: 0.9, translateY: 5, rotate: 0 }, // affaissé / fond
  froid: { scaleY: 1.02, translateY: 0, rotate: 0 },
  endormi: { scaleY: 0.92, translateY: 2, rotate: -4 }, // penché, assoupi
};

type ArmPose = 'guard' | 'down' | 'tucked' | 'holdRight';
const ARM_POSE: Record<Mood, ArmPose> = {
  content: 'guard', // bras écartés, monte la garde
  soif: 'holdRight', // tient un verre vide
  change_eau: 'holdRight', // tient un arrosoir
  chaud: 'down',
  froid: 'tucked', // se serre les bras (a froid)
  endormi: 'down',
};

export function Poup({ mood, size = 200 }: Props) {
  const body = BODY[mood];
  const eyeFill = mood === 'endormi' ? '#C9CFEA' : '#243B2E';
  const posture = POSTURE[mood];

  // ── Respiration / jiggle gélatineux ────────────────────────────────────────
  const jelly = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(jelly, {
          toValue: 1,
          duration: mood === 'endormi' ? 2600 : 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(jelly, {
          toValue: 0,
          duration: mood === 'endormi' ? 2600 : 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [jelly, mood]);

  const sx = jelly.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const sy = jelly.interpolate({ inputRange: [0, 1], outputRange: [1.03, 0.97] });
  const ty = jelly.interpolate({ inputRange: [0, 1], outputRange: [0, 3] });

  // ── Frisson (uniquement quand il a froid) ──────────────────────────────────
  const shiver = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (mood !== 'froid') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shiver, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(shiver, { toValue: -1, duration: 70, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shiver, mood]);
  const shiverX = shiver.interpolate({ inputRange: [-1, 1], outputRange: [-1.6, 1.6] });

  // ── Clignement périodique (sauf quand Poup dort) ───────────────────────────
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    if (mood === 'endormi') return;
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => setBlinking(false), 130);
        schedule();
      }, 2200 + Math.random() * 2200);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, [mood]);

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [{ translateX: shiverX }, { translateY: ty }, { scaleX: sx }, { scaleY: sy }],
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="poupBody" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={body.top} stopOpacity={0.95} />
              <Stop offset="1" stopColor={body.bottom} stopOpacity={0.95} />
            </LinearGradient>
          </Defs>

          <Ellipse cx="50" cy="90" rx="30" ry="5" fill="#000000" opacity={0.08} />

          {/* Posture appliquée au corps + tenue (pivot ~ bas du blob) */}
          <G
            originX={50}
            originY={86}
            scaleY={posture.scaleY}
            rotation={posture.rotate}
            translateY={posture.translateY}
          >
            {/* Fonte quand il fait chaud (gouttes sous le blob) */}
            {mood === 'chaud' && <MeltDrips />}

            <Arms pose={ARM_POSE[mood]} color={body.bottom} />

            <Path d={BLOB} fill="url(#poupBody)" />
            <Ellipse cx="38" cy="38" rx="12" ry="8" fill="#FFFFFF" opacity={0.35} />

            <Expression mood={mood} eyeFill={eyeFill} blinking={blinking} />
            <Outfit mood={mood} />
          </G>
        </Svg>
      </Animated.View>

      {/* Détails animés (overlays hors SVG) */}
      {mood === 'endormi' && <SleepZs size={size} />}
      {mood === 'chaud' && <SweatDrop size={size} />}
    </View>
  );
}

// ── Bras + mains ──────────────────────────────────────────────────────────────
function Arms({ pose, color }: { pose: ArmPose; color: string }) {
  const arm = (d: string) => (
    <Path d={d} stroke={color} strokeWidth={7} fill="none" strokeLinecap="round" />
  );
  const hand = (x: number, y: number) => <Circle cx={x} cy={y} r={4} fill={color} />;

  switch (pose) {
    case 'guard':
      return (
        <G>
          {arm('M22 64 Q10 66 9 74')}
          {arm('M78 64 Q90 66 91 74')}
          {hand(9, 74)}
          {hand(91, 74)}
        </G>
      );
    case 'tucked':
      return (
        <G>
          {arm('M26 64 Q34 66 44 60')}
          {arm('M74 64 Q66 66 56 60')}
          {hand(44, 60)}
          {hand(56, 60)}
        </G>
      );
    case 'holdRight':
      return (
        <G>
          {arm('M22 66 Q16 74 16 80')}
          {arm('M78 64 Q86 62 86 58')}
          {hand(16, 80)}
          {hand(86, 58)}
        </G>
      );
    case 'down':
    default:
      return (
        <G>
          {arm('M22 66 Q16 74 17 80')}
          {arm('M78 66 Q84 74 83 80')}
          {hand(17, 80)}
          {hand(83, 80)}
        </G>
      );
  }
}

// ── Tenues / accessoires par humeur ─────────────────────────────────────────────
function Outfit({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'froid':
      return (
        <G>
          {/* écharpe */}
          <Path d="M22 70 Q50 80 78 70 L78 77 Q50 87 22 77 Z" fill="#C8553D" />
          <Path d="M62 75 L70 75 L72 92 L64 92 Z" fill="#C8553D" />
          <Path d="M64 80 L70 80 M65 85 L71 85" stroke="#A23B28" strokeWidth={1.4} />
          {/* bonnet */}
          <Path d="M24 32 Q50 4 76 32 Q50 24 24 32 Z" fill="#2F6FB0" />
          <Rect x="22" y="30" width="56" height="7" rx="3.5" fill="#3B82C4" />
          <Circle cx="50" cy="7" r="5" fill="#EAF1FB" />
        </G>
      );
    case 'chaud':
      return (
        <G>
          {/* lunettes de soleil (par-dessus les yeux) */}
          <Rect x="32" y="45" width="15" height="11" rx="4" fill="#22262E" />
          <Rect x="53" y="45" width="15" height="11" rx="4" fill="#22262E" />
          <Line x1="47" y1="49" x2="53" y2="49" stroke="#22262E" strokeWidth={3} />
          <Rect x="34" y="47" width="5" height="3" rx="1.5" fill="#FFFFFF" opacity={0.5} />
        </G>
      );
    case 'endormi':
      return (
        <G>
          {/* bonnet de nuit qui retombe sur le côté */}
          <Path d="M30 26 Q44 4 80 16 Q66 24 54 26 Q44 26 30 26 Z" fill="#5A6BA8" />
          <Path d="M30 26 Q44 21 56 24" stroke="#EAF1FB" strokeWidth={4} strokeLinecap="round" />
          <Circle cx="82" cy="15" r="5" fill="#EAF1FB" />
        </G>
      );
    case 'change_eau':
      return (
        <G>
          {/* petit arrosoir tenu par la main droite */}
          <Rect x="74" y="52" width="14" height="11" rx="2.5" fill="#8FB7C9" />
          <Path d="M88 54 L95 50 L95 53 L90 57 Z" fill="#8FB7C9" />
          <Path d="M74 53 Q70 50 73 47" stroke="#8FB7C9" strokeWidth={2} fill="none" />
          <Path d="M95 51 l1 4 M97 51 l0 4 M99 52 l-1 4" stroke="#3E9BD6" strokeWidth={1.2} strokeLinecap="round" />
        </G>
      );
    case 'soif':
      return (
        <G>
          {/* verre vide tenu par la main droite */}
          <Path d="M80 50 L92 50 L90 60 Q90 62 88 62 L84 62 Q82 62 82 60 Z" fill="#CFEAF5" opacity={0.55} stroke="#9FD2E6" strokeWidth={1.2} />
        </G>
      );
    case 'content':
      return (
        <G>
          {/* fleur tenue fièrement (main gauche) + étincelle */}
          <Line x1="9" y1="74" x2="9" y2="64" stroke="#5DA86B" strokeWidth={2} />
          <Circle cx="9" cy="61" r="3.4" fill="#FFE08A" />
          <Petal cx={9} cy={61} />
          <Sparkle x={80} y={26} />
        </G>
      );
    default:
      return null;
  }
}

function Petal({ cx, cy }: { cx: number; cy: number }) {
  return (
    <G>
      {[0, 72, 144, 216, 288].map((a) => (
        <Ellipse key={a} cx={cx} cy={cy - 4.5} rx={2} ry={3.2} fill="#F2A6C0" transform={`rotate(${a} ${cx} ${cy})`} />
      ))}
      <Circle cx={cx} cy={cy} r={2} fill="#FFE08A" />
    </G>
  );
}

function Sparkle({ x, y }: { x: number; y: number }) {
  return (
    <Path
      d={`M${x} ${y - 5} L${x + 1.4} ${y - 1.4} L${x + 5} ${y} L${x + 1.4} ${y + 1.4} L${x} ${y + 5} L${x - 1.4} ${y + 1.4} L${x - 5} ${y} L${x - 1.4} ${y - 1.4} Z`}
      fill="#FFE8A3"
    />
  );
}

function MeltDrips() {
  return (
    <G>
      <Path d="M30 80 Q28 92 33 92 Q38 92 36 80 Z" fill="url(#poupBody)" />
      <Path d="M64 82 Q62 95 67 95 Q72 95 70 82 Z" fill="url(#poupBody)" />
    </G>
  );
}

// ── Expressions ────────────────────────────────────────────────────────────────
function Expression({ mood, eyeFill, blinking }: { mood: Mood; eyeFill: string; blinking: boolean }) {
  if (blinking && mood !== 'endormi') {
    return (
      <G>
        <Path d="M34 52 q6 5 12 0" stroke={eyeFill} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Path d="M54 52 q6 5 12 0" stroke={eyeFill} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Mouth mood={mood} eyeFill={eyeFill} />
      </G>
    );
  }

  switch (mood) {
    case 'endormi':
      return (
        <G>
          <Path d="M34 54 q6 6 12 0" stroke={eyeFill} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M54 54 q6 6 12 0" stroke={eyeFill} strokeWidth={3} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'soif':
      return (
        <G>
          <Circle cx="40" cy="52" r="4" fill={eyeFill} />
          <Circle cx="60" cy="52" r="4" fill={eyeFill} />
          <Path d="M44 64 q6 4 12 0" stroke={eyeFill} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M50 66 q4 0 4 8 q-4 2 -4 -2 Z" fill="#E0668A" />
        </G>
      );
    case 'change_eau':
      return (
        <G>
          <Circle cx="40" cy="52" r="4.5" fill={eyeFill} />
          <Circle cx="60" cy="52" r="4.5" fill={eyeFill} />
          <Path d="M46 64 q4 3 8 0" stroke={eyeFill} strokeWidth={3} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'chaud':
      // yeux cachés par les lunettes → bouche fatiguée uniquement
      return <Path d="M43 64 q3.5 4 7 0 q3.5 -4 7 0" stroke={eyeFill} strokeWidth={3} fill="none" strokeLinecap="round" />;
    case 'froid':
      return (
        <G>
          <Circle cx="40" cy="52" r="4" fill={eyeFill} />
          <Circle cx="60" cy="52" r="4" fill={eyeFill} />
          <Path d="M45 64 q5 -3 10 0" stroke={eyeFill} strokeWidth={3} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'content':
    default:
      return (
        <G>
          <Circle cx="40" cy="50" r="5" fill={eyeFill} />
          <Circle cx="60" cy="50" r="5" fill={eyeFill} />
          <Circle cx="42" cy="48" r="1.6" fill="#FFFFFF" />
          <Circle cx="62" cy="48" r="1.6" fill="#FFFFFF" />
          <Path d="M40 62 q10 10 20 0" stroke={eyeFill} strokeWidth={3.5} fill="none" strokeLinecap="round" />
        </G>
      );
  }
}

function Mouth({ mood, eyeFill }: { mood: Mood; eyeFill: string }) {
  switch (mood) {
    case 'content':
      return <Path d="M40 62 q10 10 20 0" stroke={eyeFill} strokeWidth={3.5} fill="none" strokeLinecap="round" />;
    case 'froid':
      return <Path d="M45 64 q5 -3 10 0" stroke={eyeFill} strokeWidth={3} fill="none" strokeLinecap="round" />;
    default:
      return <Path d="M46 64 q4 3 8 0" stroke={eyeFill} strokeWidth={3} fill="none" strokeLinecap="round" />;
  }
}

// ── Détails animés (overlays) ────────────────────────────────────────────────
function SleepZs({ size }: { size: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(a, { toValue: 1, duration: 2800, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.18] });
  const opacity = a.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] });
  return (
    <Animated.Text
      style={[
        styles.overlayText,
        { right: size * 0.16, top: size * 0.12, fontSize: size * 0.12, opacity, transform: [{ translateY }] },
      ]}
    >
      z
    </Animated.Text>
  );
}

function SweatDrop({ size }: { size: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 1400, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(900),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.22] });
  const opacity = a.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] });
  return (
    <Animated.Text
      style={[
        styles.overlayText,
        { left: size * 0.26, top: size * 0.3, fontSize: size * 0.1, color: '#5BB8E6', opacity, transform: [{ translateY }] },
      ]}
    >
      💧
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  overlayText: { position: 'absolute', fontWeight: '800', color: '#8E97C9' },
});
