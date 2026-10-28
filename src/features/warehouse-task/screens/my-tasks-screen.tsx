import { useRouter } from 'expo-router';
import { Bell, History } from 'lucide-react-native';
import { useState } from 'react';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';

import { TaskListView, type TaskListHeaderAction } from '../components/task-list-view';
import { TaskWorkspaceControl, TaskWorkspaceGate } from '../components/task-workspace';
import {
  flattenTasks,
  useMyWarehouseTasksQuery,
} from '../hooks/use-my-warehouse-tasks';
import { OPEN_STATUS_FILTERS } from '../warehouse-task.labels';
import type { MyWarehouseTask, WarehouseTaskExecutionStatus, WarehouseTaskType } from '../warehouse-task.types';

export function MyTasksScreen() {
  const router = useRouter();
  const notifications = useNotifications(1);
  const [statusFilter, setStatusFilter] = useState<WarehouseTaskExecutionStatus | null>(null);
  const [typeFilter, setTypeFilter] = useState<WarehouseTaskType | null>(null);
  const [recentlyAssignedFirst, setRecentlyAssignedFirst] = useState(false);

  const query = useMyWarehouseTasksQuery({
    executionStatus: statusFilter ?? undefined,
    taskType: typeFilter ?? undefined,
    recentlyAssignedFirst,
  });

  const actions: readonly TaskListHeaderAction[] = [
    { label: 'Lịch sử công việc', icon: History, onPress: () => router.push('/tasks/history') },
    ...(notifications.allowed ? [{ label: 'Thông báo', icon: Bell, onPress: () => router.push('/notifications') }] : []),
  ];

  function openTask(task: MyWarehouseTask) {
    router.push({
      pathname: '/tasks/[taskType]/[taskId]',
      params: { taskType: task.taskType, taskId: task.id, warehouseId: task.warehouseId },
    });
  }

  if (!query.workspace.canView) return <TaskWorkspaceGate workspace={query.workspace} />;

  return (
    <TaskListView
      title="Công việc"
      description="Các nhiệm vụ kho đang chờ bạn thực hiện."
      actions={actions}
      workspaceControl={<TaskWorkspaceControl workspace={query.workspace} />}
      stats={query.data?.pages[0]?.stats}
      statusOptions={OPEN_STATUS_FILTERS}
      statusFilter={statusFilter}
      onStatusChange={setStatusFilter}
      typeFilter={typeFilter}
      onTypeChange={setTypeFilter}
      recentlyAssignedFirst={recentlyAssignedFirst}
      onRecentlyAssignedFirstChange={setRecentlyAssignedFirst}
      tasks={flattenTasks(query.data)}
      isLoading={query.isPending}
      error={query.error}
      isRefreshing={query.isRefetching && !query.isFetchingNextPage}
      isFetchingNextPage={query.isFetchingNextPage}
      emptyDescription="Các nhiệm vụ được giao cho bạn sẽ xuất hiện tại đây."
      onRefresh={() => void query.refetch()}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      onRetry={() => void query.refetch()}
      onOpenTask={openTask}
    />
  );
}
