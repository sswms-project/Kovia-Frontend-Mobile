import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import { P } from '@/config/permission-codes';
import { ApiError } from '@/lib/api';
import { logApiError } from '@/lib/api-error';

import { assertReceiptCorrection, assertReceiptQuantities, receiptCommand, receiptToForm, type ReceiptCommandMemory } from '../receiving';
import { receivingApi } from '../receiving.api';
import { createReceiptFormSchema, updateReceiptFormSchema, type ReceiptForm, type ReceivingTask } from '../receiving.schema';
import type { ReceiptContext } from './use-receipt-context';

export function useReceiptEditor(context: ReceiptContext) {
  const [target, setTarget] = useState<{ key: string; receiptId: string | null; version: string; task: ReceivingTask | null; correction: boolean } | null>(null);
  const [discard, setDiscard] = useState(false);
  const lock = useRef(false);
  const command = useRef<ReceiptCommandMemory | null>(null);
  const visible = target?.key === context.contextKey;
  const form = useForm<ReceiptForm>({ resolver: zodResolver(target?.receiptId ? updateReceiptFormSchema : createReceiptFormSchema),
    defaultValues: { receiptCode: '', lines: [] } });
  const fields = useFieldArray({ control: form.control, name: 'lines' });
  const mutation = useMutation<string, Error, ReceiptForm>({ retry: false,
    mutationFn: async (values: ReceiptForm) => {
      if (!target || target.key !== context.contextKey) throw new Error('Công việc đã thay đổi.');
      const original = target;
      const assertCurrentContext = () => {
        context.assertCurrent(P.GOODS_RECEIPTS_CREATE);
        if (original.receiptId) context.assertAction('Update', original.version, P.GOODS_RECEIPTS_CREATE);
        else if (context.task.isError || context.task.isFetching || context.task.data?.version !== original.version ||
          context.task.data?.activeGoodsReceiptId || context.task.data?.assignedTo !== context.userId)
          throw new Error('Yêu cầu nhận hoặc phân công đã thay đổi. Vui lòng tải lại.');
      };
      assertCurrentContext();
      if (original.task && !original.correction) assertReceiptQuantities(values, original.task);
      if (original.correction && context.receipt.data) assertReceiptCorrection(values, context.receipt.data);
      if (original.receiptId) {
        const body = { ...values, expectedVersion: original.version };
        command.current = receiptCommand(command.current, { receiptId: original.receiptId, ...body });
        await receivingApi.update(original.receiptId, { ...body, commandId: command.current.commandId }, assertCurrentContext);
        return original.receiptId;
      }
      const body = { ...values, inboundRequestId: context.documentId, expectedInboundVersion: original.version };
      command.current = receiptCommand(command.current, body);
      return receivingApi.create({ ...body, commandId: command.current.commandId }, assertCurrentContext);
    },
    onError: logApiError,
    onSuccess: async (id) => { context.rememberReceipt(id); setTarget(null); form.reset(); await context.refreshWarehouse(); },
  });
  function begin() {
    if (lock.current || !context.permission(P.GOODS_RECEIPTS_CREATE)) return;
    mutation.reset(); setDiscard(false);
    if (context.receiptId) {
      if (!context.receipt.data || !context.allowed('Update')) return;
      const receipt = context.receipt.data;
      form.reset(receiptToForm(receipt));
      setTarget({ key: context.contextKey, receiptId: receipt.id, version: receipt.version,
        task: context.task.data ?? null, correction: !!receipt.arrivalConfirmedAt });
    } else {
      if (!context.task.data || context.task.isFetching || context.task.isError) return;
      form.reset({ receiptCode: '', lines: [] });
      setTarget({ key: context.contextKey, receiptId: null, version: context.task.data.version,
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
  async function save() {
    await form.handleSubmit(async values => {
      if (lock.current || !visible || (mutation.error instanceof ApiError && mutation.error.statusCode === 409)) return;
      lock.current = true;
      try { await mutation.mutateAsync(values); } catch { /* The editor retains input and the server error for retry. */ }
      finally { lock.current = false; }
    })();
  }
  function close() { if (!lock.current) { if (form.formState.isDirty) setDiscard(true); else setTarget(null); } }
  return { form, fields, target: visible ? target : null, mutation, discard, setDiscard, begin, addLine, save, close,
    discardChanges: () => { if (!lock.current) { setDiscard(false); setTarget(null); form.reset(); } } };
}
