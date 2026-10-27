import { api, unwrap, type ApiResponse } from '@/lib/api';

import { forecastRunListSchema, forecastRunSchema } from './forecast.schema';
import type { CreateForecastRunBody, RejectForecastSuggestionBody } from './forecast.types';

export const forecastApi = {
  listRuns: async (warehouseId: string, signal?: AbortSignal) =>
    forecastRunListSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/inventory/forecast-runs', { params: { warehouseId }, signal }))),
  getRun: async (runId: string, signal?: AbortSignal) =>
    forecastRunSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/inventory/forecast-runs/${runId}`, { signal }))),
  createRun: async (body: CreateForecastRunBody) =>
    String(unwrap(await api.post<ApiResponse<unknown>>('/inventory/forecast-runs', body))),
  // Returns immediately; the caller polls getRun until Completed or Failed.
  executeRun: async (runId: string) => {
    await api.post<ApiResponse<unknown>>(`/inventory/forecast-runs/${runId}/execute`);
  },
  evaluateRun: async (runId: string) => {
    await api.post<ApiResponse<unknown>>(`/inventory/forecast-runs/${runId}/evaluate-accuracy`);
  },
  rejectSuggestion: async (suggestionId: string, body: RejectForecastSuggestionBody) => {
    await api.post<ApiResponse<unknown>>(`/inventory/forecast-suggestions/${suggestionId}/reject`, body);
  },
};
