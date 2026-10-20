import { P } from '@/config/permission-codes';
import type { UserProfile } from '@/features/auth/auth.types';
import { warehouseSnapshot } from '@/features/warehouse-access/warehouse-access';

import type { WarehouseNotification } from './notifications.schema';

export function assertNotificationContext(identity: string | null, signature: string | null, profile: UserProfile | undefined, signedIn: boolean) {
  const snapshot = profile ? warehouseSnapshot(profile) : null;
  if (!identity || !signature || !signedIn || !snapshot?.activeUser || !snapshot.compatible || snapshot.identity !== identity ||
    snapshot.signature !== signature || !profile?.tenantId || !profile.permissions.includes(P.NOTIFICATIONS_VIEW))
    throw new Error('Tài khoản hoặc quyền thông báo đã thay đổi. Vui lòng tải lại.');
}
// References are document identifiers, never URLs supplied by a notification payload.
export function notificationDestination(notification: WarehouseNotification, profile: UserProfile | undefined) {
  if (!notification.referenceId || !profile) return null;
  if (notification.referenceType === 'CycleCount' && profile.permissions.includes(P.CYCLE_COUNTS_VIEW))
    return { pathname: '/(account)/cycle-count/[id]' as const, params: { id: notification.referenceId } };
  if (notification.referenceType === 'StockIssueRequest' && profile.permissions.includes(P.STOCK_ISSUE_REQUESTS_VIEW))
    return { pathname: '/(account)/stock-issue/[id]' as const, params: { id: notification.referenceId } };
  if (notification.referenceType === 'InboundRequest' && profile.permissions.includes(P.GOODS_RECEIPTS_VIEW))
    return { pathname: '/(account)/receiving/[id]' as const, params: { id: notification.referenceId } };
  if (notification.referenceType === 'GoodsReceipt' && profile.permissions.includes(P.GOODS_RECEIPTS_VIEW))
    return { pathname: '/(account)/putaway/[id]' as const, params: { id: notification.referenceId } };
  return null;
}
