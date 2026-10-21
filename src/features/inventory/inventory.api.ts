import { api, unwrap, type ApiResponse } from '@/lib/api';

import type {
  InventoryListQuery,
  InventoryStockListResponse,
  InventoryWarehouseOption,
  StockMovementListQuery,
  StockMovementListResponse,
} from './inventory.types';

// Read-only on mobile: reporting damage and the other writes stay on the web for now.
export const inventoryApi = {
  getInventory: (params: InventoryListQuery) =>
    api.get<ApiResponse<InventoryStockListResponse>>('/inventory', { params }).then(unwrap),
  getWarehouseOptions: () =>
    api
      .get<ApiResponse<InventoryWarehouseOption[]>>('/inventory/filter-options/warehouses')
      .then(unwrap),
  getStockMovements: (params: StockMovementListQuery) =>
    api.get<ApiResponse<StockMovementListResponse>>('/inventory/movements', { params }).then(unwrap),
};
