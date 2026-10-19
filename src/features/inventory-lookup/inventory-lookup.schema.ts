import { z } from 'zod';

import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

const id = nonEmptyDotNetGuidSchema('Mã định danh không hợp lệ.');
const nullableText = z.string().nullable();
export const lookupInputSchema = z.object({
  kind: z.enum(['Product', 'Location']),
  code: z.string().max(512, 'Mã tra cứu không được vượt quá 512 ký tự.')
    .refine((value) => !/\p{Cc}/u.test(value), 'Mã tra cứu không được chứa ký tự điều khiển.')
    .transform((value) => value.trim()).pipe(z.string().min(1, 'Vui lòng nhập mã tra cứu.')),
});
export const barcodeMatchSchema = z.object({
  id, type: z.enum(['Product', 'Zone', 'Rack', 'Slot']), code: z.string(), name: z.string(),
  displayPath: z.string(), warehouseId: id,
});
export const barcodeResultSchema = z.object({
  matches: z.array(barcodeMatchSchema).max(50), totalCount: z.number().int().min(0),
}).refine((value) => value.totalCount >= value.matches.length, 'Kết quả tra mã không hợp lệ.');
export const inventoryStockSchema = z.object({
  id, productId: id, sku: z.string(), productName: z.string(), warehouseId: id, warehouseName: z.string(),
  slotId: id, slotCode: z.string(), lotId: id.nullable(), qualityStatus: z.string(), eligibilityStatus: z.string(),
  quantityOnHand: z.number().finite(), reservedQuantity: z.number().finite(), holdQuantity: z.number().finite(),
  availableQuantity: z.number().finite(), version: nullableText, updatedAt: nullableText,
  lotNumber: nullableText, manufacturedDate: nullableText, expiryDate: nullableText, lotStatus: nullableText,
  unitName: nullableText, canManageWarehouse: z.boolean(), rackId: id.nullable(), rackCode: nullableText,
  zoneCode: nullableText, isSystemDefaultSlot: z.boolean(),
  lastCount: z.object({ cycleCountId: id, code: z.string(), countedAt: z.string(),
    countedByName: nullableText, difference: z.number().nullable() }).nullable(),
});
export const inventoryListSchema = z.object({
  items: z.array(inventoryStockSchema), totalCount: z.number().int().min(0),
  pageNumber: z.number().int().min(1), pageSize: z.number().int().min(1), snapshotAt: z.string(),
});
export type LookupInput = z.infer<typeof lookupInputSchema>;
export type BarcodeMatch = z.infer<typeof barcodeMatchSchema>;
export type BarcodeResult = z.infer<typeof barcodeResultSchema>;
export type InventoryStock = z.infer<typeof inventoryStockSchema>;
export type InventoryList = z.infer<typeof inventoryListSchema>;
