import { api, unwrap, type ApiResponse } from '@/lib/api';

import { expiryAlertPageSchema, reportingWarehousesSchema, thresholdAlertPageSchema } from './stock-alerts.schema';
import type { StockAlertParams } from './stock-alerts.types';

export const STOCK_ALERT_PAGE_SIZE = 50;
const SUMMARY_NAME_COUNT = 5;

function buildParams(params: StockAlertParams, pageNumber: number, pageSize = STOCK_ALERT_PAGE_SIZE) {
  const search = params.search.trim();
  return {
    kind: params.kind,
    pageNumber,
    pageSize,
    ...(params.warehouseId ? { warehouseIds: [params.warehouseId] } : {}),
    ...(params.kind === 'expiring' ? { expiringDays: params.expiringDays } : {}),
    ...(search ? { search } : {}),
  };
}

// Backend binds arrays as repeated keys (warehouseIds=a&warehouseIds=b).
const paramsSerializer = { indexes: null };

export const stockAlertsApi = {
  thresholds: async (params: StockAlertParams, pageNumber: number, signal?: AbortSignal) =>
    thresholdAlertPageSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/dashboard/stock-alerts/thresholds',
      { params: buildParams(params, pageNumber), paramsSerializer, signal }))),
  expiry: async (params: StockAlertParams, pageNumber: number, signal?: AbortSignal) =>
    expiryAlertPageSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/dashboard/stock-alerts/expiry',
      { params: buildParams(params, pageNumber), paramsSerializer, signal }))),
  // Home summary: totalCount plus the first few product names (spoken alert).
  count: async (params: StockAlertParams, signal?: AbortSignal) => {
    const isExpiry = params.kind === 'expiring' || params.kind === 'expired';
    const page = unwrap(await api.get<ApiResponse<unknown>>(
      isExpiry ? '/dashboard/stock-alerts/expiry' : '/dashboard/stock-alerts/thresholds',
      { params: buildParams(params, 1, SUMMARY_NAME_COUNT), paramsSerializer, signal }));
    const parsed = isExpiry ? expiryAlertPageSchema.parse(page) : thresholdAlertPageSchema.parse(page);
    return { total: parsed.totalCount, names: parsed.items.map((row) => row.productName) };
  },
  warehouses: async (signal?: AbortSignal) =>
    reportingWarehousesSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/dashboard/warehouses', { signal }))),
};
