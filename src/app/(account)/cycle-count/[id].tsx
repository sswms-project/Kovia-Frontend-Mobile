import { useLocalSearchParams } from 'expo-router';

import { CycleCountScreen } from '@/features/cycle-count/screens/cycle-count-screen';

export default function CycleCountRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CycleCountScreen documentId={typeof id === 'string' ? id : ''} />;
}
