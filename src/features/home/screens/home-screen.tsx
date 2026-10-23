import { router } from 'expo-router';
import { Bell, User, ClipboardList, PackageSearch, Warehouse } from 'lucide-react-native';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OwnerActions } from '../components/owner-actions';
import { KoviaLogo } from '@/components/kovia-logo';

import { getRoleLabel } from '@/config/roles';
import { isFieldWorkspace } from '@/config/mobile-workspace';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { SelectionField } from '@/components/ui/selection-field';
import { P } from '@/config/permission-codes';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { FontFamily, MaxContentWidth } from '@/constants/theme';
import { useMe } from '@/features/auth/hooks/use-me';
import { GreetingCard } from '@/features/home/components/greeting-card';
import { MetricGrid } from '@/features/home/components/metric-grid';
import { buildKpis } from '@/features/home/home.kpis';
import { useOverview } from '@/features/home/hooks/use-overview';
import { TaskCard } from '@/features/my-tasks/components/task-list/task-card';
import { useMyTasks } from '@/features/my-tasks/hooks/use-my-tasks';
import { getTaskDestination } from '@/features/my-tasks/my-tasks.navigation';
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

export function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const access = useWarehouseAccess();
  const overview = useOverview();
  const notifications = useNotifications(ACTIVITY_PREVIEW);
  const owner = !isFieldWorkspace(me.data?.role);
  const tasks = useMyTasks(!owner);

  if (!access.warehouse) {
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
        onSelect={access.choose}
        onRefresh={access.refresh}
        onProfile={() => router.push('/profile')}
      />
    );
  }

  const profile = me.data;
  if (!profile) return me.isError ? <ErrorState error={me.error} onRetry={() => void me.refetch()} fullScreen /> : <LoadingState fullScreen />;

  const refreshing = overview.isRefetching || notifications.isRefetching || (!owner && tasks.list.isRefetching);
  const refresh = () => {
    if (overview.allowed) void overview.refetch();
    if (notifications.allowed) void notifications.refetch();
    if (tasks.canView) void tasks.list.refetch();
  };
  const roleLabel = profile.role ? getRoleLabel(profile.role) : '';
  const taskItems = tasks.list.data?.items ?? [];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <KoviaLogo />
        <View style={styles.actions}>
        {notifications.allowed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thông báo"
            onPress={() => router.push('/notifications')}
            style={({ pressed }) => [styles.bell, pressed && styles.pressed]}>
            <Bell size={20} color={theme.text} />
            {(notifications.unreadCount ?? 0) > 0 ? <View style={[styles.bellDot, { backgroundColor: theme.error }]} /> : null}
          </Pressable>
        ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Hồ sơ" onPress={() => router.push('/profile')}
            style={({ pressed }) => [styles.avatar, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
            <User size={20} color={theme.onPrimary} />
          </Pressable>
        </View>
      </View>

      <GreetingCard
        overview={owner}
        name={profile.fullName}
        subtitle={roleLabel}
        onSearch={(query) => router.push({ pathname: '/inventory/lookup', params: { q: query } })}
        onScan={() => router.push('/scan')}
      />


      <SelectionField label={owner ? "Kho đang theo dõi" : "Kho đang làm việc"} value={access.warehouse.id}
        options={(access.snapshot?.warehouses ?? []).map((warehouse) => ({ value: warehouse.id, label: warehouse.warehouseName, description: warehouse.warehouseCode }))}
        disabled={access.selection.transitioning} onChange={(id) => { void access.choose(id); }} />

      {!owner && <View style={styles.shortcuts}>
        {tasks.canView && <Pressable accessibilityRole="button" onPress={() => router.navigate('/tasks')}
          style={({ pressed }) => [styles.shortcut, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
          <ClipboardList size={24} color={theme.onPrimary} />
          <Text style={[styles.shortcutTitle, { color: theme.onPrimary }]}>Công việc</Text>
          <Text style={[styles.shortcutHint, { color: theme.onPrimary }]}>Nhiệm vụ được giao</Text>
        </Pressable>}
        {profile.permissions.includes(P.INVENTORY_VIEW) && <Pressable accessibilityRole="button" onPress={() => router.navigate('/inventory')}
          style={({ pressed }) => [styles.shortcut, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }, pressed && styles.pressed]}>
          <PackageSearch size={24} color={theme.primary} />
          <Text style={[styles.shortcutTitle, { color: theme.text }]}>Tồn kho</Text>
          <Text style={[styles.shortcutHint, { color: theme.textSecondary }]}>Tra mã, xem vị trí</Text>
        </Pressable>}
      </View>}

      {!owner && <Button label="Tra cứu & báo cáo hiện trường" variant="outline" onPress={() => router.navigate('/catalog')} />}

      {overview.allowed ? (
        <View style={styles.section}>
          <SectionHeader title="Chỉ số kho" />
          {overview.isError ? (
            <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
          ) : overview.data ? (
            <MetricGrid kpis={buildKpis(overview.data)} />
          ) : (
            <LoadingState message="Đang tải chỉ số kho..." />
          )}
        </View>
      ) : null}

      {owner && <OwnerActions profile={profile} ready={access.ready} />}


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
                  onOpenDocument={getTaskDestination(task, profile, access.warehouse?.id) ? (item) => {
                    const destination = getTaskDestination(item, profile, access.warehouse?.id);
                    if (destination) router.push(destination);
                  } : undefined}
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
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 24, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  bell: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 8, right: 9, width: 10, height: 10, borderRadius: 5 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontFamily: FontFamily.bold },
  sectionAction: { fontSize: 13, fontFamily: FontFamily.semibold, minHeight: 44, textAlignVertical: 'center', paddingVertical: 12 },
  countChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  countText: { fontSize: 12, fontFamily: FontFamily.semibold },
  list: { gap: 10 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  shortcut: { flex: 1, minWidth: 140, padding: 18, borderRadius: 16, gap: 10, justifyContent: 'center' },
  shortcutTitle: { fontFamily: FontFamily.semibold, fontSize: 17, lineHeight: 24 },
  shortcutHint: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 20 },
  pressed: { opacity: 0.75 },
});
