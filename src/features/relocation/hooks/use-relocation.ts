import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useFormDraft } from '@/hooks/use-form-draft';

import { P } from '@/config/permission-codes';
import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { taskScopeMatches, type TaskScope } from '@/features/my-tasks/my-tasks';
import { myTasksApi } from '@/features/my-tasks/my-tasks.api';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { profileQueryKey, warehouseSnapshot } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { getApiErrorKind, logApiError } from '@/lib/api-error';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { warehouseCommand, type WarehouseCommandMemory } from '@/lib/warehouse-command';

import { assertRelocation, assertRelocationScope, relocationDestinations } from '../relocation';
import { relocationApi } from '../relocation.api';
import { relocationFormSchema, type RelocationCommand, type RelocationForm, type RelocationLine } from '../relocation.schema';

type Target = { key: string; version: string; action: 'Start' } |
  { key: string; version: string; action: 'Execute'; values: RelocationForm; body: RelocationCommand; destinationCode: string };
const sourcePermissions = [P.INVENTORY_VIEW, P.PRODUCTS_VIEW, P.UNITS_VIEW] as const;

export function useRelocation(taskId: string) {
  const access = useWarehouseAccess();
  const client = useQueryClient();
  const { identity, warehouseId, signature, revision } = access.selection;
  const validId = nonEmptyDotNetGuidSchema('Mã công việc không hợp lệ.').safeParse(taskId).success;
  const canView = access.ready && validId && !!access.profile.data?.permissions.includes(P.WAREHOUSE_TASKS_VIEW_OWN);
  const canManage = canView && !!access.profile.data?.permissions.includes(P.WAREHOUSE_TASKS_MANAGE_OWN);
  const canReadSource = canManage && sourcePermissions.every(permission => access.profile.data?.permissions.includes(permission));
  const canAssign = !!access.profile.data?.permissions.includes(P.WAREHOUSE_TASKS_ASSIGN);
  const scope: TaskScope | null = canView && identity && warehouseId && signature ? { identity, warehouseId, signature, revision } : null;
  const prefix = ['warehouse', identity, warehouseId, revision, 'relocation', taskId, signature];
  const contextKey = JSON.stringify(prefix);
  const detail = useQuery({ queryKey: prefix, enabled: !!scope, retry: false,
    queryFn: ({ signal }) => relocationApi.load(taskId, scope!.warehouseId, access.profile.data!.id, signal) });
  const hidden = ['unauthorized', 'forbidden', 'notFound'].includes(getApiErrorKind(detail.error));
  const task = canView && !hidden ? detail.data : undefined;
  const fresh = !!task && detail.isSuccess && !detail.isFetching && !detail.isError && !!task.rowVersion;
  const canStart = canManage && fresh && (task.executionStatus === 'Queued' || task.executionStatus === 'Paused');
  const canExecute = canReadSource && fresh && task.executionStatus === 'InProgress';
  const [editor, setEditor] = useState<{ key: string; version: string; line: RelocationLine } | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [notice, setNotice] = useState<{ key: string; message: string } | null>(null);
  const [request, setRequest] = useState<{ key: string; lineId: string; version: string; quantity: number } | null>(null);
  const [discard, setDiscard] = useState(false);
  const lock = useRef(false);
  const memory = useRef<WarehouseCommandMemory | null>(null);
  const form = useForm<RelocationForm>({ resolver: zodResolver(relocationFormSchema), defaultValues: {
    lineId: '', quantity: Number.NaN, destinationSlotId: '', sourceScan: '', destinationScan: '', productScan: '', overrideReason: '',
  } });
  const quantity = useWatch({ control: form.control, name: 'quantity' });
  const destinationId = useWatch({ control: form.control, name: 'destinationSlotId' });
  const activeEditor = editor?.key === contextKey && canExecute && editor.version === task?.rowVersion ? editor : null;
  const draft = useFormDraft({ form, feature: 'relocation', documentId: taskId, lineId: editor?.line.id, version: editor?.version ?? target?.version,
    enabled: (editor?.key === contextKey || target?.key === contextKey) && canView, assertCurrent: () => {
      if (!scope || !taskScopeMatches(scope, useWarehouseSelection.getState()) || !useAuth.getState().signedIn ||
        !(target?.action === 'Start' ? canStart : canExecute) || task?.rowVersion !== (editor?.version ?? target?.version)) throw new Error('Công việc chuyển vị trí đã thay đổi.');
    } });
  const source = useQuery({ queryKey: [...prefix, 'source', activeEditor?.line.id, activeEditor?.version],
    enabled: !!activeEditor, retry: false, queryFn: ({ signal }) => relocationApi.source(warehouseId!, activeEditor!.line, signal) });
  const validRequest = !!activeEditor && request?.key === contextKey && request.lineId === activeEditor.line.id && request.version === activeEditor.version;
  const recommendations = useQuery({ queryKey: [...prefix, 'recommendations', request?.lineId, request?.version, request?.quantity],
    enabled: validRequest, retry: false,
    queryFn: ({ signal }) => relocationApi.recommendations(taskId, request!.lineId, request!.quantity, signal) });
  const recommendationsFresh = validRequest && request?.quantity === quantity && recommendations.isSuccess &&
    !recommendations.isFetching && !recommendations.isError;
  const destinations = activeEditor && recommendationsFresh ? relocationDestinations(activeEditor.line, recommendations.data ?? [], canAssign) : [];
  const selectedDestination = destinations.find(row => row.id.toLowerCase() === destinationId.toLowerCase());
  function assertCurrent(original: Target) {
    const profile = client.getQueryData<UserProfile>(profileQueryKey);
    const snapshot = profile ? warehouseSnapshot(profile) : null;
    const latest = client.getQueryData<typeof task>(prefix);
    const queryState = client.getQueryState(prefix);
    if (!scope || !taskScopeMatches(scope, useWarehouseSelection.getState()) || !useAuth.getState().signedIn ||
      !snapshot?.activeUser || !snapshot.compatible || snapshot.identity !== scope.identity || snapshot.signature !== scope.signature ||
      !profile?.permissions.includes(P.WAREHOUSE_TASKS_VIEW_OWN) || !profile.permissions.includes(P.WAREHOUSE_TASKS_MANAGE_OWN) ||
      !latest || latest.rowVersion !== original.version || queryState?.status !== 'success' || queryState.fetchStatus !== 'idle' || original.key !== contextKey)
      throw new Error('Kho, quyền hoặc phiên bản công việc đã thay đổi. Vui lòng tải lại.');
    assertRelocationScope(latest, taskId, scope.warehouseId, profile.id);
    if (original.action === 'Start' && !['Queued', 'Paused'].includes(latest.executionStatus))
      throw new Error('Công việc không còn ở trạng thái có thể bắt đầu.');
    if (original.action === 'Execute') {
      if (!canExecute || !sourcePermissions.every(permission => profile.permissions.includes(permission)) || !source.isSuccess || source.isFetching ||
        !recommendationsFresh || !source.data || !activeEditor) throw new Error('Tải lại tồn nguồn và gợi ý trước khi xác nhận.');
      assertRelocation(original.values, latest, activeEditor.line, source.data, recommendations.data ?? [],
        profile.permissions.includes(P.WAREHOUSE_TASKS_ASSIGN));
    }
  }
  const mutation = useMutation<unknown, Error, Target>({ retry: false, mutationFn: async original => {
    const guard = () => assertCurrent(original); guard();
    const sending = original.action === 'Execute' ? { commandId: original.body.commandId, content: JSON.stringify(original.body) }
      : (memory.current = warehouseCommand(memory.current, { taskId, action: 'Start', version: original.version }));
    return draft.execute({ operation: original.action, ...sending, documentId: taskId, expectedVersion: original.version },
      () => original.action === 'Start' ? myTasksApi.action('Relocation', taskId, { action: 'Start', reason: '' }, guard)
        : relocationApi.execute(taskId, original.body, guard), () => { memory.current = null; });
  }, onSettled: () => draft.settled(), onError: logApiError, onSuccess: async (_, original) => {
    if (original.key !== contextKey) return;
    await draft.clear(true);
    setTarget(null); setEditor(null); setRequest(null); form.reset();
    setNotice({ key: contextKey, message: original.action === 'Start' ? 'Đã bắt đầu công việc chuyển vị trí.' : 'Đã ghi nhận chuyển vị trí. Tổng tồn của kho không thay đổi.' });
    await client.invalidateQueries({ queryKey: ['warehouse', identity, warehouseId, revision] });
  } });
  function openLine(line: RelocationLine) {
    if (!canExecute || !task?.rowVersion || line.remainingQuantity <= 0 || lock.current) return;
    mutation.reset(); setTarget(null); setRequest(null); setDiscard(false); setNotice(null);
    form.reset({ lineId: line.id, quantity: Number.NaN, destinationSlotId: '', sourceScan: '', destinationScan: '', productScan: '', overrideReason: '' });
    setEditor({ key: contextKey, version: task.rowVersion, line });
  }
  async function loadRecommendations() {
    if (!activeEditor || lock.current || !(await form.trigger('quantity'))) return;
    if (quantity > activeEditor.line.remainingQuantity) { form.setError('quantity', { message: 'Số lượng vượt phần công việc còn lại.' }); return; }
    const next = { key: contextKey, lineId: activeEditor.line.id, version: activeEditor.version, quantity };
    if (validRequest && request.quantity === quantity) await recommendations.refetch(); else setRequest(next);
    form.setValue('destinationSlotId', ''); form.setValue('destinationScan', '');
  }
  async function review() {
    await form.handleSubmit(values => {
      if (!activeEditor || !task?.rowVersion || !source.data || !source.isSuccess || source.isFetching || !recommendationsFresh || lock.current) return;
      try {
        const destination = assertRelocation(values, task, activeEditor.line, source.data, recommendations.data ?? [], canAssign);
        setNotice(null);
        const payload = { lineId: values.lineId, destinationSlotId: values.destinationSlotId, quantity: values.quantity,
          expectedVersion: task.rowVersion, overrideReason: values.overrideReason.trim() || null };
        memory.current = warehouseCommand(memory.current, { taskId, contextKey, ...payload });
        mutation.reset(); setTarget({ key: contextKey, version: task.rowVersion, action: 'Execute', values,
          body: { ...payload, commandId: memory.current.commandId }, destinationCode: destination.code });
      } catch (error) { setNotice({ key: contextKey, message: error instanceof Error ? error.message : 'Dữ liệu chưa hợp lệ.' }); }
    })();
  }
  async function confirm() {
    if (!target || lock.current) return;
    lock.current = true;
    try { await mutation.mutateAsync(target); } catch { /* Keep frozen command for an explicit retry after a network failure. */ }
    finally { lock.current = false; }
  }
  return { access, validId, canView, canManage, canReadSource, canStart, canExecute, task, detail, form, source, recommendations,
    recommendationsFresh, destinations, selectedDestination, activeEditor, mutation, contextKey, loadRecommendations, review, confirm,
    target: target?.key === contextKey && fresh && target.version === task?.rowVersion ? target : null,
    notice: notice?.key === contextKey ? notice.message : null, openLine, discard: discard && !!activeEditor,
    start: () => { if (canStart && task?.rowVersion && !lock.current) { mutation.reset(); setTarget({ key: contextKey, version: task.rowVersion, action: 'Start' }); } },
    cancelConfirmation: () => { if (!lock.current) setTarget(null); },
    closeEditor: () => { if (!lock.current) { setEditor(null); setTarget(null); } },
    discardChanges: () => { if (!lock.current) { void draft.discardAndClose(() => { setEditor(null); setTarget(null); setDiscard(false); form.reset(); }); } },
    cancelDiscard: () => setDiscard(false),
    selectDestination: (destinationSlotId: string) => { form.setValue('destinationSlotId', destinationSlotId, { shouldDirty: true, shouldValidate: true }); form.setValue('destinationScan', ''); },
    refresh: async () => { if (!lock.current) { setTarget(null); setEditor(null); setRequest(null); await access.refresh(); await detail.refetch(); } },
  };
}
