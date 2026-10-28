import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useFormDraft } from '@/hooks/use-form-draft';

import { P } from '@/config/permission-codes';
import { logApiError } from '@/lib/api-error';

import { assertPlacement, receiptCommand, type ReceiptCommandMemory } from '../receiving';
import { receivingApi } from '../receiving.api';
import { putAwayFormSchema, type PutAwayForm, type PutAwaySuggestions, type SelectedReceivingLocation } from '../receiving.schema';
import type { ReceiptContext } from './use-receipt-context';
import type { useDocumentEvidence } from './use-document-evidence';
import type { useRefusalEvidence } from './use-refusal-evidence';

interface ExecutionTarget {
  key: string; receiptId: string; version: string; action: 'Submit' | 'PutAway' | 'IsolateDamage';
  sourceId: string | null; placement?: PutAwayForm; refusalEvidenceIds?: string[]; documentEvidenceIds?: string[];
}
export function useReceiptExecution(context: ReceiptContext, selected: SelectedReceivingLocation | null, refusal: ReturnType<typeof useRefusalEvidence>,
  documents: ReturnType<typeof useDocumentEvidence>) {
  const [target, setTarget] = useState<ExecutionTarget | null>(null);
  const [editor, setEditor] = useState<{ key: string; version: string; destination: SelectedReceivingLocation; isolation: boolean } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const lock = useRef(false);
  const command = useRef<ReceiptCommandMemory | null>(null);
  const form = useForm<PutAwayForm>({ resolver: zodResolver(putAwayFormSchema),
    defaultValues: { goodsReceiptItemId: '', slotId: '', quantity: Number.NaN, confirmedSlotCode: '', overrideReason: '' } });
  const draft = useFormDraft({ form, feature: editor?.isolation ? 'isolate-damage' : 'putaway', documentId: context.receiptId ?? context.documentId,
    lineId: editor ? `${form.getValues('goodsReceiptItemId')}:${editor.destination.id}` : undefined, version: editor?.version ?? target?.version,
    enabled: (editor?.key === context.contextKey || target?.key === context.contextKey) && context.canView,
    assertCurrent: () => context.assertAction(target?.action === 'Submit' ? 'Submit' : editor?.isolation ? 'IsolateDamage' : 'PutAway',
      editor?.version ?? target?.version ?? '', target?.action === 'Submit' ? P.GOODS_RECEIPTS_SUBMIT : P.GOODS_RECEIPTS_PUTAWAY) });
  const mutation = useMutation<unknown, Error, ExecutionTarget>({ retry: false,
    mutationFn: async (original: ExecutionTarget) => {
      if (original.key !== context.contextKey) throw new Error('Công việc đã thay đổi.');
      const permission = original.action === 'Submit' ? P.GOODS_RECEIPTS_SUBMIT : P.GOODS_RECEIPTS_PUTAWAY;
      const assertCurrentContext = () => context.assertAction(original.action, original.version, permission);
      assertCurrentContext();
      if (original.action === 'Submit') {
        const body = { expectedVersion: original.version, receivingSlotId: original.sourceId,
          ...(original.refusalEvidenceIds ? { refusedGoodsHandedBack: true, refusalEvidenceIds: original.refusalEvidenceIds } : {}),
          ...(original.documentEvidenceIds ? { documentEvidenceIds: original.documentEvidenceIds } : {}) };
        command.current = receiptCommand(command.current, { receiptId: original.receiptId, action: original.action, ...body });
        const sending = { ...body, commandId: command.current.commandId };
        const result = await draft.execute({ operation: 'SubmitReceipt', ...command.current, documentId: original.receiptId, receiptId: original.receiptId, expectedVersion: original.version },
          () => receivingApi.submit(original.receiptId, sending, assertCurrentContext), () => { command.current = null; });
        documents.markAttached(original.documentEvidenceIds ?? []); refusal.markAttached(original.refusalEvidenceIds ?? []);
        return result;
      }
      if (!original.placement) throw new Error('Chưa có phân bổ cất hàng.');
      const placement = putAwayFormSchema.parse(original.placement);
      if (!context.receipt.data) throw new Error('Chưa tải phiếu nhận.');
      if (original.action === 'IsolateDamage') {
        const item = context.receipt.data.items.find(value => value.id === placement.goodsReceiptItemId);
        const precision = item?.allowedUnits.find(unit => unit.unitId === item.baseUnitId)?.quantityPrecision;
        if (!item || precision === undefined || placement.quantity > item.remainingDamageIsolationQuantity ||
          !placement.confirmedSlotCode || placement.slotId === context.receipt.data.receivingSlotId ||
          Number((placement.quantity).toFixed(precision)) !== placement.quantity) throw new Error('Số lượng hoặc mã vị trí cách biệt chưa hợp lệ.');
        const body = { goodsReceiptItemId: placement.goodsReceiptItemId, destinationSlotId: placement.slotId,
          quantity: placement.quantity, confirmedSlotCode: placement.confirmedSlotCode, physicallySeparated: true as const, expectedVersion: original.version };
        command.current = receiptCommand(command.current, { receiptId: original.receiptId, action: original.action, ...body });
        const sending = { ...body, commandId: command.current.commandId };
        return draft.execute({ operation: 'IsolateDamage', ...command.current, documentId: original.receiptId, receiptId: original.receiptId, expectedVersion: original.version },
          () => receivingApi.isolateDamage(original.receiptId, sending, assertCurrentContext), () => { command.current = null; });
      }
      assertPlacement(placement, context.receipt.data);
      const body = { expectedVersion: original.version, lines: [{ goodsReceiptItemId: placement.goodsReceiptItemId,
        slotId: placement.slotId, quantity: placement.quantity, confirmedSlotCode: placement.confirmedSlotCode }],
        ...(placement.overrideReason ? { overrideReason: placement.overrideReason } : {}) };
      command.current = receiptCommand(command.current, { receiptId: original.receiptId, action: original.action, ...body });
      const sending = { ...body, commandId: command.current.commandId };
      return draft.execute({ operation: 'PutAway', ...command.current, documentId: original.receiptId, receiptId: original.receiptId, expectedVersion: original.version },
        () => receivingApi.putAway(original.receiptId, sending, assertCurrentContext), () => { command.current = null; });
    },
    onSettled: () => draft.settled(), onError: logApiError,
    onSuccess: async (_, original) => {
      if (original.key !== context.contextKey) return;
      if (original.action === 'Submit') context.rememberReceipt(original.receiptId);
      await draft.clear(true);
      setTarget(null); setEditor(null); form.reset();
      setNotice(original.action === 'Submit' ? 'Đã gửi duyệt phiếu nhận hàng. Người có quyền sẽ kiểm tra và duyệt trước khi tiếp tục cất hàng.'
        : original.action === 'IsolateDamage' ? 'Đã xác nhận cách biệt hàng hỏng. Tổng tồn không đổi; hàng vẫn không khả dụng.'
        : 'Đã ghi nhận cất hàng và chuyển vị trí. Tổng tồn của kho không thay đổi.');
      await context.refreshWarehouse();
    },
  });
  function beginArrival() {
    const receipt = context.receipt.data;
    if (!receipt || lock.current || !context.allowed('Submit')) return;
    const accepted = receipt.items.some(item => item.receivedQuantity > 0);
    const hasRefused = !receipt.arrivalConfirmedAt && receipt.items.some(item => item.rejectedQuantity > 0);
    const sourceId = receipt.arrivalConfirmedAt ? receipt.receivingSlotId : accepted ? selected?.id ?? null : null;
    if (accepted && !sourceId) { setNotice('Vui lòng chọn đúng vị trí thực tế nhận phần chấp nhận.'); return; }
    if (hasRefused && (!refusal.acknowledged || refusal.files.length === 0 || refusal.busy)) {
      setNotice('Vui lòng xác nhận bên giao giữ/mang về phần từ chối và đính kèm ảnh bằng chứng trước.'); return;
    }
    if (documents.busy) { setNotice('Đang tải ảnh phiếu giao hàng, vui lòng đợi.'); return; }
    const documentIds = !receipt.arrivalConfirmedAt && documents.files.length > 0 ? documents.files.map(file => file.id) : null;
    mutation.reset(); setNotice(null);
    setTarget({ key: context.contextKey, receiptId: receipt.id, version: receipt.version, action: 'Submit', sourceId,
      ...(hasRefused ? { refusalEvidenceIds: refusal.files.map(file => file.id) } : {}),
      ...(documentIds ? { documentEvidenceIds: documentIds } : {}) });
  }
  function beginPlacement(goodsReceiptItemId: string, isolation = false) {
    const receipt = context.receipt.data;
    if (!receipt || !selected || selected.id === receipt.receivingSlotId || lock.current || !context.allowed(isolation ? 'IsolateDamage' : 'PutAway')) {
      setNotice('Vui lòng chọn vị trí cất hợp lệ khác vị trí nhận trước.'); return;
    }
    const item = receipt.items.find(value => value.id === goodsReceiptItemId);
    if (!item || (isolation ? item.remainingDamageIsolationQuantity : item.remainingPutAwayQuantity) <= 0) return;
    mutation.reset(); setNotice(null); setDiscard(false);
    form.reset({ goodsReceiptItemId, slotId: selected.id, quantity: Number.NaN, confirmedSlotCode: '', overrideReason: '' });
    setEditor({ key: context.contextKey, version: receipt.version, destination: selected, isolation });
  }
  async function reviewPlacement() {
    await form.handleSubmit(values => {
      const receipt = context.receipt.data;
      if (!receipt || !editor || editor.key !== context.contextKey || receipt.version !== editor.version || lock.current) return;
      if (!receipt.receivingSlotId || !receipt.arrivalStockPostedAt) { setNotice('Phiếu cũ chưa được đối soát tồn thực nhận. Vui lòng liên hệ quản lý.'); return; }
      setTarget({ key: context.contextKey, receiptId: receipt.id, version: editor.version, action: editor.isolation ? 'IsolateDamage' : 'PutAway', sourceId: receipt.receivingSlotId, placement: values });
    })();
  }
  async function confirm() {
    if (!target || target.key !== context.contextKey || lock.current) return;
    lock.current = true;
    try { await mutation.mutateAsync(target); } catch { /* Keep the exact request for explicit retry after network loss. */ }
    finally { lock.current = false; }
  }
  function closeEditor() {
    if (!lock.current) { setEditor(null); setTarget(null); }
  }
  const suggestions = useMutation<{ key: string; version: string; data: PutAwaySuggestions }, Error, void>({ retry: false,
    mutationFn: async () => {
      const receipt = context.receipt.data;
      if (!receipt) throw new Error('Chưa tải phiếu nhận.');
      const assertCurrentContext = () => context.assertAction('PutAway', receipt.version, P.GOODS_RECEIPTS_PUTAWAY);
      const data = await receivingApi.suggestions(receipt.id, assertCurrentContext);
      return { key: context.contextKey, version: receipt.version, data };
    }, onError: logApiError,
  });
  return { form, editor: editor?.key === context.contextKey ? editor : null, target: target?.key === context.contextKey ? target : null,
    discard, setDiscard, notice, mutation, suggestions, beginArrival, beginPlacement, reviewPlacement, confirm, closeEditor,
    cancelConfirmation: () => { if (!lock.current) setTarget(null); },
    discardChanges: () => { if (!lock.current) { void draft.discardAndClose(() => { setEditor(null); setDiscard(false); form.reset(); }); } },
  };
}
