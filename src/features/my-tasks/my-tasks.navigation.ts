import type { Href } from 'expo-router';

import { P } from '@/config/permission-codes';
import type { UserProfile } from '@/features/auth/auth.types';

import type { WarehouseTask } from './my-tasks.schema';

export function getTaskDestination(task: WarehouseTask, profile: UserProfile | undefined, warehouseId?: string): Href | null {
  if (!profile || task.warehouseId !== warehouseId || task.assignedTo !== profile.id) return null;
  const permission = task.taskType === 'Relocation' ? P.WAREHOUSE_TASKS_VIEW_OWN : task.taskType.startsWith('Transfer')
    ? P.TRANSFERS_VIEW : task.taskType === 'Picking' ? P.STOCK_ISSUE_REQUESTS_VIEW
      : task.taskType === 'CycleCount' ? P.CYCLE_COUNTS_VIEW : P.GOODS_RECEIPTS_VIEW;
  if (!profile.permissions.includes(permission)) return null;
  const params = { id: task.id };
  switch (task.taskType) {
    case 'Receiving': return { pathname: '/(account)/receiving/[id]', params };
    case 'PutAway': return { pathname: '/(account)/putaway/[id]', params };
    case 'Picking': return { pathname: '/(account)/stock-issue/[id]', params };
    case 'CycleCount': return { pathname: '/(account)/cycle-count/[id]', params };
    case 'Relocation': return { pathname: '/(account)/relocation/[id]', params };
    default: {
      if (!task.transferId || !task.transferShipmentId) return null;
      const transferParams = { id: task.transferId, shipmentId: task.transferShipmentId };
      if (task.taskType === 'TransferPick') return { pathname: '/(account)/transfer-pick/[id]', params: transferParams };
      if (task.taskType === 'TransferReceive') return { pathname: '/(account)/transfer-receipt/[id]', params: transferParams };
      if (task.taskType === 'TransferPutAway') return { pathname: '/(account)/transfer-putaway/[id]', params: transferParams };
      return null;
    }
  }
}
