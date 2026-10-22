import { useRouter } from 'expo-router';
import { SearchX } from 'lucide-react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { WarehouseWorkspaceGate } from '@/components/warehouse-workspace';
import { ReportDamageAction } from '@/features/damage-cases/components/report-damage-modal';
import { isApiErrorResponse } from '@/lib/api-error';

import { InventoryDetailView } from '../components/inventory-detail-view';
import { flattenMovements, useInventoryStockQuery, useStockMovementsQuery } from '../hooks/use-inventory';

interface InventoryDetailScreenProps {
  readonly stockId: string;
  readonly productId: string;
  readonly slotId: string;
  readonly warehouseId?: string;
}

export function InventoryDetailScreen(identity: InventoryDetailScreenProps) {
  const router = useRouter();
  const stockQuery = useInventoryStockQuery(identity);
  const movementsQuery = useStockMovementsQuery({ productId: identity.productId, slotId: identity.slotId },
    stockQuery.isSuccess && !!stockQuery.data);
  const workspace = stockQuery.workspace;
  function refresh() { void stockQuery.refetch(); void movementsQuery.refetch(); }
  function back() { if (router.canGoBack()) router.back(); else router.replace('/inventory'); }
  if (!workspace.canView) return <WarehouseWorkspaceGate access={workspace.access} message="Bạn chưa có quyền xem tồn kho tại kho này." />;
  if (!stockQuery.validIdentity) return <EmptyState fullScreen icon={SearchX} title="Mã tồn kho không hợp lệ" actionLabel="Quay lại" onAction={back} />;
  if (stockQuery.isPending) return <LoadingState fullScreen />;
  if (stockQuery.isError && (!stockQuery.data || (isApiErrorResponse(stockQuery.error) && [401, 403, 404].includes(stockQuery.error.statusCode))))
    return <ErrorState fullScreen error={stockQuery.error} onRetry={() => { void stockQuery.refetch(); }} />;
  if (!stockQuery.data) return <EmptyState fullScreen icon={SearchX} title="Không tìm thấy dòng tồn kho"
    description="Dòng tồn có thể đã hết hoặc được chuyển vị trí." actionLabel="Quay lại" onAction={back} />;
  const fresh = stockQuery.isSuccess && !stockQuery.isFetching;
  const hideMovements = isApiErrorResponse(movementsQuery.error) && [401, 403, 404].includes(movementsQuery.error.statusCode);
  return <InventoryDetailView stock={stockQuery.data} movements={hideMovements ? [] : flattenMovements(movementsQuery.data)}
    isMovementsLoading={movementsQuery.isPending} movementsError={movementsQuery.error}
    isFetchingNextPage={movementsQuery.isFetchingNextPage} isRefreshing={stockQuery.isFetching || movementsQuery.isRefetching}
    onRefresh={refresh} onRetryMovements={() => { void movementsQuery.refetch(); }}
    onEndReached={() => { if (movementsQuery.hasNextPage && !movementsQuery.isFetching) void movementsQuery.fetchNextPage(); }}
    headerExtra={<>
      {stockQuery.isError && <AlertBanner title="Đang hiển thị dữ liệu cũ. Kéo xuống để tải lại trước khi báo hỏng." />}
      <ReportDamageAction disabled={!fresh} key={`${workspace.access.selection.identity}:${workspace.warehouseId}:${workspace.access.selection.revision}:${identity.stockId}`}
        stock={stockQuery.data} />
    </>} />;
}
