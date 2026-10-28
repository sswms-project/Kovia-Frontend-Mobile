import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useFormDraft } from '@/hooks/use-form-draft';

import { P } from '@/config/permission-codes';
import { ApiError } from '@/lib/api';
import { isApiErrorResponse, logApiError } from '@/lib/api-error';

import { assertReceiptCorrection, assertReceiptQuantities, receiptCommand, receiptToForm, type ReceiptCommandMemory } from '../receiving';
import { receivingApi } from '../receiving.api';
import { createReceiptFormSchema, updateReceiptFormSchema, type ReceiptForm, type ReceivingTask } from '../receiving.schema';
import type { ReceiptContext } from './use-receipt-context';
import type { useDocumentEvidence } from './use-document-evidence';
import type { useRefusalEvidence } from './use-refusal-evidence';

export interface ReceiptSubmission {
  receivingSlotId: string | null;
  refusedGoodsHandedBack?: boolean;
  refusalEvidenceIds?: string[];
  documentEvidenceIds?: string[];
}
export function useReceiptEditor(context: ReceiptContext, evidence?: { documents: ReturnType<typeof useDocumentEvidence>; refusal: ReturnType<typeof useRefusalEvidence> }) {
  const [target, setTarget] = useState<{ key: string; session: number; receiptId: string | null; version: string; task: ReceivingTask | null; correction: boolean } | null>(null);
  const [discard, setDiscard] = useState(false);
  const lock = useRef(false);
  const command = useRef<ReceiptCommandMemory | null>(null);
  const session = useRef(0);
  const codeEdited = useRef(false);
  const codeApplied = useRef<typeof target>(null);
  const savedReceipt = useRef<{ key: string; id: string } | null>(null);
  const submitCommand = useRef<ReceiptCommandMemory | null>(null);
  const submitSnapshot = useRef<{ id: string; body: ReceiptSubmission & { expectedVersion: string; commandId: string } } | null>(null);
  const uncertainSave = useRef(false);
  const uncertainSubmit = useRef(false);
  const [frozen, setFrozen] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const visible = target?.key === context.contextKey;
  const form = useForm<ReceiptForm>({ resolver: zodResolver(target?.receiptId ? updateReceiptFormSchema : createReceiptFormSchema),
    defaultValues: { receiptCode: '', lines: [] } });
  const fields = useFieldArray({ control: form.control, name: 'lines' });
  const codeSuggestion = useQuery({
    queryKey: [...context.prefix, 'next-receipt-code', target?.session],
    enabled: visible && !target?.receiptId && context.permission(P.GOODS_RECEIPTS_CREATE),
    queryFn: ({ signal }) => receivingApi.nextCode(signal),
    staleTime: 0, retry: false, refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (!visible || !target || target.receiptId || !codeSuggestion.data || codeSuggestion.isFetching || codeSuggestion.isError ||
      codeEdited.current || codeApplied.current === target || form.getValues('receiptCode')) return;
    codeApplied.current = target;
    form.setValue('receiptCode', codeSuggestion.data, { shouldValidate: form.formState.isSubmitted });
  }, [visible, target, codeSuggestion.data, codeSuggestion.isFetching, codeSuggestion.isError, form]);
  const draft = useFormDraft({ form, feature: 'receipt', documentId: context.documentId, lineId: target?.receiptId ?? 'new', version: target?.version,
    enabled: visible && context.permission(P.GOODS_RECEIPTS_CREATE), assertCurrent: () => {
      context.assertCurrent(P.GOODS_RECEIPTS_CREATE);
      const currentVersion = target?.receiptId ? context.receipt.data?.version : context.task.data?.version;
      if (currentVersion !== target?.version) throw new Error('Phiếu nhận đã thay đổi.');
    } });
  const mutation = useMutation<{ id: string; key: string; clear: () => Promise<void> }, Error, { values: ReceiptForm; submission?: ReceiptSubmission }>({ retry: false,
    mutationFn: async ({ values, submission }) => {
      if (!target || target.key !== context.contextKey) throw new Error('Công việc đã thay đổi.');
      const original = target;
      const assertCurrentContext = () => {
        context.assertCurrent(P.GOODS_RECEIPTS_CREATE);
        if (savedReceipt.current?.key === original.key) return;
        if (original.receiptId) context.assertAction('Update', original.version, P.GOODS_RECEIPTS_CREATE);
        else if (context.task.isError || context.task.isFetching || context.task.data?.version !== original.version ||
          context.task.data?.activeGoodsReceiptId || context.task.data?.assignedTo !== context.userId)
          throw new Error('Yêu cầu nhận hoặc phân công đã thay đổi. Vui lòng tải lại.');
      };
      assertCurrentContext();
      if (submission) context.assertCurrent(P.GOODS_RECEIPTS_SUBMIT);
      if (submission && !original.correction) {
        if (values.lines.some(line => line.receivedQty > 0) && !submission.receivingSlotId)
          throw new Error('Chọn vị trí tại khu chờ cất hàng trước khi gửi duyệt.');
        if (values.lines.some(line => line.rejectedQty > 0) &&
          (!submission.refusedGoodsHandedBack || !submission.refusalEvidenceIds?.length))
          throw new Error('Xác nhận bàn giao lại hàng từ chối và bổ sung bằng chứng trước khi gửi duyệt.');
      }
      if (original.task && !original.correction) assertReceiptQuantities(values, original.task);
      if (original.correction && context.receipt.data) assertReceiptCorrection(values, context.receipt.data);
      let id = savedReceipt.current?.key === original.key ? savedReceipt.current.id : null;
      if (!id) {
        setFrozen(true);
        try {
          if (original.receiptId) {
            const body = { ...values, expectedVersion: original.version };
            command.current = receiptCommand(command.current, { receiptId: original.receiptId, ...body });
            await draft.beforeSubmit({ operation: 'UpdateReceipt', ...command.current, expectedVersion: original.version, documentId: context.documentId, receiptId: original.receiptId });
            await receivingApi.update(original.receiptId, { ...body, commandId: command.current.commandId }, assertCurrentContext);
            id = original.receiptId;
          } else {
            const body = { ...values, inboundRequestId: context.documentId, expectedInboundVersion: original.version };
            command.current = receiptCommand(command.current, body);
            await draft.beforeSubmit({ operation: 'CreateReceipt', ...command.current, expectedVersion: original.version, documentId: context.documentId });
            id = await receivingApi.create({ ...body, commandId: command.current.commandId }, assertCurrentContext);
          }
          uncertainSave.current = false;
        } catch (failure) {
          if (!uncertainSave.current && isApiErrorResponse(failure) && [400, 422].includes(failure.statusCode)) {
            await draft.afterRejectedSubmit();
            command.current = null; setFrozen(false);
          } else uncertainSave.current = true;
          throw failure;
        }
      }
      savedReceipt.current = { key: original.key, id };
      await draft.recordResult(id);
      if (!submission) return { id, key: original.key, clear: () => draft.clear(true) };
      setSavedNotice('Phiếu đã lưu trên máy chủ. Đang gửi duyệt; nếu lỗi, hãy thử gửi lại đúng phiếu này.');
      const assertSubmitContext = () => {
        context.assertCurrent(P.GOODS_RECEIPTS_SUBMIT);
        if (original.key !== context.contextKey) throw new Error('Kho hoặc công việc đã thay đổi.');
      };
      assertSubmitContext();
      if (!submitSnapshot.current) {
        const receipt = await receivingApi.receipt(id, context.scope!.warehouseId, context.userId, 'receiving', context.documentId);
        const actions = await receivingApi.actions(id);
        assertSubmitContext();
        if (actions.currentVersion !== receipt.version || !actions.allowedActions.includes('Submit'))
          throw new Error('Phiếu đã đổi trạng thái hoặc bạn không còn quyền gửi. Đóng form và tải lại phiếu để kiểm tra.');
        const body = { ...submission, expectedVersion: receipt.version };
        submitCommand.current = receiptCommand(submitCommand.current, { receiptId: id, ...body });
        submitSnapshot.current = { id, body: { ...body, commandId: submitCommand.current.commandId } };
      }
      try {
        await draft.beforeSubmit({ operation: 'SubmitReceipt', ...submitCommand.current!, expectedVersion: submitSnapshot.current.body.expectedVersion,
          documentId: context.documentId, receiptId: submitSnapshot.current.id }, true);
        await receivingApi.submit(submitSnapshot.current.id, submitSnapshot.current.body, assertSubmitContext);
        evidence?.documents.markAttached(submitSnapshot.current.body.documentEvidenceIds ?? []);
        evidence?.refusal.markAttached(submitSnapshot.current.body.refusalEvidenceIds ?? []);
        uncertainSubmit.current = false;
      } catch (failure) {
        if (!uncertainSubmit.current && isApiErrorResponse(failure) && [400, 422].includes(failure.statusCode)) {
          // Save is known to have succeeded. Continue editing that draft, never create a replacement receipt.
          const version = submitSnapshot.current.body.expectedVersion;
          await draft.clear(true);
          context.rememberReceipt(id);
          savedReceipt.current = null; submitSnapshot.current = null; submitCommand.current = null; command.current = null;
          setTarget({ ...original, receiptId: id, version });
          setFrozen(false); setSavedNotice('Phiếu đã lưu nháp. Vui lòng sửa thông tin bị từ chối rồi gửi duyệt lại.');
          void context.refreshWarehouse();
        } else uncertainSubmit.current = true;
        throw failure;
      }
      return { id, key: original.key, clear: () => draft.clear(true) };
    },
    onSettled: () => draft.settled(), onError: logApiError,
    onSuccess: async (result) => {
      await result.clear();
      if (result.key !== context.contextKey) return;
      try { context.assertCurrent(P.GOODS_RECEIPTS_CREATE); } catch { return; }
      context.rememberReceipt(result.id); setTarget(null); setFrozen(false); setSavedNotice(null); form.reset(); await context.refreshWarehouse();
    },
  });
  function begin() {
    if (lock.current || !context.permission(P.GOODS_RECEIPTS_CREATE)) return;
    mutation.reset(); setDiscard(false);
    savedReceipt.current = null; submitSnapshot.current = null; submitCommand.current = null;
    uncertainSave.current = false; uncertainSubmit.current = false;
    setFrozen(false); setSavedNotice(null);
    if (context.receiptId) {
      if (!context.receipt.data || !context.allowed('Update')) return;
      const receipt = context.receipt.data;
      form.reset(receiptToForm(receipt));
      setTarget({ key: context.contextKey, session: ++session.current, receiptId: receipt.id, version: receipt.version,
        task: context.task.data ?? null, correction: !!receipt.arrivalConfirmedAt });
    } else {
      if (!context.task.data || context.task.isFetching || context.task.isError) return;
      form.reset({ receiptCode: '', lines: [] });
      codeEdited.current = false;
      setTarget({ key: context.contextKey, session: ++session.current, receiptId: null, version: context.task.data.version,
        task: context.task.data, correction: false });
    }
  }
  function addLine(inboundRequestItemId: string) {
    if (!visible || lock.current || target?.correction) return;
    const line = target?.task?.lines.find(item => item.inboundRequestItemId === inboundRequestItemId);
    if (!line || form.getValues('lines').some(item => item.inboundRequestItemId === inboundRequestItemId)) return;
    fields.append({ inboundRequestItemId, enteredUnitId: line.baseUnitId, receivedQty: Number.NaN, damagedQty: 0, rejectedQty: 0,
      exceptionReason: '', lotNumber: '', manufacturedDate: '', expiryDate: '' });
  }
  async function save(submission?: ReceiptSubmission) {
    await form.handleSubmit(async values => {
      if (lock.current || !visible || (mutation.error instanceof ApiError && mutation.error.statusCode === 409)) return;
      lock.current = true;
      try { await mutation.mutateAsync(frozen && mutation.variables ? mutation.variables : { values, submission }); } catch { /* Keep the exact payload for explicit retry after an uncertain response. */ }
      finally { lock.current = false; }
    })();
  }
  function close() { if (!lock.current) {
    if (savedReceipt.current?.key === context.contextKey) {
      context.rememberReceipt(savedReceipt.current.id); setTarget(null); void context.refreshWarehouse();
    } else if (frozen) {
      // Keep the pending draft marker until the server result has been reconciled.
      setTarget(null); void context.refreshWarehouse();
    } else setTarget(null);
  } }
  return { form, fields, target: visible ? target : null, mutation, discard, setDiscard, begin, addLine, save, close,
    codeSuggestion, markCodeEdited: () => { codeEdited.current = true; },
    frozen, savedNotice,
    discardChanges: () => { if (!lock.current) { void draft.discardAndClose(() => { setDiscard(false); setTarget(null); form.reset(); }); } } };
}
