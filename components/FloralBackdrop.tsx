import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { Mood } from '../lib/types';

// Atmosphère vivante derrière le contenu : pétales qui dérivent doucement +
// un voile de lumière en haut. Discret, pour poser un « petit coin de nature ».
// (Partie B de l'ambiance florale.)

const { width, height } = Dimensions.get('window');
const PETAL_COLORS = ['#F4B8CE', '#F8DD8E', '#D8C4F0', '#FFFFFF'];
const COUNT = 7;

export function FloralBackdrop({ mood }: { mood: Mood }) {
  const night = mood === 'endormi';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* voile de lumière (lune bleutée la nuit, lumière chaude le jour) */}
      <LinearGradient
        colors={
          night
            ? ['rgba(180,195,255,0.18)', 'rgba(180,195,255,0)']
            : ['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']
        }
        style={styles.light}
      />
      {Array.from({ length: COUNT }).map((_, i) => (
        <Petal key={i} index={i} dim={night} />
      ))}
    </View>
  );
}

function Petal({ index, dim }: { index: number; dim: boolean }) {
  const a = useRef(new Animated.Value(Math.random())).current;
  const x0 = useRef(Math.random() * width).current;
  const sway = useRef(18 + Math.random() * 28).current;
  const sizePx = useRef(8 + Math.random() * 8).current;
  const color = PETAL_COLORS[index % PETAL_COLORS.length];

  useEffect(() => {
    const duration = 10000 + Math.random() * 8000;
    const loop = Animated.loop(
      Animated.timing(a, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);

  const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [-40, height + 40] });
  const translateX = a.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [x0, x0 + sway, x0, x0 - sway, x0],
  });
  const rotate = a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '320deg'] });

  return (
    <Animated.View
      style={[
        styles.petal,
        {
          width: sizePx,
          height: sizePx * 1.3,
          backgroundColor: color,
          opacity: dim ? 0.22 : 0.5,
          transform: [{ translateX }, { translateY }, { rotate }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  light: { position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.4 },
  petal: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 4,
  },
});
