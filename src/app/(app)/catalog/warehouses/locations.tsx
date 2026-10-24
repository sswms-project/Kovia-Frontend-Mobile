import { useLocalSearchParams } from 'expo-router';

import { WarehouseLocationsScreen } from '@/features/warehouse-directory/screens/warehouse-locations-screen';

export default function WarehouseLocationsRoute() {
  const { warehouseId } = useLocalSearchParams<{ warehouseId: string }>();
  return <WarehouseLocationsScreen warehouseId={warehouseId} />;
}
