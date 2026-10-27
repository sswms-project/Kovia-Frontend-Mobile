import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDate, formatDisplayDateTime } from '@/lib/date-format';

import { FORECAST_RUN_STATUS_LABELS, FORECAST_RUN_STATUS_TONES } from '../forecast.labels';
import type { ForecastRunSummary } from '../forecast.types';

interface ForecastRunCardProps {
  readonly run: ForecastRunSummary;
  readonly onPress: (runId: string) => void;
}

export function ForecastRunCard({ run, onPress }: ForecastRunCardProps) {
  const theme = useTheme();
  const period = `${formatDisplayDate(new Date(run.forecastStartDate))} – ${formatDisplayDate(new Date(run.forecastEndDate))}`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Đợt dự báo ${period}, ${FORECAST_RUN_STATUS_LABELS[run.status]}`}
      onPress={() => onPress(run.id)}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.period, { color: theme.text }]}>{period}</Text>
        <StatusPill label={FORECAST_RUN_STATUS_LABELS[run.status]} tone={FORECAST_RUN_STATUS_TONES[run.status]} />
      </View>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>Tạo lúc {formatDisplayDateTime(new Date(run.createdAt))}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 44, gap: 6, padding: 12, borderWidth: 1, borderRadius: Radius.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  period: { flex: 1, fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 },
  meta: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17 },
});
