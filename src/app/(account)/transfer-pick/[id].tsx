import { useLocalSearchParams } from 'expo-router';

import { TransferPickingScreen } from '@/features/transfer-picking/screens/transfer-picking-screen';

export default function TransferPickRoute() {
  const { id, shipmentId } = useLocalSearchParams<{ id: string; shipmentId: string }>();
  return <TransferPickingScreen transferId={typeof id === 'string' ? id : ''} shipmentId={typeof shipmentId === 'string' ? shipmentId : ''} />;
}
