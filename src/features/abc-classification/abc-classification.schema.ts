import { z } from 'zod';

import { ABC_CLASSES, ABC_METRICS } from './abc-classification.types';

const nullableString = z.string().nullish().transform((value) => value ?? null);
const nullableNumber = z.number().nullish().transform((value) => value ?? null);

export const abcClassSchema = z.enum(ABC_CLASSES);
export const abcMetricSchema = z.enum(ABC_METRICS);

export const abcItemSchema = z.object({
  warehouseId: z.string().min(1),
  productId: z.string().min(1),
  sku: z.string(),
  productName: z.string(),
  totalQuantity: z.number(),
  metricValue: z.number(),
  cumulativePercentage: z.number(),
  class: abcClassSchema,
  analysisFrom: z.string(),
  analysisTo: z.string(),
  analysisId: nullableString,
  metric: abcMetricSchema.nullish().transform((value) => value ?? null),
  aThreshold: nullableNumber,
  bThreshold: nullableNumber,
  appliedCycleCountId: nullableString,
});

export const abcListSchema = z.array(abcItemSchema);

/** Mirrors the BE run validator: thresholds are percentages and A must stay below B. */
export const runAbcFormSchema = z.object({
  historicalPeriodDays: z.coerce.number({ message: 'Nhập số ngày.' }).int('Số ngày phải là số nguyên.').min(1, 'Tối thiểu 1 ngày.').max(365, 'Tối đa 365 ngày.'),
  metric: abcMetricSchema,
  aThreshold: z.coerce.number({ message: 'Nhập ngưỡng A.' }).gt(0, 'Ngưỡng A phải lớn hơn 0.').lt(100, 'Ngưỡng A phải nhỏ hơn 100.'),
  bThreshold: z.coerce.number({ message: 'Nhập ngưỡng B.' }).gt(0, 'Ngưỡng B phải lớn hơn 0.').lte(100, 'Ngưỡng B tối đa 100.'),
}).refine((value) => value.aThreshold < value.bThreshold, { path: ['bThreshold'], message: 'Ngưỡng B phải lớn hơn ngưỡng A.' });

export type RunAbcFormValues = z.input<typeof runAbcFormSchema>;
