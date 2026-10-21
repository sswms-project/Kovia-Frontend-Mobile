import { useLocalSearchParams } from 'expo-router';

import { TaskDetailScreen } from '@/features/warehouse-task/screens/task-detail-screen';

export default function TaskDetailRoute() {
  const { taskType, taskId } = useLocalSearchParams<{ taskType: string; taskId: string }>();

  return <TaskDetailScreen taskType={taskType} taskId={taskId} />;
}
