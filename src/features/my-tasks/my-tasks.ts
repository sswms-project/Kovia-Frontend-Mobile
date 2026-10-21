import { P } from '@/config/permission-codes';
import type { UserProfile } from '@/features/auth/auth.types';
import { warehouseSnapshot } from '@/features/warehouse-access/warehouse-access';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import type { TaskActionInput, TaskFilters, WarehouseTask, WarehouseTaskList } from './my-tasks.schema';

export const TASK_PAGE_SIZE = 20;
export const TASK_LABELS = {
  Receiving: 'Nhận hàng', Picking: 'Lấy hàng xuất kho', PutAway: 'Cất hàng', CycleCount: 'Kiểm kê',
  DamagedStock: 'Hàng hỏng', Relocation: 'Điều chuyển vị trí', TransferPick: 'Lấy hàng điều chuyển',
  TransferReceive: 'Nhận hàng điều chuyển', TransferPutAway: 'Cất hàng điều chuyển',
} as const;
export const EXECUTION_LABELS = {
  Queued: 'Chờ bắt đầu', InProgress: 'Đang làm', Paused: 'Tạm dừng', Completed: 'Hoàn tất', Cancelled: 'Đã hủy',
} as const;
export const DEADLINE_LABELS = {
  NoDeadline: 'Chưa có hạn', OnTrack: 'Trong hạn', DueSoon: 'Sắp đến hạn', Overdue: 'Quá hạn',
  CompletedOnTime: 'Hoàn tất đúng hạn', CompletedLate: 'Hoàn tất trễ', Cancelled: 'Đã hủy',
} as const;
export const ACTION_LABELS = { Start: 'Bắt đầu', Pause: 'Tạm dừng', Return: 'Trả về quản lý' } as const;

export interface TaskScope {
  readonly identity: string;
  readonly warehouseId: string;
  readonly revision: number;
  readonly signature: string;
}

export function taskListParams(warehouseId: string, filters: TaskFilters) {
  nonEmptyDotNetGuidSchema('Chọn kho hợp lệ trước khi tải công việc.').parse(warehouseId);
  return {
    warehouseId, pageNumber: filters.pageNumber, pageSize: TASK_PAGE_SIZE,
    ...(filters.taskType ? { taskType: filters.taskType } : {}),
    ...(filters.executionStatus ? { executionStatus: filters.executionStatus } : {}),
    ...(filters.deadlineStatus ? { deadlineStatus: filters.deadlineStatus } : {}),
    recentlyAssignedFirst: filters.recentlyAssignedFirst,
  };
}

export function assertTaskListScope(data: WarehouseTaskList, warehouseId: string, userId: string) {
  if (data.items.some((task) => task.warehouseId.toLowerCase() !== warehouseId.toLowerCase() ||
    task.assignedTo?.toLowerCase() !== userId.toLowerCase()))
    throw new Error('Dữ liệu công việc không khớp kho hoặc tài khoản. Vui lòng kiểm tra lại quyền.');
  return data;
}

export function availableTaskActions(task: WarehouseTask, canManage: boolean, history = false): TaskActionInput['action'][] {
  if (!canManage || history || task.taskType === 'Picking' || task.taskType === 'DamagedStock') return [];
  if (task.executionStatus === 'Queued' || task.executionStatus === 'Paused') return ['Start', 'Return'];
  if (task.executionStatus === 'InProgress') return ['Pause'];
  return [];
}

export function taskScopeMatches(scope: TaskScope, current: {
  identity: string | null; warehouseId: string | null; revision: number; signature: string | null; transitioning: boolean;
}) {
  return !current.transitioning && current.identity === scope.identity && current.warehouseId === scope.warehouseId &&
    current.revision === scope.revision && current.signature === scope.signature;
}

export function assertTaskActionScope(scope: TaskScope, task: WarehouseTask, action: TaskActionInput['action'],
  profile: UserProfile | undefined, signedIn: boolean) {
  const snapshot = profile ? warehouseSnapshot(profile) : null;
  if (!signedIn || !profile || !snapshot?.activeUser || !snapshot.compatible ||
    !snapshot.warehouses.some((warehouse) => warehouse.id.toLowerCase() === scope.warehouseId.toLowerCase()) ||
    snapshot.signature !== scope.signature ||
    !profile.permissions.includes(P.WAREHOUSE_TASKS_VIEW_OWN) || !profile.permissions.includes(P.WAREHOUSE_TASKS_MANAGE_OWN) ||
    task.warehouseId.toLowerCase() !== scope.warehouseId.toLowerCase() || task.assignedTo?.toLowerCase() !== profile.id.toLowerCase() ||
    !availableTaskActions(task, true).includes(action))
    throw new Error('Kho, quyền hoặc trạng thái công việc đã thay đổi. Vui lòng tải lại.');
}

const dateTime = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
});
export function taskDate(value: string | null) {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Không xác định' : dateTime.format(date);
}
