import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { SearchX } from 'lucide-react-native';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner-native';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { P } from '@/config/permission-codes';
import { useCan } from '@/features/auth/hooks/use-can';
import { useMe } from '@/features/auth/hooks/use-me';
import { getTaskDestination } from '@/features/my-tasks/my-tasks.navigation';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { getApiErrorMessage } from '@/lib/api-error';

import { TaskDetailView } from '../components/task-detail-view';
import { TaskReasonDialog } from '../components/task-reason-dialog';
import {
  flattenTasks,
  useManageMyWarehouseTaskMutation,
  useMyWarehouseTasksQuery,
} from '../hooks/use-my-warehouse-tasks';
import {
  ACTION_SUCCESS_MESSAGE,
  ACTIONS_REQUIRING_REASON,
  getAvailableActions,
} from '../warehouse-task.labels';
import { taskActionReasonSchema, type TaskActionReasonFormValues } from '../warehouse-task.schema';
import type { WarehouseTaskAction } from '../warehouse-task.types';

interface TaskDetailScreenProps {
  readonly taskType: string;
  readonly taskId: string;
}

const REASON_DIALOG_COPY: Record<'Pause' | 'Return', { title: string; description: string }> = {
  Pause: {
    title: 'Tạm dừng công việc',
    description: 'Công việc vẫn thuộc về bạn và có thể tiếp tục sau.',
  },
  Return: {
    title: 'Trả lại công việc',
    description: 'Công việc sẽ trở về trạng thái chưa giao để quản lý kho giao cho người khác.',
  },
};

export function TaskDetailScreen({ taskType, taskId }: TaskDetailScreenProps) {
  const router = useRouter();
  // Same cache entry as the unfiltered tab list, so opening a task needs no extra request.
  const tasksQuery = useMyWarehouseTasksQuery({});
  const me = useMe();
  const canManage = useCan(P.WAREHOUSE_TASKS_MANAGE_OWN);
  const manageMutation = useManageMyWarehouseTaskMutation();
  const [pendingAction, setPendingAction] = useState<'Pause' | 'Return' | null>(null);

  const reasonForm = useForm<TaskActionReasonFormValues>({
    resolver: zodResolver(taskActionReasonSchema),
    defaultValues: { reason: '' },
  });

  const task = flattenTasks(tasksQuery.data).find(
    (item) => item.id === taskId && item.taskType === taskType,
  );
  const access = useWarehouseAccess();
  const [openingDocument, setOpeningDocument] = useState(false);
  const destination = task ? getTaskDestination(task, me.data, task.warehouseId) : null;
  async function openDocument() {
    if (!task || !destination || openingDocument || manageMutation.isPending) return;
    setOpeningDocument(true);
    try {
      if (await access.choose(task.warehouseId)) router.push(destination);
      else toast.error('Chưa thể xác minh kho của công việc. Vui lòng tải lại quyền truy cập.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Chưa thể mở chứng từ. Vui lòng thử lại.'));
    } finally { setOpeningDocument(false); }
  }

  async function runAction(action: WarehouseTaskAction, reason?: string) {
    // A double tap must not send the same action twice.
    if (manageMutation.isPending) return;
    try {
      await manageMutation.mutateAsync({ taskType, taskId, action, reason });
      toast.success(ACTION_SUCCESS_MESSAGE[action]);
      setPendingAction(null);
      // A returned task is no longer the user's, so there is nothing left to show here.
      if (action === 'Return') router.back();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật công việc. Vui lòng thử lại.'));
    }
  }

  function handleAction(action: WarehouseTaskAction) {
    if (ACTIONS_REQUIRING_REASON.includes(action)) {
      reasonForm.reset({ reason: '' });
      setPendingAction(action === 'Pause' ? 'Pause' : 'Return');
      return;
    }
    void runAction(action);
  }

  if (tasksQuery.isPending) return <LoadingState fullScreen />;
  if (tasksQuery.isError) {
    return <ErrorState fullScreen error={tasksQuery.error} onRetry={() => void tasksQuery.refetch()} />;
  }
  if (!task) {
    return (
      <EmptyState
        fullScreen
        icon={SearchX}
        title="Không tìm thấy công việc"
        description="Công việc có thể đã hoàn tất hoặc được giao cho người khác."
        actionLabel="Quay lại"
        onAction={() => router.back()}
      />
    );
  }

  return (
    <>
      <TaskDetailView
        task={task}
        availableActions={getAvailableActions(task, { canManage, currentUserId: me.data?.id })}
        isPending={manageMutation.isPending}
        onAction={handleAction}
        onOpenDocument={destination && access.validated ? () => { void openDocument(); } : undefined}
        openingDocument={openingDocument}
      />
      <TaskReasonDialog
        visible={pendingAction !== null}
        title={pendingAction ? REASON_DIALOG_COPY[pendingAction].title : ''}
        description={pendingAction ? REASON_DIALOG_COPY[pendingAction].description : ''}
        form={reasonForm}
        isPending={manageMutation.isPending}
        onSubmit={(values) => {
          if (pendingAction) void runAction(pendingAction, values.reason);
        }}
        onCancel={() => setPendingAction(null)}
      />
    </>
  );
}
