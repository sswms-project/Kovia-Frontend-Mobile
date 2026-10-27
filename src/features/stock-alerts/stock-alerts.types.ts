import type { z } from 'zod';

import type { expiryAlertPageSchema, thresholdAlertPageSchema } from './stock-alerts.schema';

export type StockAlertKind = 'below-minimum' | 'above-maximum' | 'expiring' | 'expired';
export type ThresholdAlertPage = z.infer<typeof thresholdAlertPageSchema>;
export type ExpiryAlertPage = z.infer<typeof expiryAlertPageSchema>;
export type ThresholdAlertRow = ThresholdAlertPage['items'][number];
export type ExpiryAlertRow = ExpiryAlertPage['items'][number];

export interface StockAlertParams {
  readonly kind: StockAlertKind;
  readonly warehouseId: string | null;
  readonly expiringDays: number;
  readonly search: string;
}
