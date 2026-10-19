import { InventoryLookupScreen } from '@/features/inventory-lookup/screens/inventory-lookup-screen';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';

export default function LookupRoute() {
  const { selection, ready } = useWarehouseAccess();
  return <InventoryLookupScreen key={`${selection.identity}:${selection.warehouseId}:${selection.revision}:${ready}`} />;
}
