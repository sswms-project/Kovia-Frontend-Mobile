export const WAREHOUSE_TASK_TYPES = [
  'Receiving',
  'PutAway',
  'CycleCount',
  'DamagedStock',
  'Relocation',
  'TransferPick',
  'TransferReceive',
  'TransferPutAway',
  'Picking',
] as const;

export type WarehouseTaskType = (typeof WAREHOUSE_TASK_TYPES)[number];

export type WarehouseTaskExecutionStatus =
  | 'Queued'
  | 'InProgress'
  | 'Paused'
  | 'Completed'
  | 'Cancelled';

export type WarehouseTaskDeadlineStatus =
  | 'NoDeadline'
  | 'OnTrack'
  | 'DueSoon'
  | 'Overdue'
  | 'CompletedOnTime'
  | 'CompletedLate'
  | 'Cancelled';

export type WarehouseTaskPriority = 'Normal' | 'Urgent';

export type WarehouseTaskAction = 'Start' | 'Pause' | 'Return';

export interface MyWarehouseTask {
  id: string;
  taskType: WarehouseTaskType;
  referenceCode: string;
  title: string;
  warehouseId: string;
  warehouseName: string;
  status: string;
  executionStatus: WarehouseTaskExecutionStatus;
  priority: WarehouseTaskPriority;
  dueAt: string | null;
  deadlineStatus: WarehouseTaskDeadlineStatus;
  startedAt: string | null;
  completedAt: string | null;
  itemCount: number;
  completedItemCount: number;
  totalQuantity: number;
  completedQuantity: number;
  progressPercentage: number;
  workSummary: string;
  pauseReason: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  updatedAt: string;
  /** Only set for transfer pick/receive tasks. */
  transferId: string | null;
  transferShipmentId: string | null;
}

export interface MyWarehouseTaskQuery {
  pageNumber: number;
  pageSize: number;
  taskType?: WarehouseTaskType;
  warehouseId?: string;
  status?: string;
  executionStatus?: WarehouseTaskExecutionStatus;
  deadlineStatus?: WarehouseTaskDeadlineStatus;
  recentlyAssignedFirst?: boolean;
  assignedTo?: string;
}

export interface WarehouseTaskStats {
  unassignedCount: number;
  queuedCount: number;
  inProgressCount: number;
  pausedCount: number;
  dueSoonCount: number;
  overdueCount: number;
}

export interface MyWarehouseTaskListResponse {
  items: MyWarehouseTask[];
  stats: WarehouseTaskStats;
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
