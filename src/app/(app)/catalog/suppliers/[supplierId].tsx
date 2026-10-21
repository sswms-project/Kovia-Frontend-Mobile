import { useLocalSearchParams } from 'expo-router';

import { SupplierDetailScreen } from '@/features/supplier/screens/supplier-detail-screen';

export default function SupplierDetailRoute() {
  const { supplierId } = useLocalSearchParams<{ supplierId: string }>();
  return <SupplierDetailScreen supplierId={supplierId} />;
}
