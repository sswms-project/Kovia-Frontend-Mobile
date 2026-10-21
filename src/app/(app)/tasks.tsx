import { MyTasksScreen } from '@/features/my-tasks/screens/my-tasks-screen';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';

export default function TasksRoute() {
  const { selection, ready } = useWarehouseAccess();
  return <MyTasksScreen key={`${selection.identity}:${selection.warehouseId}:${selection.revision}:${ready}`} />;
}
