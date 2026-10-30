import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect, useRef, useState } from 'react';
import type { useFormDraft } from '@/hooks/use-form-draft';

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
import { transferReceiptActionAllowed } from '../transfer-receiving';

export function useTransferReceiptExecution(state: ReturnType<typeof useTransferReceiving>, transferId: string, shipmentId: string,
  persistence: { current: ReturnType<typeof useFormDraft> | null }, onCommitted?: (target: TransferExecutionTarget) => void) {
  const client = useQueryClient();
  const { identity, warehouseId, revision, signature } = state.access.selection;
  const key = JSON.stringify([identity, warehouseId, revision, signature, transferId, shipmentId]);
  const latestKey = useRef(key);
  useLayoutEffect(() => { latestKey.current = key; }, [key]);
  const [target, setTarget] = useState<(TransferExecutionTarget & { scopeKey: string }) | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<{ key: string; action: TransferExecutionTarget['action']; version: string } | null>(null);
  const lock = useRef(false);
  const memory = useRef<WarehouseCommandMemory | null>(null);
  const enabled = state.canView && !!state.data && !state.detail.isError && !state.detail.isFetching &&
    !!state.data.receipt.version && !state.data.document.isLegacyWorkflow && !!state.access.profile.data?.permissions.includes(P.TRANSFERS_RECEIVE);
  function allowed(action: TransferExecutionTarget['action']) {
    if (!enabled || state.realtime.changed || !state.data) return false;
    if (recorded?.key === key && recorded.action === action && recorded.version === state.data.receipt.version) return false;
    const { shipment, receipt, putAway } = state.data;
    const taskStatus = state.mode === 'Receive' ? shipment.receiveTaskStatus : shipment.putAwayTaskStatus;
    return transferReceiptActionAllowed(state.mode, action, receipt.status, taskStatus, !!putAway?.canResumePutAway);
  }
  function assertSession() {
      const profile = client.getQueryData<UserProfile>(profileQueryKey);
      const snapshot = profile ? warehouseSnapshot(profile) : null;
      if (latestKey.current !== key || !identity || !warehouseId || !signature || !useAuth.getState().signedIn ||
        !taskScopeMatches({ identity, warehouseId, revision, signature }, useWarehouseSelection.getState()) ||
        !snapshot?.activeUser || !snapshot.compatible || snapshot.signature !== signature ||
        !profile?.permissions.includes(P.TRANSFERS_RECEIVE) || !profile.permissions.includes(P.TRANSFERS_VIEW))
        throw new Error('Phiếu, kho hoặc quyền đã thay đổi. Vui lòng mở lại công việc.');
  }
  function assertCurrent(expectedVersion: string) {
    assertSession();
    if (!enabled || state.data?.receipt.version !== expectedVersion)
      throw new Error('Phiếu, kho hoặc quyền đã thay đổi. Vui lòng mở lại công việc.');
  }
  const mutation = useMutation<ReturnType<typeof useFormDraft>, Error, TransferExecutionTarget & { scopeKey: string }>({ retry: false, mutationFn: async original => {
    const check = () => {
      if (original.scopeKey !== key) throw new Error('Kho đã thay đổi.');
      assertCurrent(original.body.expectedVersion);
      if (!allowed(original.action)) throw new Error('Trạng thái công việc không còn cho phép thao tác này. Vui lòng tải lại.');
    };
    check();
    if (!persistence.current) throw new Error('Chưa kiểm tra được bản nháp.');
    const sendingDraft = persistence.current;
    await sendingDraft.execute({ operation: `Transfer${original.action}`, commandId: original.body.commandId,
      content: JSON.stringify(original.body), documentId: `${transferId}:${shipmentId}`, expectedVersion: original.body.expectedVersion },
    () => transferReceivingApi.execute(transferId, shipmentId, original, check), () => { memory.current = null; });
    return sendingDraft;
  }, onError: logApiError, onSuccess: async (sendingDraft, original) => {
    setRecorded({ key: original.scopeKey, action: original.action, version: original.body.expectedVersion });
    await sendingDraft.clear(true);
    if (original.scopeKey !== key) return;
    try { assertSession(); } catch { return; }
    onCommitted?.(original);
    setTarget(null); setNotice(original.action === 'Start' ? 'Đã bắt đầu nhận tại vị trí đã xác nhận. Chưa ghi nhận số lượng thực nhận.'
      : original.action === 'Submit' ? 'Đã ghi nhận kết quả kiểm hàng. Chỉ hàng đạt đủ điều kiện mới được phân bổ; hàng hỏng cách biệt vẫn bị tạm giữ.'
      : original.action === 'Resume' ? 'Đã tiếp tục công việc cất phần hàng còn khả dụng. Không ghi nhận nhập tồn thêm.'
      : 'Đã ghi nhận cất hàng thực tế. Luồng nhận mới chỉ chuyển vị trí, không cộng tồn lần nữa.');
    await client.invalidateQueries({ queryKey: ['warehouse', identity, warehouseId, revision], refetchType: 'none' });
    const fresh = await state.refresh();
    try { assertSession(); } catch { return; }
    if (fresh.isError || !fresh.data || fresh.data.receipt.version === original.body.expectedVersion)
      setNotice('Đã ghi nhận thao tác nhưng chưa tải được dữ liệu mới. Hãy tải lại phiếu, không gửi thêm lần nữa.');
    await client.invalidateQueries({ queryKey: ['warehouse', identity, warehouseId, revision, 'my-tasks'] });
    await client.invalidateQueries({ queryKey: ['warehouse', identity, warehouseId, revision, 'warehouse-task-feed'] });
    await client.invalidateQueries({ queryKey: ['warehouse', identity, warehouseId, revision, 'warehouse-task-detail'] });
  } });
  function prepare(value: TransferExecutionTarget) {
    if (!allowed(value.action) || lock.current) return;
    memory.current = warehouseCommand(memory.current, { transferId, shipmentId, ...value });
    mutation.reset(); setTarget({ ...value, body: { ...value.body, commandId: memory.current.commandId }, scopeKey: key } as TransferExecutionTarget & { scopeKey: string });
  }
  return { enabled, allowed, key, assertCurrent, target: target?.scopeKey === key ? target : null, mutation, notice, prepare,
    confirm: async () => { if (!target || lock.current) return false; lock.current = true; try { await mutation.mutateAsync(target); return true; } catch { return false; } finally { lock.current = false; } },
    cancel: () => { if (!lock.current) setTarget(null); },
  };
}
