import { FlashList } from '@shopify/flash-list';
import { Layers } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { WarehouseWorkspaceControl, WarehouseWorkspaceGate } from '@/components/warehouse-workspace';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { AbcItemCard } from '../components/abc-item-card';
import { AbcRunForm } from '../components/abc-run-form';
import { useAbcClassificationQuery, useRunAbcMutation } from '../hooks/use-abc-classification';

export function AbcClassificationScreen() {
  const theme = useTheme();
  const query = useAbcClassificationQuery();
  const runMutation = useRunAbcMutation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { workspace, canRun } = query;
  if (!workspace.canView) return <WarehouseWorkspaceGate access={workspace.access} message="Bạn chưa có quyền xem phân loại ABC tại kho này." />;
  const items = query.data ?? [];

  function renderBody() {
    if (query.isPending) return <LoadingState message="Đang tải phân loại ABC…" />;
    if (query.error && items.length === 0) return <ErrorState error={query.error} onRetry={() => { void query.refetch(); }} />;
    if (items.length === 0) return <EmptyState icon={Layers} title="Chưa có phân loại ABC" description="Chạy phân loại để xếp hạng sản phẩm theo mức độ quan trọng." />;
    return (
      <FlashList data={items} keyExtractor={(item) => item.productId}
        renderItem={({ item }) => <AbcItemCard item={item} />}
        ItemSeparatorComponent={Separator} contentContainerStyle={styles.listContent}
        refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); }} />
    );
  }

  return (
    <SafeAreaView edges={[]} style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.control}>
        <WarehouseWorkspaceControl access={workspace.access} />
        {canRun && (isFormOpen
          ? <AbcRunForm isSubmitting={runMutation.isPending}
              onSubmit={(values) => runMutation.mutate({ ...values, warehouseId: workspace.warehouseId }, { onSuccess: () => setIsFormOpen(false) })} />
          : <Button label="Chạy phân loại mới" variant="outline" onPress={() => setIsFormOpen(true)} />)}
        {!!runMutation.error && <AlertBanner variant="destructive" title={getApiErrorMessage(runMutation.error)} />}
      </View>
      <View style={styles.body}>{renderBody()}</View>
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
