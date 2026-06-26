import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, Text } from 'react-native';
import type { Mood } from '../lib/types';

// Éléments d'ambiance AUTOUR des fleurs, selon l'état :
//   froid → flocons · nuit → lune + étoiles. Couche discrète, derrière Poup.

const W = 230; // largeur de la zone d'ambiance (centrée sur le pot)
const H = 280;

export function PlantAmbiance({ mood }: { mood: Mood }) {
  return (
    <View pointerEvents="none" style={styles.wrap}>
      {mood === 'froid' && <Falling emoji="❄️" count={6} />}
      {mood === 'endormi' && <NightSky />}
    </View>
  );
}

// ── Pétales / flocons qui tombent ───────────────────────────────────────────────
function Falling({ emoji, count }: { emoji: string; count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <FallingOne key={i} emoji={emoji} index={i} />
      ))}
    </>
  );
}

function FallingOne({ emoji, index }: { emoji: string; index: number }) {
  const a = useRef(new Animated.Value(Math.random())).current;
  const x0 = useRef(20 + Math.random() * (W - 40)).current;
  const sway = useRef(8 + Math.random() * 16).current;
  const sz = useRef(12 + Math.random() * 8).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(a, {
        toValue: 1,
        duration: 5000 + Math.random() * 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);

  const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [-20, H] });
  const translateX = a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [x0, x0 + sway, x0 - sway] });
  const opacity = a.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.85, 0.85, 0] });
  const rotate = a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <Animated.Text style={[styles.float, { fontSize: sz, opacity, transform: [{ translateX }, { translateY }, { rotate }] }]}>
      {emoji}
    </Animated.Text>
  );
}

// ── Soleil qui pulse (chaud) ────────────────────────────────────────────────────
// ── Lune + étoiles qui scintillent (nuit) ───────────────────────────────────────
function NightSky() {
  return (
    <View style={styles.nightWrap}>
      <Text style={styles.moon}>🌙</Text>
      <Star x={40} y={40} delay={0} />
      <Star x={160} y={28} delay={600} />
      <Star x={110} y={70} delay={1200} />
    </View>
  );
}

function Star({ x, y, delay }: { x: number; y: number; delay: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(a, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a, delay]);
  const opacity = a.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  return <Animated.Text style={[styles.star, { left: x, top: y, opacity }]}>✦</Animated.Text>;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, width: W, height: H, alignSelf: 'center' },
  float: { position: 'absolute', left: 0, top: 0 },
  nightWrap: { position: 'absolute', top: 0, left: 0, width: W, height: H },
  moon: { position: 'absolute', right: 14, top: 10, fontSize: 30 },
  star: { position: 'absolute', fontSize: 12, color: '#EAF1FB' },
});
