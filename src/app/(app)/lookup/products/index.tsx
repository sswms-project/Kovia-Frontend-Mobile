import { useLocalSearchParams } from 'expo-router';

import { ErrorState } from '@/components/ui/error-state';
import { P } from '@/config/permission-codes';
import { useCan } from '@/features/auth/hooks/use-can';
import { ProductsScreen } from '@/features/product/screens/products-screen';

export default function ProductsRoute() {
  const { search } = useLocalSearchParams<{ search?: string }>();
  const allowed = useCan(P.PRODUCTS_VIEW);

  // Without view permission the list would only produce 403s, so explain it up front.
  if (!allowed) return <ErrorState kind="forbidden" fullScreen />;

  // Keyed by the scanned code so a new scan remounts the screen with the code as its search text.
  return <ProductsScreen key={search ?? ''} initialSearch={search ?? ''} />;
}
