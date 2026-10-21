import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';

import { productApi } from '../product.api';
import type { ProductListItem, ProductListQuery, ProductListResponse } from '../product.types';

export const PRODUCT_QUERY_KEY = ['products'] as const;

const PAGE_SIZE = 20;
const STATIC_DATA_STALE_TIME_MS = 5 * 60_000;

export type ProductFilters = Omit<ProductListQuery, 'pageNumber' | 'pageSize'>;

/** The list response has no page number, so the next page is derived from how many rows are loaded. */
export function useProductListQuery(filters: ProductFilters) {
  return useInfiniteQuery({
    queryKey: [...PRODUCT_QUERY_KEY, 'list', filters],
    queryFn: ({ pageParam }) =>
      productApi.getProducts({ ...filters, pageNumber: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      const loadedCount = allPages.reduce((total, page) => total + page.items.length, 0);
      return lastPage.items.length > 0 && loadedCount < lastPage.totalCount
        ? lastPageParam + 1
        : undefined;
    },
  });
}

export function flattenProducts(
  data: InfiniteData<ProductListResponse> | undefined,
): readonly ProductListItem[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: [...PRODUCT_QUERY_KEY, 'categories'],
    queryFn: () => productApi.getCategories('Active'),
    staleTime: STATIC_DATA_STALE_TIME_MS,
  });
}

export function useProductQuery(productId: string) {
  return useQuery({
    queryKey: [...PRODUCT_QUERY_KEY, 'detail', productId],
    queryFn: () => productApi.getProduct(productId),
  });
}

export function useProductUnitConversionsQuery(productId: string) {
  return useQuery({
    queryKey: [...PRODUCT_QUERY_KEY, 'unit-conversions', productId],
    queryFn: () => productApi.getUnitConversions(productId),
  });
}

/** Lots only exist for lot-tracked products, so the caller gates the request. */
export function useProductLotsQuery(productId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...PRODUCT_QUERY_KEY, 'lots', productId],
    queryFn: () => productApi.getLots(productId),
    enabled,
  });
}

export function useProductSuppliersQuery(productId: string) {
  return useQuery({
    queryKey: [...PRODUCT_QUERY_KEY, 'suppliers', productId],
    queryFn: () => productApi.getSuppliers(productId),
  });
}
