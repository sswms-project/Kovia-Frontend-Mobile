import { FlashList } from '@shopify/flash-list';
import { TrendingUp } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { WarehouseWorkspaceControl, WarehouseWorkspaceGate } from '@/components/warehouse-workspace';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { ForecastRunCard } from '../components/forecast-run-card';
import { ForecastRunDetail } from '../components/forecast-run-detail';
import { ForecastRunForm } from '../components/forecast-run-form';
import type { ForecastRun, ForecastSuggestionType } from '../forecast.types';
import {
  useEvaluateForecastRunMutation, useForecastRunQuery, useForecastRunsQuery,
  useRejectForecastSuggestionMutation, useStartForecastRunMutation,
} from '../hooks/use-forecast';

interface PendingReject {
  readonly suggestionId: string;
  readonly suggestionType: ForecastSuggestionType;
}

function findExpectedVersions(run: ForecastRun, pending: PendingReject) {
  if (pending.suggestionType !== 'Replenishment') return { expectedVersion: null, expectedInboundRequestVersion: null };
  const suggestion = run.replenishmentSuggestions.find((item) => item.id === pending.suggestionId);
  return { expectedVersion: suggestion?.version ?? null, expectedInboundRequestVersion: suggestion?.inboundRequestVersion ?? null };
}

export function ForecastScreen() {
  const theme = useTheme();
  const runsQuery = useForecastRunsQuery();
  const startMutation = useStartForecastRunMutation();
  const evaluateMutation = useEvaluateForecastRunMutation();
  const rejectMutation = useRejectForecastSuggestionMutation();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingReject, setPendingReject] = useState<PendingReject | null>(null);
  const runQuery = useForecastRunQuery(selectedRunId);
  const { workspace, canManage } = runsQuery;
  if (!workspace.canView) return <WarehouseWorkspaceGate access={workspace.access} message="Bạn chưa có quyền xem dự báo tại kho này." />;
  const runs = runsQuery.data ?? [];
  const mutationError = startMutation.error ?? evaluateMutation.error;

  function confirmReject() {
    if (!pendingReject || !runQuery.data) return;
    rejectMutation.mutate(
      { suggestionId: pendingReject.suggestionId, body: { suggestionType: pendingReject.suggestionType, ...findExpectedVersions(runQuery.data, pendingReject) } },
      { onSuccess: () => setPendingReject(null) },
    );
  }

  function renderDetail() {
    if (runQuery.isPending) return <LoadingState message="Đang tải đợt dự báo…" />;
    if (runQuery.error || !runQuery.data) return <ErrorState error={runQuery.error} onRetry={() => { void runQuery.refetch(); }} />;
    return (
      <ForecastRunDetail run={runQuery.data} canManage={canManage} isBusy={evaluateMutation.isPending || rejectMutation.isPending}
        onEvaluate={() => selectedRunId && evaluateMutation.mutate(selectedRunId)}
        onReject={(suggestionId, suggestionType) => { rejectMutation.reset(); setPendingReject({ suggestionId, suggestionType }); }} />
    );
  }

  function renderList() {
    if (runsQuery.isPending) return <LoadingState message="Đang tải các đợt dự báo…" />;
    if (runsQuery.error && runs.length === 0) return <ErrorState error={runsQuery.error} onRetry={() => { void runsQuery.refetch(); }} />;
    if (runs.length === 0) return <EmptyState icon={TrendingUp} title="Chưa có đợt dự báo" description="Chạy dự báo để ước tính nhu cầu và nhận đề xuất bổ sung hàng." />;
    return (
      <FlashList data={runs} keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ForecastRunCard run={item} onPress={setSelectedRunId} />}
        ItemSeparatorComponent={Separator} contentContainerStyle={styles.listContent}
        refreshing={runsQuery.isRefetching} onRefresh={() => { void runsQuery.refetch(); }} />
    );
  }

  return (
    <SafeAreaView edges={[]} style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.control}>
        {selectedRunId === null ? (
          <>
            <WarehouseWorkspaceControl access={workspace.access} />
            {canManage && (isFormOpen
              ? <ForecastRunForm isSubmitting={startMutation.isPending}
                  onSubmit={(values) => startMutation.mutate({ ...values, warehouseId: workspace.warehouseId }, {
                    onSuccess: (runId) => { setIsFormOpen(false); setSelectedRunId(runId); },
                  })} />
              : <Button label="Chạy dự báo mới" variant="outline" onPress={() => setIsFormOpen(true)} />)}
          </>
        ) : <Button label="Quay lại danh sách" variant="ghost" onPress={() => setSelectedRunId(null)} />}
        {!!mutationError && <AlertBanner variant="destructive" title={getApiErrorMessage(mutationError)} />}
      </View>
      <View style={styles.body}>{selectedRunId === null ? renderList() : renderDetail()}</View>
      <ConfirmationModal visible={pendingReject !== null} title="Từ chối đề xuất?"
        description="Đề xuất sẽ được đánh dấu là đã từ chối."
        busy={rejectMutation.isPending} error={rejectMutation.error as Error | null}
        onConfirm={confirmReject} onCancel={() => setPendingReject(null)} />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12, paddingTop: 8 },
  control: { paddingHorizontal: 20, gap: 12 },
  body: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  separator: { height: 10 },
});
