import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';

interface QueryBoundaryProps<TData> {
  readonly query: UseQueryResult<TData, Error>;
  readonly loadingMessage?: string;
  readonly children: (data: TData) => ReactNode;
}

/** Early-return loading and error states so detail screens only render the success case. */
export function QueryBoundary<TData>({ query, loadingMessage, children }: QueryBoundaryProps<TData>) {
  if (query.isPending) return <LoadingState fullScreen message={loadingMessage} />;
  if (query.isError) return <ErrorState fullScreen error={query.error} onRetry={() => void query.refetch()} />;
  return <>{children(query.data)}</>;
}
