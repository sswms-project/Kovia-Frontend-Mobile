import { api, unwrap, type ApiResponse } from '@/lib/api';

import type {
  CategoryResponse,
  ProductListQuery,
  ProductListResponse,
  ProductLot,
  ProductResponse,
  ProductSupplier,
  ProductUnitConversion,
} from './product.types';

// Read-only on mobile: creating, editing and generating barcodes stay on the web.
export const productApi = {
  getProducts: (params: ProductListQuery) =>
    api.get<ApiResponse<ProductListResponse>>('/products', { params }).then(unwrap),
  getProduct: (id: string) =>
    api.get<ApiResponse<ProductResponse>>(`/products/${id}`).then(unwrap),
  getUnitConversions: (id: string) =>
    api.get<ApiResponse<ProductUnitConversion[]>>(`/products/${id}/unit-conversions`).then(unwrap),
  getLots: (id: string) => api.get<ApiResponse<ProductLot[]>>(`/products/${id}/lots`).then(unwrap),
  getSuppliers: (id: string) =>
    api.get<ApiResponse<ProductSupplier[]>>(`/products/${id}/suppliers`).then(unwrap),
  getCategories: (status: 'Active' | 'Inactive') =>
    api.get<ApiResponse<CategoryResponse[]>>('/categories', { params: { status } }).then(unwrap),
};
