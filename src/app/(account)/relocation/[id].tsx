import { useLocalSearchParams } from 'expo-router';

import { RelocationScreen } from '@/features/relocation/screens/relocation-screen';

export default function RelocationRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RelocationScreen key={id} taskId={typeof id === 'string' ? id : ''} />;
}
