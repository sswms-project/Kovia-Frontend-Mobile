import { useLocalSearchParams } from 'expo-router';

import { StockAdjustmentDetailScreen } from '@/features/stock-adjustments/screens/stock-adjustment-detail-screen';

export default function StockAdjustmentDetailRoute() {
  const { adjustmentId } = useLocalSearchParams<{ adjustmentId: string }>();
  return <StockAdjustmentDetailScreen adjustmentId={adjustmentId} />;
}
