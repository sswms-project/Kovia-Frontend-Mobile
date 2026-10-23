import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { findPagedRecord, type RecordSearchCursor } from '@/lib/paged-record-search';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { ApiError } from '@/lib/api';
import { useInventoryWorkspace } from '@/features/inventory/hooks/use-inventory-workspace';
import { warehouseQueryKey } from '@/features/warehouse-access/warehouse-access';
import { discrepanciesApi } from '../discrepancies.api';

export function useDiscrepancyDetail(id: string) {
  const workspace = useInventoryWorkspace();
  const valid = nonEmptyDotNetGuidSchema('Mã báo cáo không hợp lệ.').safeParse(id).success;
  const cursor = useRef<{ key: string; value: RecordSearchCursor }>({ key: '', value: { page: 1 } });
  const cursorKey = JSON.stringify([workspace.access.selection.identity, workspace.access.selection.signature, workspace.access.selection.revision, workspace.warehouseId, id]);
  const query = useQuery({
    queryKey: workspace.canView ? warehouseQueryKey('discrepancy-detail', id) : ['discrepancy-detail', 'disabled', workspace.access.selection.identity, id],
    enabled: valid && workspace.canView, retry: false,
    queryFn: async ({ signal }) => {
      if (!workspace.canView) throw new ApiError('Không có quyền xem báo cáo tại kho này.', 403);
      if (cursor.current.key !== cursorKey) cursor.current = { key: cursorKey, value: { page: 1 } };
      const report = await findPagedRecord(pageNumber => discrepanciesApi.list(workspace.warehouseId, pageNumber, undefined, signal),
        item => item.id.toLowerCase() === id.toLowerCase(), cursor.current.value, signal);
      if (!report) throw new ApiError('Không tìm thấy báo cáo trong kho đang chọn.', 404);
      return report;
    },
  });
  return { ...query, workspace, valid };
}
