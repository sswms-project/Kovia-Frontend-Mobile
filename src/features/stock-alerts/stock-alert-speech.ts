import type { StockAlertKind } from './stock-alerts.types';

export interface AlertCount { readonly kind: StockAlertKind; readonly total: number; readonly names?: readonly string[] }
const MAX_NAMES = 5;
const PHRASES: Partial<Record<StockAlertKind, string>> = {
  'below-minimum': 'mặt hàng dưới mức tối thiểu', expiring: 'mặt hàng sắp hết hạn', expired: 'mặt hàng đã quá hạn',
};
const ORDER: StockAlertKind[] = ['below-minimum', 'expiring', 'expired'];
const find = (counts: readonly AlertCount[], kind: StockAlertKind) => counts.find(c => c.kind === kind);
const total = (counts: readonly AlertCount[], kind: StockAlertKind) => counts.find(c => c.kind === kind)?.total ?? 0;

/** Khẩn cấp: dưới tối thiểu hoặc đã quá hạn. */
export const hasUrgentAlerts = (counts: readonly AlertCount[]) => total(counts, 'below-minimum') > 0 || total(counts, 'expired') > 0;
function describe(count: AlertCount | undefined, text: string) {
  const n = count?.total ?? 0;
  if (n <= 0) return '';
  const spoken = (count?.names ?? []).slice(0, MAX_NAMES);
  if (spoken.length === 0) return `${n} ${text}`;
  const rest = n - spoken.length;
  return `${n} ${text}: ${spoken.join(', ')}${rest > 0 ? ` và ${rest} mặt hàng khác` : ''}`;
}
export function buildAlertSpeech(counts: readonly AlertCount[], warehouseName?: string) {
  const parts = ORDER.map(kind => describe(find(counts, kind), PHRASES[kind] ?? '')).filter(Boolean);
  if (parts.length === 0) return 'Không có cảnh báo tồn kho';
  return `Cảnh báo tồn kho${warehouseName ? ` kho ${warehouseName}` : ''}. ${parts.join('. ')}. Vui lòng kiểm tra.`;
}
