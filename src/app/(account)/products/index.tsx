import { useLocalSearchParams } from 'expo-router';

import { ProductsScreen } from '@/features/products/screens/products-screen';

export default function ProductsRoute() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  return <ProductsScreen initialQuery={typeof q === 'string' ? q : ''} />;
}
