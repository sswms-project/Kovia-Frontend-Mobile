import { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { ScanCodeButton } from '@/features/scanner/components/scan-code-button';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';
import type { usePutawayAllocation } from '../../hooks/use-putaway-allocation';
import { resolvePutawayScan } from '../../putaway-allocation';

interface Props { readonly state: ReturnType<typeof usePutawayAllocation>; readonly receivingSlotId?: string | null }
export function PutawayLocationPicker({ state, receivingSlotId }: Props) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const locked = state.layout.isFetching || state.layout.isError || !state.layout.isSuccess || state.frozen;
  const items = state.destinations.filter(item => item.id !== receivingSlotId);
  const term = search.trim().toLocaleLowerCase('vi');
  const filtered = term ? items.filter(item => `${item.displayPath} ${item.slotCode}`.toLocaleLowerCase('vi').includes(term)) : items;
  function selectByCode(code: string) {
    if (locked) return false;
    try {
      // Resolve against the entire warehouse, including locations excluded from placement.
      const candidates = state.destinations.map(destination => ({ goodsReceiptItemId: '', destination, enteredUnitId: '', enteredQuantity: 1 }));
      const result = resolvePutawayScan(code, state.destinations, candidates, {});
      const destination = candidates[result.index].destination;
      if (destination.id === receivingSlotId) throw new Error('Vị trí cất phải khác vị trí nhận hàng.');
      state.chooseDestination(destination); setSearch(''); setError(null); return true;
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Mã chưa khớp vị trí trong kho.'); return false; }
  }
  return <Modal visible={state.pickerOpen} animationType="slide" onRequestClose={state.closePicker}>
    <SafeAreaProvider><SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <FlatList data={state.layout.isSuccess && !state.layout.isError ? filtered : []} keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
        ListHeaderComponent={<View style={styles.group}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Chọn vị trí cho phân bổ này</Text>
          <TextField label="Tìm mã kệ, vị trí hoặc khu vực" value={search} onChangeText={setSearch} autoCapitalize="characters" maxLength={100}
            hint="Chọn từ danh sách hoặc quét nhãn tại vị trí muốn cất." />
          <ScanCodeButton label="Quét mã vị trí" title="Chọn vị trí cất bằng mã" disabled={locked}
            status={error ?? undefined} onScan={selectByCode} />
          {state.layout.isPending && <Text style={{ color: theme.textSecondary }}>Đang tải vị trí kho…</Text>}
          {state.layout.isError && <AlertBanner variant="destructive" title="Chưa thể tải vị trí" description={getApiErrorMessage(state.layout.error)}>
            <Button label="Tải lại vị trí" variant="outline" onPress={() => { void state.layout.refetch(); }} />
          </AlertBanner>}
          {error && <AlertBanner variant="destructive" title={error} />}
        </View>}
        renderItem={({ item }) => <View style={styles.group}>
          <Button label={item.displayPath} variant="outline" disabled={locked} onPress={() => { state.chooseDestination(item); setSearch(''); setError(null); }} />
          {item.capacityLabel && <Text style={{ color: theme.textSecondary }}>{item.capacityLabel}</Text>}
        </View>}
        ListEmptyComponent={state.layout.isSuccess ? <Text style={{ color: theme.textSecondary }}>Không tìm thấy vị trí lưu trữ phù hợp.</Text> : null}
        ListFooterComponent={<Button label="Đóng chọn vị trí" variant="outline" onPress={state.closePicker} />} />
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  group: { gap: 10 }, title: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 32 } });
