import { useLocalSearchParams } from 'expo-router';

import { WarehouseDetailScreen } from '@/features/warehouse-directory/screens/warehouse-detail-screen';

export default function WarehouseDetailRoute() {
  const { warehouseId } = useLocalSearchParams<{ warehouseId: string }>();
  return <WarehouseDetailScreen warehouseId={warehouseId} />;
}
