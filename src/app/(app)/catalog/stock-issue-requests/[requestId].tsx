import { useLocalSearchParams } from 'expo-router';

import { StockIssueRequestDetailScreen } from '@/features/stock-issue-requests/screens/stock-issue-request-detail-screen';

export default function StockIssueRequestDetailRoute() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  return <StockIssueRequestDetailScreen requestId={requestId} />;
}
