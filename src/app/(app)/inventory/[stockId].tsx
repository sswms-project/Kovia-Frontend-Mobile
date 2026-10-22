import { useLocalSearchParams } from 'expo-router';

import { InventoryDetailScreen } from '@/features/inventory/screens/inventory-detail-screen';

export default function InventoryDetailRoute() {
  const { stockId, productId, slotId, warehouseId } = useLocalSearchParams<{
    stockId: string;
    productId: string;
    slotId: string;
    warehouseId?: string;
  }>();

  return <InventoryDetailScreen stockId={stockId} productId={productId} slotId={slotId} warehouseId={warehouseId} />;
}
