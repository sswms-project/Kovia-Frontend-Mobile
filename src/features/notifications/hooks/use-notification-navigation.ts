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
import type { WarehouseTaskType } from '@/features/warehouse-task/warehouse-task.types';
import { ApiError } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

import { assertNotificationContext, canOpenNotification, notificationDestination, notificationNeedsTask } from '../notifications';
import type { AppNotification } from '../notifications.types';
import { createNotificationTaskSearch, findNotificationTasks, type NotificationTaskChoice, type NotificationTaskSearch } from '../notification-task-search';

interface SearchSession { key: string; item: AppNotification; cursor: NotificationTaskSearch }
interface SearchStatus { key: string; active: boolean; message: string; canContinue: boolean; actionLabel?: string }
const TRANSFER_ACTION_TYPE: Readonly<Record<string, WarehouseTaskType>> = {
  ViewStockTransferPick: 'TransferPick', ViewStockTransferReceive: 'TransferReceive', ViewStockTransferPutAway: 'TransferPutAway',
};

export function useNotificationNavigation(dismissOverlay = false) {
  const access = useWarehouseAccess();
  const client = useQueryClient();
  const controller = useRef<AbortController | null>(null);
  const session = useRef<SearchSession | null>(null);
  const [status, setStatus] = useState<SearchStatus | null>(null);
  const [choices, setChoices] = useState<{ key: string; items: readonly NotificationTaskChoice[] } | null>(null);
  const { identity, signature, revision, warehouseId } = access.selection;
  const key = JSON.stringify([identity, signature, revision, warehouseId]);
  useEffect(() => () => { controller.current?.abort(); }, [key]);

  function assertCurrent() {
    const state = useWarehouseSelection.getState();
    if (key !== JSON.stringify([state.identity, state.signature, state.revision, state.warehouseId]) || state.transitioning || !state.warehouseId)
      throw new ApiError('Kho hoặc phiên làm việc đã thay đổi. Vui lòng mở lại thông báo.', 409);
    assertNotificationContext(identity, signature, client.getQueryData<UserProfile>(profileQueryKey), useAuth.getState().signedIn);
  }
  function navigateTask(choice: NotificationTaskChoice) {
    assertCurrent();
    if (dismissOverlay && router.canGoBack()) router.back();
    router.push({ pathname: '/tasks/[taskType]/[taskId]', params: { taskType: choice.task.taskType,
      taskId: choice.task.id, warehouseId: choice.task.warehouseId, history: choice.history ? '1' : '0' } });
  }
  async function open(item: AppNotification) {
    if (controller.current && !controller.current.signal.aborted) return;
    if (session.current?.key !== key || session.current.item.id !== item.id) session.current = null;
    const request = new AbortController();
    controller.current = request;
    setStatus({ key, active: true, message: 'Đang tìm công việc liên quan…', canContinue: false }); setChoices(null);
    try {
      assertCurrent();
      const profile = client.getQueryData<UserProfile>(profileQueryKey);
      if (!canOpenNotification(item, profile)) throw new ApiError('Thông báo chưa có màn hình phù hợp hoặc bạn không có quyền truy cập.', 403);
      if (notificationDestination(item, profile) || !notificationNeedsTask(item)) {
        const destination = notificationDestination(item, profile);
        if (destination) {
          setStatus(null);
          if (dismissOverlay && router.canGoBack()) router.back();
          router.push(destination);
        }
        return;
      }
      if (!profile?.permissions.includes(P.WAREHOUSE_TASKS_VIEW_OWN) || !warehouseId) throw new ApiError('Bạn chưa có quyền xem công việc.', 403);
      const taskType = item.action ? TRANSFER_ACTION_TYPE[item.action] : undefined;
      if (session.current?.key !== key || session.current.item.id !== item.id)
        session.current = { key, item, cursor: createNotificationTaskSearch() };
      const search = session.current;
      const matches = await findNotificationTasks(search.cursor, item, async (pageNumber, history) => {
        assertCurrent();
        const params = { warehouseId, taskType, pageNumber, pageSize: 100 };
        const page = await (history ? warehouseTaskApi.getHistory(params, profile.id, request.signal) : warehouseTaskApi.getCurrent(params, profile.id, request.signal));
        assertCurrent();
        if (taskType && page.items.some(task => task.taskType !== taskType)) throw new ApiError('Loại công việc trả về không khớp thông báo.', 409);
        return page;
      }, request.signal, (page, history) => setStatus({ key, active: true,
        message: `Đang tìm trong ${history ? 'lịch sử' : 'công việc hiện tại'} · trang ${page}`, canContinue: false }));
      assertCurrent();
      if (matches === null) {
        setStatus({ key, active: false, message: `Chưa tải hết ${search.cursor.history ? 'lịch sử' : 'công việc hiện tại'}. Có thể tìm tiếp từ trang ${search.cursor.page}.`, canContinue: true, actionLabel: 'Tìm tiếp' });
        return;
      }
      session.current = null;
      if (matches.length === 1) { setStatus(null); navigateTask(matches[0]); return; }
      if (matches.length > 1) { setStatus(null); setChoices({ key, items: matches }); return; }
      throw new ApiError('Không tìm thấy việc được giao cho bạn tại kho đang chọn. Kiểm tra kho hoặc phân công rồi thử lại.', 404);
    } catch (error) {
      if (!request.signal.aborted) {
        const message = getApiErrorMessage(error, 'Chưa thể mở nội dung liên quan.');
        const canContinue = !!session.current && (!(error instanceof ApiError) || ![400, 401, 403, 404].includes(error.statusCode));
        setStatus({ key, active: false, message, canContinue, actionLabel: 'Thử lại' });
      }
    } finally {
      if (controller.current === request) controller.current = null;
    }
  }
  function pick(value: string) {
    const choice = choices?.key === key ? choices.items[Number(value)] : undefined;
    if (!choice) return;
    try { navigateTask(choice); setChoices(null); }
    catch (error) { toast.error(getApiErrorMessage(error)); }
  }
  function cancel() {
    controller.current?.abort(); controller.current = null; session.current = null; setStatus(null); setChoices(null);
  }
  return { open, opening: status?.key === key && status.active, pick, cancel,
    searchStatus: status?.key === key ? status : null,
    continueSearch: () => { if (session.current?.key === key) void open(session.current.item); },
    choices: choices?.key === key ? choices.items : [] };
}
