import { useLocalSearchParams } from 'expo-router';

import { PickingScreen } from '@/features/stock-issue-requests/screens/picking-screen';

export default function PickingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PickingScreen id={id} />;
}
