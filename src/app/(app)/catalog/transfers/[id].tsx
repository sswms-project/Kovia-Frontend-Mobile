import { useLocalSearchParams } from 'expo-router';
import { TransferMonitorDetailScreen } from '@/features/transfer-monitor/screens/transfer-monitor-detail-screen';
export default function TransferMonitorDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TransferMonitorDetailScreen id={id} />;
}
