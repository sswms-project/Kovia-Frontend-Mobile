import { router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { FontFamily } from '@/constants/theme';
import { P } from '@/config/permission-codes';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { PickingEditor } from '../components/picking-editor';
import { ReportPickIssueDialog } from '../components/report-pick-issue-dialog';
import { StockIssueItemCard } from '../components/stock-issue-item-card';
import { useStockIssue } from '../hooks/use-stock-issue';
import { outstandingPicks } from '../stock-issue';
import type { StockIssueItem } from '../stock-issue.schema';

export function StockIssueScreen({ documentId }: { readonly documentId: string }) {
  const state = useStockIssue(documentId);
  const theme = useTheme();
  const busy = state.mutation.isPending;
  const canPick = state.allowed('Pick') && state.permission(P.STOCK_ISSUE_REQUESTS_PICK);
  const renderItem = useCallback(({ item }: { item: StockIssueItem }) => <StockIssueItemCard item={item} canPick={canPick}
    busy={busy} onPick={state.beginPick} />, [canPick, busy, state.beginPick]);
  const error = state.detail.error;
  const pending = state.detail.data ? outstandingPicks(state.detail.data) : [];
  const pendingQuantity = pending.reduce((sum, value) => sum + value.pickedQuantity, 0);
  return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
    <FlatList data={state.canView ? state.detail.data?.items ?? [] : []} keyExtractor={item => item.id} renderItem={renderItem}
      contentContainerStyle={styles.content} refreshing={state.detail.isFetching}
      onRefresh={() => { void state.refresh(); }} ItemSeparatorComponent={Separator}
      ListHeaderComponent={<View style={styles.header}>
        <Button label="Về công việc" variant="outline" onPress={() => router.back()} disabled={busy} />
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{state.canView ? state.detail.data?.stockIssueRequestCode ?? 'Phiếu xuất được giao' : 'Chưa thể mở phiếu xuất'}</Text>
        {!state.canView ? <AlertBanner title={state.validId ? 'Chọn kho được giao và kiểm tra quyền xem phiếu xuất.' : 'Mã phiếu xuất không hợp lệ.'} /> : <>
          {state.detail.isPending && <AlertBanner title="Đang tải phiếu xuất…" />}
          {error && <AlertBanner variant="destructive" title="Chưa thể tải dữ liệu mới" description={getApiErrorMessage(error)} />}
          {state.detail.data && state.detail.isError && <AlertBanner title="Đang hiển thị dữ liệu cũ"
            description={`Lần tải thành công: ${new Date(state.detail.dataUpdatedAt).toLocaleString('vi-VN')}. Tải lại trước khi thao tác.`} />}
          {state.notice && <AlertBanner title={state.notice} />}
          {state.detail.data && <>
            <Text style={[styles.text, { color: theme.textSecondary }]}>{state.detail.data.warehouseName} · {state.detail.data.stockRecipientName}</Text>
            <AlertBanner title={`Chờ xuất: ${pending.length} lượt lấy hàng`}
              description="Lấy hàng giữ nguyên tổng tồn. Chỉ xác nhận xuất sau khi phần hàng liệt kê đã thực tế rời kho. Phần chưa lấy hoặc chưa xuất tiếp tục mở." />
            {!state.detail.data.items.length && <AlertBanner title="Phiếu không có dòng hàng." />}
            {canPick && <Button label="Báo hàng lỗi" variant="outline" disabled={busy} onPress={state.openReport} />}
            {state.allowed('AuthorizeDispatch') && state.permission(P.STOCK_ISSUE_REQUESTS_AUTHORIZE_DISPATCH) && <Button
              label="Cho phép xuất kho" disabled={busy} onPress={state.beginAuthorize} />}
            {state.allowed('Dispatch') && state.permission(P.STOCK_ISSUE_REQUESTS_DISPATCH) && <Button
              label={`Xác nhận xuất ${pending.length} lượt đang chờ`} disabled={busy} onPress={state.beginDispatch} />}
          </>}
        </>}
      </View>} />
    <Modal visible={!!state.editor} animationType="slide" onRequestClose={busy ? undefined : state.closeEditor}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>{state.editor && <PickingEditor
        key={`${state.contextKey}:${state.editor.item.id}:${state.form.getValues('inventoryStockId')}`}
        item={state.editor.item} slotCode={state.editor.slotCode} form={state.form} busy={busy} notice={state.notice}
        onReview={() => { void state.reviewPick(); }} onClose={state.closeEditor} />}
        <ConfirmationModal visible={state.target?.action === 'Pick'} title="Xác nhận đã lấy hàng?"
          description={`Đã di chuyển ${state.target?.values?.pickedQuantity ?? ''} đơn vị cơ sở từ vị trí ${state.editor?.slotCode ?? ''}`}
          busy={busy} error={state.mutation.error} onConfirm={() => { void state.confirm(); }} onCancel={state.cancelConfirmation} />
        <ConfirmationModal visible={state.discard} title="Bỏ thay đổi chưa lưu?" description="Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn rời khỏi trang không?"
          busy={busy} onConfirm={state.discardChanges} onCancel={() => state.setDiscard(false)} />
      </SafeAreaView>
    </Modal>
    <Modal visible={!!state.report} animationType="slide" onRequestClose={busy ? undefined : state.closeReport}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>{state.report && <ReportPickIssueDialog
        key={state.contextKey} code={state.detail.data?.stockIssueRequestCode ?? ''} busy={busy} error={state.mutation.error}
        onSubmit={reason => { void state.submitReport(reason); }} onClose={state.closeReport} />}
      </SafeAreaView>
    </Modal>
    <ConfirmationModal visible={state.target?.action === 'AuthorizeDispatch'} title="Cho phép xuất kho?"
      description="Phiếu sẽ chuyển sang trạng thái được phép xuất kho." busy={busy} error={state.mutation.error}
      onConfirm={() => { void state.confirm(); }} onCancel={state.cancelConfirmation} />
    <ConfirmationModal visible={state.target?.action === 'Dispatch'} title="Xác nhận hàng đã thực tế rời kho?"
      description={`${pending.length} lượt hàng đang chờ xuất sẽ được xác nhận, tổng ${pendingQuantity} đơn vị cơ sở. Chỉ xác nhận nếu toàn bộ phần này đã rời kho. Phần chưa lấy vẫn mở.`}
      busy={busy} error={state.mutation.error} onConfirm={() => { void state.confirm(); }} onCancel={state.cancelConfirmation} />
  </SafeAreaView>;
}
function Separator() { return <View style={styles.separator} />; }
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { gap: 16, paddingBottom: 16 }, separator: { height: 16 }, title: { fontFamily: FontFamily.bold, fontSize: 26, lineHeight: 34 },
  text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 } });
