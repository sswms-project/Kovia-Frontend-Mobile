import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { P } from '@/config/permission-codes';
import { useCan } from '@/features/auth/hooks/use-can';

import { ProductDetailView } from '../components/product-detail-view';
import {
  useProductLotsQuery,
  useProductQuery,
  useProductSuppliersQuery,
  useProductUnitConversionsQuery,
} from '../hooks/use-products';

interface ProductDetailScreenProps {
  readonly productId: string;
}

export function ProductDetailScreen({ productId }: ProductDetailScreenProps) {
  const canViewInventory = useCan(P.INVENTORY_VIEW);
  const productQuery = useProductQuery(productId);
  const conversionsQuery = useProductUnitConversionsQuery(productId);
  const lotsQuery = useProductLotsQuery(productId, Boolean(productQuery.data?.isLotTracked));
  const suppliersQuery = useProductSuppliersQuery(productId);

  if (productQuery.isPending) return <LoadingState fullScreen />;
  if (productQuery.isError) {
    return <ErrorState fullScreen error={productQuery.error} onRetry={() => void productQuery.refetch()} />;
  }

  return (
    <ProductDetailView
      product={productQuery.data}
      canViewInventory={canViewInventory}
      unitConversions={{
        data: conversionsQuery.data,
        isLoading: conversionsQuery.isLoading,
        error: conversionsQuery.error,
        onRetry: () => void conversionsQuery.refetch(),
      }}
      lots={{
        data: lotsQuery.data,
        isLoading: lotsQuery.isLoading,
        error: lotsQuery.error,
        onRetry: () => void lotsQuery.refetch(),
      }}
      suppliers={{
        data: suppliersQuery.data,
        isLoading: suppliersQuery.isLoading,
        error: suppliersQuery.error,
        onRetry: () => void suppliersQuery.refetch(),
      }}
    />
  );
}
