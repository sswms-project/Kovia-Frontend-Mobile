import { router } from 'expo-router';

import type { AppNotification } from './notifications.types';

const TASK_REFERENCES = new Set([
  'WarehouseTask',
  'GoodsReceipt',
  'GoodsReceiptItem',
  'InboundRequest',
  'PutAwayDeviation',
  'StockIssueRequest',
  'StockIssueRequestLine',
  'StockIssuePick',
  'StockTransfer',
  'CycleCount',
  'StockAdjustment',
]);

/** Mở đúng màn hình liên quan tới thông báo. Trả về false nếu không có màn nào phù hợp. */
export function openNotificationTarget(n: AppNotification): boolean {
  const type = n.referenceType;
  if (!type) return false;
  if (type === 'Product' && n.referenceId) {
    router.push({ pathname: '/(account)/products/[id]', params: { id: n.referenceId } });
    return true;
  }
  if (TASK_REFERENCES.has(type) || /task/i.test(type)) {
    router.navigate('/tasks');
    return true;
  }
  return false;
}
