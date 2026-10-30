import type { FilterOption } from '@/components/ui/filter-chips';
import type { PillTone } from '@/components/ui/status-pill';

import type {
  MyWarehouseTask,
  WarehouseTaskAction,
  WarehouseTaskDeadlineStatus,
  WarehouseTaskExecutionStatus,
  WarehouseTaskType,
} from './warehouse-task.types';

export const TASK_TYPE_LABEL: Record<WarehouseTaskType, string> = {
  Receiving: 'Nhận hàng',
  PutAway: 'Cất hàng',
  CycleCount: 'Kiểm kê',
  DamagedStock: 'Hàng hỏng',
  Relocation: 'Điều chuyển vị trí',
  TransferPick: 'Lấy hàng điều chuyển',
  TransferReceive: 'Nhận hàng điều chuyển',
  TransferPutAway: 'Cất hàng điều chuyển',
  Picking: 'Lấy hàng xuất kho',
};

export function getTaskTypeLabel(task: Pick<MyWarehouseTask, 'taskType' | 'isCombinedTransferReceipt'>) {
  return task.isCombinedTransferReceipt && (task.taskType === 'TransferReceive' || task.taskType === 'TransferPutAway')
    ? 'Nhận và cất hàng điều chuyển' : TASK_TYPE_LABEL[task.taskType];
}

export function matchesTaskType(task: Pick<MyWarehouseTask, 'taskType' | 'isCombinedTransferReceipt'>, type: WarehouseTaskType) {
  return task.taskType === type || !!task.isCombinedTransferReceipt &&
    (type === 'TransferReceive' || type === 'TransferPutAway') &&
    (task.taskType === 'TransferReceive' || task.taskType === 'TransferPutAway');
}

export const EXECUTION_STATUS_LABEL: Record<WarehouseTaskExecutionStatus, string> = {
  Queued: 'Chờ bắt đầu',
  InProgress: 'Đang làm',
  Paused: 'Tạm dừng',
  Completed: 'Hoàn tất',
  Cancelled: 'Đã hủy',
};

export const EXECUTION_STATUS_TONE: Record<WarehouseTaskExecutionStatus, PillTone> = {
  Queued: 'neutral',
  InProgress: 'primary',
  Paused: 'warning',
  Completed: 'success',
  Cancelled: 'neutral',
};

export const DEADLINE_STATUS_LABEL: Record<WarehouseTaskDeadlineStatus, string> = {
  NoDeadline: 'Chưa đặt hạn',
  OnTrack: 'Đúng tiến độ',
  DueSoon: 'Sắp đến hạn',
  Overdue: 'Quá hạn',
  CompletedOnTime: 'Xong đúng hạn',
  CompletedLate: 'Xong trễ hạn',
  Cancelled: 'Đã hủy',
};

export const DEADLINE_STATUS_TONE: Record<WarehouseTaskDeadlineStatus, PillTone> = {
  NoDeadline: 'neutral',
  OnTrack: 'neutral',
  DueSoon: 'warning',
  Overdue: 'danger',
  CompletedOnTime: 'success',
  CompletedLate: 'danger',
  Cancelled: 'neutral',
};

export const OPEN_STATUS_FILTERS: readonly FilterOption<WarehouseTaskExecutionStatus>[] = [
  { value: 'Queued', label: 'Chờ bắt đầu' },
  { value: 'InProgress', label: 'Đang làm' },
  { value: 'Paused', label: 'Tạm dừng' },
];

export const HISTORY_STATUS_FILTERS: readonly FilterOption<WarehouseTaskExecutionStatus>[] = [
  { value: 'Completed', label: 'Hoàn tất' },
  { value: 'Cancelled', label: 'Đã hủy' },
];

export const TASK_TYPE_FILTERS: readonly FilterOption<WarehouseTaskType>[] = [
  { value: 'Receiving', label: 'Nhận hàng' },
  { value: 'Picking', label: 'Lấy hàng xuất kho' },
  { value: 'PutAway', label: 'Cất hàng' },
  { value: 'CycleCount', label: 'Kiểm kê' },
  { value: 'Relocation', label: 'Điều chuyển vị trí' },
  { value: 'TransferPick', label: 'Lấy hàng điều chuyển' },
  { value: 'TransferReceive', label: 'Nhận hàng điều chuyển' },
  { value: 'TransferPutAway', label: 'Cất hàng điều chuyển' },
];

export const ACTION_SUCCESS_MESSAGE: Record<WarehouseTaskAction, string> = {
  Start: 'Đã bắt đầu công việc.',
  Pause: 'Đã tạm dừng công việc.',
  Return: 'Đã trả công việc về cho quản lý kho.',
};

/** Pause and Return change who works on the task, so the BE requires a reason for them. */
export const ACTIONS_REQUIRING_REASON: readonly WarehouseTaskAction[] = ['Pause', 'Return'];

interface ActionContext {
  readonly canManage: boolean;
  readonly currentUserId: string | undefined;
}

/**
 * Mirrors the web rules: only the assignee with manage-own permission can act. Picking is driven
 * from its own pick screen and damaged-stock tasks have no start/pause/return.
 */
export function getAvailableActions(
  task: MyWarehouseTask,
  { canManage, currentUserId }: ActionContext,
): readonly WarehouseTaskAction[] {
  if (!canManage || task.assignedTo !== currentUserId) return [];
  if (task.taskType === 'DamagedStock' || task.taskType === 'Picking') return [];
  if (task.executionStatus === 'InProgress') return ['Pause'];
  if (task.executionStatus === 'Queued' || task.executionStatus === 'Paused') {
    return ['Start', 'Return'];
  }
  return [];
}
