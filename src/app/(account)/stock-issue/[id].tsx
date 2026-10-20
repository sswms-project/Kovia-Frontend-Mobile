import { useLocalSearchParams } from 'expo-router';

import { StockIssueScreen } from '@/features/stock-issue/screens/stock-issue-screen';

export default function StockIssueRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StockIssueScreen documentId={typeof id === 'string' ? id : ''} />;
}
