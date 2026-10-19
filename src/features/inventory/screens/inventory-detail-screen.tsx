import { useRouter } from 'expo-router';
import { SearchX } from 'lucide-react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';

import { InventoryDetailView } from '../components/inventory-detail-view';
import {
  flattenMovements,
  useInventoryStockQuery,
  useStockMovementsQuery,
} from '../hooks/use-inventory';

interface InventoryDetailScreenProps {
  readonly stockId: string;
  readonly productId: string;
  readonly slotId: string;
}

export function InventoryDetailScreen({ stockId, productId, slotId }: InventoryDetailScreenProps) {
  const router = useRouter();
  const stockQuery = useInventoryStockQuery({ stockId, productId, slotId });
  const movementsQuery = useStockMovementsQuery({ productId, slotId });

  function refresh() {
    void stockQuery.refetch();
    void movementsQuery.refetch();
  }

  if (stockQuery.isPending) return <LoadingState fullScreen />;
  if (stockQuery.isError) {
    return <ErrorState fullScreen error={stockQuery.error} onRetry={() => void stockQuery.refetch()} />;
  }
  if (!stockQuery.data) {
    return (
      <EmptyState
        fullScreen
        icon={SearchX}
        title="Không tìm thấy dòng tồn kho"
        description="Dòng tồn này có thể đã hết hoặc được chuyển vị trí."
        actionLabel="Quay lại"
        onAction={() => router.back()}
      />
    );
  }

  return (
    <InventoryDetailView
      stock={stockQuery.data}
      movements={flattenMovements(movementsQuery.data)}
      isMovementsLoading={movementsQuery.isPending}
      movementsError={movementsQuery.error}
      isFetchingNextPage={movementsQuery.isFetchingNextPage}
      isRefreshing={stockQuery.isRefetching && !movementsQuery.isFetchingNextPage}
      onRefresh={refresh}
      onEndReached={() => {
        if (movementsQuery.hasNextPage && !movementsQuery.isFetchingNextPage) {
          void movementsQuery.fetchNextPage();
        }
      }}
      onRetryMovements={() => void movementsQuery.refetch()}
    />
  );
}
