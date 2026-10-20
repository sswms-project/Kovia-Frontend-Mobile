import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Controller } from 'react-hook-form';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { NotificationCard } from '../components/notification-card';
import { useWorkflowNotifications } from '../hooks/use-workflow-notifications';
import { notificationDestination } from '../notifications';
import type { WarehouseNotification } from '../notifications.schema';

export function NotificationsScreen() {
  const state = useWorkflowNotifications();
  const theme = useTheme();
  const [confirmAll, setConfirmAll] = useState<string | null>(null);
  const profile = state.access.profile.data;
  const identityKey = JSON.stringify([state.access.selection.identity, state.access.selection.signature]);
  const busy = state.mutation.isPending;
  const { markRead } = state;
  const open = useCallback((item: WarehouseNotification) => {
    const destination = notificationDestination(item, profile);
    if (state.canView && destination && state.access.ready) router.push(destination);
  }, [profile, state.canView, state.access.ready]);
  const read = useCallback((id: string) => { void markRead(id); }, [markRead]);
  const renderItem = useCallback(({ item }: { item: WarehouseNotification }) => <NotificationCard item={item} busy={busy}
    canOpen={state.access.ready && !!notificationDestination(item, profile)} onOpen={open} onRead={read} />,
  [busy, state.access.ready, profile, open, read]);
  return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
    <FlatList data={state.canView ? state.list.data?.items ?? [] : []} keyExtractor={item => item.id} renderItem={renderItem}
      contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" ItemSeparatorComponent={Separator}
      refreshing={state.canView && state.list.isFetching} onRefresh={() => { void state.list.refetch(); }}
      ListHeaderComponent={<View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Thông báo</Text>
        {!state.canView ? <>
          <AlertBanner title={state.access.validated ? 'Bạn chưa có quyền xem thông báo.' : 'Đang xác minh tài khoản và quyền thông báo.'} />
          <Button label="Kiểm tra lại quyền" variant="outline" onPress={() => { void state.access.refresh(); }} />
        </> : <>
          <Text style={[styles.text, { color: theme.textSecondary }]}>{state.connected ? 'Đang nhận cập nhật trực tiếp' : 'Cập nhật mỗi 30 giây; kéo xuống để tải lại'}</Text>
          {!state.access.ready && <AlertBanner title="Chọn kho làm việc để mở công việc liên quan." />}
          <Controller control={state.form.control} name="search" render={({ field, fieldState }) => <TextField label="Tìm thông báo"
            value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message}
            maxLength={256} autoCapitalize="none" returnKeyType="search" onSubmitEditing={() => { void state.search(); }} />} />
          <Button label="Tìm kiếm" variant="outline" disabled={busy} onPress={() => { void state.search(); }} />
          <Button label={state.filters.unreadOnly ? 'Đang xem chưa đọc · Xem tất cả' : 'Đang xem tất cả · Chỉ xem chưa đọc'}
            variant="outline" disabled={busy} onPress={state.toggleUnread} />
          {state.list.isPending && <AlertBanner title="Đang tải thông báo…" />}
          {state.list.error && <AlertBanner variant="destructive" title="Chưa thể tải dữ liệu mới" description={getApiErrorMessage(state.list.error)} />}
          {state.mutation.error && <AlertBanner variant="destructive" title="Chưa thể đánh dấu đã đọc" description={getApiErrorMessage(state.mutation.error)} />}
          {state.notice && <AlertBanner title={state.notice} />}
          {state.list.data && <Text style={[styles.text, { color: theme.textSecondary }]}>{state.list.data.totalCount} thông báo phù hợp · Trang {state.filters.pageNumber}
            {state.list.isError ? ' · Dữ liệu cũ' : ` · Cập nhật ${new Date(state.list.dataUpdatedAt).toLocaleTimeString('vi-VN')}`}</Text>}
          <Button label="Đánh dấu tất cả là đã đọc" variant="outline" disabled={busy || state.list.isPending}
            onPress={() => setConfirmAll(identityKey)} />
        </>}
      </View>}
      ListEmptyComponent={state.canView && state.list.isSuccess ? <AlertBanner title={state.filters.unreadOnly && !state.filters.search && state.filters.pageNumber === 1
        ? 'Bạn không có thông báo mới.' : 'Không có thông báo phù hợp trên trang này.'} /> : null}
      ListFooterComponent={state.canView && state.list.data ? <View style={styles.footer}>
        <Button label="Trang trước" variant="outline" disabled={busy || state.filters.pageNumber <= 1 || state.list.isFetching} onPress={() => state.page(state.filters.pageNumber - 1)} />
        <Button label="Trang sau" variant="outline" disabled={busy || state.list.isFetching || state.filters.pageNumber * state.list.data.pageSize >= state.list.data.totalCount}
          onPress={() => state.page(state.filters.pageNumber + 1)} />
      </View> : null} />
    <ConfirmationModal visible={confirmAll === identityKey && state.canView} title="Đánh dấu tất cả thông báo đã đọc?"
      description="Thao tác áp dụng cho tất cả thông báo chưa đọc của tài khoản trong doanh nghiệp này, kể cả các trang và thông báo ngoài bộ lọc hiện tại."
      busy={busy} error={state.mutation.error} onConfirm={() => { void state.markRead(null).then(success => { if (success) setConfirmAll(null); }); }}
      onCancel={() => setConfirmAll(null)} />
  </SafeAreaView>;
}
function Separator() { return <View style={styles.separator} />; }
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { gap: 16, paddingBottom: 16 }, footer: { paddingTop: 16, gap: 12 }, separator: { height: 14 },
  title: { fontFamily: FontFamily.bold, fontSize: 28, lineHeight: 36 }, text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
