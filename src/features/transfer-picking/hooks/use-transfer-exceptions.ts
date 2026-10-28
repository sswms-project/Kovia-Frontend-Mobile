import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner-native';
import { useFormDraft } from '@/hooks/use-form-draft';
import { warehouseCommand, type WarehouseCommandMemory } from '@/lib/warehouse-command';
import { logApiError, getApiErrorMessage } from '@/lib/api-error';
import { transferExceptionFormSchema, type TransferExceptionForm } from '../transfer-exception.schema';
import { assertTransferException } from '../transfer-exception';
import type { TransferPickLine } from '../transfer-picking.schema';
import { transferPickingApi } from '../transfer-picking.api';
import type { useTransferPicking } from './use-transfer-picking';

type Execution = ReturnType<typeof useTransferPicking>;
interface Target { key: string; version: string; values: TransferExceptionForm }
export function useTransferExceptions(transferId: string, shipmentId: string, execution: Execution) {
  const client = useQueryClient();
  const latest = useRef(execution);
  useLayoutEffect(() => { latest.current = execution; });
  const [editor, setEditor] = useState<{ key: string; version: string; lineId: string; action: TransferExceptionForm['action'] } | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const lock = useRef(false);
  const memory = useRef<WarehouseCommandMemory | null>(null);
  const attempted = useRef(false);
  const form = useForm<TransferExceptionForm>({ resolver: zodResolver(transferExceptionFormSchema), defaultValues: {
    action: 'Escalate', lineId: '', fromInventoryStockId: '', toInventoryStockId: '', pickDetailId: '',
    quantity: 0, reasonCode: 'InsufficientAtLocation', note: '', scannedSlotCode: '',
  } });
  const action = editor?.action ?? 'Escalate';
  const visible = !!editor && editor.key === execution.contextKey && editor.version === execution.detail.data?.sheet.version && execution.canPick;
  const line = execution.detail.data?.sheet.lines.find(item => item.lineId === editor?.lineId);
  const alternatives = useQuery({ queryKey: ['warehouse', execution.access.selection.identity,
    execution.access.selection.warehouseId, execution.access.selection.revision, 'pick-alternatives', execution.contextKey, editor?.version, editor?.lineId],
    enabled: visible && action === 'Switch', retry: false,
    queryFn: ({ signal }) => transferPickingApi.alternatives(transferId, shipmentId, editor!.lineId, signal) });
  function guard(original: Pick<Target, 'key' | 'version'>) { latest.current.assertExecution(original.key, original.version); }
  const draft = useFormDraft({ form, feature: 'transfer-pick-exception', documentId: `${transferId}:${shipmentId}`,
    lineId: editor ? `${editor.lineId}:${editor.action}` : undefined, version: editor?.version, enabled: visible,
    assertCurrent: () => { if (!editor) throw new Error('Biểu mẫu đã đóng.'); guard(editor); } });
  const mutation = useMutation<unknown, Error, Target>({ retry: false, mutationFn: async (original: Target) => {
    guard(original);
    const values = transferExceptionFormSchema.parse(original.values);
    assertTransferException(values, latest.current.detail.data!.sheet, alternatives.data ?? []);
    if (values.action === 'Switch' && (alternatives.isFetching || alternatives.isError)) throw new Error('Tải lại danh sách vị trí mới trước khi tiếp tục.');
    guard(original);
    if (!attempted.current) {
      const fresh = await transferPickingApi.load(transferId, shipmentId, execution.access.selection.warehouseId!,
        execution.access.profile.data!.id);
      guard(original);
      if (fresh.sheet.version !== original.version) throw new Error('Đợt lấy hàng đã thay đổi. Hãy tải lại trước khi tiếp tục.');
    }
    const base = { transferId, shipmentId };
    const body = values.action === 'Switch' ? { ...base, lineId: values.lineId, fromInventoryStockId: values.fromInventoryStockId,
      toInventoryStockId: values.toInventoryStockId, quantity: values.quantity, reasonCode: values.reasonCode, note: values.note }
      : values.action === 'Escalate' ? { ...base, lineId: values.lineId, reasonCode: values.reasonCode, note: values.note }
        : { ...base, pickDetailId: values.pickDetailId, quantity: values.quantity, scannedSlotCode: values.scannedSlotCode };
    memory.current = warehouseCommand(memory.current, { action: values.action, context: original.key, ...body });
    const commandId = memory.current.commandId;
    const current = () => guard(original);
    return draft.execute({ operation: values.action, ...memory.current, documentId: `${transferId}:${shipmentId}`, expectedVersion: original.version }, () => {
      attempted.current = true;
      if (values.action === 'Switch') return transferPickingApi.switch({ ...base, lineId: values.lineId,
      fromInventoryStockId: values.fromInventoryStockId, toInventoryStockId: values.toInventoryStockId,
      quantity: values.quantity, reasonCode: values.reasonCode, note: values.note, commandId }, current);
      if (values.action === 'Escalate') return transferPickingApi.escalate({ ...base, lineId: values.lineId,
      reasonCode: values.reasonCode, note: values.note, commandId }, current);
      return transferPickingApi.returnPick({ ...base, pickDetailId: values.pickDetailId, quantity: values.quantity,
      scannedSlotCode: values.scannedSlotCode, commandId }, current);
    }, () => { attempted.current = false; memory.current = null; });
  }, onSettled: () => draft.settled(), onError: logApiError, onSuccess: async (_, original) => {
    if (latest.current.contextKey !== original.key) return;
    await draft.clear(true); setTarget(null); setEditor(null);
    toast.success(original.values.action === 'Return' ? 'Đã xác nhận trả hàng về vị trí. Tổng tồn kho không đổi.'
      : original.values.action === 'Switch' ? 'Đã đổi nguồn giữ chỗ. Hãy lấy hàng tại vị trí mới.' : 'Đã báo quản lý. Dòng hàng đang chờ xử lý.');
    await client.invalidateQueries({ queryKey: ['warehouse', execution.access.selection.identity, execution.access.selection.warehouseId,
      execution.access.selection.revision] });
    await client.invalidateQueries({ queryKey: ['notifications'] });
  } });
  function open(action: TransferExceptionForm['action'], line: TransferPickLine) {
    if (!execution.canPick || !execution.detail.data?.sheet.version || lock.current) return;
    mutation.reset(); setError(null); setTarget(null); memory.current = null; attempted.current = false;
    form.reset({ action, lineId: line.lineId, fromInventoryStockId: '', toInventoryStockId: '', pickDetailId: '',
      quantity: 0, reasonCode: 'InsufficientAtLocation', note: '', scannedSlotCode: '' });
    setEditor({ key: execution.contextKey, version: execution.detail.data.sheet.version, lineId: line.lineId, action });
  }
  function close() {
    if (lock.current) return;
    setEditor(null); setTarget(null);
  }
  return { form, action, line, visible, alternatives, error: error ?? mutation.error, mutation, open, close, target: visible ? target : null,
    review: () => form.handleSubmit(values => {
      try {
        if (!editor || !visible || lock.current || attempted.current) throw new Error('Hãy kiểm tra kết quả thao tác trước trước khi sửa nội dung.');
        guard(editor); assertTransferException(values, execution.detail.data!.sheet, alternatives.data ?? []);
        setError(null); setTarget({ ...editor, values: { ...values } });
      } catch (failure) { setError(new Error(getApiErrorMessage(failure))); }
    })(),
    cancel: () => { if (!lock.current) { if (attempted.current) close(); else setTarget(null); } },
    confirm: async () => {
      if (!target || lock.current) return;
      lock.current = true;
      try { await mutation.mutateAsync(target); } catch { /* Exact command remains available for explicit retry. */ }
      finally { lock.current = false; }
    },
  };
}
