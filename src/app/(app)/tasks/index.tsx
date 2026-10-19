import { P } from '@/config/permission-codes';
import { ClipboardList } from 'lucide-react-native';

import { useCan } from '@/features/auth/hooks/use-can';
import { TabPlaceholder } from '@/features/navigation/components/tab-placeholder';
import { MyTasksScreen } from '@/features/warehouse-task/screens/my-tasks-screen';

export default function TasksRoute() {
  const allowed = useCan(P.WAREHOUSE_TASKS_VIEW_OWN);

  // Without view permission the list would only produce 403s, so explain it up front.
  if (!allowed) {
    return (
      <TabPlaceholder
        allowed={false}
        icon={ClipboardList}
        title="Công việc của tôi"
        description="Danh sách công việc được giao cho bạn sẽ hiển thị tại đây."
      />
    );
  }

  return <MyTasksScreen />;
}
