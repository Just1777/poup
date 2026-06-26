import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PoupScene } from './PoupScene';
import { FloralBackdrop } from './FloralBackdrop';
import type { usePlantState } from '../lib/hooks/usePlantState';
import { pickMoodMessage } from '../config/poup';

type PlantState = ReturnType<typeof usePlantState>;

export function HomeScreen({ state, theme, reading, water }: PlantState) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  // On pioche une phrase quand l'humeur change (stable entre deux rafraîchissements).
  const message = useMemo(
    () =>
      pickMoodMessage(state.mood, {
        daysSinceWaterChange: state.daysSinceWaterChange,
        roomTemp: reading.data?.room_temp ?? null,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.mood],
  );

  const onWaterChanged = async () => {
    try {
      setSaving(true);
      await water.logWaterChange();
    } catch {
      // l'erreur est déjà stockée dans le hook
    } finally {
      setSaving(false);
    }
  };

  const loading = reading.loading || water.loading;

  return (
    <View style={[styles.fill, { backgroundColor: theme.bg }]}>
      {/* B — atmosphère : pétales qui flottent + lumière douce, derrière le contenu */}
      <FloralBackdrop mood={state.mood} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 110 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              reading.refetch();
              water.refetch();
            }}
            tintColor={theme.accent}
          />
        }
      >
        {loading && !reading.data ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : (
          <>
            {/* A — Poup gardien à côté de son vase de fleurs réactives */}
            <PoupScene mood={state.mood} />

            <Text style={[styles.message, { color: theme.text }]}>{message}</Text>

            {state.provisional && (
              <Text style={[styles.provisional, { color: theme.text }]}>
                (estimation provisoire — sonde d'eau pas encore branchée)
              </Text>
            )}

            <View style={styles.stats}>
              <Stat label="Chambre" value={fmtTemp(reading.data?.room_temp)} color={theme.text} />
              <Stat label="Humidité" value={fmtPct(reading.data?.humidity)} color={theme.text} />
              <Stat label="Eau" value={fmtTemp(reading.data?.water_temp)} color={theme.text} />
            </View>

            <Text style={[styles.lastWater, { color: theme.text }]}>
              {waterChangeLabel(state.daysSinceWaterChange)}
            </Text>

            <Pressable
              onPress={onWaterChanged}
              disabled={saving}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.accent, opacity: pressed || saving ? 0.7 : 1 },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>J'ai changé l'eau</Text>
              )}
            </Pressable>

            {(reading.error || water.error) && (
              <Text style={styles.error}>{reading.error || water.error}</Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

function fmtTemp(v: number | null | undefined): string {
  return v == null ? '—' : `${Math.round(v * 10) / 10}°`;
}
function fmtPct(v: number | null | undefined): string {
  return v == null ? '—' : `${Math.round(v)}%`;
}
function waterChangeLabel(days: number | null): string {
  if (days == null) return "Pas encore de changement d'eau enregistré";
  if (days <= 0) return "Eau changée aujourd'hui";
  if (days === 1) return 'Eau changée hier';
  return `Eau changée il y a ${days} jours`;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { alignItems: 'center', paddingHorizontal: 24, gap: 16 },
  center: { flex: 1, justifyContent: 'center', minHeight: 400 },
  message: { fontSize: 24, fontWeight: '700', textAlign: 'center', lineHeight: 32 },
  provisional: { fontSize: 13, opacity: 0.7, textAlign: 'center' },
  stats: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 8 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 13, opacity: 0.7, marginTop: 2 },
  lastWater: { fontSize: 15, opacity: 0.85, marginTop: 4 },
  button: {
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  error: { color: '#B00020', fontSize: 13, textAlign: 'center' },
});
