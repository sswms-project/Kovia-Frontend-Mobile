import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Controller } from 'react-hook-form';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Search, X } from 'lucide-react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { NotificationCard } from '../components/notification-card';
import { useWorkflowNotifications } from '../hooks/use-workflow-notifications';
import { canOpenNotification } from '../notifications';
import { useNotificationNavigation } from '../hooks/use-notification-navigation';
import { NotificationTaskChoices } from '../components/notification-task-choices';
import type { WarehouseNotification } from '../notifications.schema';

export function NotificationsScreen() {
  const state = useWorkflowNotifications();
  const navigation = useNotificationNavigation(true);
  const insets = useSafeAreaInsets();
  const [searchOpen, setSearchOpen] = useState(false);
  const close = () => router.canGoBack() ? router.back() : router.replace('/');
  const theme = useTheme();
  const [confirmAll, setConfirmAll] = useState<string | null>(null);
  const profile = state.access.profile.data;
  const identityKey = JSON.stringify([state.access.selection.identity, state.access.selection.signature]);
  const busy = state.mutation.isPending;
  const { markRead } = state;
  const read = useCallback((id: string) => { void markRead(id); }, [markRead]);
  const renderItem = ({ item }: { item: WarehouseNotification }) => <NotificationCard item={item} busy={busy || navigation.opening}
    canOpen={!state.list.isError && state.access.ready && canOpenNotification(item, profile)}
    onOpen={(notification) => { void navigation.open(notification); }} onRead={read} />;
  return <View style={[styles.root, { backgroundColor: theme.scrim, paddingTop: insets.top + 24 }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo" onPress={close} style={StyleSheet.absoluteFill} />
    <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom }]}>
    <View style={styles.toolbar}>
      <View style={styles.heading}><Bell size={22} color={theme.primary} /><Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Thông báo</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo" onPress={close} style={styles.iconButton}><X size={22} color={theme.text} /></Pressable>
    </View>
    <FlatList data={state.canView ? state.list.data?.items ?? [] : []} keyExtractor={item => item.id} renderItem={renderItem}
      contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" ItemSeparatorComponent={Separator}
      refreshing={state.canView && state.list.isFetching} onRefresh={() => { if (state.canView) void state.list.refetch(); }}
      ListHeaderComponent={<View style={styles.header}>
        <NotificationTaskChoices navigation={navigation} />
        {!state.canView ? <>
          <AlertBanner title={state.access.validated ? 'Bạn chưa có quyền xem thông báo.' : 'Đang xác minh tài khoản và quyền thông báo.'} />
          <Button label="Kiểm tra lại quyền" variant="outline" onPress={() => { void state.access.refresh(); }} />
        </> : <>
          <Text style={[styles.text, { color: theme.textSecondary }]}>{state.connected ? 'Cập nhật trực tiếp' : 'Kéo xuống để làm mới'}</Text>
          {!state.access.ready && <AlertBanner title="Chọn kho làm việc để mở công việc liên quan." />}
          <View style={[styles.filters, { backgroundColor: theme.muted }]}>
            {[true, false].map((unread) => <Pressable key={String(unread)} accessibilityRole="button" accessibilityState={{ selected: state.filters.unreadOnly === unread }}
              onPress={() => { if (state.filters.unreadOnly !== unread) state.toggleUnread(); }} disabled={busy}
              style={[styles.segment, state.filters.unreadOnly === unread && { backgroundColor: theme.card }]}>
              <Text style={[styles.segmentText, { color: state.filters.unreadOnly === unread ? theme.primary : theme.textSecondary }]}>{unread ? 'Chưa đọc' : 'Tất cả'}</Text>
            </Pressable>)}
            <Pressable accessibilityRole="button" accessibilityLabel="Tìm thông báo" accessibilityState={{ expanded: searchOpen }} onPress={() => setSearchOpen(!searchOpen)} style={styles.iconButton}><Search size={20} color={theme.text} /></Pressable>
          </View>
          {searchOpen && <View style={styles.search}><Controller control={state.form.control} name="search" render={({ field, fieldState }) => <TextField label="Tìm thông báo"
            value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message}
            maxLength={256} autoCapitalize="none" returnKeyType="search" onSubmitEditing={() => { void state.search(); }} />} />
          <Button label="Tìm kiếm" variant="outline" disabled={busy} onPress={() => { void state.search(); }} /></View>}
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
    </View>
  </View>;
}
function Separator() { return <View style={styles.separator} />; }
const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '94%', height: '88%', width: '100%', maxWidth: 600, alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  segmentText: { fontFamily: FontFamily.semibold, fontSize: 14 },
  content: { padding: 20 }, header: { gap: 12, paddingBottom: 16 }, search: { gap: 8 },
  footer: { paddingTop: 16, gap: 12 }, separator: { height: 10 },
  title: { fontFamily: FontFamily.bold, fontSize: 22, lineHeight: 30 },
  text: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 20 },
});
