import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Controller } from 'react-hook-form';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCheck, Search, X } from 'lucide-react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { FontFamily } from '@/constants/theme';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatDisplayDate } from '@/lib/date-format';

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
  const close = () => router.canGoBack() ? router.back() : router.replace('/');
  const theme = useTheme();
  const [confirmAll, setConfirmAll] = useState<string | null>(null);
  const profile = state.access.profile.data;
  const identityKey = JSON.stringify([state.access.selection.identity, state.access.selection.signature]);
  const busy = state.mutation.isPending;
  const { markRead } = state;
  const read = useCallback((id: string) => { void markRead(id); }, [markRead]);
  const items = state.canView ? state.list.data?.items ?? [] : [];
  const hasUnread = items.some((item) => !item.isRead);
  const rows = groupByDay(items);
  const renderItem = ({ item }: { item: Row }) => item.kind === 'header'
    ? <Text style={[styles.section, { color: theme.textSecondary }]}>{item.label}</Text>
    : <NotificationCard item={item.item} busy={busy || navigation.opening}
    canOpen={!state.list.isError && state.access.ready && canOpenNotification(item.item, profile)}
    onOpen={(notification) => { void navigation.open(notification); }} onRead={read} />;
  return <View style={[styles.root, { backgroundColor: theme.scrim, paddingTop: insets.top + 24 }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo" onPress={close} style={StyleSheet.absoluteFill} />
    <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom }]}>
    <View style={styles.toolbar}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Thông báo</Text>
        {hasUnread && <View style={[styles.badge, { backgroundColor: theme.errorContainer }]}><Text style={[styles.badgeText, { color: theme.error }]}>Chưa đọc</Text></View>}
      </View>
      <View style={styles.heading}>
        {state.canView && <Pressable accessibilityRole="button" accessibilityLabel="Đọc tất cả" disabled={busy || state.list.isPending}
          onPress={() => setConfirmAll(identityKey)} style={[styles.readAll, { backgroundColor: theme.muted }]}>
          <CheckCheck size={16} color={theme.primary} /><Text style={[styles.readAllText, { color: theme.primary }]}>Đọc tất cả</Text></Pressable>}
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo" onPress={close} style={styles.iconButton}><X size={22} color={theme.text} /></Pressable>
      </View>
    </View>
    {(navigation.searchStatus || navigation.choices.length > 0) && <View style={styles.searchFeedback}>
      <NotificationTaskChoices navigation={navigation} />
    </View>}
    <FlatList data={rows} keyExtractor={item => item.key} renderItem={renderItem}
      contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" ItemSeparatorComponent={Separator}
      refreshing={state.canView && state.list.isFetching} onRefresh={() => { if (state.canView) void state.list.refetch(); }}
      ListHeaderComponent={<View style={styles.header}>
        {!state.canView ? <>
          <AlertBanner title={state.access.validated ? 'Bạn chưa có quyền xem thông báo.' : 'Đang xác minh tài khoản và quyền thông báo.'} />
          <Button label="Kiểm tra lại quyền" variant="outline" onPress={() => { void state.access.refresh(); }} />
        </> : <>
          {!state.access.ready && <AlertBanner title="Chọn kho làm việc để mở công việc liên quan." />}
          <View accessibilityRole="tablist" style={[styles.filters, { backgroundColor: theme.muted }]}>
            {[false, true].map(unreadOnly => <Pressable key={String(unreadOnly)} accessibilityRole="tab"
              accessibilityState={{ selected: state.filters.unreadOnly === unreadOnly }}
              onPress={() => { if (state.filters.unreadOnly !== unreadOnly) state.toggleUnread(); }}
              style={[styles.segment, state.filters.unreadOnly === unreadOnly && { backgroundColor: theme.primary }]}>
              <Text style={[styles.segmentText, { color: state.filters.unreadOnly === unreadOnly ? theme.onPrimary : theme.text }]}>
                {unreadOnly ? 'Chưa đọc' : 'Tất cả'}</Text>
            </Pressable>)}
          </View>
          <Controller control={state.form.control} name="search" render={({ field, fieldState }) => <View style={styles.searchForm}>
            <View style={[styles.searchBar, { backgroundColor: theme.muted }]}>
              <Search size={18} color={theme.textSecondary} />
              <TextInput accessibilityLabel="Tìm thông báo" placeholder="Tìm thông báo…" placeholderTextColor={theme.textSecondary} value={field.value}
                onChangeText={field.onChange} onBlur={field.onBlur} maxLength={255} autoCapitalize="none" autoCorrect={false} returnKeyType="search"
                onSubmitEditing={() => { void state.search(); }} style={[styles.searchInput, { color: theme.text }]} />
              {field.value ? <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" style={styles.iconButton}
                onPress={() => { state.form.setValue('search', ''); void state.search(); }}><X size={18} color={theme.textSecondary} /></Pressable> : null}
            </View>
            {fieldState.error && <Text accessibilityRole="alert" style={[styles.text, { color: theme.error }]}>{fieldState.error.message}</Text>}
          </View>} />
          <Button label="Tìm thông báo" variant="outline" onPress={() => { void state.search(); }} />
          {state.list.isPending && <AlertBanner title="Đang tải thông báo…" />}
          {state.list.error && <AlertBanner variant="destructive" title="Chưa thể tải dữ liệu mới" description={getApiErrorMessage(state.list.error)} />}
          {state.mutation.error && <AlertBanner variant="destructive" title="Chưa thể đánh dấu đã đọc" description={getApiErrorMessage(state.mutation.error)} />}
          {state.notice && <AlertBanner title={state.notice} />}
        </>}
      </View>}
      ListEmptyComponent={state.canView && state.list.isSuccess ? <AlertBanner title={state.filters.search ? 'Không có thông báo phù hợp.'
        : state.filters.unreadOnly ? 'Bạn không có thông báo mới.' : 'Bạn chưa có thông báo nào.'} /> : undefined}
      onEndReached={state.loadMore} onEndReachedThreshold={0.4}
      ListFooterComponent={state.loadingMore ? <ActivityIndicator style={styles.footer} color={theme.primary} /> : undefined} />
    <ConfirmationModal visible={confirmAll === identityKey && state.canView} title="Đánh dấu tất cả thông báo đã đọc?"
      description="Thao tác áp dụng cho tất cả thông báo chưa đọc của tài khoản trong doanh nghiệp này, kể cả các trang và thông báo ngoài bộ lọc hiện tại."
      busy={busy} error={state.mutation.error} onConfirm={() => { void state.markRead(null).then(success => { if (success) setConfirmAll(null); }); }}
      onCancel={() => setConfirmAll(null)} />
    </View>
  </View>;
}
type Row = { kind: 'header'; key: string; label: string } | { kind: 'item'; key: string; item: WarehouseNotification };
function groupByDay(items: readonly WarehouseNotification[]): Row[] {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const rows: Row[] = [];
  let last = '';
  for (const item of items) {
    const day = new Date(item.createdAt).toDateString();
    if (day !== last) {
      last = day;
      rows.push({ kind: 'header', key: `h:${day}`, label: day === today ? 'Hôm nay' : day === yesterday ? 'Hôm qua' : formatDisplayDate(new Date(item.createdAt)) });
    }
    rows.push({ kind: 'item', key: item.id, item });
  }
  return rows;
}
function Separator() { return <View style={styles.separator} />; }
const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '94%', height: '88%', width: '100%', maxWidth: 600, alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', padding: 4, borderRadius: 999 },
  searchFeedback: { paddingHorizontal: 20, paddingVertical: 8 }, searchForm: { gap: 8 },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  segmentText: { fontFamily: FontFamily.semibold, fontSize: 14 },
  content: { padding: 20 }, header: { gap: 12, paddingBottom: 16 }, searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 14, borderRadius: 999 },
  searchInput: { flex: 1, fontFamily: FontFamily.regular, fontSize: 15, paddingVertical: 8 },
  footer: { paddingTop: 16, gap: 12 }, separator: { height: 10 },
  title: { fontFamily: FontFamily.bold, fontSize: 22, lineHeight: 30 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }, badgeText: { fontFamily: FontFamily.semibold, fontSize: 12, lineHeight: 18 },
  readAll: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 12, borderRadius: 999 },
  readAllText: { fontFamily: FontFamily.semibold, fontSize: 13 },
  section: { fontFamily: FontFamily.semibold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', paddingTop: 8 },
  text: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 20 },
});
