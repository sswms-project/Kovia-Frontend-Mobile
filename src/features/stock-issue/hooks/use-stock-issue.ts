import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { useIsFocused } from 'expo-router/react-navigation';
import { useNotificationRealtime } from '@/features/notifications/hooks/use-notification-realtime';
import { notificationSchema } from '@/features/notifications/notifications.schema';
import { useForm } from 'react-hook-form';
import { useFormDraft } from '@/hooks/use-form-draft';
import { formatInventoryLocation } from '@/features/inventory/inventory.labels';

import { P, type PermissionCode } from '@/config/permission-codes';
import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { taskScopeMatches, type TaskScope } from '@/features/my-tasks/my-tasks';
import { warehouseCommand, type WarehouseCommandMemory } from '@/lib/warehouse-command';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { profileQueryKey, warehouseSnapshot } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { getApiErrorMessage, logApiError } from '@/lib/api-error';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { assertPick, outstandingPicks } from '../stock-issue';
import { stockIssueApi } from '../stock-issue.api';
import { pickFormSchema, type PickForm, type StockIssueItem } from '../stock-issue.schema';

interface Target { key: string; version: string; action: 'Pick' | 'Dispatch'; values?: PickForm }
export function useStockIssue(documentId: string) {
  const access = useWarehouseAccess();
  const client = useQueryClient();
  const validId = nonEmptyDotNetGuidSchema('Mã phiếu xuất không hợp lệ.').safeParse(documentId).success;
  const canView = access.ready && validId && !!access.profile.data?.permissions.includes(P.STOCK_ISSUE_REQUESTS_VIEW);
  const { identity, warehouseId, revision, signature } = access.selection;
  const scope: TaskScope | null = canView && identity && warehouseId && signature ? { identity, warehouseId, revision, signature } : null;
  const prefix = ['warehouse', identity, warehouseId, revision, 'stock-issue', documentId];
  const contextKey = JSON.stringify([...prefix, signature]);
  const userId = access.profile.data?.id ?? '';
  const focused = useIsFocused();
  const refreshFromNotification = useCallback((event?: unknown) => {
    if (!canView || !identity || !warehouseId || !signature ||
      !taskScopeMatches({ identity, warehouseId, revision, signature }, useWarehouseSelection.getState())) return;
    if (event !== undefined) {
      const reference = notificationSchema.pick({ referenceType: true, referenceId: true }).safeParse(event);
      if (!reference.success || reference.data.referenceType !== 'StockIssueRequest' || reference.data.referenceId !== documentId) return;
    }
    // A notification is only a refresh hint; status and allowed actions still come from the API.
    void client.invalidateQueries({ queryKey: ['warehouse', identity, warehouseId, revision, 'stock-issue', documentId] });
  }, [canView, client, documentId, identity, warehouseId, revision, signature]);
  useNotificationRealtime(focused && canView && !!access.profile.data?.permissions.includes(P.NOTIFICATIONS_VIEW),
    identity, signature, refreshFromNotification);
  const detail = useQuery({ queryKey: [...prefix, 'detail'], enabled: !!scope, retry: false,
    queryFn: ({ signal }) => stockIssueApi.detail(documentId, scope!.warehouseId, userId, signal) });
  const actions = useQuery({ queryKey: [...prefix, 'actions'], enabled: !!scope && detail.isSuccess, retry: false,
    queryFn: ({ signal }) => stockIssueApi.actions(documentId, signal) });
  const [editor, setEditor] = useState<{ key: string; version: string; item: StockIssueItem; sourcePath: string; destinationId: string; destinationPath: string } | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const lock = useRef(false);
  const command = useRef<WarehouseCommandMemory | null>(null);
  const form = useForm<PickForm>({ resolver: zodResolver(pickFormSchema), defaultValues: { stockIssueRequestItemId: '',
    inventoryStockId: '', pickedQuantity: Number.NaN, scannedBarcode: '', scannedSlotCode: '' } });
  const permission = (value: PermissionCode) => canView && !!access.profile.data?.permissions.includes(value);
  const allowed = (action: string) => canView && !!detail.data?.version && !detail.isError && !detail.isFetching &&
    !actions.isError && !actions.isFetching && actions.data?.currentVersion === detail.data.version && actions.data.allowedActions.includes(action) &&
    (action !== 'Dispatch' || detail.data.status === 'AuthorizedForDispatch');
  function assertCurrent(permissionCode: PermissionCode) {
    const profile = client.getQueryData<UserProfile>(profileQueryKey);
    const snapshot = profile ? warehouseSnapshot(profile) : null;
    if (!scope || !taskScopeMatches(scope, useWarehouseSelection.getState()) || !useAuth.getState().signedIn ||
      !snapshot?.activeUser || !snapshot.compatible || snapshot.identity !== scope.identity || snapshot.signature !== scope.signature ||
      !snapshot.warehouses.some(warehouse => warehouse.id === scope.warehouseId) ||
      !profile?.permissions.includes(P.STOCK_ISSUE_REQUESTS_VIEW) || !profile.permissions.includes(permissionCode))
      throw new Error('Kho, tài khoản hoặc quyền đã thay đổi. Vui lòng mở lại công việc.');
  }
  const draft = useFormDraft({ form, feature: 'issue-pick', documentId, lineId: editor ? `${editor.item.id}:${form.getValues('inventoryStockId')}` : undefined,
    version: editor?.version ?? target?.version, enabled: (editor?.key === contextKey || target?.key === contextKey) && canView,
    assertCurrent: () => { assertCurrent(target?.action === 'Dispatch' ? P.STOCK_ISSUE_REQUESTS_DISPATCH : P.STOCK_ISSUE_REQUESTS_PICK);
      if (detail.data?.version !== (editor?.version ?? target?.version)) throw new Error('Phiếu xuất đã thay đổi.'); } });
  const mutation = useMutation<unknown, Error, Target>({ retry: false, mutationFn: async (original: Target) => {
    const permissionCode = original.action === 'Pick' ? P.STOCK_ISSUE_REQUESTS_PICK : P.STOCK_ISSUE_REQUESTS_DISPATCH;
    const assertCurrentContext = () => {
      assertCurrent(permissionCode);
      if (original.key !== contextKey || !allowed(original.action) || detail.data?.version !== original.version)
        throw new Error('Dữ liệu đã thay đổi. Vui lòng tải lại phiếu trước khi tiếp tục.');
    };
    assertCurrentContext();
    if (original.action === 'Pick') {
      const values = pickFormSchema.parse(original.values);
      assertPick(values, detail.data!);
      const body = { items: [values], expectedVersion: original.version };
      command.current = warehouseCommand(command.current, { documentId, action: original.action, ...body });
      const sending = { ...body, commandId: command.current.commandId };
      return draft.execute({ operation: 'Pick', ...command.current, documentId, expectedVersion: original.version },
        () => stockIssueApi.pick(documentId, sending, assertCurrentContext), () => { command.current = null; });
    }
    const body = { expectedVersion: original.version };
    command.current = warehouseCommand(command.current, { documentId, action: original.action, ...body });
    const sending = { ...body, commandId: command.current.commandId };
    return draft.execute({ operation: 'Dispatch', ...command.current, documentId, expectedVersion: original.version },
      () => stockIssueApi.dispatch(documentId, sending, assertCurrentContext), () => { command.current = null; });
  }, onSettled: () => draft.settled(), onError: logApiError, onSuccess: async (_, original) => {
    if (original.key !== contextKey) return;
    await draft.clear(true);
    setTarget(null); setEditor(null); form.reset();
    setNotice(original.action === 'Pick' ? 'Đã ghi nhận lấy hàng vào khu chờ xuất. Tổng tồn kho không đổi.'
      : 'Đã xác nhận hàng rời kho và ghi giảm tồn kho.');
    await client.invalidateQueries({ queryKey: ['warehouse', identity, warehouseId, revision] });
  } });
  async function beginPick(item: StockIssueItem, inventoryStockId: string) {
    const location = item.pickLocations.find(value => value.inventoryStockId === inventoryStockId);
    if (!location || !detail.data?.version || !allowed('Pick') || lock.current) return;
    lock.current = true;
    mutation.reset(); setNotice('Đang xác minh vị trí chờ xuất…'); setDiscard(false);
    const expectedVersion = detail.data.version;
    try {
      assertCurrent(P.STOCK_ISSUE_REQUESTS_PICK);
      const destination = await stockIssueApi.destination(documentId, inventoryStockId, scope!.warehouseId);
      assertCurrent(P.STOCK_ISSUE_REQUESTS_PICK);
      if (destination.version !== expectedVersion) throw new Error('Phiếu đã đổi phiên bản. Vui lòng tải lại trước khi lấy hàng.');
      form.reset({ stockIssueRequestItemId: item.id, inventoryStockId, pickedQuantity: Number.NaN, scannedBarcode: '', scannedSlotCode: '',
        destinationStagingSlotId: destination.slotId, scannedStagingSlotCode: '' });
      setEditor({ key: contextKey, version: expectedVersion, item, sourcePath: formatInventoryLocation(location),
        destinationId: destination.slotId, destinationPath: destination.path });
      setNotice(null);
    } catch (error) { logApiError(error); setNotice(getApiErrorMessage(error)); }
    finally { lock.current = false; }
  }
  async function reviewPick() {
    await form.handleSubmit(values => {
      if (editor?.key !== contextKey || lock.current) return;
      try {
        assertPick(values, detail.data!);
        if (values.destinationStagingSlotId !== editor.destinationId)
          throw new Error('Điểm chờ xuất đã thay đổi. Vui lòng mở lại dòng hàng.');
        setTarget({ key: contextKey, version: editor.version, action: 'Pick', values });
      }
      catch (error) { setNotice(error instanceof Error ? error.message : 'Dữ liệu chưa hợp lệ.'); }
    })();
  }
  function beginDispatch() {
    if (!detail.data?.version || !allowed('Dispatch') || !permission(P.STOCK_ISSUE_REQUESTS_DISPATCH) || lock.current ||
      !outstandingPicks(detail.data).length) return;
    mutation.reset(); setNotice(null);
    setTarget({ key: contextKey, version: detail.data.version, action: 'Dispatch' });
  }
  async function confirm() {
    if (!target || target.key !== contextKey || lock.current) return;
    lock.current = true;
    try { await mutation.mutateAsync(target); } catch { /* The confirmation retains the immutable command for an explicit retry. */ }
    finally { lock.current = false; }
  }
  return { access, validId, canView, detail, actions, form, allowed, permission, mutation, notice,
    assertFieldReport: (key: string, version: string) => {
      assertCurrent(P.STOCK_ISSUE_REQUESTS_PICK);
      if (key !== contextKey || detail.data?.version !== version || detail.isError || detail.isFetching ||
        !['ReleasedForPicking', 'Picking'].includes(detail.data.status)) throw new Error('Phiếu đã đổi trạng thái hoặc phiên bản. Vui lòng tải lại.');
    },
    contextKey, editor: editor?.key === contextKey && editor.version === detail.data?.version && allowed('Pick') ? editor : null,
    target: target?.key === contextKey && target.version === detail.data?.version && allowed(target.action) ? target : null,
    discard, setDiscard, beginPick, reviewPick, beginDispatch, confirm,
    refresh: async () => { await client.invalidateQueries({ queryKey: prefix }); },
    closeEditor: () => { if (!lock.current) { setEditor(null); setTarget(null); } },
    discardChanges: () => { if (!lock.current) { void draft.discardAndClose(() => { setEditor(null); setDiscard(false); form.reset(); }); } },
    cancelConfirmation: () => { if (!lock.current) setTarget(null); } };
}
