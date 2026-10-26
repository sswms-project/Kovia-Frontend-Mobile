import { Controller, useWatch } from 'react-hook-form';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { SelectionField } from '@/components/ui/selection-field';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { FieldActionModal } from '@/features/warehouse-task/components/field-action-modal';
import { ScanCodeButton } from '@/features/scanner/components/scan-code-button';
import { PICK_REASONS } from '../transfer-exception.schema';
import { formatDisplayDateTime } from '@/lib/date-format';
import type { useTransferExceptions } from '../hooks/use-transfer-exceptions';

const titles = { Switch: 'Đổi vị trí hoặc lô lấy hàng', Escalate: 'Báo quản lý xử lý', Return: 'Trả hàng đã lấy về vị trí' };
export function TransferExceptionModal({ state }: { readonly state: ReturnType<typeof useTransferExceptions> }) {
  const action = state.action;
  const sourceId = useWatch({ control: state.form.control, name: 'fromInventoryStockId' });
  const line = state.line;
  const busy = state.mutation.isPending;
  const choices = action === 'Return' ? (line?.picks ?? []).filter(item => item.pickedQuantity > item.returnedQuantity + item.dispatchedQuantity)
    .map(item => ({ value: item.id, label: `${item.slotCode} · Lô ${item.lotNumber ?? 'không có'}`,
      description: `${item.pickedQuantity - item.returnedQuantity - item.dispatchedQuantity} ${line?.baseUnitName ?? ''} có thể trả · ${formatDisplayDateTime(new Date(item.pickedAt))}` }))
    : (line?.suggestions ?? []).filter(item => item.reservedQuantity > 0 && item.suggestedQuantity > 0)
      .map(item => ({ value: item.inventoryStockId, label: `${item.slotCode} · Lô ${item.lotNumber ?? 'không có'}`,
        description: `Giữ chỗ ${item.reservedQuantity} ${line?.baseUnitName ?? ''} · HSD ${item.expiryDate ?? 'không có'}` }));
  return <>
    <FieldActionModal visible={state.visible && !state.target} title={titles[action]} busy={busy}
      error={state.error ?? state.alternatives.error} reviewDisabled={action === 'Switch' && (!state.alternatives.isSuccess || state.alternatives.isFetching)}
      onReview={() => { void state.review(); }} onClose={state.close}>
      <AlertBanner title={`${line?.sku ?? ''} · ${line?.productName ?? ''}`} description={action === 'Return'
        ? 'Chỉ xác nhận sau khi đã chuyển hàng về vị trí gốc. Tổng tồn kho không đổi; giữ chỗ được đối soát theo kế hoạch.'
        : action === 'Switch' ? 'Chỉ chuyển giữ chỗ, chưa ghi nhận lấy hàng. Ưu tiên HSD sớm; đổi khác thứ tự FEFO phải ghi rõ lý do.'
          : 'Dòng hàng sẽ chờ quản lý xử lý trên web. Không tự điều chỉnh tồn hoặc xác nhận hàng hỏng.'} />
      {action !== 'Escalate' && <Controller name={action === 'Return' ? 'pickDetailId' : 'fromInventoryStockId'} control={state.form.control}
        render={({ field, fieldState }) => <>
          <SelectionField label={action === 'Return' ? 'Lượt lấy cần trả' : 'Nguồn đang giữ chỗ'} value={field.value} disabled={busy}
            options={choices} onChange={value => { field.onChange(value); state.form.setValue('scannedSlotCode', ''); }} />
          {fieldState.error && <AlertBanner title={fieldState.error.message ?? 'Vui lòng chọn nguồn.'} />}
        </>} />}
      {action === 'Switch' && <>
        {state.alternatives.isFetching && <AlertBanner title="Đang tìm vị trí/lô thay thế…" />}
        {state.alternatives.isError && <Button label="Tải lại vị trí thay thế" variant="outline" disabled={busy}
          onPress={() => { void state.alternatives.refetch(); }} />}
        <Controller name="toInventoryStockId" control={state.form.control} render={({ field, fieldState }) => <>
          <SelectionField label="Vị trí/lô thay thế" value={field.value} disabled={busy || state.alternatives.isFetching} onChange={field.onChange}
            options={[...(state.alternatives.data ?? [])].filter(item => item.inventoryStockId !== sourceId && item.availableQuantity > 0)
              .sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999')).map(item => ({ value: item.inventoryStockId,
                label: `${item.slotCode} · Lô ${item.lotNumber ?? 'không có'}`,
                description: `Khả dụng ${item.availableQuantity} ${line?.baseUnitName ?? ''} · HSD ${item.expiryDate ?? 'không có'}` }))} />
          {fieldState.error && <AlertBanner title={fieldState.error.message ?? 'Chọn vị trí mới.'} />}
        </>} />
      </>}
      {action !== 'Escalate' && <Controller name="quantity" control={state.form.control} render={({ field, fieldState }) => <TextField
        label={`Số lượng (${line?.baseUnitName ?? 'đơn vị cơ sở'})`} value={Number.isFinite(field.value) && field.value > 0 ? String(field.value) : ''}
        keyboardType="decimal-pad" editable={!busy} error={fieldState.error?.message} onChangeText={value => field.onChange(value.trim() ? Number(value.replace(',', '.')) : Number.NaN)} />} />}
      {action === 'Return' ? <>
        <Controller name="scannedSlotCode" control={state.form.control} render={({ field, fieldState }) => <TextField label="Mã vị trí gốc đã trả hàng về"
          value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} editable={!busy} autoCapitalize="none" maxLength={100} />} />
        <ScanCodeButton label="Quét vị trí trả" title="Quét vị trí gốc của lượt lấy" disabled={busy} onScan={code => {
          state.form.setValue('scannedSlotCode', code, { shouldDirty: true, shouldValidate: true }); return true;
        }} />
      </> : <>
        <Controller name="reasonCode" control={state.form.control} render={({ field }) => <SelectionField label="Lý do" value={field.value}
          options={PICK_REASONS} onChange={field.onChange} disabled={busy} />} />
        <Controller name="note" control={state.form.control} render={({ field, fieldState }) => <TextField label="Mô tả lý do" multiline maxLength={500}
          value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} editable={!busy} />} />
      </>}
    </FieldActionModal>
    <ConfirmationModal visible={!!state.target} title={titles[state.target?.values.action ?? action]} busy={busy} error={state.mutation.error}
      description={state.target?.values.action === 'Escalate' ? `${state.target.values.note}. Dòng hàng sẽ dừng chờ quản lý.`
        : `${state.target?.values.quantity ?? ''} ${line?.baseUnitName ?? ''}. ${state.target?.values.action === 'Return'
          ? `Đã thực tế trả về ${state.target.values.scannedSlotCode}.`
          : `Chuyển giữ chỗ ${line?.suggestions.find(item => item.inventoryStockId === state.target?.values.fromInventoryStockId)?.slotCode ?? ''} → ${state.alternatives.data?.find(item => item.inventoryStockId === state.target?.values.toInventoryStockId)?.slotCode ?? ''}. Lý do: ${state.target?.values.note ?? ''}.`} Tổng tồn kho không đổi.`}
      onConfirm={() => { void state.confirm(); }} onCancel={state.cancel} />
  </>;
}
