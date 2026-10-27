import { z } from 'zod';

import { FORECAST_RUN_STATUSES, FORECAST_SUGGESTION_STATUSES } from './forecast.types';

const nullableString = z.string().nullish().transform((value) => value ?? null);
const nullableNumber = z.number().nullish().transform((value) => value ?? null);

export const forecastRunStatusSchema = z.enum(FORECAST_RUN_STATUSES);
const suggestionStatusSchema = z.enum(FORECAST_SUGGESTION_STATUSES);

export const forecastRunSummarySchema = z.object({
  id: z.string().min(1),
  status: forecastRunStatusSchema,
  createdAt: z.string(),
  forecastStartDate: z.string(),
  forecastEndDate: z.string(),
});
export const forecastRunListSchema = z.array(forecastRunSummarySchema);

const resultSchema = z.object({
  id: z.string(),
  productId: z.string(),
  sku: z.string(),
  productName: z.string(),
  forecastDate: z.string(),
  forecastQuantity: z.number(),
  actualQuantity: nullableNumber,
  accuracyPercent: nullableNumber,
});

const replenishmentSchema = z.object({
  id: z.string(),
  productId: z.string(),
  sku: z.string(),
  productName: z.string(),
  suggestedQuantity: z.number(),
  adjustedQuantity: nullableNumber,
  status: suggestionStatusSchema,
  version: nullableString,
  inboundRequestVersion: nullableString,
  reviewNotice: nullableString,
  explanation: z.object({ unitName: z.string() }).nullish().transform((value) => value?.unitName ?? null),
}).transform(({ explanation, ...rest }) => ({ ...rest, unitName: explanation }));

const rebalancingSchema = z.object({
  id: z.string(),
  productId: z.string(),
  sku: z.string(),
  productName: z.string(),
  sourceWarehouseName: z.string(),
  destinationWarehouseName: z.string(),
  suggestedQuantity: z.number(),
  status: suggestionStatusSchema,
});

export const forecastRunSchema = z.object({
  id: z.string().min(1),
  warehouseName: z.string(),
  createdByName: z.string(),
  historicalPeriodDays: z.number(),
  forecastStartDate: z.string(),
  forecastEndDate: z.string(),
  status: forecastRunStatusSchema,
  failureReason: nullableString,
  completedAt: nullableString,
  createdAt: z.string(),
  results: z.array(resultSchema),
  replenishmentSuggestions: z.array(replenishmentSchema),
  rebalancingSuggestions: z.array(rebalancingSchema),
  details: z.object({ draftCreationNotice: nullableString }).nullish().transform((value) => value?.draftCreationNotice ?? null),
}).transform(({ details, ...rest }) => ({ ...rest, draftCreationNotice: details }));

/** Mirrors the BE create-run validator: history 1..366 days, horizon 1..90 days. */
export const createForecastRunFormSchema = z.object({
  historicalPeriodDays: z.coerce.number({ message: 'Nhập số ngày lịch sử.' }).int('Phải là số nguyên.').min(1, 'Tối thiểu 1 ngày.').max(366, 'Tối đa 366 ngày.'),
  horizonDays: z.coerce.number({ message: 'Nhập số ngày dự báo.' }).int('Phải là số nguyên.').min(1, 'Tối thiểu 1 ngày.').max(90, 'Tối đa 90 ngày.'),
});

export type CreateForecastRunFormValues = z.input<typeof createForecastRunFormSchema>;
