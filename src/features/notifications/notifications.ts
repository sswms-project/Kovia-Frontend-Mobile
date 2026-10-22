import { P } from '@/config/permission-codes';
import type { UserProfile } from '@/features/auth/auth.types';
import { warehouseSnapshot } from '@/features/warehouse-access/warehouse-access';

import type { AppNotification } from './notifications.types';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

export function assertNotificationContext(identity: string | null, signature: string | null, profile: UserProfile | undefined, signedIn: boolean) {
  const snapshot = profile ? warehouseSnapshot(profile) : null;
  if (!identity || !signature || !signedIn || !snapshot?.activeUser || !snapshot.compatible || snapshot.identity !== identity ||
    snapshot.signature !== signature || !profile?.tenantId || !profile.permissions.includes(P.NOTIFICATIONS_VIEW))
    throw new Error('Tài khoản hoặc quyền thông báo đã thay đổi. Vui lòng tải lại.');
}
// References are document identifiers, never URLs supplied by a notification payload.
export function notificationDestination(notification: AppNotification, profile: UserProfile | undefined) {
  if (!profile || !nonEmptyDotNetGuidSchema('Mã thông báo không hợp lệ.').safeParse(notification.referenceId).success) return null;
  if (!notification.referenceId) return null;
  if (notification.referenceType === 'StockDiscrepancyReport' && profile.permissions.includes(P.INVENTORY_VIEW))
    return { pathname: '/catalog/discrepancies/[id]' as const, params: { id: notification.referenceId } };

  if (notification.referenceType === 'CycleCount' && profile.permissions.includes(P.CYCLE_COUNTS_VIEW))
    return { pathname: '/(account)/cycle-count/[id]' as const, params: { id: notification.referenceId } };
  if (notification.referenceType === 'GoodsReturnRequest' && profile.permissions.includes(P.GOODS_RETURN_REQUESTS_VIEW))
    return { pathname: '/catalog/goods-returns/[returnId]' as const, params: { returnId: notification.referenceId } };
  if (notification.referenceType === 'Product' && profile.permissions.includes(P.PRODUCTS_VIEW))
    return { pathname: '/catalog/products/[productId]' as const, params: { productId: notification.referenceId } };
  if (notification.referenceType === 'StockIssueRequest' && profile.permissions.includes(P.STOCK_ISSUE_REQUESTS_VIEW))
    return { pathname: '/(account)/stock-issue/[id]' as const, params: { id: notification.referenceId } };
  if (notification.referenceType === 'InboundRequest' && profile.permissions.includes(P.GOODS_RECEIPTS_VIEW))
    return { pathname: '/(account)/receiving/[id]' as const, params: { id: notification.referenceId } };
  if (notification.referenceType === 'GoodsReceipt' && profile.permissions.includes(P.GOODS_RECEIPTS_VIEW))
    return { pathname: '/(account)/putaway/[id]' as const, params: { id: notification.referenceId } };
  return null;
}

export function notificationNeedsTask(notification: AppNotification) {
  return ['WarehouseTask', 'StockTransfer', 'StockTransferShipment'].includes(notification.referenceType ?? '');
}

export function canOpenNotification(notification: AppNotification, profile: UserProfile | undefined) {
  return !!notificationDestination(notification, profile) || (!!profile?.permissions.includes(P.WAREHOUSE_TASKS_VIEW_OWN)
    && notificationNeedsTask(notification) && nonEmptyDotNetGuidSchema('Mã tham chiếu không hợp lệ.').safeParse(notification.referenceId).success);
}
