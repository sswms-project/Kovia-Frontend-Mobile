import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner-native';

import { P } from '@/config/permission-codes';
import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { profileQueryKey } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { warehouseTaskApi } from '@/features/warehouse-task/warehouse-task.api';
import type { MyWarehouseTask, WarehouseTaskType } from '@/features/warehouse-task/warehouse-task.types';
import { ApiError } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

import { assertNotificationContext, canOpenNotification, notificationDestination, notificationNeedsTask } from '../notifications';
import type { AppNotification } from '../notifications.types';

interface TaskChoice { readonly task: MyWarehouseTask; readonly history: boolean }
const TRANSFER_ACTION_TYPE: Readonly<Record<string, WarehouseTaskType>> = {
  ViewStockTransferPick: 'TransferPick', ViewStockTransferReceive: 'TransferReceive', ViewStockTransferPutAway: 'TransferPutAway',
};

export function useNotificationNavigation(dismissOverlay = false) {
  const access = useWarehouseAccess();
  const client = useQueryClient();
  const controller = useRef<AbortController | null>(null);
  const [opening, setOpening] = useState(false);
  const [choices, setChoices] = useState<{ key: string; items: readonly TaskChoice[] } | null>(null);
  const { identity, signature, revision, warehouseId } = access.selection;
  const key = JSON.stringify([identity, signature, revision, warehouseId]);
  useEffect(() => () => { controller.current?.abort(); }, [key]);

  function assertCurrent() {
    const state = useWarehouseSelection.getState();
    if (key !== JSON.stringify([state.identity, state.signature, state.revision, state.warehouseId]) || state.transitioning || !state.warehouseId)
      throw new ApiError('Kho hoặc phiên làm việc đã thay đổi. Vui lòng mở lại thông báo.', 409);
    assertNotificationContext(identity, signature, client.getQueryData<UserProfile>(profileQueryKey), useAuth.getState().signedIn);
  }
  function navigateTask(choice: TaskChoice) {
    assertCurrent();
    if (dismissOverlay && router.canGoBack()) router.back();
    router.push({ pathname: '/tasks/[taskType]/[taskId]', params: { taskType: choice.task.taskType,
      taskId: choice.task.id, warehouseId: choice.task.warehouseId, history: choice.history ? '1' : '0' } });
  }
  async function open(item: AppNotification) {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setOpening(true); setChoices(null);
    try {
      assertCurrent();
      const profile = client.getQueryData<UserProfile>(profileQueryKey);
      if (!canOpenNotification(item, profile)) throw new ApiError('Thông báo chưa có màn hình phù hợp hoặc bạn không có quyền truy cập.', 403);
      if (!notificationNeedsTask(item)) {
        const destination = notificationDestination(item, profile);
        if (destination) {
          if (dismissOverlay && router.canGoBack()) router.back();
          router.push(destination);
        }
        return;
      }
      if (!profile?.permissions.includes(P.WAREHOUSE_TASKS_VIEW_OWN) || !warehouseId) throw new ApiError('Bạn chưa có quyền xem công việc.', 403);
      const taskType = item.action ? TRANSFER_ACTION_TYPE[item.action] : undefined;
      for (const history of [false, true]) {
        const matches: TaskChoice[] = [];
        for (let pageNumber = 1; pageNumber <= 20; pageNumber += 1) {
          const params = { warehouseId, taskType, pageNumber, pageSize: 100 };
          const page = await (history ? warehouseTaskApi.getHistory(params, profile.id, request.signal) : warehouseTaskApi.getCurrent(params, profile.id, request.signal));
          assertCurrent();
          if (page.pageNumber !== pageNumber || page.pageSize > 100) throw new ApiError('Phân trang công việc chưa hợp lệ.', 422);
          for (const task of page.items) {
            const reference = item.referenceType === 'WarehouseTask' ? task.id
              : item.referenceType === 'StockTransferShipment' ? task.transferShipmentId : task.transferId;
            if (reference?.toLowerCase() === item.referenceId?.toLowerCase() && (!taskType || task.taskType === taskType)) matches.push({ task, history });
          }
          if (pageNumber * page.pageSize >= page.totalCount) break;
          if (!page.items.length || pageNumber === 20) throw new ApiError('Chưa tải đủ công việc. Vui lòng mở tab Công việc để tra cứu.', 422);
        }
        if (matches.length === 1) { navigateTask(matches[0]); return; }
        if (matches.length > 1) { setChoices({ key, items: matches }); return; }
      }
      throw new ApiError('Không tìm thấy việc được giao cho bạn tại kho đang chọn. Kiểm tra kho hoặc phân công rồi thử lại.', 404);
    } catch (error) {
      if (!request.signal.aborted) toast.error(getApiErrorMessage(error, 'Chưa thể mở nội dung liên quan.'));
    } finally {
      if (controller.current === request) { controller.current = null; setOpening(false); }
    }
  }
  function pick(value: string) {
    const choice = choices?.key === key ? choices.items[Number(value)] : undefined;
    if (!choice) return;
    try { navigateTask(choice); setChoices(null); }
    catch (error) { toast.error(getApiErrorMessage(error)); }
  }
  return { open, opening, pick, cancel: () => setChoices(null), choices: choices?.key === key ? choices.items : [] };
}
