import { useLocalSearchParams } from 'expo-router';

import { StockRecipientDetailScreen } from '@/features/stock-recipients/screens/stock-recipient-detail-screen';

export default function StockRecipientDetailRoute() {
  const { recipientId } = useLocalSearchParams<{ recipientId: string }>();
  return <StockRecipientDetailScreen recipientId={recipientId} />;
}
