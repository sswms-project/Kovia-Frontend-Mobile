import { useLocalSearchParams } from 'expo-router';

import { ReceivingScreen } from '@/features/receiving/screens/receiving-screen';

export default function PutAwayRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReceivingScreen documentId={typeof id === 'string' ? id : ''} mode="putaway" />;
}
