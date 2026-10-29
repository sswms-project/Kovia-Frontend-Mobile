import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useFormDraft } from '@/hooks/use-form-draft';
import { useExitProtection, useModalExit } from '@/hooks/use-screen-exit';
import { getApiErrorMessage } from '@/lib/api-error';
import { codesMatch } from '@/features/scanner/warehouse-scan';
import { transferAllocationSchema, type TransferAllocationForm, type TransferExecutionSlot } from '../transfer-execution.schema';
import { transferReceivingApi } from '../transfer-receiving.api';
import { buildTransferAllocations, transferAllocationEntries } from '../transfer-putaway-allocation';
import type { useTransferReceiving } from './use-transfer-receiving';
import { useTransferReceiptExecution } from './use-transfer-receipt-execution';

export function useTransferPutawayAllocation(state: ReturnType<typeof useTransferReceiving>, transferId: string, shipmentId: string) {
  const persistence = useRef<ReturnType<typeof useFormDraft> | null>(null);
  const execution = useTransferReceiptExecution(state, transferId, shipmentId, persistence);
  const [snapshot, setSnapshot] = useState<{ key: string; version: string; planVersion: string } | null>(null);
  const [picker, setPicker] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [scans, setScans] = useState<Record<string, { slot: string; product: string }>>({});
  const generation = useRef(0);
  const scanRequests = useRef<Record<number, number>>({});
  useEffect(() => () => { generation.current++; }, [execution.key, state.data?.receipt.version, state.data?.putAway?.planVersion]);
  const form = useForm<TransferAllocationForm>({ resolver: zodResolver(transferAllocationSchema), defaultValues: { lines: [] } });
  const fields = useFieldArray({ control: form.control, name: 'lines' });
  const values = useWatch({ control: form.control, name: 'lines' }) ?? [];
  const sheet = state.data?.putAway;
  const visible = !!snapshot && snapshot.key === execution.key && state.mode === 'PutAway' && state.canView;
  const resuming = execution.target?.action === 'Resume';
  const stale = !!snapshot && (snapshot.version !== state.data?.receipt.version || snapshot.planVersion !== sheet?.planVersion);
  const locked = execution.mutation.isPending || stale || !execution.allowed('PutAway');
  function assertCurrent() {
    if (execution.target?.action === 'Resume') { execution.assertCurrent(execution.target.body.expectedVersion); return; }
    if (!snapshot || snapshot.key !== execution.key || !visible || stale || !sheet) throw new Error('Phiếu hoặc kế hoạch đã thay đổi. Đóng và tải lại trước khi tiếp tục.');
    execution.assertCurrent(snapshot.version);
  }
  const draft = useFormDraft({ form, feature: 'transfer-putaway-allocation', documentId: `${transferId}:${shipmentId}`,
    version: snapshot ? `${snapshot.version}:${snapshot.planVersion}` : resuming ? execution.target?.body.expectedVersion : undefined,
    enabled: visible || resuming, assertCurrent });
  useEffect(() => { persistence.current = draft; });
  useExitProtection(() => ({ busy: execution.mutation.isPending, dirty: visible && Object.keys(scans).length > 0,
    discard: async () => { setScans({}); setTexts({}); } }));
  const close = useModalExit(() => { generation.current++; setSnapshot(null); setPicker(null); execution.cancel(); });
  const suggestions = useQuery({ queryKey: ['warehouse', execution.key, 'transfer-putaway-suggestions', snapshot?.version, snapshot?.planVersion],
    enabled: false, retry: false, queryFn: ({ signal }) => transferReceivingApi.suggestions(transferId, shipmentId, signal) });
  function resetScans() { generation.current++; setScans({}); setTexts({}); }
  function replacePlan() {
    if (locked || !sheet) return;
    fields.replace(buildTransferAllocations(sheet.rows).lines); resetScans(); setError(null);
  }
  return { pendingChange: state.realtime.changed, form, fields, values, sheet, execution, visible, stale, locked, picker, setPicker, error, texts, scans, suggestions,
    open: () => {
      if (!sheet || !state.data?.receipt.version || !execution.allowed('PutAway')) return;
      try {
        form.reset(buildTransferAllocations(sheet.rows)); resetScans(); setError(null);
        setSnapshot({ key: execution.key, version: state.data.receipt.version, planVersion: sheet.planVersion });
      } catch (failure) { setError(getApiErrorMessage(failure)); }
    }, close, replacePlan,
    applySuggestions: async () => {
      if (locked || !sheet || !snapshot) return;
      const epoch = generation.current;
      const result = await suggestions.refetch();
      if (epoch !== generation.current || result.isError || !result.data) return;
      try { assertCurrent(); fields.replace(buildTransferAllocations(sheet.rows, result.data).lines); resetScans(); setError(null); }
      catch (failure) { setError(getApiErrorMessage(failure)); }
    },
    add: (index: number) => {
      const line = values[index]; if (locked || !line || values.length >= 500) return;
      fields.append({ lineId: line.lineId!, lotId: line.lotId ?? null, slotCodeUnreadable: false, destination: null, quantity: '', reasonCode: null, note: '' }); resetScans();
    },
    remove: (index: number) => { if (!locked) { fields.remove(index); resetScans(); } },
    choose: (destination: TransferExecutionSlot) => {
      if (locked || picker === null) return;
      form.setValue(`lines.${picker}.destination`, destination, { shouldDirty: true }); setPicker(null); resetScans();
    },
    setUnreadable: (index: number, value: boolean) => {
      if (locked) return;
      form.setValue(`lines.${index}.slotCodeUnreadable`, value, { shouldDirty: true }); resetScans();
    },
    changeScan: (index: number, value: string) => {
      if (locked) return;
      scanRequests.current[index] = (scanRequests.current[index] ?? 0) + 1;
      setTexts(previous => ({ ...previous, [index]: value }));
      const destination = values[index]?.destination;
      if (destination) setScans(previous => ({ ...previous, [`${index}:${destination.id}`]: { slot: '', product: previous[`${index}:${destination.id}`]?.product ?? '' } }));
    },
    scanSlot: async (index: number, value: string) => {
      if (locked || !snapshot) return false;
      const line = form.getValues(`lines.${index}`); if (!line?.destination || line.slotCodeUnreadable) return false;
      const epoch = generation.current;
      const request = (scanRequests.current[index] ?? 0) + 1;
      scanRequests.current[index] = request;
      const current = () => epoch === generation.current && request === scanRequests.current[index];
      try {
        assertCurrent();
        const resolved = await transferReceivingApi.resolveSlot(state.data!.document.destinationWarehouseId, value);
        if (!current()) return false;
        if (resolved?.id !== line.destination.id) throw new Error('Mã không khớp vị trí đã chọn.');
        assertCurrent();
        const key = `${index}:${line.destination.id}`;
        setTexts(previous => ({ ...previous, [index]: value.trim() }));
        setScans(previous => ({ ...previous, [key]: { slot: value.trim(), product: previous[key]?.product ?? '' } }));
        setError(null); return true;
      } catch (failure) { if (current()) setError(getApiErrorMessage(failure)); return false; }
    },
    productScan: (index: number, value: string) => {
      if (locked) return false;
      const line = form.getValues(`lines.${index}`), product = state.data?.receipt.lines.find(row => row.lineId === line?.lineId);
      if (!line?.destination || !product || !codesMatch(value, product.sku, product.barcode)) { setError('Mã sản phẩm không đúng với dòng/lô đang cất.'); return false; }
      const key = `${index}:${line.destination.id}`;
      setScans(previous => ({ ...previous, [key]: { slot: previous[key]?.slot ?? '', product: value.trim() } })); setError(null); return true;
    },
    changeProduct: (index: number, value: string) => {
      if (locked) return;
      const destination = values[index]?.destination; if (!destination) return;
      const key = `${index}:${destination.id}`;
      setScans(previous => ({ ...previous, [key]: { slot: previous[key]?.slot ?? '', product: value } }));
    },
    review: async () => { await form.handleSubmit(parsed => {
      try {
        assertCurrent();
        execution.prepare({ action: 'PutAway', body: { expectedVersion: snapshot!.version, planVersion: snapshot!.planVersion,
          commandId: '', entries: transferAllocationEntries(parsed, sheet!, scans) } }); setError(null);
      } catch (failure) { setError(getApiErrorMessage(failure)); }
    }, () => setError('Dữ liệu phân bổ chưa hợp lệ. Kiểm tra các dòng trước khi xác nhận.'))(); },
    confirm: async () => { const success = await execution.confirm(); if (success) { generation.current++; setSnapshot(null); form.reset({ lines: [] }); resetScans(); } },
  };
}
