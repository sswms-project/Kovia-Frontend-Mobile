import { useRouter } from 'expo-router';
import { useState } from 'react';

import { TaskListView } from '../components/task-list-view';
import { TaskWorkspaceControl, TaskWorkspaceGate } from '../components/task-workspace';
import {
  flattenTasks,
  useMyWarehouseTaskHistoryQuery,
} from '../hooks/use-my-warehouse-tasks';
import { HISTORY_STATUS_FILTERS } from '../warehouse-task.labels';
import type { WarehouseTaskExecutionStatus, WarehouseTaskType } from '../warehouse-task.types';

export function TaskHistoryScreen() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<WarehouseTaskExecutionStatus | null>(null);
  const [typeFilter, setTypeFilter] = useState<WarehouseTaskType | null>(null);

  const query = useMyWarehouseTaskHistoryQuery({
    executionStatus: statusFilter ?? undefined,
    taskType: typeFilter ?? undefined,
  });

  if (!query.workspace.canView) return <TaskWorkspaceGate workspace={query.workspace} />;

  return (
    <TaskListView
      description="Các công việc đã hoàn tất hoặc đã hủy; không bao gồm nhật ký thao tác hệ thống."
      workspaceControl={<TaskWorkspaceControl workspace={query.workspace} />}
      statusOptions={HISTORY_STATUS_FILTERS}
      statusFilter={statusFilter}
      onStatusChange={setStatusFilter}
      typeFilter={typeFilter}
      onTypeChange={setTypeFilter}
      tasks={flattenTasks(query.data)}
      isLoading={query.isPending}
      error={query.error}
      isRefreshing={query.isRefetching && !query.isFetchingNextPage}
      isFetchingNextPage={query.isFetchingNextPage}
      emptyDescription="Các công việc đã xử lý sẽ xuất hiện tại đây."
      onRefresh={() => void query.refetch()}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      onRetry={() => void query.refetch()}
      onOpenTask={(task) => router.push({ pathname: '/tasks/[taskType]/[taskId]',
        params: { taskType: task.taskType, taskId: task.id, warehouseId: task.warehouseId, history: '1' } })}
    />
  );
}
