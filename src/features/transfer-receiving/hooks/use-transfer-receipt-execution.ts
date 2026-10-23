import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { P } from '@/config/permission-codes';
import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { taskScopeMatches } from '@/features/my-tasks/my-tasks';
import { profileQueryKey, warehouseSnapshot } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { logApiError } from '@/lib/api-error';
import { warehouseCommand, type WarehouseCommandMemory } from '@/lib/warehouse-command';

import { transferReceivingApi } from '../transfer-receiving.api';
import type { TransferExecutionTarget } from '../transfer-execution.schema';
import type { useTransferReceiving } from './use-transfer-receiving';

export function useTransferReceiptExecution(state: ReturnType<typeof useTransferReceiving>, transferId: string, shipmentId: string) {
  const client = useQueryClient();
  const { identity, warehouseId, revision, signature } = state.access.selection;
  const key = JSON.stringify([identity, warehouseId, revision, signature, transferId, shipmentId]);
  const [target, setTarget] = useState<(TransferExecutionTarget & { scopeKey: string }) | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const lock = useRef(false);
  const memory = useRef<WarehouseCommandMemory | null>(null);
  const enabled = state.canView && !!state.data && !state.detail.isError && !state.detail.isFetching &&
    !!state.data.receipt.version && !state.data.document.isLegacyWorkflow && !!state.access.profile.data?.permissions.includes(P.TRANSFERS_RECEIVE);
  function assertCurrent(expectedVersion: string) {
      const profile = client.getQueryData<UserProfile>(profileQueryKey);
      const snapshot = profile ? warehouseSnapshot(profile) : null;
      if (!enabled || !identity || !warehouseId || !signature || !useAuth.getState().signedIn ||
        !taskScopeMatches({ identity, warehouseId, revision, signature }, useWarehouseSelection.getState()) ||
        !snapshot?.activeUser || !snapshot.compatible || snapshot.signature !== signature ||
        !profile?.permissions.includes(P.TRANSFERS_RECEIVE) || !profile.permissions.includes(P.TRANSFERS_VIEW) ||
        state.data?.receipt.version !== expectedVersion)
        throw new Error('Phiếu, kho hoặc quyền đã thay đổi. Vui lòng mở lại công việc.');
  }
  const mutation = useMutation<unknown, Error, TransferExecutionTarget & { scopeKey: string }>({ retry: false, mutationFn: async original => {
    const check = () => {
      if (original.scopeKey !== key) throw new Error('Kho đã thay đổi.');
      assertCurrent(original.body.expectedVersion);
    };
    check();
    return transferReceivingApi.execute(transferId, shipmentId, original, check);
  }, onError: logApiError, onSuccess: async (_, original) => {
    if (original.scopeKey !== key) return;
    setTarget(null); setNotice(original.action === 'Start' ? 'Đã bắt đầu nhận tại vị trí đã xác nhận. Chưa ghi nhận số lượng thực nhận.'
      : original.action === 'Submit' ? 'Đã ghi nhận kết quả kiểm hàng. Chỉ hàng đạt đủ điều kiện mới được phân bổ; hàng hỏng cách biệt vẫn bị tạm giữ.'
      : 'Đã ghi nhận cất hàng thực tế. Luồng nhận mới chỉ chuyển vị trí, không cộng tồn lần nữa.');
    await client.invalidateQueries({ queryKey: ['warehouse', identity, warehouseId, revision] });
  } });
  function prepare(value: TransferExecutionTarget) {
    if (!enabled || lock.current) return;
    memory.current = warehouseCommand(memory.current, { transferId, shipmentId, ...value });
    mutation.reset(); setTarget({ ...value, body: { ...value.body, commandId: memory.current.commandId }, scopeKey: key } as TransferExecutionTarget & { scopeKey: string });
  }
  return { enabled, key, assertCurrent, target: target?.scopeKey === key ? target : null, mutation, notice, prepare,
    confirm: async () => { if (!target || lock.current) return false; lock.current = true; try { await mutation.mutateAsync(target); return true; } catch { return false; } finally { lock.current = false; } },
    cancel: () => { if (!lock.current) setTarget(null); },
  };
}
