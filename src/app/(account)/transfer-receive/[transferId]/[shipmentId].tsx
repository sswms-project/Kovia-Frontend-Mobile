import { useLocalSearchParams } from 'expo-router';

import { TransferReceiveScreen } from '@/features/transfer-tasks/screens/transfer-receive-screen';

export default function TransferReceiveRoute() {
  const { transferId, shipmentId } = useLocalSearchParams<{ transferId: string; shipmentId: string }>();
  return <TransferReceiveScreen transferId={transferId} shipmentId={shipmentId} />;
}
