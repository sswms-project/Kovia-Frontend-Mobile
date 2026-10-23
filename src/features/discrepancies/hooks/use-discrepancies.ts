import { useInfiniteQuery } from '@tanstack/react-query';
import { useInventoryWorkspace } from '@/features/inventory/hooks/use-inventory-workspace';
import { warehouseQueryKey } from '@/features/warehouse-access/warehouse-access';
import { ApiError } from '@/lib/api';
import { discrepanciesApi } from '../discrepancies.api';
import type { DiscrepancyStatus } from '../discrepancies.schema';

export function useDiscrepancies(status?: DiscrepancyStatus) {
  const workspace = useInventoryWorkspace();
  const query = useInfiniteQuery({
    queryKey: workspace.canView ? warehouseQueryKey('discrepancies', status) : ['discrepancies', 'disabled', workspace.access.selection.identity, workspace.access.selection.revision],
    enabled: workspace.canView, initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => {
      if (!workspace.canView) throw new ApiError('Bạn chưa có quyền xem báo cáo tại kho này.', 403);
      return discrepanciesApi.list(workspace.warehouseId, pageParam, status, signal);
    },
    getNextPageParam: (page) => page.pageNumber * page.pageSize < page.totalCount ? page.pageNumber + 1 : undefined,
    retry: false, staleTime: 15_000,
  });
  return { ...query, workspace };
}
