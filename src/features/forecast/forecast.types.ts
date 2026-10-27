export const FORECAST_RUN_STATUSES = ['Pending', 'Running', 'Completed', 'Failed'] as const;
export type ForecastRunStatus = (typeof FORECAST_RUN_STATUSES)[number];

export const FORECAST_SUGGESTION_STATUSES = ['New', 'Accepted', 'Rejected', 'Expired'] as const;
export type ForecastSuggestionStatus = (typeof FORECAST_SUGGESTION_STATUSES)[number];

export type ForecastSuggestionType = 'Replenishment' | 'Rebalancing';

export interface ForecastRunSummary {
  id: string;
  status: ForecastRunStatus;
  createdAt: string;
  forecastStartDate: string;
  forecastEndDate: string;
}

export interface ForecastRunResult {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  forecastDate: string;
  forecastQuantity: number;
  actualQuantity: number | null;
  accuracyPercent: number | null;
}

export interface ReplenishmentSuggestion {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  suggestedQuantity: number;
  adjustedQuantity: number | null;
  status: ForecastSuggestionStatus;
  version: string | null;
  inboundRequestVersion: string | null;
  reviewNotice: string | null;
  unitName: string | null;
}

export interface RebalancingSuggestion {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  sourceWarehouseName: string;
  destinationWarehouseName: string;
  suggestedQuantity: number;
  status: ForecastSuggestionStatus;
}

export interface ForecastRun {
  id: string;
  warehouseName: string;
  createdByName: string;
  historicalPeriodDays: number;
  forecastStartDate: string;
  forecastEndDate: string;
  status: ForecastRunStatus;
  failureReason: string | null;
  completedAt: string | null;
  createdAt: string;
  results: ForecastRunResult[];
  replenishmentSuggestions: ReplenishmentSuggestion[];
  rebalancingSuggestions: RebalancingSuggestion[];
  draftCreationNotice: string | null;
}

export interface CreateForecastRunBody {
  warehouseId: string;
  historicalPeriodDays: number;
  horizonDays: number;
}

export interface RejectForecastSuggestionBody {
  suggestionType: ForecastSuggestionType;
  expectedVersion: string | null;
  expectedInboundRequestVersion: string | null;
}
