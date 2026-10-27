import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { HomeKpi } from '../home.types';

const ROW_SIZES = [3, 2];

function chunk(kpis: readonly HomeKpi[]) {
  const rows: HomeKpi[][] = [];
  let start = 0;
  for (const size of ROW_SIZES) {
    if (start >= kpis.length) break;
    rows.push(kpis.slice(start, start + size));
    start += size;
  }
  if (start < kpis.length) rows.push(kpis.slice(start));
  return rows;
}

export function MetricGrid({ kpis }: { readonly kpis: readonly HomeKpi[] }) {
  const theme = useTheme();

  return (
    <View style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {chunk(kpis).map((row, r) => (
        <View key={r} style={[styles.row, r > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
          {row.map((kpi, c) => (
            <View key={kpi.id} style={[styles.cell, c > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
              <Text style={[styles.value, { color: kpi.tone === 'danger' ? theme.error : theme.text }]}>
                {kpi.value}
                <Text style={[styles.unit, { color: theme.textSecondary }]}> {kpi.unit}</Text>
              </Text>
              <Text style={[styles.label, { color: theme.textSecondary }]} numberOfLines={1}>{kpi.label}</Text>
              {kpi.progress !== undefined ? (
                <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                  <View style={[styles.fill, { backgroundColor: theme.primary, width: `${Math.min(1, kpi.progress) * 100}%` }]} />
                </View>
              ) : kpi.chip ? (
                <Text style={[styles.sub, { color: theme.textSecondary }]} numberOfLines={1}>{kpi.chip.text}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderWidth: 1, borderRadius: Radius.xl, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  cell: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 2 },
  value: { fontSize: 22, lineHeight: 28, fontFamily: FontFamily.bold },
  unit: { fontSize: 12, fontFamily: FontFamily.regular },
  label: { fontSize: 12, lineHeight: 16, fontFamily: FontFamily.medium },
  sub: { fontSize: 11, lineHeight: 14, fontFamily: FontFamily.regular },
  track: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', borderRadius: 2 },
});
