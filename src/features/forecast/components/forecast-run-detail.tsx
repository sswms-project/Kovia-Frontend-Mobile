import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDate } from '@/lib/date-format';
import { formatQuantity } from '@/lib/number-format';

import {
  FORECAST_RUN_STATUS_LABELS, FORECAST_RUN_STATUS_TONES, SUGGESTION_STATUS_LABELS, SUGGESTION_STATUS_TONES,
} from '../forecast.labels';
import type { ForecastRun, ForecastSuggestionType } from '../forecast.types';

interface ForecastRunDetailProps {
  readonly run: ForecastRun;
  readonly canManage: boolean;
  readonly isBusy: boolean;
  readonly onEvaluate: () => void;
  readonly onReject: (suggestionId: string, type: ForecastSuggestionType) => void;
}

interface ProductDemand {
  readonly productId: string;
  readonly sku: string;
  readonly productName: string;
  readonly totalQuantity: number;
}

function summarizeDemand(run: ForecastRun): ProductDemand[] {
  const totals = new Map<string, ProductDemand>();
  for (const result of run.results) {
    const current = totals.get(result.productId);
    totals.set(result.productId, {
      productId: result.productId, sku: result.sku, productName: result.productName,
      totalQuantity: (current?.totalQuantity ?? 0) + result.forecastQuantity,
    });
  }
  return [...totals.values()].sort((left, right) => right.totalQuantity - left.totalQuantity);
}

export function ForecastRunDetail({ run, canManage, isBusy, onEvaluate, onReject }: ForecastRunDetailProps) {
  const theme = useTheme();
  const demand = useMemo(() => summarizeDemand(run), [run]);
  const averageAccuracy = useMemo(() => {
    const scored = run.results.filter((result) => result.accuracyPercent !== null);
    if (scored.length === 0) return null;
    return scored.reduce((sum, result) => sum + (result.accuracyPercent ?? 0), 0) / scored.length;
  }, [run]);
  const isInProgress = run.status === 'Pending' || run.status === 'Running';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <StatusPill label={FORECAST_RUN_STATUS_LABELS[run.status]} tone={FORECAST_RUN_STATUS_TONES[run.status]} />
        <Text style={[styles.title, { color: theme.text }]}>{run.warehouseName}</Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {formatDisplayDate(new Date(run.forecastStartDate))} – {formatDisplayDate(new Date(run.forecastEndDate))} · {run.historicalPeriodDays} ngày lịch sử · {run.createdByName}
        </Text>
        {averageAccuracy !== null && <Text style={[styles.meta, { color: theme.textSecondary }]}>Độ chính xác trung bình {averageAccuracy.toFixed(1)}%</Text>}
      </View>

      {isInProgress && <AlertBanner title="Đang chạy dự báo" description="Màn hình tự cập nhật khi hoàn tất." />}
      {run.status === 'Failed' && <AlertBanner variant="destructive" title="Dự báo thất bại" description={run.failureReason ?? undefined} />}
      {!!run.draftCreationNotice && <AlertBanner variant="default" title={run.draftCreationNotice} />}
      {canManage && run.status === 'Completed' && <Button label="Đánh giá độ chính xác" variant="outline" loading={isBusy} onPress={onEvaluate} />}

      {demand.length > 0 && <Text accessibilityRole="header" style={[styles.section, { color: theme.text }]}>Nhu cầu dự báo theo sản phẩm</Text>}
      {demand.map((item) => (
        <View key={item.productId} style={[styles.row, { borderColor: theme.border }]}>
          <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={2}>{item.productName}  <Text style={{ color: theme.textSecondary }}>{item.sku}</Text></Text>
          <Text style={[styles.rowValue, { color: theme.text }]}>{formatQuantity(item.totalQuantity)}</Text>
        </View>
      ))}

      {run.replenishmentSuggestions.length > 0 && <Text accessibilityRole="header" style={[styles.section, { color: theme.text }]}>Đề xuất bổ sung hàng</Text>}
      {run.replenishmentSuggestions.map((suggestion) => (
        <View key={suggestion.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <StatusPill label={SUGGESTION_STATUS_LABELS[suggestion.status]} tone={SUGGESTION_STATUS_TONES[suggestion.status]} />
          <Text style={[styles.rowName, { color: theme.text }]}>{suggestion.productName}</Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            Đề xuất {formatQuantity(suggestion.adjustedQuantity ?? suggestion.suggestedQuantity)} {suggestion.unitName ?? ''}
          </Text>
          {!!suggestion.reviewNotice && <Text style={[styles.meta, { color: theme.textSecondary }]}>{suggestion.reviewNotice}</Text>}
          {canManage && suggestion.status === 'New' && (
            <Button label="Từ chối đề xuất" variant="outline" disabled={isBusy} onPress={() => onReject(suggestion.id, 'Replenishment')} />
          )}
        </View>
      ))}

      {run.rebalancingSuggestions.length > 0 && <Text accessibilityRole="header" style={[styles.section, { color: theme.text }]}>Đề xuất cân đối tồn</Text>}
      {run.rebalancingSuggestions.map((suggestion) => (
        <View key={suggestion.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <StatusPill label={SUGGESTION_STATUS_LABELS[suggestion.status]} tone={SUGGESTION_STATUS_TONES[suggestion.status]} />
          <Text style={[styles.rowName, { color: theme.text }]}>{suggestion.productName}</Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {formatQuantity(suggestion.suggestedQuantity)} · {suggestion.sourceWarehouseName} → {suggestion.destinationWarehouseName}
          </Text>
          {canManage && suggestion.status === 'New' && (
            <Button label="Từ chối đề xuất" variant="outline" disabled={isBusy} onPress={() => onReject(suggestion.id, 'Rebalancing')} />
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingHorizontal: 20, paddingBottom: 24 },
  card: { gap: 6, padding: 12, borderWidth: 1, borderRadius: Radius.lg },
  title: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 22 },
  meta: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17 },
  section: { marginTop: 8, fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  rowName: { flex: 1, fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 },
  rowValue: { fontFamily: FontFamily.mono, fontSize: 14 },
});
