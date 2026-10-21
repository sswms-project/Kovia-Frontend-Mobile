import { useLocalSearchParams } from 'expo-router';

import { TaskDetailScreen } from '@/features/warehouse-task/screens/task-detail-screen';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';

export default function TaskDetailRoute() {
  const { selection } = useWarehouseAccess();
  const { taskType, taskId, history, warehouseId } = useLocalSearchParams<{ taskType: string; taskId: string; history?: string; warehouseId?: string }>();

  return <TaskDetailScreen key={`${selection.identity}:${selection.warehouseId}:${selection.revision}:${taskType}:${taskId}:${history ?? ''}`}
    taskType={taskType} taskId={taskId} history={history === '1'} warehouseId={warehouseId} />;
}
