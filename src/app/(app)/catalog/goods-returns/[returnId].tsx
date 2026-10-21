import { useLocalSearchParams } from 'expo-router';

import { GoodsReturnDetailScreen } from '@/features/goods-returns/screens/goods-return-detail-screen';

export default function GoodsReturnDetailRoute() {
  const { returnId } = useLocalSearchParams<{ returnId: string }>();
  return <GoodsReturnDetailScreen returnId={returnId} />;
}
