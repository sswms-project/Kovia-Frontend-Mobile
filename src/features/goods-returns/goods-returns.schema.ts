import { z } from 'zod';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
const id = nonEmptyDotNetGuidSchema('Mã phiếu trả không hợp lệ.');
export const goodsReturnSchema = z.object({ id, goodsReturnRequestCode: z.string(), stockIssueRequestId: id,
  stockIssueRequestCode: z.string(), reason: z.string(), status: z.string(), createdAt: z.string(), createdBy: id,
  approvedBy: id.nullable(), approvedAt: z.string().nullable(), rejectionReason: z.string().nullable(),
  items: z.array(z.object({ id, stockIssuePickDetailId: id.nullable(), productId: id, productName: z.string(), sku: z.string(),
    quantity: z.number().finite().positive(), condition: z.string(), restockSlotId: id.nullable(), lotId: id.nullable(), lotNumber: z.string().nullable() })) });
export const returnLocationPageSchema = z.object({ items: z.array(z.object({ id, type: z.string(), code: z.string(),
  zoneCode: z.string().nullable(), rackCode: z.string().nullable(), lifecycleStatus: z.string() })), totalCount: z.number().int().nonnegative() });
