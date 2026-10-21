import { AlertTriangle, Clock, FileClock, Package, Warehouse } from 'lucide-react-native';

import type { DashboardOverview } from './home.api';
import type { HomeKpi } from './home.types';

// Chuyển số liệu dashboard thật từ BE thành các thẻ KPI
export function buildKpis(o: DashboardOverview): HomeKpi[] {
  const pendingDocs = o.pendingGoodsReceipts + o.pendingStockIssues + o.pendingTransfers + o.pendingCounts;
  const occupancy = o.activeSlots > 0 ? o.occupiedActiveSlots / o.activeSlots : 0;
  return [
    { id: 'sku', label: 'SKU tồn kho', value: String(o.stockedSkuCount), unit: 'mã', icon: Package, tone: 'primary' },
    {
      id: 'low',
      label: 'Sắp hết hàng',
      value: String(o.lowStockCount),
      unit: 'SKU',
      icon: AlertTriangle,
      tone: o.lowStockCount > 0 ? 'danger' : 'primary',
    },
    {
      id: 'docs',
      label: 'Phiếu chờ xử lý',
      value: String(pendingDocs),
      unit: 'phiếu',
      icon: FileClock,
      tone: 'primary',
      chip: { text: `${o.pendingInboundRequests} yêu cầu nhập`, tone: 'neutral' },
    },
    {
      id: 'slots',
      label: 'Vị trí đang dùng',
      value: `${Math.round(occupancy * 100)}%`,
      unit: `${o.occupiedActiveSlots}/${o.activeSlots}`,
      icon: Warehouse,
      tone: 'primary',
      progress: occupancy,
    },
    {
      id: 'overdue',
      label: 'Việc quá hạn',
      value: String(o.overdueTasks),
      unit: 'việc',
      icon: Clock,
      tone: o.overdueTasks > 0 ? 'danger' : 'primary',
      chip: o.unassignedTasks > 0 ? { text: `${o.unassignedTasks} chưa giao`, tone: 'neutral' } : undefined,
    },
  ];
}
