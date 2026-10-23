import { P } from '@/config/permission-codes';
import { useWarehouseQuery } from '@/features/warehouse-access/hooks/use-warehouse-query';

import { productsApi } from '../products.api';
import type { ProductFilters } from '../products.types';

export const useProducts = (filters: ProductFilters) => useWarehouseQuery({
  permission: P.PRODUCTS_VIEW, resource: 'products', params: filters,
  fetcher: (warehouseId, signal) => productsApi.list(warehouseId, filters, signal),
});

export const useProduct = (id: string) => useWarehouseQuery({
  permission: P.PRODUCTS_VIEW, resource: 'product', params: { id }, enabled: !!id,
  fetcher: (warehouseId, signal) => productsApi.detail(id, warehouseId, signal),
});
