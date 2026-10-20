import { router } from 'expo-router';
import { Bell, Warehouse } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getRoleLabel } from '@/config/roles';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { P } from '@/config/permission-codes';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { FontFamily, MaxContentWidth, Radius } from '@/constants/theme';
import { useMe } from '@/features/auth/hooks/use-me';
import { GreetingCard } from '@/features/home/components/greeting-card';
import { MetricGrid } from '@/features/home/components/metric-grid';
import { buildKpis } from '@/features/home/home.kpis';
import { useOverview } from '@/features/home/hooks/use-overview';
import { TaskCard } from '@/features/my-tasks/components/task-list/task-card';
import { useMyTasks } from '@/features/my-tasks/hooks/use-my-tasks';
import { NotificationRow } from '@/features/notifications/components/notification-row';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import { WarehousePicker } from '@/features/warehouse-access/components/warehouse-picker';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { useTheme } from '@/hooks/use-theme';

const TASK_PREVIEW = 3;
const ACTIVITY_PREVIEW = 5;

function SectionHeader({ title, count, actionLabel, onAction }: {
  readonly title: string;
  readonly count?: number;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        {count !== undefined ? (
          <View style={[styles.countChip, { backgroundColor: theme.primaryContainer }]}>
            <Text style={[styles.countText, { color: theme.onPrimaryContainer }]}>{count}</Text>
          </View>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction}>
          <Text style={[styles.sectionAction, { color: theme.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const access = useWarehouseAccess();
  const overview = useOverview();
  const notifications = useNotifications(ACTIVITY_PREVIEW);
  const tasks = useMyTasks();
  const [picking, setPicking] = useState(false);

  if (!access.warehouse || picking) {
    return (
      <WarehousePicker
        profile={access.profile.data}
        warehouses={access.snapshot?.warehouses ?? []}
        selected={access.warehouse}
        validated={access.validated}
        loading={access.profile.isFetching || (access.selection.transitioning && access.profile.isSuccess)}
        error={access.profile.error}
        notice={access.selection.notice}
        compatible={access.snapshot?.compatible ?? true}
        onSelect={async (id) => {
          const ok = await access.choose(id);
          if (ok) setPicking(false);
          return ok;
        }}
        onRefresh={access.refresh}
        onProfile={() => router.push('/profile')}
      />
    );
  }

  const profile = me.data;
  if (!profile) return me.isError ? <ErrorState error={me.error} onRetry={() => void me.refetch()} fullScreen /> : <LoadingState fullScreen />;

  const refreshing = overview.isRefetching || notifications.isRefetching || tasks.list.isRefetching;
  const refresh = () => {
    void overview.refetch();
    void notifications.refetch();
    void tasks.list.refetch();
  };
  const roleLabel = profile.role ? getRoleLabel(profile.role) : '';
  const subtitle = [roleLabel, access.warehouse.warehouseName].filter(Boolean).join(' • ');
  const taskItems = tasks.list.data?.items ?? [];

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: theme.primary }]}>
            <Warehouse size={18} color={theme.onPrimary} />
          </View>
          <Text style={[styles.brandText, { color: theme.text }]}>KOVIA WMS</Text>
        </View>
        {notifications.allowed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thông báo"
            onPress={() => router.push('/notifications')}
            style={[styles.bell, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Bell size={20} color={theme.text} />
            {notifications.unreadCount > 0 ? <View style={[styles.bellDot, { backgroundColor: theme.error }]} /> : null}
          </Pressable>
        ) : null}
      </View>

      <GreetingCard
        name={profile.fullName}
        subtitle={subtitle}
        onSearch={(query) => router.push({ pathname: '/inventory', params: { q: query } })}
        onScan={() => router.push('/scan')}
        onChangeWarehouse={() => setPicking(true)}
      />

      {overview.allowed ? (
        <View style={styles.section}>
          <SectionHeader title="Chỉ số kho" />
          {overview.data ? (
            <MetricGrid kpis={buildKpis(overview.data)} />
          ) : overview.isError ? (
            <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
          ) : (
            <LoadingState message="Đang tải chỉ số kho..." />
          )}
        </View>
      ) : null}

      {access.ready && profile.permissions.includes(P.STOCK_ISSUE_REQUESTS_VIEW) && profile.permissions.includes(P.STOCK_ISSUE_REQUESTS_ASSIGN_PICKER) &&
        <Button label="Phân bổ thông minh · FEFO và đi thẳng" variant="outline" onPress={() => router.push('/smart-allocation')} />}
      {access.ready && profile.permissions.includes(P.GOODS_RECEIPTS_VIEW) && profile.permissions.includes(P.GOODS_RECEIPTS_APPROVE) &&
        <Button label="Duyệt hàng đạt tại khu nhận" variant="outline" onPress={() => router.push('/receiving-review')} />}

      {tasks.canView ? (
        <View style={styles.section}>
          <SectionHeader
            title="Nhiệm vụ của tôi"
            count={taskItems.length}
            actionLabel="Xem tất cả"
            onAction={() => router.navigate('/tasks')}
          />
          {tasks.list.isError ? (
            <ErrorState error={tasks.list.error} onRetry={() => void tasks.list.refetch()} />
          ) : tasks.list.isLoading ? (
            <LoadingState message="Đang tải nhiệm vụ..." />
          ) : taskItems.length === 0 ? (
            <EmptyState icon={Warehouse} title="Chưa có nhiệm vụ" description="Bạn chưa được giao công việc nào." />
          ) : (
            <View style={styles.list}>
              {taskItems.slice(0, TASK_PREVIEW).map((task) => (
                <TaskCard
                  key={`${task.taskType}:${task.id}`}
                  task={task}
                  history={false}
                  canManage={false}
                  busy={false}
                  onAction={() => router.navigate('/tasks')}
                />
              ))}
            </View>
          )}
        </View>
      ) : null}

      {notifications.allowed ? (
        <View style={styles.section}>
          <SectionHeader title="Hoạt động gần đây" actionLabel="Xem tất cả" onAction={() => router.push('/notifications')} />
          {notifications.isError ? (
            <ErrorState error={notifications.error} onRetry={() => void notifications.refetch()} />
          ) : notifications.isLoading ? (
            <LoadingState message="Đang tải hoạt động..." />
          ) : notifications.items.length === 0 ? (
            <EmptyState icon={Bell} title="Chưa có hoạt động" description="Thông báo mới sẽ hiển thị tại đây." />
          ) : (
            <View style={styles.list}>
              {notifications.items.slice(0, ACTIVITY_PREVIEW).map((item) => (
                <NotificationRow
                  key={item.id}
                  notification={item}
                  onPress={(n) => {
                    if (!n.isRead) notifications.markRead.mutate(n.id);
                  }}
                />
              ))}
            </View>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 20, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 36, height: 36, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 18, fontFamily: FontFamily.bold, letterSpacing: 0.5 },
  bell: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontFamily: FontFamily.bold },
  sectionAction: { fontSize: 13, fontFamily: FontFamily.semibold },
  countChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  countText: { fontSize: 12, fontFamily: FontFamily.semibold },
  list: { gap: 10 },
});
