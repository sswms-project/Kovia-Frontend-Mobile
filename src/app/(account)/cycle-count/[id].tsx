import { useLocalSearchParams } from 'expo-router';

import { CycleCountScreen } from '@/features/cycle-count/screens/cycle-count-screen';

export default function CycleCountRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CycleCountScreen id={id} />;
}
