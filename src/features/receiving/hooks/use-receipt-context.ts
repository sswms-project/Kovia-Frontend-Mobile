import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { P, type PermissionCode } from '@/config/permission-codes';
import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { taskScopeMatches, type TaskScope } from '@/features/my-tasks/my-tasks';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { profileQueryKey } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { assertReceivingContext } from '../receiving';
import { receivingApi } from '../receiving.api';

export function useReceiptContext(mode: 'receiving' | 'putaway', documentId: string) {
  const access = useWarehouseAccess();
  const client = useQueryClient();
  const validId = nonEmptyDotNetGuidSchema('Mã công việc không hợp lệ.').safeParse(documentId).success;
  const canView = access.ready && validId && !!access.profile.data?.permissions.includes(P.GOODS_RECEIPTS_VIEW);
  const { identity, warehouseId, revision, signature } = access.selection;
  const scope: TaskScope | null = canView && identity && warehouseId && signature ? { identity, warehouseId, revision, signature } : null;
  const prefix = scope ? ['warehouse', scope.identity, scope.warehouseId, scope.revision, 'receiving'] : ['receiving', 'blocked'];
  const contextKey = JSON.stringify([...prefix, mode, documentId]);
  const [saved, setSaved] = useState<{ key: string; id: string | null; evidenceKey: string } | null>(null);
  const evidenceSession = useRef(0);
  const userId = access.profile.data?.id ?? '';
  const task = useQuery({
    queryKey: [...prefix, 'task', documentId], enabled: !!scope && mode === 'receiving', retry: false,
    queryFn: ({ signal }) => receivingApi.task(scope!.warehouseId, userId, documentId, signal),
  });
  const receiptId = mode === 'putaway' ? documentId : saved?.key === contextKey ? saved.id : task.data?.activeGoodsReceiptId ?? null;
  const evidenceKey = saved?.key === contextKey ? saved.evidenceKey : `${contextKey}:${receiptId ?? 'new'}`;
  const receipt = useQuery({
    queryKey: [...prefix, 'receipt', receiptId], enabled: !!scope && !!receiptId, retry: false,
    queryFn: ({ signal }) => receivingApi.receipt(receiptId!, scope!.warehouseId, userId, mode, mode === 'receiving' ? documentId : undefined, signal),
  });
  const actions = useQuery({ queryKey: [...prefix, 'actions', receiptId], enabled: !!scope && !!receiptId && receipt.isSuccess,
    queryFn: ({ signal }) => receivingApi.actions(receiptId!, signal), retry: false });
  function assertCurrent(permission: PermissionCode) {
    if (!scope || !taskScopeMatches(scope, useWarehouseSelection.getState()))
      throw new Error('Kho hoặc phiên làm việc đã thay đổi. Vui lòng mở lại công việc.');
    assertReceivingContext(scope, client.getQueryData<UserProfile>(profileQueryKey), useAuth.getState().signedIn, permission);
  }
  function assertAction(action: string, expectedVersion: string, permission: PermissionCode) {
    assertCurrent(permission);
    if (receipt.isError || receipt.isFetching || actions.isError || actions.isFetching || receipt.data?.version !== expectedVersion ||
      actions.data?.currentVersion !== expectedVersion || !actions.data.allowedActions.includes(action))
      throw new Error('Dữ liệu hoặc quyền thao tác đã thay đổi. Vui lòng tải lại trước khi tiếp tục.');
  }
  const permission = (value: PermissionCode) => canView && !!access.profile.data?.permissions.includes(value);
  const allowed = (value: string) => !!receipt.data && !receipt.isFetching && !receipt.isError &&
    !actions.isFetching && !actions.isError && actions.data?.currentVersion === receipt.data.version && actions.data.allowedActions.includes(value);
  async function refresh() {
    await client.invalidateQueries({ queryKey: prefix });
  }
  async function refreshWarehouse() {
    if (scope) await client.invalidateQueries({ queryKey: ['warehouse', scope.identity, scope.warehouseId, scope.revision] });
  }
  function rememberReceipt(id: string | null) {
    setSaved({ key: contextKey, id, evidenceKey: id === null ? `${contextKey}:new:${++evidenceSession.current}` : evidenceKey });
  }
  return { access, client, scope, prefix, contextKey, mode, documentId, canView, validId, userId,
    task, receiptId, receipt, actions, assertCurrent, assertAction, permission, allowed, refresh, refreshWarehouse, rememberReceipt, evidenceKey };
}
export type ReceiptContext = ReturnType<typeof useReceiptContext>;
