import { useLocalSearchParams } from 'expo-router';

import { ProductDetailScreen } from '@/features/product/screens/product-detail-screen';

export default function ProductDetailRoute() {
  const { productId } = useLocalSearchParams<{ productId: string }>();

  return <ProductDetailScreen productId={productId} />;
}
