import { z } from 'zod';

import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { inventoryStockSchema } from '@/features/inventory-lookup/inventory-lookup.schema';
import { executionStatusSchema } from '@/features/my-tasks/my-tasks.schema';

const id = nonEmptyDotNetGuidSchema('Mã công việc hoặc vị trí không hợp lệ.');
const text = z.string();
const quantity = z.number().finite().nonnegative();
export const relocationLineSchema = z.object({ id, productId: id, sku: text, productName: text,
  sourceInventoryStockId: id, sourceSlotId: id, sourceSlotCode: text, proposedDestinationSlotId: id.nullable(),
  proposedDestinationSlotCode: text.nullable(), quantity, completedQuantity: quantity, remainingQuantity: quantity,
}).refine(line => Math.abs(line.quantity - line.completedQuantity - line.remainingQuantity) < 1e-7, 'Số lượng công việc chưa khớp.');
export const relocationTaskSchema = z.object({ id, taskCode: text, taskType: z.literal('Relocation'), warehouseId: id,
  warehouseName: text, executionStatus: executionStatusSchema, priority: z.enum(['Normal', 'Urgent']), reason: text,
  dueAt: text.nullable(), assignedTo: id.nullable(), assignedToName: text.nullable(), assignedAt: text.nullable(),
  rowVersion: text.nullable(), lines: z.array(relocationLineSchema), executions: z.array(z.object({ id, warehouseTaskLineId: id,
    sourceSlotId: id, sourceSlotCode: text, destinationSlotId: id, destinationSlotCode: text, quantity,
    performedBy: id, recommendationRank: z.number().int().nullable(), recommendationScore: z.number().nullable(),
    recommendationReasons: text.nullable(), overrideReason: text.nullable(), executedAt: text,
  })),
});
export const relocationRecommendationsSchema = z.array(z.object({ slotId: id, slotCode: text, slotName: text,
  zoneCode: text, rackCode: text, rank: z.number().int().positive(), score: z.number().finite(),
  remainingCapacity: z.number().finite().nullable(), capacityUnitName: text.nullable(), reasons: z.array(text),
}));
export const relocationProductSchema = z.object({ id, sku: text, productName: text, description: text.nullable(), imageUrl: text.nullable(),
  unitId: id, unitName: text, categoryId: id.nullable(), categoryName: text.nullable(), categoryCode: text.nullable(),
  categoryPath: text.nullable(), status: text, barcodeValue: text.nullable(), isLotTracked: z.boolean(), shelfLifeDays: z.number().nullable(),
  canChangeBaseUnit: z.boolean(), canChangeTrackingMode: z.boolean(), quantityOnHand: quantity, reservedQuantity: quantity,
  availableQuantity: z.number().finite(), createdAt: text,
});
export const relocationUnitsSchema = z.array(z.object({ id, unitCode: text, unitName: text, symbol: text.nullable(),
  quantityPrecision: z.number().int().min(0).max(6), description: text.nullable(), status: text,
  createdAt: text, modifiedAt: text.nullable(),
}));
export const relocationSourceSchema = z.object({ stock: inventoryStockSchema, product: relocationProductSchema,
  unit: relocationUnitsSchema.element });
const scan = text.trim().min(1, 'Vui lòng quét hoặc nhập mã thực tế.').max(200, 'Mã không được vượt quá 200 ký tự.');
export const relocationFormSchema = z.object({ lineId: id, quantity: z.number({ error: 'Vui lòng nhập số lượng thực tế hợp lệ.' }).finite().positive('Số lượng phải lớn hơn 0.'),
  destinationSlotId: id, sourceScan: scan, destinationScan: scan, productScan: scan,
  overrideReason: text.trim().max(500, 'Lý do không được vượt quá 500 ký tự.'),
});
export const relocationCommandSchema = relocationFormSchema.pick({ lineId: true, destinationSlotId: true, quantity: true })
  .extend({ commandId: id, expectedVersion: text.min(1), overrideReason: text.trim().max(500).nullable() });
export type RelocationTask = z.infer<typeof relocationTaskSchema>;
export type RelocationLine = z.infer<typeof relocationLineSchema>;
export type RelocationRecommendations = z.infer<typeof relocationRecommendationsSchema>;
export type RelocationSource = z.infer<typeof relocationSourceSchema>;
export type RelocationForm = z.infer<typeof relocationFormSchema>;
export type RelocationCommand = z.infer<typeof relocationCommandSchema>;
