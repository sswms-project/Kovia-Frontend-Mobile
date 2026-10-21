import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { SearchX } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { P } from '@/config/permission-codes';
import { taskScopeMatches } from '@/features/my-tasks/my-tasks';
import { getTaskDestination } from '@/features/my-tasks/my-tasks.navigation';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { getApiErrorMessage, isApiErrorResponse } from '@/lib/api-error';

import { TaskDetailView } from '../components/task-detail-view';
import { TaskReasonDialog } from '../components/task-reason-dialog';
import { TaskWorkspaceGate } from '../components/task-workspace';
import { useManageMyWarehouseTaskMutation } from '../hooks/use-my-warehouse-tasks';
import { useTaskDetail } from '../hooks/use-task-detail';
import { ACTION_SUCCESS_MESSAGE, ACTIONS_REQUIRING_REASON, getAvailableActions } from '../warehouse-task.labels';
import { getTaskReference } from '../warehouse-task.navigation';
import { taskActionReasonSchema, type TaskActionReasonFormValues } from '../warehouse-task.schema';
import type { WarehouseTaskAction } from '../warehouse-task.types';

interface TaskDetailScreenProps {
  readonly taskType: string;
  readonly taskId: string;
  readonly history?: boolean;
  readonly warehouseId?: string;
}
const REASON_DIALOG_COPY = {
  Pause: { title: 'Tạm dừng công việc', description: 'Công việc vẫn thuộc về bạn và có thể tiếp tục sau.' },
  Return: { title: 'Trả lại công việc', description: 'Công việc sẽ được trả về để quản lý phân công lại.' },
};

export function TaskDetailScreen({ taskType, taskId, history = false, warehouseId }: TaskDetailScreenProps) {
  const router = useRouter();
  const query = useTaskDetail(taskType, taskId, history, warehouseId);
  const { workspace } = query;
  const { access, scope } = workspace;
  const profile = access.profile.data;
  const manageMutation = useManageMyWarehouseTaskMutation();
  const commandLock = useRef(false);
  const [pendingAction, setPendingAction] = useState<'Pause' | 'Return' | null>(null);
  const reasonForm = useForm<TaskActionReasonFormValues>({ resolver: zodResolver(taskActionReasonSchema), defaultValues: { reason: '' } });
  const task = query.data?.task;
  const readOnly = !!query.data?.history || task?.executionStatus === 'Completed' || task?.executionStatus === 'Cancelled';
  const fresh = query.isSuccess && !query.isFetching;
  const canManage = fresh && !readOnly && !!profile?.permissions.includes(P.WAREHOUSE_TASKS_MANAGE_OWN);
  const destination = task && profile ? readOnly ? getTaskReference(task, profile)
    : getTaskDestination(task, profile, scope?.warehouseId) : null;

  function back() { if (router.canGoBack()) router.back(); else router.replace('/tasks'); }
  function openDocument() {
    if (!scope || !destination || !fresh || !taskScopeMatches(scope, useWarehouseSelection.getState())) return;
    router.push(destination);
  }
  async function runAction(action: WarehouseTaskAction, reason?: string) {
    if (!task || !canManage || !scope || commandLock.current) return;
    const startingScope = scope;
    commandLock.current = true;
    try {
      const operationScope = await manageMutation.mutateAsync({ task, action, reason });
      if (!taskScopeMatches(operationScope, useWarehouseSelection.getState())) return;
      toast.success(ACTION_SUCCESS_MESSAGE[action]);
      setPendingAction(null);
      if (action === 'Return') back();
    } catch (error) {
      if (taskScopeMatches(startingScope, useWarehouseSelection.getState()))
        toast.error(getApiErrorMessage(error, 'Không thể cập nhật công việc. Vui lòng thử lại.'));
    }
    finally { commandLock.current = false; }
  }
  function handleAction(action: WarehouseTaskAction) {
    if (!canManage) return;
    if (ACTIONS_REQUIRING_REASON.includes(action)) {
      reasonForm.reset({ reason: '' }); setPendingAction(action === 'Pause' ? 'Pause' : 'Return');
    } else void runAction(action);
  }

  if (!workspace.canView) return <TaskWorkspaceGate workspace={workspace} />;
  if (!query.validRoute) return <EmptyState fullScreen icon={SearchX} title="Mã công việc không hợp lệ" actionLabel="Quay lại" onAction={back} />;
  if (query.isPending) return <LoadingState fullScreen message="Đang tìm công việc trong kho đang chọn…" />;
  if (query.isError && (!task || (isApiErrorResponse(query.error) && [401, 403, 404].includes(query.error.statusCode))))
    return <ErrorState fullScreen error={query.error} onRetry={() => void query.refetch()} />;
  if (!task) return <EmptyState fullScreen icon={SearchX} title="Không tìm thấy công việc trong phạm vi hiện tại"
    description="Công việc có thể đã đổi phân công. Kiểm tra kho đang chọn và tải lại danh sách."
    actionLabel="Quay lại" onAction={back} />;

  return <View style={styles.root}>
    {readOnly && <AlertBanner title="Lịch sử công việc · chỉ xem" description="Kết quả và mốc xử lý được giữ để tra cứu." />}
    {query.isError && <AlertBanner title="Đang hiển thị dữ liệu cũ. Tải lại trước khi thao tác." description={getApiErrorMessage(query.error)} />}
    <TaskDetailView task={task} availableActions={getAvailableActions(task, { canManage, currentUserId: profile?.id })}
      isPending={manageMutation.isPending || query.isFetching} onAction={handleAction}
      onOpenDocument={destination && fresh ? openDocument : undefined} documentLabel={readOnly ? 'Xem chứng từ tham chiếu' : 'Mở chứng từ và thực hiện'} />
    <Button label="Tải lại công việc" variant="outline" loading={query.isFetching} disabled={manageMutation.isPending} onPress={() => { void query.refetch(); }} />
    <TaskReasonDialog visible={pendingAction !== null && canManage} title={pendingAction ? REASON_DIALOG_COPY[pendingAction].title : ''}
      description={pendingAction ? REASON_DIALOG_COPY[pendingAction].description : ''} form={reasonForm} isPending={manageMutation.isPending}
      onSubmit={(values) => { if (pendingAction) void runAction(pendingAction, values.reason); }} onCancel={() => setPendingAction(null)} />
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1 } });
