import { Bell } from 'lucide-react-native';

import { P } from '@/config/permission-codes';
import { useCan } from '@/features/auth/hooks/use-can';
import { TabPlaceholder } from '@/features/navigation/components/tab-placeholder';

export default function NotificationsRoute() {
  const allowed = useCan(P.NOTIFICATIONS_VIEW);

  return (
    <TabPlaceholder
      allowed={allowed}
      icon={Bell}
      title="Thông báo"
      description="Thông báo từ hệ thống kho sẽ hiển thị tại đây."
    />
  );
}
