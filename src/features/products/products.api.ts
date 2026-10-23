import { api, unwrap, type ApiResponse } from '@/lib/api';

import type { Product, ProductFilters, ProductList } from './products.types';

export const productsApi = {
  list: (warehouseId: string, f: ProductFilters, signal?: AbortSignal) =>
    api.get<ApiResponse<ProductList>>('/products', {
      params: {
        pageNumber: 1, pageSize: f.pageSize, warehouseId,
        searchTerm: f.searchTerm?.trim() || undefined, stockStatus: f.stockStatus,
      },
      signal,
    }).then(unwrap),
  detail: (id: string, warehouseId: string, signal?: AbortSignal) =>
    api.get<ApiResponse<Product>>(`/products/${id}`, { params: { warehouseId }, signal }).then(unwrap),
};
