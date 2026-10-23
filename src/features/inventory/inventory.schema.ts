import { z } from 'zod';

import { inventoryListSchema } from '@/features/inventory-lookup/inventory-lookup.schema';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { STOCK_MOVEMENT_TYPES } from './inventory.types';

const id = nonEmptyDotNetGuidSchema('Mã tồn kho không hợp lệ.');
const quality = z.enum(['Good', 'Damaged', 'Quarantine']);
const eligibility = z.enum(['Available', 'InspectionHold', 'DamageHold', 'Quarantine']);
export const scopedInventoryListSchema = inventoryListSchema.extend({
  items: z.array(inventoryListSchema.shape.items.element.extend({ qualityStatus: quality, eligibilityStatus: eligibility })),
});
export const stockIdentitySchema = z.object({ stockId: id, productId: id, slotId: id, warehouseId: id.optional() });
export const movementTypeSchema = z.enum(STOCK_MOVEMENT_TYPES);
export const stockMovementListSchema = z.object({
  pageNumber: z.number().int().positive(), pageSize: z.number().int().positive(), totalCount: z.number().int().nonnegative(),
  items: z.array(z.object({
    id, productId: id, sku: z.string(), productName: z.string(), slotId: id, slotCode: z.string(),
    lotId: id.nullable(), lotNumber: z.string().nullable(), qualityStatus: quality, eligibilityStatus: eligibility,
    quantityChange: z.number().finite(), balanceAfter: z.number().finite(), movementType: movementTypeSchema,
    referenceType: z.string(), referenceId: id, correctsMovementId: id.nullable(), correctionReason: z.string().nullable(),
    performedByUserId: id, performedByName: z.string(), occurredAt: z.string(), createdAt: z.string(),
    warehouseName: z.string().nullish(), zoneCode: z.string().nullish(), rackCode: z.string().nullish(),
    isSystemDefaultSlot: z.boolean().optional(), unitName: z.string().nullish(), referenceCode: z.string().nullish(),
  })),
});
