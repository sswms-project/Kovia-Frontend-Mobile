import { useLocalSearchParams } from 'expo-router';

import { InventoryLookupScreen } from '@/features/inventory-lookup/screens/inventory-lookup-screen';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';

export default function LookupRoute() {
  const { selection } = useWarehouseAccess();
  const params = useLocalSearchParams<{ code?: string; q?: string; kind?: string; scanId?: string }>();
  const code = typeof params.code === 'string' ? params.code : typeof params.q === 'string' ? params.q : '';
  const kind = params.kind === 'Location' ? 'Location' : 'Product';
  return <InventoryLookupScreen key={`${selection.identity}:${selection.warehouseId}:${selection.revision}:${code}:${kind}:${params.scanId ?? ''}`}
    initialInput={code ? { code, kind } : undefined} />;
}
