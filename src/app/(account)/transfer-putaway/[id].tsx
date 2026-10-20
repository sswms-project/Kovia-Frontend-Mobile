import { useLocalSearchParams } from 'expo-router';

import { TransferReceivingScreen } from '@/features/transfer-receiving/screens/transfer-receiving-screen';

export default function TransferPutAwayRoute() {
  const { id, shipmentId } = useLocalSearchParams<{ id: string; shipmentId: string }>();
  return <TransferReceivingScreen transferId={typeof id === 'string' ? id : ''} shipmentId={typeof shipmentId === 'string' ? shipmentId : ''} mode="PutAway" />;
}
