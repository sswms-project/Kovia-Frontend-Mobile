import { WorkCompletionActions } from '@/components/work-completion-actions';
import { ScanLine } from 'lucide-react-native';
import { useExitProtection, useModalExit, useScreenSubtitle } from '@/hooks/use-screen-exit';
import { useCallback, useState } from 'react';
import { WorkActionBar } from '@/components/work-action-bar';
import { WorkListTools, matchesWorkLine, type WorkFilter } from '@/components/work-list-tools';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { FontFamily } from '@/constants/theme';
import { P } from '@/config/permission-codes';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatQuantity } from '@/lib/number-format';

import { PickingEditor } from '../components/picking-editor';
import { DispatchConfirmationModal } from '../components/dispatch-confirmation-modal';
import { StockIssueItemCard } from '../components/stock-issue-item-card';
import { useStockIssue } from '../hooks/use-stock-issue';
import { usePickIssueReport } from '../hooks/use-pick-issue-report';
import { PickIssueReportModal } from '../components/pick-issue-report-modal';
import { outstandingPicks, stockIssuePickQueue } from '../stock-issue';
import type { StockIssueItem } from '../stock-issue.schema';

export function StockIssueScreen({ documentId }: { readonly documentId: string }) {
  const state = useStockIssue(documentId);
  useScreenSubtitle(state.canView ? state.detail.data?.stockIssueRequestCode : undefined);
  const closeEditor = useModalExit(state.closeEditor);
  const report = usePickIssueReport(documentId, state);
  const theme = useTheme();
  const busy = state.mutation.isPending || report.mutation.isPending || report.active;
  useExitProtection(() => ({ busy: state.mutation.isPending || report.mutation.isPending }));
  const canPick = state.allowed('Pick') && state.permission(P.STOCK_ISSUE_REQUESTS_PICK);
  const renderItem = useCallback(({ item }: { item: StockIssueItem }) => <StockIssueItemCard item={item} canPick={canPick}
    busy={busy} onPick={state.beginPick} onReport={report.open} />, [canPick, busy, state.beginPick, report.open]);
  const error = state.detail.error ?? state.actions.error;
  const pending = state.detail.data ? outstandingPicks(state.detail.data) : [];
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<WorkFilter>('all');
  const items = state.canView ? state.detail.data?.items ?? [] : [];
  const nextPick = stockIssuePickQueue(items)[0];
  const visible = items.filter(item => matchesWorkLine(search, item.pickedQuantity < item.quantity, filter,
    [item.sku, item.productName, ...item.pickLocations.flatMap(location => [location.slotCode, location.rackCode, location.lotNumber])]));
  const canDispatch = state.allowed('Dispatch') && state.permission(P.STOCK_ISSUE_REQUESTS_DISPATCH);
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.root, { backgroundColor: theme.background }]}>
    <FlatList style={styles.root} data={visible} keyExtractor={item => item.id} renderItem={renderItem} keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content} refreshing={state.detail.isFetching || state.actions.isFetching}
      onRefresh={() => { void state.refresh(); }} ItemSeparatorComponent={Separator}
      ListHeaderComponent={<View style={styles.header}>
        <WorkCompletionActions visible={!busy && !state.detail.isFetching && !state.detail.isError && state.detail.data?.status === 'Dispatched'} message={'Đã hoàn tất xuất hàng.'} />
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
              description={state.detail.data.status === 'Picked'
                ? 'Đã lấy đủ hàng. Chờ quản lý cho phép xuất kho; sau đó bạn xác nhận khi hàng thực tế rời kho.'
                : state.detail.data.status === 'AuthorizedForDispatch'
                  ? 'Đã được phép xuất kho. Kiểm tra toàn bộ hàng của phiếu và xác nhận sau khi hàng thực tế rời kho.'
                  : 'Quét vị trí và sản phẩm, nhập số lượng rồi xác nhận lấy hàng. Lấy hàng vào khu chờ xuất chưa ghi giảm tổng tồn kho.'} />
            {!state.detail.data.items.length && <AlertBanner title="Phiếu không có dòng hàng." />}
            {state.actions.data?.denialReasonCode === 'DAMAGE_WORKFLOW_OUT_OF_SCOPE' && <AlertBanner title="Phiếu này thuộc quy trình xử lý hàng hỏng ngoài phạm vi mobile hiện tại." />}
            <Text style={[styles.text, { color: theme.primary }]}>{items.filter(item => item.pickedQuantity >= item.quantity).length}/{items.length} dòng đã lấy đủ</Text>
            <WorkListTools search={search} onSearch={setSearch} filter={filter} onFilter={setFilter}
              shown={visible.length} total={items.length} disabled={busy} />
          </>}
        </>}
        <Button label="Tải lại phiếu và quyền" variant="outline" disabled={busy} onPress={() => { void state.refresh(); }} />
      </View>} ListEmptyComponent={items.length > 0 ? <Text style={[styles.text, { color: theme.textSecondary }]}>Không có dòng hàng phù hợp. Đổi bộ lọc để xem lại.</Text> : null} />
    {(canPick || canDispatch) && <WorkActionBar hint={canPick && nextPick ? 'Quét vị trí nguồn → mã hàng → số lượng thực lấy.' : 'Chỉ xác nhận sau khi toàn bộ hàng của phiếu đã thực tế rời kho.'}>
      {canPick && nextPick && <Button label="Quét & lấy hàng" disabled={busy} renderIcon={color => <ScanLine size={22} color={color} />}
        onPress={() => { void state.beginPick(nextPick.item, nextPick.location.inventoryStockId); }} />}
      {canDispatch && <Button label="Xác nhận hàng rời kho" variant={canPick && nextPick ? 'outline' : 'primary'} disabled={busy || !pending.length} onPress={state.beginDispatch} />}
    </WorkActionBar>}
    <Modal visible={!!state.editor} animationType="slide" onRequestClose={busy ? undefined : closeEditor}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>{state.editor && <PickingEditor
        key={`${state.contextKey}:${state.editor.item.id}:${state.form.getValues('inventoryStockId')}`}
        item={state.editor.item} sourcePath={state.editor.sourcePath} destinationPath={state.editor.destinationPath} form={state.form} busy={busy} notice={state.notice}
        onReview={() => { void state.reviewPick(); }} onClose={state.closeEditor} />}
        <ConfirmationModal visible={state.target?.action === 'Pick'} title="Xác nhận đã lấy hàng vào khu chờ xuất?"
          description={`Đã di chuyển ${formatQuantity((state.target?.values?.pickedQuantity ?? 0) / (state.editor?.item.conversionFactor ?? 1))} ${state.editor?.item.enteredUnitName ?? 'đơn vị cơ sở'} từ ${state.editor?.sourcePath ?? ''} đến ${state.editor?.destinationPath ?? ''}. Tổng tồn kho không thay đổi.`}
          busy={busy} error={state.mutation.error} onConfirm={() => { void state.confirm(); }} onCancel={state.cancelConfirmation} />
        <ConfirmationModal visible={state.discard} title="Bỏ thay đổi chưa lưu?" description="Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn rời khỏi trang không?"
          busy={busy} onConfirm={state.discardChanges} onCancel={() => state.setDiscard(false)} />
      </SafeAreaView>
    </Modal>
    <DispatchConfirmationModal visible={state.target?.action === 'Dispatch'} picks={pending}
      busy={busy} error={state.mutation.error} onConfirm={() => { void state.confirm(); }} onClose={state.cancelConfirmation} />
    <PickIssueReportModal state={report} />
  </SafeAreaView>;
}
function Separator() { return <View style={styles.separator} />; }
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { gap: 16, paddingBottom: 16 }, separator: { height: 16 }, title: { fontFamily: FontFamily.bold, fontSize: 26, lineHeight: 34 },
  text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 } });
