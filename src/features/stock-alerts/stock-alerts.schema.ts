import { z } from 'zod';

const baseRow = {
  warehouseId: z.string(),
  warehouseName: z.string(),
  productId: z.string(),
  sku: z.string(),
  productName: z.string(),
  unit: z.string(),
};

const pageFields = {
  generatedAt: z.string(),
  appliedWarehouseIds: z.array(z.string()).default([]),
  totalCount: z.number(),
  pageNumber: z.number(),
  pageSize: z.number(),
};

export const thresholdAlertPageSchema = z.object({
  ...pageFields,
  kind: z.enum(['below-minimum', 'above-maximum']),
  items: z.array(z.object({
    ...baseRow,
    availableQuantity: z.number(),
    thresholdQuantity: z.number(),
    difference: z.number(),
  })),
});

export const expiryAlertPageSchema = z.object({
  ...pageFields,
  kind: z.enum(['expiring', 'expired']),
  expiringDays: z.number().nullable().optional(),
  items: z.array(z.object({
    ...baseRow,
    lotId: z.string(),
    lotNumber: z.string(),
    expiryDate: z.string(),
    onHandQuantity: z.number(),
    daysToExpiry: z.number(),
  })),
});

export const reportingWarehousesSchema = z.array(z.object({
  id: z.string().optional(),
  warehouseId: z.string().optional(),
  name: z.string().optional(),
  warehouseName: z.string().optional(),
}).passthrough());
