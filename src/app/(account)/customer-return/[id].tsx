import { useLocalSearchParams } from 'expo-router';
import { ReturnWorkScreen } from '@/features/return-work/screens/return-work-screen';
export default function CustomerReturnRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReturnWorkScreen supplier={false} taskId={typeof id === 'string' ? id : ''} />;
}
