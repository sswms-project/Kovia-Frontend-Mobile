import { z } from 'zod';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { warehouseEvidenceSchema } from '@/lib/warehouse-contract.schema';

const id = nonEmptyDotNetGuidSchema('Mã định danh không hợp lệ.');
const lifecycleEventSchema = z.object({ action: z.string(), fromState: z.string().nullable(), toState: z.string().nullable(),
  actorId: id, actorName: z.string(), reason: z.string().nullable(), createdAt: z.string() });
export const discrepancyStatusSchema = z.enum(['PendingReview', 'EvidenceRequested', 'Rejected', 'FollowUpPending', 'Resolved', 'Duplicate']);
export const discrepancyTypeSchema = z.enum(['Shortage', 'Excess', 'WrongLocation']);
export const discrepancySchema = z.object({
  id, code: z.string(), warehouseId: id, warehouseName: z.string(), productId: id, sku: z.string(), productName: z.string(),
  slotId: id, slotCode: z.string(), lotId: id.nullable(), lotNumber: z.string().nullable(), type: discrepancyTypeSchema,
  observedDifference: z.number().finite(), description: z.string(), status: discrepancyStatusSchema,
  reportedByUserId: id, reportedByName: z.string(), createdAt: z.string(), reviewedByUserId: id.nullable(), reviewedAt: z.string().nullable(),
  reviewReason: z.string().nullable(), duplicateOfReportId: id.nullable(), linkedCycleCountId: id.nullable(),
  linkedStockAdjustmentId: id.nullable(), version: z.string().nullable(), evidence: z.array(warehouseEvidenceSchema),
  correctSlotId: id.nullable(), correctSlotCode: z.string().nullable(), relatedTaskType: z.string().nullable(), relatedTaskId: id.nullable(),
  responsibleUserId: id.nullable(), responsibleUserName: z.string().nullable(), history: z.array(lifecycleEventSchema),
});
export const discrepancyPageSchema = z.object({ items: z.array(discrepancySchema), totalCount: z.number().int().nonnegative(),
  pageNumber: z.number().int().positive(), pageSize: z.number().int().positive(), snapshotAt: z.string() });
export const discrepancyFormSchema = z.object({
  type: discrepancyTypeSchema,
  quantity: z.string().trim().regex(/^-?\d+([.,]\d{1,2})?$/, 'Nhập số khác 0, tối đa 2 chữ số thập phân.')
    .refine((value) => Number.isFinite(Number(value.replace(',', '.'))) && Number(value.replace(',', '.')) !== 0 && Math.abs(Number(value.replace(',', '.'))) <= Number.MAX_SAFE_INTEGER, 'Số lượng chưa hợp lệ.'),
  description: z.string().trim().min(1, 'Vui lòng nhập mô tả.').max(1000, 'Mô tả tối đa 1000 ký tự.'),
  correctSlotCode: z.string().trim().max(512, 'Mã vị trí tối đa 512 ký tự.'),
}).superRefine((value, context) => {
  if (value.type !== 'WrongLocation' && Number(value.quantity.replace(',', '.')) <= 0)
    context.addIssue({ code: 'custom', path: ['quantity'], message: 'Nhập độ lớn số thiếu/thừa lớn hơn 0.' });
  if (value.type === 'WrongLocation' && !value.correctSlotCode)
    context.addIssue({ code: 'custom', path: ['correctSlotCode'], message: 'Vui lòng nhập mã vị trí đúng.' });
});
export const discrepancyCommandSchema = z.object({ warehouseId: id, productId: id, slotId: id, lotId: id.optional(),
  type: discrepancyTypeSchema, observedDifference: z.number().finite().refine((value) => value !== 0),
  description: z.string().trim().min(1).max(1000), evidenceIds: z.array(id).min(1).max(10), commandId: id,
  correctSlotId: id.optional(), relatedTaskType: z.string().max(100).optional(), relatedTaskId: id.optional(),
}).superRefine((value, context) => {
  if ((value.type === 'Shortage' && value.observedDifference >= 0) || (value.type === 'Excess' && value.observedDifference <= 0))
    context.addIssue({ code: 'custom', path: ['observedDifference'], message: 'Thiếu phải âm, thừa phải dương.' });
  if (value.type === 'WrongLocation' && (!value.correctSlotId || value.correctSlotId === value.slotId))
    context.addIssue({ code: 'custom', path: ['correctSlotId'], message: 'Vị trí đúng phải khác vị trí hiện tại.' });
  if (!!value.relatedTaskType !== !!value.relatedTaskId)
    context.addIssue({ code: 'custom', path: ['relatedTaskId'], message: 'Công việc liên quan phải đủ loại và mã.' });
});
export type Discrepancy = z.infer<typeof discrepancySchema>;
export type DiscrepancyStatus = z.infer<typeof discrepancyStatusSchema>;
export type DiscrepancyForm = z.infer<typeof discrepancyFormSchema>;
export type DiscrepancyCommand = z.infer<typeof discrepancyCommandSchema>;
export const DISCREPANCY_STATUS = { PendingReview: 'Chờ xem xét', EvidenceRequested: 'Cần thêm bằng chứng', Rejected: 'Từ chối', FollowUpPending: 'Đang xử lý tiếp', Resolved: 'Đã giải quyết', Duplicate: 'Báo cáo trùng' } as const;
export const DISCREPANCY_TYPE = { Shortage: 'Thiếu hàng', Excess: 'Thừa hàng', WrongLocation: 'Sai vị trí' } as const;

export const discrepancyEvidenceSchema = z.object({ reportId: id, evidenceIds: z.array(id).min(1).max(10), expectedVersion: z.string().min(1) });
