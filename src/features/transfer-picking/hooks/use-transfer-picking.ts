import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useFormDraft } from '@/hooks/use-form-draft';

import { P } from '@/config/permission-codes';
import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { taskScopeMatches, type TaskScope } from '@/features/my-tasks/my-tasks';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { profileQueryKey, warehouseSnapshot } from '@/features/warehouse-access/warehouse-access';
import { logApiError } from '@/lib/api-error';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { warehouseCommand, type WarehouseCommandMemory } from '@/lib/warehouse-command';

import { assertTransferPick, transferPickingComplete } from '../transfer-picking';
import { transferPickingApi } from '../transfer-picking.api';
import { transferPickFormSchema, type TransferPickForm, type TransferPickLine } from '../transfer-picking.schema';

type Target = { key: string; version: string; action: 'Pick' | 'Complete'; values?: TransferPickForm; stagingSlotId?: string };
export function useTransferPicking(transferId: string, shipmentId: string) {
  const access = useWarehouseAccess();
  const client = useQueryClient();
  const validId = [transferId, shipmentId].every(value => nonEmptyDotNetGuidSchema('Mã điều chuyển không hợp lệ.').safeParse(value).success);
  const canView = access.ready && validId && !!access.profile.data?.permissions.includes(P.TRANSFERS_VIEW);
  const { identity, warehouseId, signature, revision } = access.selection;
  const scope: TaskScope | null = canView && identity && warehouseId && signature ? { identity, warehouseId, signature, revision } : null;
  const prefix = ['warehouse', identity, warehouseId, revision, 'transfer-pick', transferId, shipmentId];
  const contextKey = JSON.stringify([...prefix, signature]);
  const detail = useQuery({ queryKey: [...prefix, signature], enabled: !!scope, retry: false,
    queryFn: ({ signal }) => transferPickingApi.load(transferId, shipmentId, scope!.warehouseId, access.profile.data!.id, signal) });
  const [editor, setEditor] = useState<{ key: string; version: string; line: TransferPickLine; slotCode: string } | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [notice, setNotice] = useState<{ key: string; message: string } | null>(null);
  const [discard, setDiscard] = useState(false);
  const [stagingChoice, setStagingChoice] = useState<{ key: string; id: string } | null>(null);
  const lock = useRef(false);
  const command = useRef<WarehouseCommandMemory | null>(null);
  const form = useForm<TransferPickForm>({ resolver: zodResolver(transferPickFormSchema), defaultValues: {
    lineId: '', inventoryStockId: '', quantity: Number.NaN, scannedSlotCode: '', scannedProductCode: '' } });
  const data = detail.data;
  const canPick = canView && !!access.profile.data?.permissions.includes(P.TRANSFERS_PICK) &&
    detail.isSuccess && !detail.isFetching && !detail.isError && !!data?.sheet.version &&
    data.document.status === 'InProgress' && data.sheet.shipmentStatus === 'Picking' &&
    (data.shipment.pickTaskStatus === 'Queued' || data.shipment.pickTaskStatus === 'InProgress');
  const stagingSlotId = data?.sheet.outboundStagingSlotId ?? (stagingChoice?.key === contextKey ? stagingChoice.id : data?.sheet.stagingPoints?.suggestedSlotId) ?? '';
  const staged = (data?.sheet.outboundStagingFlowVersion ?? 0) > 0;
  const validStaging = !staged || !!data?.sheet.stagingPoints?.items.some(point => point.slotId === stagingSlotId);
  const canComplete = canPick && !!data && transferPickingComplete(data.sheet) && validStaging;
  function assertCurrent(original: Target) {
    const profile = client.getQueryData<UserProfile>(profileQueryKey);
    const snapshot = profile ? warehouseSnapshot(profile) : null;
    if (!scope || !taskScopeMatches(scope, useWarehouseSelection.getState()) || !useAuth.getState().signedIn ||
      !snapshot?.activeUser || !snapshot.compatible || snapshot.identity !== scope.identity || snapshot.signature !== scope.signature ||
      !snapshot.warehouses.some(value => value.id === scope.warehouseId) || !profile?.permissions.includes(P.TRANSFERS_VIEW) ||
      !profile.permissions.includes(P.TRANSFERS_PICK) || original.key !== contextKey || !canPick ||
      original.version !== data?.sheet.version || (original.action === 'Complete' && !canComplete))
      throw new Error('Kho, quyền hoặc đợt xuất đã thay đổi. Vui lòng tải lại công việc.');
  }
  const draft = useFormDraft({ form, feature: 'transfer-pick', documentId: `${transferId}:${shipmentId}`,
    lineId: editor ? `${editor.line.lineId}:${form.getValues('inventoryStockId')}` : undefined, version: editor?.version,
    enabled: editor?.key === contextKey && canView && !!access.profile.data?.permissions.includes(P.TRANSFERS_PICK),
    assertCurrent: () => assertCurrent({ key: contextKey, action: 'Pick', version: editor?.version ?? '' }) });
  const mutation = useMutation<unknown, Error, Target>({ retry: false, mutationFn: async original => {
    const guard = () => assertCurrent(original); guard();
    if (original.action === 'Pick') {
      await draft.beforeSubmit();
      const values = transferPickFormSchema.parse(original.values);
      assertTransferPick(values, data!.sheet);
      const body = { transferId, shipmentId, ...values };
      command.current = warehouseCommand(command.current, { ...body, contextKey, version: original.version });
      return transferPickingApi.pick({ ...body, commandId: command.current.commandId }, guard);
    }
    const body = { transferId, shipmentId, expectedVersion: original.version,
      ...(original.stagingSlotId ? { outboundStagingSlotId: original.stagingSlotId } : {}) };
    command.current = warehouseCommand(command.current, { action: 'Complete', contextKey, ...body });
    return transferPickingApi.complete({ ...body, commandId: command.current.commandId }, guard);
  }, onError: logApiError, onSuccess: async (_, original) => {
    if (original.key !== contextKey) return;
    if (original.action === 'Pick') await draft.clear();
    setTarget(null); setEditor(null); form.reset();
    setNotice({ key: contextKey, message: original.action === 'Pick' ? 'Đã ghi nhận số lượng thực tế lấy. Tổng tồn kho chưa giảm.'
      : 'Đã hoàn tất lấy hàng. Hàng chờ người có quyền xác nhận xuất thực tế.' });
    await client.invalidateQueries({ queryKey: ['warehouse', identity, warehouseId, revision] });
  } });
  function beginPick(line: TransferPickLine, inventoryStockId: string) {
    const source = line.suggestions.find(value => value.inventoryStockId === inventoryStockId);
    if (!canPick || !source || !data?.sheet.version || lock.current) return;
    mutation.reset(); setNotice(null); setDiscard(false);
    form.reset({ lineId: line.lineId, inventoryStockId, quantity: Number.NaN, scannedSlotCode: '', scannedProductCode: '' });
    setEditor({ key: contextKey, version: data.sheet.version, line, slotCode: source.slotCode });
  }
  async function review() {
    await form.handleSubmit(values => {
      if (!canPick || editor?.key !== contextKey || lock.current) return;
      try { assertTransferPick(values, data!.sheet); setNotice(null); setTarget({ key: contextKey, version: editor.version, action: 'Pick', values }); }
      catch (error) { setNotice({ key: contextKey, message: error instanceof Error ? error.message : 'Dữ liệu chưa hợp lệ.' }); }
    })();
  }
  function beginComplete() {
    if (!canComplete || !data?.sheet.version || lock.current) return;
    mutation.reset(); setTarget({ key: contextKey, version: data.sheet.version, action: 'Complete', stagingSlotId: staged ? stagingSlotId : undefined });
  }
  async function confirm() {
    if (!target || lock.current) return;
    lock.current = true;
    try { await mutation.mutateAsync(target); } catch { /* Keep the same command for an explicit retry. */ }
    finally { lock.current = false; }
  }
  const activeEditor = editor?.key === contextKey && canPick && editor.version === data?.sheet.version ? editor : null;
  return { access, validId, canView, detail, canPick, canComplete, form, mutation, contextKey, beginPick, review, beginComplete, confirm,
    assertExecution: (key: string, version: string) => assertCurrent({ key, version, action: 'Pick' }),
    staged, stagingSlotId, chooseStaging: (id: string) => {
      if (!lock.current && !data?.sheet.outboundStagingSlotId && data?.sheet.stagingPoints?.items.some(point => point.slotId === id))
        { setTarget(null); setStagingChoice({ key: contextKey, id }); }
    },
    editor: activeEditor, target: target?.key === contextKey && canPick && target.version === data?.sheet.version ? target : null,
    notice: notice?.key === contextKey ? notice.message : null, discard: discard && !!activeEditor, setDiscard,
    refresh: async () => { if (lock.current) return; setTarget(null); setEditor(null); await access.refresh(); await detail.refetch(); },
    closeEditor: () => { if (!lock.current) { if (form.formState.isDirty) setDiscard(true); else setEditor(null); } },
    discardChanges: () => { if (!lock.current) { void draft.clear(); setEditor(null); setDiscard(false); form.reset(); } },
    cancelConfirmation: () => { if (!lock.current) setTarget(null); } };
}
