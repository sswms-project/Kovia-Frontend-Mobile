import { z } from 'zod';

import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

export const taskTypeSchema = z.enum([
  'Receiving', 'Picking', 'PutAway', 'CycleCount', 'DamagedStock', 'Relocation',
  'TransferPick', 'TransferReceive', 'TransferPutAway',
]);
export const executionStatusSchema = z.enum(['Queued', 'InProgress', 'Paused', 'Completed', 'Cancelled']);
export const deadlineStatusSchema = z.enum([
  'NoDeadline', 'OnTrack', 'DueSoon', 'Overdue', 'CompletedOnTime', 'CompletedLate', 'Cancelled',
]);

export const taskFiltersSchema = z.object({
  history: z.boolean().default(false),
  taskType: taskTypeSchema.optional(),
  executionStatus: executionStatusSchema.optional(),
  deadlineStatus: deadlineStatusSchema.optional(),
  recentlyAssignedFirst: z.boolean().default(false),
  pageNumber: z.number().int().min(1).default(1),
});

export const taskActionSchema = z.object({
  action: z.enum(['Start', 'Pause', 'Return']),
  reason: z.string().trim().max(500, 'Lý do tối đa 500 ký tự').optional(),
}).superRefine((values, context) => {
  if (values.action !== 'Start' && !values.reason)
    context.addIssue({ code: 'custom', path: ['reason'], message: 'Nhập lý do trước khi xác nhận.' });
});

export const warehouseTaskSchema = z.object({
  id: nonEmptyDotNetGuidSchema('Mã công việc không hợp lệ'),
  taskType: taskTypeSchema,
  referenceCode: z.string(), title: z.string(),
  warehouseId: nonEmptyDotNetGuidSchema('Mã kho không hợp lệ'), warehouseName: z.string(),
  status: z.string(), executionStatus: executionStatusSchema, priority: z.enum(['Normal', 'Urgent']),
  dueAt: z.string().nullable(), deadlineStatus: deadlineStatusSchema,
  startedAt: z.string().nullable(), completedAt: z.string().nullable(),
  itemCount: z.number(), completedItemCount: z.number(), totalQuantity: z.number(),
  completedQuantity: z.number(), progressPercentage: z.number(), workSummary: z.string(),
  pauseReason: z.string().nullable(), assignedTo: z.string().nullable(), assignedToName: z.string().nullable(),
  assignedAt: z.string().nullable(), updatedAt: z.string(), transferId: z.string().nullable(),
  transferShipmentId: z.string().nullable(),
  isCombinedTransferReceipt: z.boolean().optional(),
});

export const warehouseTaskListSchema = z.object({
  items: z.array(warehouseTaskSchema),
  stats: z.object({ unassignedCount: z.number(), queuedCount: z.number(), inProgressCount: z.number(),
    pausedCount: z.number(), dueSoonCount: z.number(), overdueCount: z.number() }),
  totalCount: z.number().int().min(0), pageNumber: z.number().int().min(1), pageSize: z.number().int().min(1),
});

export type TaskFilters = z.infer<typeof taskFiltersSchema>;
export type TaskActionInput = z.infer<typeof taskActionSchema>;
export type WarehouseTask = z.infer<typeof warehouseTaskSchema>;
export type WarehouseTaskList = z.infer<typeof warehouseTaskListSchema>;
