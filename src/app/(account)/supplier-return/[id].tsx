import { useLocalSearchParams } from 'expo-router';
import { ReturnWorkScreen } from '@/features/return-work/screens/return-work-screen';
export default function SupplierReturnRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReturnWorkScreen supplier taskId={typeof id === 'string' ? id : ''} />;
}
