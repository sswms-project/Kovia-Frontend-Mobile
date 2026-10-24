import type { MyWarehouseTask } from '@/features/warehouse-task/warehouse-task.types';
import { ApiError } from '@/lib/api';

import type { AppNotification } from './notifications.types';

export interface NotificationTaskChoice { readonly task: MyWarehouseTask; readonly history: boolean }
export interface NotificationTaskSearch {
  page: number;
  history: boolean;
  totalCount?: number;
  matches: NotificationTaskChoice[];
}
interface TaskPage { items: readonly MyWarehouseTask[]; pageNumber: number; pageSize: number; totalCount: number }

export function createNotificationTaskSearch(): NotificationTaskSearch {
  return { page: 1, history: false, matches: [] };
}

// Keep partial matches private until the feed is exhausted, so a page boundary
// cannot silently choose one shipment when another matching task exists later.
export async function findNotificationTasks(search: NotificationTaskSearch, notification: AppNotification,
  load: (page: number, history: boolean) => Promise<TaskPage>, signal: AbortSignal,
  onPage: (page: number, history: boolean) => void): Promise<readonly NotificationTaskChoice[] | null> {
  for (let requested = 0; requested < 20; requested++) {
    if (signal.aborted) throw new Error('Đã hủy tra cứu công việc.');
    const page = await load(search.page, search.history);
    if (signal.aborted) throw new Error('Đã hủy tra cứu công việc.');
    if (page.pageNumber !== search.page || page.pageSize !== 100 || page.items.length > page.pageSize ||
      (search.totalCount !== undefined && search.totalCount !== page.totalCount)) {
      Object.assign(search, createNotificationTaskSearch(), { totalCount: undefined });
      throw new ApiError('Danh sách công việc đã thay đổi. Bấm Thử lại để tìm từ đầu.', 409);
    }
    search.totalCount = page.totalCount;
    for (const task of page.items) {
      const reference = notification.referenceType === 'WarehouseTask' ? task.id
        : notification.referenceType === 'StockTransferShipment' ? task.transferShipmentId : task.transferId;
      if (reference?.toLowerCase() === notification.referenceId?.toLowerCase() &&
        !search.matches.some(choice => choice.task.id.toLowerCase() === task.id.toLowerCase() && choice.task.taskType === task.taskType))
        search.matches.push({ task, history: search.history });
    }
    onPage(search.page, search.history);
    if (page.pageNumber * page.pageSize >= page.totalCount) {
      if (search.matches.length) return search.matches;
      if (search.history) return [];
      search.history = true; search.page = 1; search.totalCount = undefined;
    } else {
      if (!page.items.length) {
        Object.assign(search, createNotificationTaskSearch(), { totalCount: undefined });
        throw new ApiError('Danh sách công việc vừa thay đổi. Bấm Thử lại để tìm từ đầu.', 409);
      }
      search.page++;
    }
  }
  return null;
}
