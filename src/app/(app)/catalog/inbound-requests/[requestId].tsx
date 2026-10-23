import { useLocalSearchParams } from 'expo-router';

import { InboundRequestDetailScreen } from '@/features/inbound-requests/screens/inbound-request-detail-screen';

export default function InboundRequestDetailRoute() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  return <InboundRequestDetailScreen requestId={requestId} />;
}
