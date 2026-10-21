import { z } from 'zod';

import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

const id = nonEmptyDotNetGuidSchema('Mã dữ liệu không hợp lệ.');
const text = z.string();
const quantity = z.number().finite().nonnegative();
export const allocationOrderSchema = z.object({ id, warehouseId: id, stockIssueRequestCode: text, status: text,
  createdBy: id.optional(), version: text.nullable().optional() });
export const allocationQueueSchema = z.object({ items: z.array(allocationOrderSchema), totalCount: quantity.int() });
export const allocationPlanSchema = z.object({ stockIssueRequestId: id, documentVersion: text.nullable(),
  canAllocateWholeRequest: z.boolean(), decision: text, automationEnabled: z.boolean().default(false),
  allocations: z.array(z.object({ itemId: id, productId: id, inventoryStockId: id, slotId: id,
    lotId: id.nullable(), lotNumber: text.nullable(), expiryDate: text.nullable(), quantity,
    directFromReceiving: z.boolean(), reason: text, sku: text, productName: text, sourcePath: text })) });
export const allocationDemandSchema = z.object({ id, stockIssueRequestId: id, assignedStaffId: id,
  authorizedBy: id, authorizedAt: text, validUntil: text, completedAt: text.nullable(), revokedAt: text.nullable(),
  lastAttemptAt: text.nullable(), decision: text, version: text.nullable() });
export const allocationPickersSchema = z.array(z.object({ id, fullName: text }));
export const allocationSummarySchema = z.object({ warehouseId: id, from: text, to: text, measurementBasis: text,
  products: z.array(z.object({ productId: id, sku: text, productName: text, baseUnitName: text,
    allocatedDirectQuantity: quantity, confirmedDirectPickedQuantity: quantity, confirmedDirectDispatchedQuantity: quantity })) });
export const authorizeAllocationSchema = z.object({ stockIssueRequestId: id, expectedVersion: text.min(1),
  commandId: id, assignedStaffId: id, validUntil: z.iso.datetime({ offset: true }), selfApprovalAcknowledged: z.boolean() });
export type AllocationOrder = z.infer<typeof allocationOrderSchema>;
export type AllocationAuthorization = z.infer<typeof authorizeAllocationSchema>;
