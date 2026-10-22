import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { P } from '@/config/permission-codes';
import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import type { InventoryStock } from '@/features/inventory/inventory.types';
import { taskScopeMatches } from '@/features/my-tasks/my-tasks';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { profileQueryKey, warehouseSnapshot } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { ApiError } from '@/lib/api';

export function useInventoryReportContext(stock: Pick<InventoryStock, 'id' | 'warehouseId'>) {
  const access = useWarehouseAccess();
  const client = useQueryClient();
  const { identity, warehouseId, signature, revision } = access.selection;
  const canReport = access.ready && warehouseId === stock.warehouseId &&
    !!access.profile.data?.permissions.includes(P.INVENTORY_REPORT_DAMAGED);
  const assertCurrentContext = useCallback(() => {
    const profile = client.getQueryData<UserProfile>(profileQueryKey);
    const snapshot = profile ? warehouseSnapshot(profile) : null;
    if (!identity || !warehouseId || !signature || !useAuth.getState().signedIn || !snapshot?.activeUser || !snapshot.compatible ||
      !taskScopeMatches({ identity, warehouseId, signature, revision }, useWarehouseSelection.getState()) ||
      snapshot.signature !== signature || warehouseId !== stock.warehouseId ||
      !profile?.permissions.includes(P.INVENTORY_REPORT_DAMAGED) || !profile.permissions.includes(P.INVENTORY_VIEW))
      throw new ApiError('Kho, quyền hoặc phiên làm việc đã thay đổi. Vui lòng mở lại dòng tồn.', 409);
  }, [client, identity, warehouseId, signature, revision, stock.warehouseId]);
  return { canReport, assertCurrentContext, key: `${identity}:${warehouseId}:${signature}:${revision}:${stock.id}` };
}
