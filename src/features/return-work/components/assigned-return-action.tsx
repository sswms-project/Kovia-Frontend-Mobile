import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { hasReturnPermissions } from '../return-work';
import { returnWorkApi } from '../return-work.api';

/** Catalog detail remains read-only; staff execution always opens the assigned, versioned task. */
export function AssignedReturnAction({ documentId }: { readonly documentId: string }) {
  const access = useWarehouseAccess(); const router = useRouter();
  const { identity, warehouseId, revision } = access.selection;
  const canRead = access.ready && hasReturnPermissions(false, access.profile.data);
  const query = useQuery({ queryKey: ['warehouse', identity, warehouseId, revision, 'customer-return-assignment', documentId],
    enabled: canRead, retry: false, queryFn: ({ signal }) => returnWorkApi.documentTask(false, documentId, signal) });
  if (!canRead) return null;
  const task = query.data;
  if (task?.taskId && task.assignedTo === access.profile.data?.id && task.warehouseId === warehouseId && task.sourceDocumentId === documentId)
    return <Button label="Mở công việc nhận hàng khách trả" disabled={query.isFetching || query.isError}
      onPress={() => router.push({ pathname: '/(account)/customer-return/[id]', params: { id: task.taskId! } })} />;
  return <AlertBanner title={query.isPending ? 'Đang kiểm tra phân công…' : 'Thực hiện từ công việc được giao'}
    description="Mở tab Công việc trong đúng kho để nhận và cất hàng khách trả. Nếu chưa có nhiệm vụ, nhờ quản lý phân công." />;
}
