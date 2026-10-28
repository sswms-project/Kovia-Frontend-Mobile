import { useCallback, useRef } from 'react';
import { ScanLine } from 'lucide-react-native';
import { Controller } from 'react-hook-form';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatQuantity } from '@/lib/number-format';
import { formatInventoryLocation } from '@/features/inventory/inventory.labels';
import { ScanCodeButton } from '@/features/scanner/components/scan-code-button';
import type { usePutawayAllocation } from '../../hooks/use-putaway-allocation';
import type { useReceivingLocations } from '../../hooks/use-receiving-locations';
import { PUTAWAY_REASON_OPTIONS, type PutAwaySuggestions, type Receipt } from '../../receiving.schema';
import { ConfirmationModal } from './confirmation-modal';
import { LocationPicker } from './location-picker';
import { PutawayAllocationItem } from './putaway-allocation-item';
import { PutawayLocationPicker } from './putaway-location-picker';

interface Props {
  readonly state: ReturnType<typeof usePutawayAllocation>; readonly locations: ReturnType<typeof useReceivingLocations>;
  readonly receipt?: Receipt; readonly suggestions: PutAwaySuggestions | null; readonly suggesting: boolean;
  readonly suggestionError: Error | null; readonly onSuggest: () => void;
}
export function PutawayAllocationModal({ state, locations, receipt, suggestions, suggesting, suggestionError, onSuggest }: Props) {
  const theme = useTheme();
  const list = useRef<FlatList<Receipt['items'][number]>>(null);
  const showReason = useCallback(() => list.current?.scrollToEnd({ animated: true }), []);
  const locked = state.frozen || state.mutation.isPending;
  const allocation = state.allocation;
  const scanLocationCount = state.values.lines.filter(line => line.destination).length;
  const scannedLocationCount = allocation?.rows.filter(row => row.confirmed).length ?? 0;
  const items = receipt?.items.filter(item => item.remainingPutAwayQuantity > 0) ?? [];
  const hasPlan = items.some(item => item.putAwayPlan.length > 0);
  const offPlan = allocation?.rows.some(row => row.offPlan);
  const renderItem = useCallback(({ item }: { item: Receipt['items'][number] }) => <PutawayAllocationItem item={item} state={state}
    suggestions={suggestions} suggesting={suggesting} onSuggest={onSuggest} onShowReason={showReason} />, [state, suggestions, suggesting, onSuggest, showReason]);
  return <Modal visible={!!state.visible} animationType="slide" onRequestClose={state.mutation.isPending ? undefined : state.close}>
    <SafeAreaProvider><SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList ref={list} data={items} keyExtractor={item => item.id} renderItem={renderItem} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
          ListHeaderComponent={<View style={styles.group}>
            <Button label="Quay lại phiếu nhận" variant="ghost" disabled={state.mutation.isPending} onPress={state.close} />
            <Text style={[styles.kicker, { color: theme.primary }]}>CẤT HÀNG</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{receipt?.receiptCode}</Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>{receipt?.inboundRequestCode} · {receipt?.warehouseName}</Text>
            {hasPlan && <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.name, { color: theme.text }]}>Vị trí cất do quản lý cấu hình</Text>
              <Text style={[styles.text, { color: theme.textSecondary }]}>Đã điền sẵn theo kế hoạch. Có thể chia sang vị trí khác; thay đổi cần ghi rõ lý do.</Text>
              {items.flatMap(item => item.putAwayPlan.map(plan => <Text key={plan.id} style={[styles.text, { color: theme.textSecondary }]}>
                {item.productSKU} · {formatInventoryLocation(plan)}: {formatQuantity(plan.quantity, 6)} {item.baseUnitName}
              </Text>))}
              <Button label="Làm theo kế hoạch" variant="outline" disabled={locked} onPress={state.applyPlan} />
            </View>}
            <Text accessibilityRole="header" style={[styles.name, { color: theme.text }]}>Chọn vị trí cất cho từng sản phẩm</Text>
            <Text accessibilityLiveRegion="polite" style={[styles.text, { color: theme.primary }]}>Đã phân bổ đủ {allocation?.fullyAllocated ?? 0}/{items.length} sản phẩm</Text>
            <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Text style={[styles.name, { color: theme.text }]}>Xác nhận vị trí thực tế</Text>
              <Text style={[styles.text, { color: theme.textSecondary }]}>Cất xong vị trí nào, quét nhãn vị trí đó. Mã đã xác nhận được dùng làm bằng chứng cất đúng chỗ.</Text>
              <ScanCodeButton label="Quét mã vị trí" title="Quét vị trí vừa cất hàng" disabled={locked || !state.canViewLayout}
                continuous status={`${state.notice ? `${state.notice}\n` : ''}Đã ghi nhận mã ${scannedLocationCount}/${scanLocationCount} dòng vị trí. Tiếp tục quét hoặc bấm Xong để quay lại phân bổ.`}
                confirm={{ label: 'Xong', onPress: () => { /* ScanCodeButton closes the camera; placement is confirmed separately. */ } }}
                renderIcon={color => <ScanLine size={18} color={color} />} onScan={code => state.scan(code)} />
              <TextField label="Hoặc nhập mã trên nhãn" value={state.scanText} onChangeText={state.setScanText} editable={!locked} autoCapitalize="characters" maxLength={100}
                returnKeyType="done" onSubmitEditing={() => { state.scan(state.scanText); }} />
              <Button label="Xác nhận mã vị trí" variant="outline" disabled={locked || !state.scanText.trim()} onPress={() => { state.scan(state.scanText); }} />
              <Text style={[styles.text, { color: theme.primary }]}>Đã quét {allocation?.confirmedCount ?? 0}/{allocation?.requiredCount ?? 0} vị trí được giao</Text>
              <Button label={state.scanSkipped ? 'Quay lại yêu cầu quét đủ mã' : 'Không quét được mã?'} variant="ghost" disabled={locked} onPress={state.toggleSkipScan} />
              {!state.canViewLayout && <AlertBanner title="Chưa có quyền xem danh sách vị trí kho"
                description="Quản lý cần cấp quyền xem kho để chọn vị trí và quét chung như web. Bạn vẫn có thể quét riêng trên dòng đã có vị trí; BE sẽ kiểm tra mã khi xác nhận." />}
            </View>
            {state.layout.isError && <AlertBanner title="Chưa tải được thông tin nhãn và sức chứa" description={getApiErrorMessage(state.layout.error)}>
              <Button label="Tải lại thông tin vị trí" variant="outline" disabled={locked} onPress={() => { void state.layout.refetch(); }} />
            </AlertBanner>}
            {suggestionError && <AlertBanner title="Chưa tải được gợi ý vị trí" description={getApiErrorMessage(suggestionError)} />}
            {state.notice && <AlertBanner title={state.notice} />}
            {state.mutation.error && <AlertBanner variant="destructive" title="Chưa xác nhận được cất hàng" description={getApiErrorMessage(state.mutation.error)} />}
            {state.frozen && <AlertBanner title="Đang giữ nguyên lần gửi để tránh ghi nhận trùng. Thử lại cùng thao tác hoặc đóng để tải lại phiếu và kiểm tra kết quả." />}
          </View>}
          ListFooterComponent={(state.scanSkipped || offPlan || allocation?.needsReason || !!state.values.overrideReason || !!state.values.overrideReasonCode) ? <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <AlertBanner title={offPlan ? 'Bạn đang cất khác kế hoạch của quản lý' : 'Cần bổ sung lý do cất hàng'}
                description="Chọn nhóm lý do hoặc nhập mô tả bên dưới trước khi xác nhận." />
              <Text style={[styles.name, { color: theme.text }]}>Lý do không quét được mã hoặc cất khác kế hoạch</Text>
              <Controller control={state.form.control} name="overrideReasonCode" render={({ field }) => <View style={styles.reasons}>
                {PUTAWAY_REASON_OPTIONS.map(option => <Pressable key={option.code} accessibilityRole="radio" accessibilityLabel={option.label}
                  accessibilityState={{ checked: field.value === option.code, disabled: locked }} disabled={locked}
                  onPress={() => field.onChange(field.value === option.code ? '' : option.code)}
                  style={[styles.reason, { borderColor: field.value === option.code ? theme.primary : theme.border,
                    backgroundColor: field.value === option.code ? theme.backgroundElement : theme.card }]}>
                  <Text style={[styles.text, { color: theme.text }]}>{option.label}</Text>
                </Pressable>)}
              </View>} />
              <Controller control={state.form.control} name="overrideReason" render={({ field, fieldState }) => <TextField
                label="Mô tả lý do" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
                editable={!locked} multiline maxLength={500} error={fieldState.error?.message}
                hint={state.values.overrideReasonCode && state.values.overrideReasonCode !== 'Other'
                  ? 'Mô tả bổ sung không bắt buộc, tối đa 500 ký tự.' : 'Ít nhất 5 ký tự khi chưa chọn nhóm hoặc chọn Lý do khác.'} />} />
            </View> : null} />
        <View style={[styles.footer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text accessibilityLiveRegion="polite" style={[styles.text, { color: theme.textSecondary }]}>Phân bổ {allocation?.fullyAllocated ?? 0}/{items.length} sản phẩm · Quét mã {allocation?.confirmedCount ?? 0}/{allocation?.requiredCount ?? 0}</Text>
          {allocation?.needsReason && !allocation.reasonValid && <Button label="Bổ sung lý do để tiếp tục" variant="outline" disabled={locked} onPress={showReason} />}
          <Button label={state.frozen ? 'Thử lại cùng lần cất hàng' : 'Kiểm tra và xác nhận cất hàng'} loading={state.mutation.isPending}
            disabled={!state.frozen && !allocation?.valid} onPress={() => { if (state.frozen) void state.confirm(); else void state.prepare(); }} />
        </View>
      </KeyboardAvoidingView>
      {state.canViewLayout ? <PutawayLocationPicker state={state} receivingSlotId={receipt?.receivingSlotId} />
        : <LocationPicker state={locations} title="Chọn vị trí cho phân bổ này" excludedId={receipt?.receivingSlotId} onChoose={state.chooseLocation} />}
      <ConfirmationModal visible={!!state.review && !state.frozen} title="Xác nhận đã cất hàng thực tế?"
        description={`Ghi nhận ${state.review?.body.lines.length ?? 0} phân bổ của phiếu ${receipt?.receiptCode ?? ''}. Chỉ xác nhận sau khi hàng đã được chuyển tới đúng vị trí. Tổng tồn kho không thay đổi.`}
        busy={state.mutation.isPending} error={state.mutation.error} onConfirm={() => { void state.confirm(); }} onCancel={state.cancelReview} />
      <ConfirmationModal visible={state.discard} title="Bỏ phân bổ chưa xác nhận?" description="Các thay đổi chưa gửi sẽ bị bỏ."
        busy={state.mutation.isPending} onConfirm={state.discardChanges} onCancel={state.cancelDiscard} />
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, gap: 16 },
  group: { gap: 14 }, card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 12 },
  title: { fontFamily: FontFamily.bold, fontSize: 25, lineHeight: 34 }, kicker: { fontFamily: FontFamily.semibold, fontSize: 12, lineHeight: 18 },
  name: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24 }, text: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 20 },
  footer: { borderTopWidth: 1, paddingHorizontal: 20, paddingVertical: 12, gap: 10, width: '100%', maxWidth: 640, alignSelf: 'center' },
  reasons: { gap: 8 }, reason: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderRadius: Radius.md, padding: 12 } });
