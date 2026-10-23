import { router } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { SelectionField } from '@/components/ui/selection-field';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { BarcodeCamera, LookupForm, StockCard } from '../components/inventory-results';
import { useInventoryLookup } from '../hooks/use-inventory-lookup';
import { inventoryTimestamp } from '../inventory-lookup';
import type { BarcodeMatch, InventoryStock, LookupInput } from '../inventory-lookup.schema';

export function InventoryLookupScreen({ scanner = false, initialInput }: { readonly scanner?: boolean; readonly initialInput?: LookupInput }) {
  const state = useInventoryLookup(initialInput);
  const theme = useTheme();
  const select = state.select;
  const renderRow = useCallback(({ item }: { item: InventoryStock | BarcodeMatch }) => 'type' in item
    ? <Button label={`${item.displayPath} · ${item.name}`} variant="outline" onPress={() => select(item)} />
    : <StockCard stock={item} />, [select]);
  if (!state.canView) return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
    <View style={styles.content}>
      <AlertBanner title={!state.access.validated ? 'Đang chờ xác minh kho và quyền truy cập.'
        : !state.access.warehouse ? 'Chọn kho đang hoạt động được giao để tra cứu.' : 'Bạn không có quyền truy cập nội dung này.'}
        description={state.access.selection.notice ?? undefined} />
      <Button label="Chọn kho làm việc" onPress={() => router.navigate('/')} />
      <Button label="Tải lại quyền truy cập" variant="outline" loading={state.access.profile.isFetching}
        onPress={() => { void state.access.refresh(); }} />
    </View>
  </SafeAreaView>;
  const ready = !state.request || !!state.resolved;
  const rows: (InventoryStock | BarcodeMatch)[] = ready && state.inventory.isSuccess ? state.inventory.data.items
    : state.request && state.lookup.isSuccess && !state.resolved ? state.lookup.data.matches : [];
  const pages = Math.max(1, Math.ceil((state.inventory.data?.totalCount ?? 0) / 20));
  return <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
    <AppHeader title={scanner ? 'Quét & tra cứu' : 'Tồn kho'} />
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList data={rows} keyExtractor={(item) => `${'type' in item ? item.type : 'Stock'}:${item.id}`} renderItem={renderRow}
        contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<View style={styles.header}>
          {scanner && <Text style={[styles.text, { color: theme.textSecondary }]}>Quét nhãn hoặc nhập mã để xem đúng sản phẩm, vị trí và số lượng tồn.</Text>}
          <SelectionField label="Kho làm việc" value={state.access.warehouse?.id ?? ''}
            options={(state.access.snapshot?.warehouses ?? []).map((warehouse) => ({ value: warehouse.id, label: warehouse.warehouseName, description: warehouse.warehouseCode }))}
            disabled={state.access.selection.transitioning} onChange={(id) => { void state.access.choose(id); }} />
          <LookupForm form={state.form} busy={!!state.request && state.lookup.isFetching}
            onSearch={() => { void state.search(); }} onCamera={() => { void state.openCamera(); }} onClear={state.clear} />
          {state.cameraError && <AlertBanner title={state.cameraError} />}
          {state.request && <Text style={[styles.text, { color: theme.textSecondary }]}>Mã đã tra: {state.request.input.code}</Text>}
          {!!state.request && state.lookup.isFetching && <ActivityIndicator accessibilityLabel="Đang tra mã" color={theme.primary} />}
          {!!state.request && state.lookup.isError && <>
            <AlertBanner variant="destructive" title={state.lookup.error.message} />
            <Button label="Thử tra mã lại" variant="outline" onPress={() => { void state.lookup.refetch(); }} />
          </>}
          {!!state.request && state.lookup.isSuccess && !state.resolved && <>
            <AlertBanner title={state.lookup.data.totalCount === 0 ? 'Không tìm thấy mã trong kho được phép truy cập.'
              : `Có ${state.lookup.data.totalCount} kết quả. Chọn đúng sản phẩm hoặc vị trí.`}
              description={state.lookup.data.totalCount > 50 ? 'Chỉ hiển thị 50 kết quả. Nhập mã đầy đủ hơn để thu hẹp.' : undefined} />
          </>}
          {state.resolved && <AlertBanner title={state.resolved.name} description={state.resolved.displayPath} />}
          {ready && state.inventory.isSuccess && <Text style={[styles.text, { color: theme.textSecondary }]}>
            {state.inventory.data.totalCount} dòng tồn · Cập nhật: {inventoryTimestamp(state.inventory.data.snapshotAt)}
          </Text>}
          {ready && state.inventory.isFetching && <ActivityIndicator accessibilityLabel="Đang tải tồn kho" color={theme.primary} />}
          {ready && state.inventory.isError && <AlertBanner variant="destructive" title={state.inventory.error.message}
            description="Chưa thể tải dữ liệu mới. Vui lòng kiểm tra thời điểm cập nhật và thử lại." />}
          {ready && <Button label="Tải lại tồn kho" variant="outline" loading={state.inventory.isFetching}
            onPress={() => { void state.inventory.refetch(); }} />}
        </View>}
        ListEmptyComponent={<View style={styles.empty}>
          {ready && state.inventory.isSuccess && !state.inventory.isFetching && <Text style={[styles.text, { color: theme.textSecondary }]}>
            Không có dòng tồn phù hợp trong kho đang chọn.
          </Text>}
        </View>}
        ListFooterComponent={ready && state.inventory.isSuccess && pages > 1 ? <View style={styles.footer}>
          <Button label="Trang trước" variant="outline" disabled={state.pageNumber <= 1 || state.inventory.isFetching}
            onPress={() => state.setPageNumber((page) => page - 1)} />
          <Text style={[styles.text, { color: theme.text }]}>Trang {state.pageNumber}/{pages}</Text>
          <Button label="Trang sau" variant="outline" disabled={state.pageNumber >= pages || state.inventory.isFetching}
            onPress={() => state.setPageNumber((page) => page + 1)} />
        </View> : null} />
    </KeyboardAvoidingView>
    <BarcodeCamera visible={state.cameraVisible} onScan={state.onScan} onClose={state.closeCamera} onFailure={state.failCamera} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, gap: 16, paddingBottom: 40 },
  header: { gap: 14, marginBottom: 16 }, title: { fontFamily: FontFamily.semibold, fontSize: 26, lineHeight: 32 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 }, empty: { gap: 12 },
  footer: { gap: 10, marginTop: 16, alignItems: 'stretch' } });
