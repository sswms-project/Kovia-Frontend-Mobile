export const ABC_CLASSES = ['A', 'B', 'C'] as const;
export type AbcClass = (typeof ABC_CLASSES)[number];

export const ABC_METRICS = ['Quantity', 'Activity'] as const;
export type AbcMetric = (typeof ABC_METRICS)[number];

export interface AbcItem {
  readonly warehouseId: string;
  readonly productId: string;
  readonly sku: string;
  readonly productName: string;
  readonly totalQuantity: number;
  readonly metricValue: number;
  readonly cumulativePercentage: number;
  readonly class: AbcClass;
  readonly analysisFrom: string;
  readonly analysisTo: string;
  readonly analysisId: string | null;
  readonly metric: AbcMetric | null;
  readonly aThreshold: number | null;
  readonly bThreshold: number | null;
  readonly appliedCycleCountId: string | null;
}

export interface RunAbcBody {
  readonly warehouseId: string;
  readonly historicalPeriodDays: number;
  readonly metric: AbcMetric;
  readonly aThreshold: number;
  readonly bThreshold: number;
}
