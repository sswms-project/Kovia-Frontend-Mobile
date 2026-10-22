import { P } from '@/config/permission-codes';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';

export function useInventoryWorkspace() {
  const access = useWarehouseAccess();
  const canView = access.ready && !!access.profile.data?.permissions.includes(P.INVENTORY_VIEW);
  return { access, canView, warehouseId: access.warehouse?.id ?? '' };
}
