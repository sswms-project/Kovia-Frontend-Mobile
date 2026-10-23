import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

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
        : { fg: theme.onPrimaryContainer, bg: theme.primaryContainer };

  return (
    <View style={styles.grid}>
      {kpis.map((kpi, index) => {
        const danger = kpi.tone === 'danger';
        const chip = kpi.chip ? chipColors(kpi.chip.tone) : null;
        const Icon = kpi.icon;
        return (
          <Animated.View
            key={kpi.id}
            entering={FadeInDown.delay(80 * index).springify()}
            style={[
              styles.card,
              {
                backgroundColor: danger ? theme.errorContainer : theme.card,
                borderColor: danger ? theme.error : theme.border,
              },
            ]}>
            <View style={styles.top}>
              <Text style={[styles.label, { color: danger ? theme.error : theme.textSecondary }]}>{kpi.label}</Text>
              <View style={[styles.iconWrap, { backgroundColor: danger ? theme.card : theme.muted }]}>
                <Icon size={16} color={danger ? theme.error : theme.primary} />
              </View>
            </View>
            <Text style={[styles.value, { color: danger ? theme.error : theme.text }]}>
              {kpi.value}
              <Text style={[styles.unit, { color: danger ? theme.error : theme.textSecondary }]}> {kpi.unit}</Text>
            </Text>
            {chip && kpi.chip ? (
              <View style={[styles.chip, { backgroundColor: chip.bg }]}>
                <Text style={[styles.chipText, { color: chip.fg }]} numberOfLines={1}>
                  {kpi.chip.text}
                </Text>
              </View>
            ) : null}
            {kpi.progress !== undefined ? (
              <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                <View style={[styles.fill, { backgroundColor: theme.primary, width: `${kpi.progress * 100}%` }]} />
              </View>
            ) : null}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47.8%', flexGrow: 1, borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  iconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, fontFamily: FontFamily.semibold },
  value: { fontSize: 28, fontFamily: FontFamily.bold, letterSpacing: -0.5 },
  unit: { fontSize: 12, fontFamily: FontFamily.medium },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  chipText: { fontSize: 11, fontFamily: FontFamily.semibold },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
