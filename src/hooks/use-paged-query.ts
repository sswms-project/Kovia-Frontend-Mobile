import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';

export interface PageResult<T> {
  readonly items: readonly T[];
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
}

export const PAGE_SIZE = 20;

/** Infinite list over the BE's pageNumber/pageSize convention. */
export function usePagedQuery<T>(
  queryKey: readonly unknown[],
  fetchPage: (pageNumber: number, pageSize: number) => Promise<PageResult<T>>,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pageNumber * lastPage.pageSize < lastPage.totalCount ? lastPage.pageNumber + 1 : undefined,
    enabled,
  });
}

export function flattenPages<T>(data: InfiniteData<PageResult<T>> | undefined): readonly T[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}
