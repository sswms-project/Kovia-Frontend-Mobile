import { useQuery } from '@tanstack/react-query';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { ApiError } from '@/lib/api';
import { useInventoryWorkspace } from '@/features/inventory/hooks/use-inventory-workspace';
import { warehouseQueryKey } from '@/features/warehouse-access/warehouse-access';
import { discrepanciesApi } from '../discrepancies.api';

export function useDiscrepancyDetail(id: string) {
  const workspace = useInventoryWorkspace();
  const valid = nonEmptyDotNetGuidSchema('Mã báo cáo không hợp lệ.').safeParse(id).success;
  const query = useQuery({
    queryKey: workspace.canView ? warehouseQueryKey('discrepancy-detail', id) : ['discrepancy-detail', 'disabled', workspace.access.selection.identity, id],
    enabled: valid && workspace.canView, retry: false,
    queryFn: async ({ signal }) => {
      if (!workspace.canView) throw new ApiError('Không có quyền xem báo cáo tại kho này.', 403);
      for (let pageNumber = 1; pageNumber <= 20; pageNumber += 1) {
        const page = await discrepanciesApi.list(workspace.warehouseId, pageNumber, undefined, signal);
        const report = page.items.find((item) => item.id.toLowerCase() === id.toLowerCase());
        if (report) return report;
        if (page.pageNumber * page.pageSize >= page.totalCount) throw new ApiError('Không tìm thấy báo cáo trong kho đang chọn.', 404);
        if (!page.items.length) throw new ApiError('Danh sách vừa thay đổi. Vui lòng tải lại.', 409);
      }
      throw new ApiError('Chưa tải đủ để tìm báo cáo. Hãy tra trên web hoặc mở báo cáo gần đây.', 422);
    },
  });
  return { ...query, workspace, valid };
}
