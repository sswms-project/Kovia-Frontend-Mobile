import { useQuery } from '@tanstack/react-query';

import { usePagedQuery } from '@/hooks/use-paged-query';

import { stockRecipientsApi } from '../stock-recipients.api';
import type { RecipientStatus, StockRecipient } from '../stock-recipients.types';

export const STOCK_RECIPIENTS_QUERY_KEY = ['stock-recipients'] as const;

export interface RecipientFilters {
  readonly searchTerm?: string;
  readonly status?: RecipientStatus;
}

export function useStockRecipientsQuery(filters: RecipientFilters) {
  return usePagedQuery<StockRecipient>([...STOCK_RECIPIENTS_QUERY_KEY, 'list', filters], (pageNumber, pageSize) =>
    stockRecipientsApi.list({ ...filters, pageNumber, pageSize }),
  );
}

export function useStockRecipientQuery(id: string) {
  return useQuery({
    queryKey: [...STOCK_RECIPIENTS_QUERY_KEY, 'detail', id],
    queryFn: () => stockRecipientsApi.get(id),
  });
}
