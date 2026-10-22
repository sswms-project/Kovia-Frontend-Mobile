import { History, ListTodo } from 'lucide-react-native';
import { useState } from 'react';

import { WarehouseWorkspaceControl, WarehouseWorkspaceGate } from '@/components/warehouse-workspace';

import { TaskListView } from '../components/task-list-view';
import { useManagedTasks } from '../hooks/use-managed-tasks';
import { flattenTasks } from '../hooks/use-my-warehouse-tasks';
import { HISTORY_STATUS_FILTERS, OPEN_STATUS_FILTERS } from '../warehouse-task.labels';
import type { WarehouseTaskExecutionStatus, WarehouseTaskType } from '../warehouse-task.types';

export function ManagedTasksScreen() {
  const [history, setHistory] = useState(false);
  const [taskType, setTaskType] = useState<WarehouseTaskType | null>(null);
  const [status, setStatus] = useState<WarehouseTaskExecutionStatus | null>(null);
  const state = useManagedTasks(history, taskType, status);
  const { list } = state;
  if (!state.allowed) return <WarehouseWorkspaceGate access={state.access} message="Bạn chưa được cấp quyền giám sát công việc toàn kho." />;
  return <TaskListView title={history ? 'Lịch sử toàn kho' : 'Công việc toàn kho'}
    description="Theo dõi tiến độ và nhân viên phụ trách trong kho đang chọn."
    actions={[{ label: history ? 'Xem việc hiện tại' : 'Xem lịch sử', icon: history ? ListTodo : History,
      onPress: () => { setHistory(!history); setStatus(null); } }]}
    workspaceControl={<WarehouseWorkspaceControl access={state.access} />}
    stats={list.data?.pages[0]?.stats} showAssignee
    statusOptions={history ? HISTORY_STATUS_FILTERS : OPEN_STATUS_FILTERS} statusFilter={status} onStatusChange={setStatus}
    typeFilter={taskType} onTypeChange={setTaskType} tasks={flattenTasks(list.data)}
    isLoading={list.isPending} error={list.error} isRefreshing={list.isRefetching && !list.isFetchingNextPage}
    isFetchingNextPage={list.isFetchingNextPage} emptyDescription="Chưa có công việc phù hợp với kho và bộ lọc hiện tại."
    onRefresh={() => { void list.refetch(); }} onRetry={() => { void list.refetch(); }}
    onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }} />;
}
