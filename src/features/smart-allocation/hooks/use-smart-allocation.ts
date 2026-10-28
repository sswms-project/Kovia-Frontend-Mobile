import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { P } from '@/config/permission-codes';
import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { taskScopeMatches } from '@/features/my-tasks/my-tasks';
import { profileQueryKey, warehouseSnapshot } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { getApiErrorKind, logApiError } from '@/lib/api-error';
import { warehouseCommand, type WarehouseCommandMemory } from '@/lib/warehouse-command';

import { AllocationScopeError, smartAllocationApi } from '../smart-allocation.api';
import type { AllocationAuthorization } from '../smart-allocation.schema';
import { useCommandDraft } from '@/hooks/use-command-draft';

type Target = { action: 'Authorize'; key: string; orderId: string; body: AllocationAuthorization }
  | { action: 'Revoke'; key: string; orderId: string; demandId: string; version: string };
export function useSmartAllocation() {
  const access = useWarehouseAccess();
  const client = useQueryClient();
  const { identity, warehouseId, revision, signature } = access.selection;
  const ready = access.ready && !!identity && !!warehouseId && !!signature &&
    [P.STOCK_ISSUE_REQUESTS_VIEW, P.STOCK_ISSUE_REQUESTS_ASSIGN_PICKER].every(permission => access.profile.data?.permissions.includes(permission));
  const prefix = ['warehouse', identity, warehouseId, revision, 'smart-allocation', signature];
  const key = JSON.stringify(prefix);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [pickerId, setPickerId] = useState('');
  const [hours, setHours] = useState(8);
  const [acknowledged, setAcknowledged] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [period, setPeriod] = useState(() => ({ from: new Date(Date.now() - 30 * 86400_000).toISOString(), to: new Date().toISOString() }));
  const command = useRef<WarehouseCommandMemory | null>(null);
  const lock = useRef(false);
  const queue = useQuery({ queryKey: [...prefix, 'queue', page], enabled: ready, retry: false,
    queryFn: ({ signal }) => smartAllocationApi.queue(warehouseId!, page, signal) });
  const context = useQuery<Awaited<ReturnType<typeof smartAllocationApi.context>>, Error>({ queryKey: [...prefix, 'document', selected], enabled: ready && !!selected, retry: false,
    refetchInterval: query => query.state.data?.demand && !query.state.data.demand.completedAt && !query.state.data.demand.revokedAt ? 30_000 : false,
    queryFn: ({ signal }) => smartAllocationApi.context(selected!, warehouseId!, signal) });
  const summary = useQuery({ queryKey: [...prefix, 'summary', period], enabled: ready, retry: false,
    queryFn: ({ signal }) => smartAllocationApi.summary(warehouseId!, period.from, period.to, signal) });
  const denied = (error: unknown) => error instanceof AllocationScopeError || ['unauthorized', 'forbidden', 'notFound'].includes(getApiErrorKind(error));
  const data = ready && !denied(context.error) ? context.data : undefined;
  function assertCurrent() {
    const profile = client.getQueryData<UserProfile>(profileQueryKey);
    const snapshot = profile ? warehouseSnapshot(profile) : null;
    if (!ready || !identity || !warehouseId || !signature || !useAuth.getState().signedIn ||
      !taskScopeMatches({ identity, warehouseId, revision, signature }, useWarehouseSelection.getState()) ||
      !snapshot?.activeUser || !snapshot.compatible || snapshot.signature !== signature ||
      ![P.STOCK_ISSUE_REQUESTS_VIEW, P.STOCK_ISSUE_REQUESTS_ASSIGN_PICKER].every(permission => profile?.permissions.includes(permission)))
      throw new Error('Kho, phiên hoặc quyền đã thay đổi. Vui lòng mở lại chức năng.');
  }
  const draft = useCommandDraft({ feature: 'allocation-authorization', documentId: selected ?? '', version: data?.plan.documentVersion ?? undefined,
    enabled: ready && !!selected, assertCurrent });
  const mutation = useMutation<unknown, Error, Target>({ retry: false, mutationFn: async (original: Target) => {
    const check = () => {
      assertCurrent();
      if (original.key !== key || original.orderId !== selected || context.isFetching || context.isError || !data)
        throw new Error('Dữ liệu đã thay đổi. Vui lòng tải lại kế hoạch.');
      if (original.action === 'Authorize' && (data.plan.documentVersion !== original.body.expectedVersion || data.order.status !== 'Pending'))
        throw new Error('Phiếu đã thay đổi phiên bản. Vui lòng lập lại lần cho phép.');
      if (original.action === 'Revoke' && (data.demand?.id !== original.demandId || data.demand.version !== original.version))
        throw new Error('Lần cho phép đã thay đổi. Vui lòng tải lại.');
    };
    check();
    const sending = original.action === 'Authorize' ? { commandId: original.body.commandId, content: JSON.stringify(original.body) }
      : (command.current = warehouseCommand(command.current, original));
    return draft.execute({ operation: original.action, ...sending, documentId: original.orderId,
      expectedVersion: original.action === 'Authorize' ? original.body.expectedVersion : original.version },
    () => original.action === 'Authorize' ? smartAllocationApi.authorize(original.orderId, original.body, check)
      : smartAllocationApi.revoke(original.orderId, original.demandId, original.version, check),
    () => { command.current = null; });
  }, onSettled: () => draft.settled(), onError: logApiError, onSuccess: async (_, original) => {
    if (original.key !== key) return;
    try { assertCurrent(); } catch { return; }
    await draft.clear(true);
    setTarget(null); setNotice(original.action === 'Authorize' ? 'Đã cho phép tự phân bổ. Hệ thống chỉ giữ hàng khi đủ toàn phiếu; không tự xác nhận xuất.' : 'Đã thu hồi lần cho phép.');
    await client.invalidateQueries({ queryKey: prefix });
  } });
  function reviewAuthorization() {
    if (!selected || !data?.plan.documentVersion || !pickerId || !data.plan.automationEnabled || lock.current) return;
    const body = { stockIssueRequestId: selected, expectedVersion: data.plan.documentVersion, assignedStaffId: pickerId,
      validUntil: new Date(Date.now() + hours * 3600_000).toISOString(), selfApprovalAcknowledged: acknowledged };
    command.current = warehouseCommand(command.current, body);
    mutation.reset(); setTarget({ action: 'Authorize', key, orderId: selected, body: { ...body, commandId: command.current.commandId } });
  }
  function reviewRevoke() {
    if (!selected || !data?.demand?.version || lock.current) return;
    mutation.reset(); setTarget({ action: 'Revoke', key, orderId: selected, demandId: data.demand.id, version: data.demand.version });
  }
  return { access, ready, queue, summary, context, data, page, setPage, selected, pickerId, setPickerId, hours, setHours,
    acknowledged, setAcknowledged, target, mutation, notice, reviewAuthorization, reviewRevoke,
    queueData: ready && !denied(queue.error) ? queue.data : undefined,
    summaryData: ready && !denied(summary.error) ? summary.data : undefined,
    select: (id: string) => { if (!lock.current) { setSelected(id); setPickerId(''); setAcknowledged(false); setNotice(null); } },
    refresh: async () => { setPeriod({ from: new Date(Date.now() - 30 * 86400_000).toISOString(), to: new Date().toISOString() }); await client.invalidateQueries({ queryKey: prefix }); },
    confirm: async () => { if (!target || lock.current) return; lock.current = true; try { await mutation.mutateAsync(target); } catch { /* Explicit retry keeps the frozen authorization command. */ } finally { lock.current = false; } },
    cancel: () => { if (!lock.current) setTarget(null); },
  };
}
