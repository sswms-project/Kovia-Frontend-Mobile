import { P } from '@/config/permission-codes';
import { USER_ROLES } from '@/config/roles';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
export function useTransferMonitorAccess() {
  const access = useWarehouseAccess();
  const role = access.profile.data?.role;
  const allowed = access.ready && (role === USER_ROLES.TenantOwner || role === USER_ROLES.WarehouseManager) &&
    !!access.profile.data?.permissions.includes(P.TRANSFERS_VIEW);
  return { access, allowed, key: ['warehouse', access.selection.identity, access.selection.warehouseId, access.selection.revision,
    'transfer-monitor', access.selection.signature] };
}
