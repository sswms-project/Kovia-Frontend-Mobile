import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { P } from '@/config/permission-codes';
import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { taskScopeMatches } from '@/features/my-tasks/my-tasks';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { profileQueryKey, warehouseSnapshot } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { getApiErrorKind, logApiError } from '@/lib/api-error';
import { warehouseCommand, type WarehouseCommandMemory } from '@/lib/warehouse-command';

import { receiptReviewApi } from '../receipt-review.api';
import { AllocationScopeError } from '../smart-allocation.api';

type Target = { receiptId: string; key: string; expectedVersion: string; commandId: string; keepAtReceiving: boolean; selfApprovalAcknowledged: boolean };
export function useReceiptReview() {
  const access = useWarehouseAccess();
  const client = useQueryClient();
  const { identity, warehouseId, revision, signature } = access.selection;
  const ready = access.ready && [P.GOODS_RECEIPTS_VIEW, P.GOODS_RECEIPTS_APPROVE].every(permission => access.profile.data?.permissions.includes(permission));
  const prefix = ['warehouse', identity, warehouseId, revision, 'receipt-review', signature];
  const key = JSON.stringify(prefix);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const command = useRef<WarehouseCommandMemory | null>(null);
  const lock = useRef(false);
  const queue = useQuery({ queryKey: [...prefix, 'queue', page], enabled: ready, retry: false,
    queryFn: ({ signal }) => receiptReviewApi.queue(warehouseId!, page, signal) });
  const context = useQuery({ queryKey: [...prefix, selected], enabled: ready && !!selected, retry: false,
    queryFn: ({ signal }) => receiptReviewApi.context(selected!, warehouseId!, signal) });
  const denied = (error: unknown) => error instanceof AllocationScopeError || ['unauthorized', 'forbidden', 'notFound'].includes(getApiErrorKind(error));
  const data = ready && !denied(context.error) ? context.data : undefined;
  const canApprove = !!data && !context.isError && !context.isFetching && data.receipt.status === 'PendingApproval' &&
    data.actions.currentVersion === data.receipt.version && data.actions.allowedActions.includes('Approve');
  const canKeep = canApprove && data?.receipt.receivingFlowVersion === 1 && data.receipt.items.some(item => item.usableQuantity > 0) && data.receipt.items.every(item => item.damagedQuantity === 0);
  const mutation = useMutation<unknown, Error, Target>({ retry: false, mutationFn: async (original: Target) => {
    const check = () => {
      const profile = client.getQueryData<UserProfile>(profileQueryKey);
      const snapshot = profile ? warehouseSnapshot(profile) : null;
      if (!identity || !warehouseId || !signature || !useAuth.getState().signedIn || original.key !== key || !ready ||
        !taskScopeMatches({ identity, warehouseId, revision, signature }, useWarehouseSelection.getState()) ||
        !snapshot?.activeUser || !snapshot.compatible || snapshot.signature !== signature ||
        ![P.GOODS_RECEIPTS_VIEW, P.GOODS_RECEIPTS_APPROVE].every(permission => profile?.permissions.includes(permission)) ||
        !canApprove || original.receiptId !== selected || data?.receipt.version !== original.expectedVersion || original.keepAtReceiving && !canKeep)
        throw new Error('Phiếu, kho hoặc quyền đã thay đổi. Vui lòng tải lại trước khi duyệt.');
    };
    check();
    return receiptReviewApi.approve(original.receiptId, { expectedVersion: original.expectedVersion, commandId: original.commandId,
      keepAtReceiving: original.keepAtReceiving, selfApprovalAcknowledged: original.selfApprovalAcknowledged }, check);
  }, onError: logApiError, onSuccess: async (_, original) => {
    if (original.key !== key) return;
    setTarget(null); setNotice(original.keepAtReceiving ? 'Đã duyệt. Hàng đạt khả dụng tại vị trí nhận, không ghi nhận cất giả hoặc tăng tồn lần nữa.' : 'Đã duyệt kiểm hàng. Tiếp tục cất hoặc cách biệt theo công việc được giao.');
    await client.invalidateQueries({ queryKey: ['warehouse', identity, warehouseId, revision] });
  } });
  function review(keepAtReceiving: boolean) {
    if (!selected || !data || !canApprove || keepAtReceiving && !canKeep || lock.current) return;
    const body = { expectedVersion: data.receipt.version, keepAtReceiving, selfApprovalAcknowledged: acknowledged };
    command.current = warehouseCommand(command.current, { receiptId: selected, ...body });
    mutation.reset(); setTarget({ receiptId: selected, key, ...body, commandId: command.current.commandId });
  }
  return { access, ready, data, canApprove, canKeep, context, queue, page, setPage, selected, acknowledged, setAcknowledged, target, mutation, notice,
    queueData: ready && !denied(queue.error) ? queue.data : undefined,
    select: (id: string) => { if (!lock.current) { setSelected(id); setAcknowledged(false); setNotice(null); } }, review,
    refresh: () => client.invalidateQueries({ queryKey: prefix }),
    confirm: async () => { if (!target || lock.current) return; lock.current = true; try { await mutation.mutateAsync(target); } catch { /* Retain frozen command for explicit retry. */ } finally { lock.current = false; } },
    cancel: () => { if (!lock.current) setTarget(null); },
  };
}
