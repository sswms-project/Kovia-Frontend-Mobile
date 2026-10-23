import { router } from 'expo-router';
import { Bell, ChevronLeft, CheckCheck } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { NotificationRow } from '../components/notification-row';
import { useNotifications } from '../hooks/use-notifications';
import { openNotificationTarget } from '../notification-route';
import type { AppNotification } from '../notifications.types';

const PAGE_SIZE = 20;

export function NotificationsScreen() {
  const theme = useTheme();
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const state = useNotifications(pageSize);
  const { markRead } = state;

  const open = useCallback((item: AppNotification) => {
    if (!item.isRead) markRead.mutate(item.id);
    openNotificationTarget(item);
  }, [markRead]);

  if (!state.allowed) return <ErrorState kind="forbidden" fullScreen />;
  if (state.isPending) return <LoadingState fullScreen message="Đang tải thông báo…" />;
  if (state.isError && !state.data)
    return <ErrorState fullScreen error={state.error} onRetry={() => void state.refetch()} />;

  const total = state.data?.totalCount ?? 0;
  const hasMore = state.items.length < total;

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()}
          hitSlop={8} style={[styles.back, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ChevronLeft size={20} color={theme.text} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.text }]}>Thông báo</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {state.unreadCount > 0 ? `${state.unreadCount} chưa đọc` : 'Đã đọc tất cả'}
          </Text>
        </View>
        <Button
          variant="outline"
          label="Đọc tất cả"
          loading={state.markAllRead.isPending}
          disabled={state.unreadCount === 0}
          onPress={() => state.markAllRead.mutate()}
          renderIcon={(color) => <CheckCheck size={16} color={color} />}
        />
      </View>
      <FlatList
        data={state.items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationRow notification={item} onPress={open} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        refreshControl={<RefreshControl refreshing={state.isRefetching}
          onRefresh={() => void state.refetch()} tintColor={theme.primary} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => { if (hasMore && !state.isFetching) setPageSize((size) => size + PAGE_SIZE); }}
        ListEmptyComponent={<EmptyState icon={Bell} title="Chưa có thông báo"
          description="Thông báo từ hệ thống kho sẽ hiển thị tại đây." />}
        ListFooterComponent={hasMore && state.isFetching ? <LoadingState message="Đang tải thêm…" /> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { flex: 1 },
  title: { fontSize: 20, fontFamily: FontFamily.bold },
  subtitle: { fontSize: 12, fontFamily: FontFamily.regular },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
  gap: { height: 8 },
});
