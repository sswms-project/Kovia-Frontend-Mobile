import { Smartphone } from 'lucide-react-native';

import AppTabs from '@/components/app-tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getRoleLabel } from '@/config/roles';
import { getAllowedTabs, isMobileSupportedRole } from '@/features/auth/auth.permissions';
import { useAuth } from '@/features/auth/auth.store';
import { useMe } from '@/features/auth/hooks/use-me';
import { useNotificationRealtime } from '@/features/notifications/hooks/use-notification-realtime';

export default function AppLayout() {
  const me = useMe();
  const signOut = useAuth((state) => state.signOut);
  useNotificationRealtime();

  if (me.isPending) return <LoadingState fullScreen message="Đang tải tài khoản…" />;

  if (me.isError) {
    return (
      <ErrorState
        fullScreen
        error={me.error}
        onRetry={() => void me.refetch()}
        secondaryLabel="Đăng xuất"
        onSecondary={() => void signOut()}
      />
    );
  }

  if (!isMobileSupportedRole(me.data.role)) {
    const roleLabel = me.data.role ? getRoleLabel(me.data.role) : 'tài khoản này';
    return (
      <EmptyState
        fullScreen
        icon={Smartphone}
        title="Chưa hỗ trợ trên ứng dụng di động"
        description={`Vai trò ${roleLabel} hiện chỉ sử dụng được trên bản web. Ứng dụng di động dành cho nhân viên kho.`}
        actionLabel="Đăng xuất"
        onAction={() => void signOut()}
      />
    );
  }

  return <AppTabs allowedTabNames={getAllowedTabs(me.data).map((tab) => tab.name)} />;
}
