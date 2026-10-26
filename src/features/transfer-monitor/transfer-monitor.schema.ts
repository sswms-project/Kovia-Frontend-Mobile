import { z } from 'zod';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
const id = nonEmptyDotNetGuidSchema('Mã phiếu điều chuyển không hợp lệ.');
const text = z.string();
const quantity = z.number().finite().nonnegative();
export const TRANSFER_STATUS_LABEL: Readonly<Record<string, string>> = {
  Draft: 'Nháp', PendingSourceAcceptance: 'Chờ kho nguồn xác nhận', InProgress: 'Đang thực hiện',
  AwaitingResolution: 'Chờ xử lý chênh lệch', Completed: 'Hoàn tất', Cancelled: 'Đã hủy',
  PendingSourceApproval: 'Chờ duyệt (phiếu cũ)', InTransit: 'Đang vận chuyển', Approved: 'Đã duyệt',
  ReceivedWithVariance: 'Nhận có chênh lệch', Rejected: 'Đã từ chối',
  Picking: 'Đang lấy hàng', ReadyToDispatch: 'Chờ xuất', AwaitingReceipt: 'Chờ nhận', Counting: 'Đang kiểm hàng',
  AwaitingPutAway: 'Chờ cất', Received: 'Đã nhận', ReceivedWithDiscrepancy: 'Nhận có chênh lệch',
};
// Read-only projections: execution commands continue to use the full operational schemas.
const scope = { id, transferCode: text, sourceWarehouseId: id, sourceWarehouseName: text,
  destinationWarehouseId: id, destinationWarehouseName: text, status: text, isLegacyWorkflow: z.boolean(), createdAt: text };
export const transferSummarySchema = z.object({ ...scope, lineCount: z.number().int().nonnegative(),
  hasPendingPickEscalation: z.boolean(), hasOpenDiscrepancy: z.boolean().default(false), hasOpenFeedback: z.boolean() });
export const transferPageSchema = z.object({ items: z.array(transferSummarySchema), totalCount: z.number().int().nonnegative(),
  pageNumber: z.number().int().positive(), pageSize: z.number().int().positive() });
export const transferMonitorDetailSchema = z.object({ ...scope, reason: text.nullable(), note: text.nullable(),
  requiredBy: text.nullable(), completedAt: text.nullable(), cancellationReason: text.nullable(),
  items: z.array(z.object({ id, sku: text, productName: text, quantity, dispatchedQuantity: quantity, receivedQuantity: quantity,
    damagedQuantity: quantity, missingQuantity: quantity, baseUnitName: text.nullable(), unitName: text.nullable() })),
  shipments: z.array(z.object({ id, shipmentNumber: z.number().int().positive(), status: text, pickAssigneeName: text.nullable(),
    receiveAssigneeName: text.nullable(), putAwayAssigneeName: text.nullable(), dispatchedAt: text.nullable(), receivedAt: text.nullable(),
    receivedPhysicalQuantity: quantity, pendingPutAwayQuantity: quantity,
    lines: z.array(z.object({ id, itemId: id, sku: text, productName: text, plannedQuantity: quantity, pickedQuantity: quantity,
      dispatchedQuantity: quantity, pendingReturnQuantity: quantity, openExceptionCount: z.number().int().nonnegative() })) })).nullable(),
  discrepancies: z.array(z.object({ id, sku: text, productName: text, isOpen: z.boolean(), quantity, resolvedQuantity: quantity })).nullable(),
  requestEvents: z.array(z.object({ action: text, actorName: text.nullable(), createdAt: text, reason: text.nullable() })).nullable(),
});
export type TransferSummary = z.infer<typeof transferSummarySchema>;
