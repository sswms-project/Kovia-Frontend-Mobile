import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { P } from '@/config/permission-codes';
import { useFormDraft } from '@/hooks/use-form-draft';
import { getApiErrorCode, isApiErrorResponse, logApiError } from '@/lib/api-error';
import { formatInventoryLocation } from '@/features/inventory/inventory.labels';
import { receiptCommand } from '../receiving';
import { receivingApi } from '../receiving.api';
import { putAwayAllocationFormSchema, type PutAwayAllocationForm, type PutAwayDestination, type ReceivingLocation, type PutAwaySuggestions } from '../receiving.schema';
import { assertPutawayAllocation, buildPutawayAllocations, layoutDestinations, putawayScanKey, resolvePutawayScan, putawayAllocationState, putawayInput } from '../putaway-allocation';
import type { ReceiptContext } from './use-receipt-context';
import type { useReceivingLocations } from './use-receiving-locations';

export function usePutawayAllocation(context: ReceiptContext, locations: ReturnType<typeof useReceivingLocations>) {
  const [target, setTarget] = useState<{ key: string; version: string; receiptId: string } | null>(null);
  const [scans, setScans] = useState<Record<string, string>>({});
  const [scanSkipped, setScanSkipped] = useState(false);
  const [forceReason, setForceReason] = useState(false);
  const [scanText, setScanText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [discard, setDiscard] = useState(false);
  const lock = useRef(false);
  const [review, setReview] = useState<{ key: string; receiptId: string; body: Parameters<typeof receivingApi.putAway>[1] } | null>(null);
  const visible = target?.key === context.contextKey;
  const form = useForm<PutAwayAllocationForm>({ resolver: zodResolver(putAwayAllocationFormSchema), defaultValues: { lines: [], overrideReason: '' } });
  const fields = useFieldArray({ control: form.control, name: 'lines' });
  const watched = useWatch({ control: form.control });
  const layout = useQuery({ queryKey: [...context.prefix, 'putaway-layout'], enabled: visible && context.permission(P.WAREHOUSES_VIEW),
    queryFn: ({ signal }) => receivingApi.layout(context.scope!.warehouseId, signal), retry: false });
  const metadata = layout.data ? layoutDestinations(layout.data) : [];
  const enrich = (destination: PutAwayDestination | null) => destination ? metadata.find(item => item.id === destination.id) ?? destination : null;
  // RHF default values establish all fields; its partial useWatch result is only a subscription.
  const values: PutAwayAllocationForm = { ...form.getValues(), ...watched, lines: form.getValues('lines').map(line => ({ ...line, destination: enrich(line.destination) })) };
  const receipt = context.receipt.data;
  const allocation = receipt ? putawayAllocationState(values, receipt, scans, scanSkipped, forceReason) : null;
  const assertCurrent = () => {
    if (!target || target.key !== context.contextKey) throw new Error('Kho hoặc phiếu nhận đã thay đổi.');
    context.assertAction('PutAway', target.version, P.GOODS_RECEIPTS_PUTAWAY);
  };
  const draft = useFormDraft({ form, feature: 'putaway-allocation', documentId: context.receiptId ?? context.documentId,
    version: target?.version, enabled: visible && context.permission(P.GOODS_RECEIPTS_PUTAWAY), assertCurrent });
  const mutation = useMutation<unknown, Error, NonNullable<typeof review>>({ retry: false,
    mutationFn: async original => {
      const guard = () => {
        context.assertCurrent(P.GOODS_RECEIPTS_PUTAWAY);
        if (original.key !== context.contextKey) throw new Error('Kho hoặc phiếu nhận đã thay đổi.');
      };
      guard();
      return receivingApi.putAway(original.receiptId, original.body, guard);
    }, onSettled: () => draft.settled(), onError: logApiError,
    onSuccess: async (_, original) => {
      if (original.key !== context.contextKey) return;
      try { context.assertCurrent(P.GOODS_RECEIPTS_PUTAWAY); } catch { return; }
      await draft.clear(true);
      setTarget(null); setReview(null); setFrozen(false); form.reset(); setScans({});
      await context.refreshWarehouse();
    },
  });
  function begin() {
    if (lock.current || !receipt || !context.allowed('PutAway') || !context.permission(P.GOODS_RECEIPTS_PUTAWAY)) return;
    form.reset(buildPutawayAllocations(receipt)); setScans({}); setScanText(''); setReview(null); setNotice(null); setPicking(null); setPickerOpen(false);
    setScanSkipped(false); setForceReason(false);
    setFrozen(false); setDiscard(false); mutation.reset();
    setTarget({ key: context.contextKey, receiptId: receipt.id, version: receipt.version });
  }
  function canEdit() { return visible && !frozen && !lock.current; }
  function add(itemId: string) {
    const item = receipt?.items.find(item => item.id === itemId);
    if (!canEdit() || !item) return;
    const remaining = Math.max(0, Math.round(item.remainingPutAwayQuantity * 100) - (allocation?.totals.get(item.id) ?? 0)) / 100;
    fields.append({ goodsReceiptItemId: itemId, destination: null, ...putawayInput(item, remaining) });
  }
  function choose(destination: PutAwayDestination) {
    if (!canEdit() || picking === null || destination.id === receipt?.receivingSlotId) return;
    clearScan(picking);
    form.setValue(`lines.${picking}.destination`, enrich(destination), { shouldDirty: true, shouldValidate: true });
    setPicking(null); setPickerOpen(false); locations.close();
  }
  function chooseLocation(location: ReceivingLocation) {
    if (locations.query.isFetching || locations.query.isError || !locations.query.data?.items.some(item => item.id === location.id)) return;
    choose(location);
  }
  function chooseSuggestion(data: PutAwaySuggestions | null, itemId: string, slotId: string) {
    if (!canEdit() || !data || picking === null || values.lines[picking]?.goodsReceiptItemId !== itemId) return;
    const suggestion = data.items.find(item => item.goodsReceiptItemId === itemId)?.suggestions.find(item => item.slotId === slotId);
    if (suggestion) choose({ id: slotId, slotCode: suggestion.slotCode, rackCode: suggestion.rackCode,
      displayPath: `${suggestion.zoneName} · ${formatInventoryLocation(suggestion)}` });
  }
  function scan(code: string, rowIndex?: number) {
    if (!canEdit()) return false;
    setScanText('');
    try {
      assertCurrent();
      if (rowIndex === undefined && !layout.data) throw new Error('Chưa tải đủ danh sách mã vị trí trong kho. Tải lại thông tin vị trí hoặc quét riêng tại dòng đã chọn để BE đối chiếu.');
      const warehouse = [...values.lines.flatMap(line => line.destination ? [line.destination] : []), ...metadata];
      const result = resolvePutawayScan(code, warehouse, values.lines, scans, rowIndex);
      const line = values.lines[result.index];
      setScans(previous => ({ ...previous, [putawayScanKey(line)]: result.code }));
      const sku = receipt?.items.find(item => item.id === line.goodsReceiptItemId)?.productSKU ?? '';
      setNotice(`${result.message}${sku ? ` ${sku}` : ''}`); return true;
    } catch (failure) { setNotice(failure instanceof Error ? failure.message : 'Chưa xác nhận được mã vị trí.'); return false; }
  }
  function clearScan(index: number) {
    if (!canEdit() || !values.lines[index]) return;
    const key = putawayScanKey(values.lines[index]);
    setScans(previous => { const next = { ...previous }; delete next[key]; return next; });
    setNotice(null);
  }
  async function prepare() {
    if (!canEdit()) return;
    await form.handleSubmit(current => {
      try {
        assertCurrent();
        if (!receipt || !target) return;
        const currentValues = { ...current, lines: current.lines.map(line => ({ ...line, destination: enrich(line.destination) })) };
        const checked = assertPutawayAllocation(currentValues, receipt, scans, scanSkipped, forceReason);
        const body = { expectedVersion: target.version, lines: currentValues.lines.map(line => ({
          goodsReceiptItemId: line.goodsReceiptItemId, slotId: line.destination!.id,
          enteredQuantity: line.enteredQuantity, enteredUnitId: line.enteredUnitId,
          ...(scans[putawayScanKey(line)] ? { confirmedSlotCode: scans[putawayScanKey(line)] } : {}),
        })), ...(checked.needsReason ? { overrideReason: current.overrideReason,
          ...(current.overrideReasonCode ? { overrideReasonCode: current.overrideReasonCode } : {}) } : {}) };
        const command = receiptCommand(null, { receiptId: target.receiptId, ...body });
        setReview({ key: target.key, receiptId: target.receiptId, body: { ...body, commandId: command.commandId } }); setNotice(null);
      } catch (failure) { setNotice(failure instanceof Error ? failure.message : 'Chưa thể xác nhận phân bổ.'); }
    })();
  }
  async function confirm() {
    if (!review || lock.current) return;
    lock.current = true;
    try {
      if (!frozen) {
        assertCurrent();
        await draft.beforeSubmit({ operation: 'PutAway', commandId: review.body.commandId, content: JSON.stringify(review.body),
          expectedVersion: review.body.expectedVersion, documentId: review.receiptId, receiptId: review.receiptId });
        setFrozen(true);
      }
      await mutation.mutateAsync(review);
    } catch (failure) {
      if (!frozen && isApiErrorResponse(failure) && [400, 422].includes(failure.statusCode)) {
        try {
          await draft.afterRejectedSubmit();
          setFrozen(false); setReview(null); mutation.reset();
          const code = getApiErrorCode(failure);
          if (code === 'PUTAWAY_SLOT_CODE_MISMATCH') setScans({});
          if (code === 'PUTAWAY_HELD_SLOT_REASON_REQUIRED') setForceReason(true);
        } catch (storageError) {
          setNotice(`${failure.message} Chưa mở lại được bản nháp để sửa: ${storageError instanceof Error ? storageError.message : 'Lỗi lưu trữ.'}`);
          return;
        }
      }
      setNotice(failure instanceof Error ? failure.message : 'Chưa thể ghi nhận cất hàng.');
    }
    finally { lock.current = false; }
  }
  function close() {
    if (lock.current) return;
    setTarget(null); setReview(null); locations.close(); void context.refreshWarehouse();
  }
  return { form, fields, values, allocation, layout, destinations: metadata, canViewLayout: context.permission(P.WAREHOUSES_VIEW),
    pickerOpen, closePicker: () => setPickerOpen(false),
    chooseDestination: (destination: PutAwayDestination) => {
      if (!layout.isSuccess || layout.isFetching || layout.isError || !metadata.some(item => item.id === destination.id)) return;
      choose(destination);
    }, scans, scanText, setScanText, scan, clearScan, scanSkipped, notice, mutation, frozen, discard,
    review, visible, picking, begin, add, chooseLocation, chooseSuggestion, prepare, confirm, close,
    pick: (index: number) => { if (canEdit()) {
      setPicking(index);
      if (context.permission(P.WAREHOUSES_VIEW)) setPickerOpen(true); else locations.open();
    } },
    suggest: (index: number) => { if (canEdit()) setPicking(index); },
    remove: (index: number) => { if (canEdit()) { clearScan(index); fields.remove(index); } },
    applyPlan: () => { if (canEdit() && receipt) { form.reset(buildPutawayAllocations(receipt)); setScans({}); setScanSkipped(false); setForceReason(false); setNotice(null); } },
    toggleSkipScan: () => { if (canEdit()) setScanSkipped(!scanSkipped); },
    fill: (index: number) => {
      const line = values.lines[index]; const item = receipt?.items.find(item => item.id === line.goodsReceiptItemId);
      if (!canEdit() || !item) return;
      const other = values.lines.reduce((sum, value, at) => sum + (at !== index && value.goodsReceiptItemId === item.id ? Math.round(allocation?.rows[at].baseQuantity ? allocation.rows[at].baseQuantity! * 100 : 0) : 0), 0);
      const input = putawayInput(item, Math.max(0, Math.round(item.remainingPutAwayQuantity * 100) - other) / 100, line.enteredUnitId);
      form.setValue(`lines.${index}.enteredQuantity`, input.enteredQuantity, { shouldDirty: true, shouldValidate: true });
      form.setValue(`lines.${index}.enteredUnitId`, input.enteredUnitId, { shouldDirty: true });
    },
    changeUnit: (index: number, unitId: string) => {
      if (!canEdit()) return;
      const item = receipt?.items.find(item => item.id === values.lines[index].goodsReceiptItemId);
      const input = item ? putawayInput(item, allocation?.rows[index].baseQuantity ?? 0, unitId) : null;
      form.setValue(`lines.${index}.enteredUnitId`, unitId, { shouldDirty: true });
      form.setValue(`lines.${index}.enteredQuantity`, input?.enteredUnitId === unitId ? input.enteredQuantity : Number.NaN, { shouldDirty: true, shouldValidate: true });
    },
    cancelReview: () => { if (!lock.current && !frozen) setReview(null); },
    cancelDiscard: () => setDiscard(false),
    discardChanges: () => { if (!lock.current) { void draft.discardAndClose(() => { setDiscard(false); setTarget(null); form.reset(); locations.close(); }); } },
  };
}
