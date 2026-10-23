import { useQuery } from '@tanstack/react-query';

import { usePagedQuery } from '@/hooks/use-paged-query';

import { supplierApi } from '../supplier.api';
import type { Supplier, SupplierStatus } from '../supplier.types';

export const SUPPLIER_QUERY_KEY = ['suppliers'] as const;

export interface SupplierFilters {
  readonly searchTerm?: string;
  readonly status?: SupplierStatus;
}

export function useSuppliersQuery(filters: SupplierFilters) {
  return usePagedQuery<Supplier>([...SUPPLIER_QUERY_KEY, 'list', filters], (pageNumber, pageSize) =>
    supplierApi.list({ ...filters, pageNumber, pageSize }),
  );
}

export function useSupplierQuery(id: string) {
  return useQuery({
    queryKey: [...SUPPLIER_QUERY_KEY, 'detail', id],
    queryFn: () => supplierApi.get(id),
  });
}
