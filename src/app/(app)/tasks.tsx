import { ClipboardList } from 'lucide-react-native';

import { P } from '@/config/permission-codes';
import { useCan } from '@/features/auth/hooks/use-can';
import { TabPlaceholder } from '@/features/navigation/components/tab-placeholder';

export default function TasksRoute() {
  const allowed = useCan(P.WAREHOUSE_TASKS_VIEW_OWN);

  return (
    <TabPlaceholder
      allowed={allowed}
      icon={ClipboardList}
      title="Công việc của tôi"
      description="Danh sách công việc được giao cho bạn sẽ hiển thị tại đây."
    />
  );
}
