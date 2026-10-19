import { useRouter } from 'expo-router';
import { useState } from 'react';

import type { FilterOption } from '@/components/ui/filter-chips';
import { P } from '@/config/permission-codes';
import { useCan } from '@/features/auth/hooks/use-can';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

import { ProductListView } from '../components/product-list-view';
import {
  flattenProducts,
  useCategoriesQuery,
  useProductListQuery,
} from '../hooks/use-products';
import type { ProductListItem, ProductStockStatus } from '../product.types';

const SEARCH_DEBOUNCE_MS = 300;

interface ProductsScreenProps {
  /** Set when the user comes back from the barcode scanner with a code to look up. */
  readonly initialSearch: string;
}

export function ProductsScreen({ initialSearch }: ProductsScreenProps) {
  const router = useRouter();
  const canViewInventory = useCan(P.INVENTORY_VIEW);
  const [searchText, setSearchText] = useState(initialSearch);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [stockStatus, setStockStatus] = useState<ProductStockStatus | null>(null);
  const debouncedSearch = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);

  const query = useProductListQuery({
    searchTerm: debouncedSearch || undefined,
    categoryId: categoryId ?? undefined,
    // The BE rejects stock filters without inventory permission, so they are never sent then.
    stockStatus: canViewInventory ? (stockStatus ?? undefined) : undefined,
  });
  const categoriesQuery = useCategoriesQuery();

  const categoryOptions: readonly FilterOption<string>[] = (categoriesQuery.data ?? []).map(
    (category) => ({ value: category.id, label: category.categoryName }),
  );

  function openProduct(product: ProductListItem) {
    router.push({ pathname: '/lookup/products/[productId]', params: { productId: product.id } });
  }

  return (
    <ProductListView
      searchText={searchText}
      onSearchChange={setSearchText}
      onScan={() => router.push('/lookup/products/scan')}
      categoryOptions={categoryOptions}
      categoryId={categoryId}
      onCategoryChange={setCategoryId}
      canViewInventory={canViewInventory}
      stockStatus={stockStatus}
      onStockStatusChange={setStockStatus}
      products={flattenProducts(query.data)}
      totalCount={query.data?.pages[0]?.totalCount}
      isLoading={query.isPending}
      error={query.error}
      isRefreshing={query.isRefetching && !query.isFetchingNextPage}
      isFetchingNextPage={query.isFetchingNextPage}
      hasFilters={Boolean(debouncedSearch || categoryId || stockStatus)}
      onRefresh={() => void query.refetch()}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      onRetry={() => void query.refetch()}
      onOpenProduct={openProduct}
    />
  );
}
