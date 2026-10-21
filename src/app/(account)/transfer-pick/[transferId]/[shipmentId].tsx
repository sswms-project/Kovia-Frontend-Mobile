import { useLocalSearchParams } from 'expo-router';

import { TransferPickScreen } from '@/features/transfer-tasks/screens/transfer-pick-screen';

export default function TransferPickRoute() {
  const { transferId, shipmentId } = useLocalSearchParams<{ transferId: string; shipmentId: string }>();
  return <TransferPickScreen transferId={transferId} shipmentId={shipmentId} />;
}
