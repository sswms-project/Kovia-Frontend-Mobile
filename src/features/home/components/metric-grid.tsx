import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { HomeKpi, Tone } from '../home.types';

export function MetricGrid({ kpis }: { readonly kpis: readonly HomeKpi[] }) {
  const theme = useTheme();

  const chipColors = (tone: Tone) =>
    tone === 'danger'
      ? { fg: theme.onErrorContainer, bg: theme.errorContainer }
      : tone === 'neutral'
        ? { fg: theme.onSecondaryContainer, bg: theme.secondaryContainer }
        : { fg: theme.primary, bg: theme.muted };

  return (
    <View style={styles.grid}>
      {kpis.map((kpi) => {
        const danger = kpi.tone === 'danger';
        const chip = kpi.chip ? chipColors(kpi.chip.tone) : null;
        const Icon = kpi.icon;
        return (
          <View
            key={kpi.id}
            style={[
              styles.card,
              {
                backgroundColor: danger ? theme.errorContainer : theme.card,
                borderColor: danger ? theme.error : theme.border,
              },
            ]}>
            <View style={styles.top}>
              <Text style={[styles.label, { color: danger ? theme.error : theme.textSecondary }]}>{kpi.label}</Text>
              <Icon size={18} color={danger ? theme.error : theme.primary} />
            </View>
            <Text style={[styles.value, { color: danger ? theme.error : theme.text }]}>
              {kpi.value}
              <Text style={[styles.unit, { color: danger ? theme.error : theme.textSecondary }]}> {kpi.unit}</Text>
            </Text>
            {chip && kpi.chip ? (
              <View style={[styles.chip, { backgroundColor: chip.bg }]}>
                <Text style={[styles.chipText, { color: chip.fg }]}>
                  {kpi.chip.text}
                </Text>
              </View>
            ) : null}
            {kpi.progress !== undefined ? (
              <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                <View style={[styles.fill, { backgroundColor: theme.primary, width: `${kpi.progress * 100}%` }]} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { flexBasis: '46%', minWidth: 140, flexGrow: 1, borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: FontFamily.medium },
  value: { fontSize: 28, fontFamily: FontFamily.bold, letterSpacing: -0.5 },
  unit: { fontSize: 12, fontFamily: FontFamily.medium },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.md },
  chipText: { fontSize: 12, lineHeight: 18, fontFamily: FontFamily.semibold },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
