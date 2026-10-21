import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { WarehouseTaskStats } from '../warehouse-task.types';

interface TaskStatsBarProps {
  readonly stats: WarehouseTaskStats;
}

type MetricTone = 'default' | 'active' | 'warning' | 'danger';

export function TaskStatsBar({ stats }: TaskStatsBarProps) {
  const metrics: readonly { label: string; value: number; tone: MetricTone }[] = [
    { label: 'Chờ bắt đầu', value: stats.queuedCount, tone: 'default' },
    { label: 'Đang làm', value: stats.inProgressCount, tone: 'active' },
    { label: 'Tạm dừng', value: stats.pausedCount, tone: 'default' },
    { label: 'Sắp đến hạn', value: stats.dueSoonCount, tone: 'warning' },
    { label: 'Quá hạn', value: stats.overdueCount, tone: 'danger' },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {metrics.map((metric) => (
        <Metric key={metric.label} {...metric} />
      ))}
    </ScrollView>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: MetricTone }) {
  const theme = useTheme();
  // A warning colour on a zero count would be a false alarm, so highlight only real work.
  const isHighlighted = value > 0;
  const valueColor =
    tone === 'danger' && isHighlighted
      ? theme.error
      : tone === 'warning' && isHighlighted
        ? theme.warning
        : tone === 'active' && isHighlighted
          ? theme.primary
          : theme.text;

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.metric, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.value, { color: valueColor }]}>{value.toLocaleString('vi-VN')}</Text>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 20 },
  metric: { minWidth: 92, gap: 2, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderRadius: Radius.lg },
  value: { fontFamily: FontFamily.mono, fontSize: 20, lineHeight: 26 },
  label: { fontFamily: FontFamily.regular, fontSize: 12 },
});
