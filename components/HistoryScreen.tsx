import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHistory, type HistoryRange } from '../lib/hooks/useHistory';
import type { usePlantState } from '../lib/hooks/usePlantState';
import { WATER_TEMP_SIMULATED } from '../config/poup';
import { buildChartData } from '../lib/aggregate';
import { LineChartSvg } from './LineChartSvg';

type Props = Pick<ReturnType<typeof usePlantState>, 'theme' | 'reading'>;

const RANGES: { key: HistoryRange; label: string }[] = [
  { key: '24h', label: '24h' },
  { key: '7j', label: '7J' },
  { key: '1m', label: '1M' },
  { key: '1y', label: '1A' },
];

const COLORS = { room: '#E07A4B', water: '#2F8FB3', humidity: '#2E8BC0' };

export function HistoryScreen({ theme, reading }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [range, setRange] = useState<HistoryRange>('24h');
  const { data, loading, error } = useHistory(range);

  // Largeur du graphe = largeur intérieure de la carte (le SVG gère sa marge d'axe Y).
  const chartWidth = width - 48 - 20; // 48 = padding ScrollView×2, 20 = padding carte×2

  // Axe X fixe + uniquement les moments mesurés (trous préservés, sans interpolation).
  const chart = useMemo(() => buildChartData(data, range), [data, range]);

  return (
    <View style={[styles.fill, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 110,
          paddingHorizontal: 24,
        }}
      >
        <Text style={[styles.title, { color: theme.text }]}>Historique</Text>

        {reading.data && (
          <Text style={[styles.updated, { color: theme.text }]}>
            Dernière mesure {timeAgo(reading.data.recorded_at)}
          </Text>
        )}

        <View style={[styles.rangeBar, { backgroundColor: theme.accent + '1A' }]}>
          {RANGES.map((r) => {
            const active = r.key === range;
            return (
              <Pressable
                key={r.key}
                onPress={() => setRange(r.key)}
                style={[styles.rangeChip, active && { backgroundColor: '#ffffffcc' }]}
              >
                <Text style={[styles.rangeText, { color: active ? theme.accent : theme.text + '99' }]}>
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 48 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : chart.isEmpty ? (
          <Text style={[styles.empty, { color: theme.text }]}>
            Pas encore de données sur cette période.
          </Text>
        ) : (
          <>
            <ChartCard
              title="Température"
              theme={theme}
              legend={[
                { label: 'Chambre', color: COLORS.room },
                { label: 'Eau', color: COLORS.water },
              ]}
            >
              <LineChartSvg
                width={chartWidth}
                height={190}
                xStart={chart.xStart}
                xEnd={chart.xEnd}
                gapMs={chart.gapMs}
                ticks={chart.ticks}
                series={[
                  { points: chart.room, color: COLORS.room },
                  { points: chart.water, color: COLORS.water },
                ]}
                formatY={(v) => `${round1(v)}°`}
                textColor={theme.text + '99'}
                gridColor={theme.text + '14'}
              />
            </ChartCard>

            <ChartCard
              title="Humidité"
              theme={theme}
              legend={[{ label: '% humidité', color: COLORS.humidity }]}
            >
              <LineChartSvg
                width={chartWidth}
                height={190}
                xStart={chart.xStart}
                xEnd={chart.xEnd}
                gapMs={chart.gapMs}
                ticks={chart.ticks}
                series={[{ points: chart.humidity, color: COLORS.humidity }]}
                yMin={0}
                yMax={100}
                formatY={(v) => `${Math.round(v)}%`}
                textColor={theme.text + '99'}
                gridColor={theme.text + '14'}
              />
            </ChartCard>
          </>
        )}

        {WATER_TEMP_SIMULATED && (
          <Text style={[styles.note, { color: theme.text + 'AA' }]}>
            ⓘ La courbe « Eau » est encore simulée (sonde branchée vendredi) — son
            oscillation douce est normale.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function ChartCard({
  title,
  legend,
  theme,
  children,
}: {
  title: string;
  legend: { label: string; color: string }[];
  theme: { text: string };
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
        <View style={styles.legend}>
          {legend.map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: l.color }]} />
              <Text style={[styles.legendText, { color: theme.text + 'CC' }]}>{l.label}</Text>
            </View>
          ))}
        </View>
      </View>
      {children}
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  title: { fontSize: 28, fontWeight: '800' },
  updated: { fontSize: 13, opacity: 0.6, marginTop: 2, marginBottom: 16 },
  rangeBar: { flexDirection: 'row', borderRadius: 24, padding: 4, gap: 4 },
  rangeChip: { flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  rangeText: { fontSize: 14, fontWeight: '700' },
  card: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingLeft: 8,
    paddingRight: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  cardHeader: { paddingHorizontal: 12, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  legend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13 },
  axis: { fontSize: 10 },
  empty: { marginTop: 48, textAlign: 'center', opacity: 0.6, fontSize: 15 },
  error: { marginTop: 48, textAlign: 'center', color: '#B00020' },
  note: { marginTop: 16, fontSize: 12, lineHeight: 18 },
});
