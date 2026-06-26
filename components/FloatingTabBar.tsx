import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS: { key: string; on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'poup', on: 'happy', off: 'happy-outline' },
  { key: 'history', on: 'analytics', off: 'analytics-outline' },
];

// Barre flottante "liquid glass" façon Instagram : flotte au-dessus du contenu,
// fond translucide flou, pilule arrondie. L'humeur colore l'onglet actif.
export function FloatingTabBar({
  activeIndex,
  onSelect,
  accent,
}: {
  activeIndex: number;
  onSelect: (index: number) => void;
  accent: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 12 }]}>
      <BlurView intensity={Platform.OS === 'ios' ? 85 : 110} tint="light" style={styles.bar}>
        {TABS.map((tab, index) => {
          const focused = activeIndex === index;
          return (
            <Pressable key={tab.key} onPress={() => onSelect(index)} style={styles.tab} hitSlop={8}>
              <View style={[styles.pill, focused && { backgroundColor: accent + '26' }]}>
                <Ionicons
                  name={focused ? tab.on : tab.off}
                  size={26}
                  color={focused ? accent : '#6B7670'}
                />
              </View>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    borderRadius: 34,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    // léger voile blanc pour que la barre reste visible sur les fonds clairs
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tab: { paddingHorizontal: 4 },
  pill: { width: 56, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
