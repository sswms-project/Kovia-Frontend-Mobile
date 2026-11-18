import type { PillTone } from '@/components/ui/status-pill';
import { formatDisplayDate } from '@/lib/date-format';
import { formatQuantity } from '@/lib/number-format';

import type { CountItem, CycleCount } from './cycle-count.schema';

type CountStatus = CycleCount['status'];

export const STATUS_LABELS: Readonly<Record<CountStatus, string>> = {
  Scheduled: 'Chưa kiểm kê', Counting: 'Đang kiểm kê', Submitted: 'Chờ duyệt',
  Recount: 'Yêu cầu đếm lại', Completed: 'Đã hoàn tất', Cancelled: 'Đã huỷ',
};
export const STATUS_TONES: Readonly<Record<CountStatus, PillTone>> = {
  Scheduled: 'primary', Counting: 'warning', Submitted: 'primary', Recount: 'warning', Completed: 'success', Cancelled: 'neutral',
};
export const QUALITY_LABELS: Readonly<Record<string, string>> = { Good: 'Tốt', Damaged: 'Hỏng', Quarantine: 'Cách ly' };
export const QUALITY_TONES: Readonly<Record<string, PillTone>> = { Good: 'success', Damaged: 'danger', Quarantine: 'warning' };
export const PRIORITY_LABELS: Readonly<Record<string, string>> = { Normal: 'Bình thường', Urgent: 'Khẩn' };

const OPEN_STATUSES: readonly CountStatus[] = ['Scheduled', 'Counting', 'Recount'];
export function isOpenCount(document: CycleCount) { return OPEN_STATUSES.includes(document.status); }
export function isUrgentOpen(document: CycleCount) { return document.priority === 'Urgent' && isOpenCount(document); }
export function hasCountResults(document: CycleCount) { return document.status !== 'Cancelled'; }

export function formatCount(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : formatQuantity(value, 2);
}
// Accounting style keeps the sign visible even where a leading minus is easy to miss.
export function formatCountDifference(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return value < 0 ? `(${formatQuantity(Math.abs(value), 2)})` : formatQuantity(value, 2);
}

// Built from the day and time parts because vi-VN otherwise puts the time before the date.
const TIME = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
function toDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
export function formatCountDate(value: string | null | undefined) {
  const date = toDate(value);
  return date ? `${formatDisplayDate(date)} ${TIME.format(date)}` : '—';
}
export function formatCountDay(value: string | null | undefined) {
  const date = toDate(value);
  return date ? formatDisplayDate(date) : '—';
}
export function withPerson(value: string | null | undefined, name: string | null | undefined) {
  if (!toDate(value)) return '—';
  return name ? `${formatCountDate(value)} · ${name}` : formatCountDate(value);
}

function formatDuration(milliseconds: number): string {
  const minutes = Math.max(1, Math.floor(milliseconds / 60_000));
  if (minutes < 60) return `${minutes} phút`;
  if (minutes < 1_440) {
    const rest = minutes % 60;
    return rest ? `${Math.floor(minutes / 60)} giờ ${rest} phút` : `${Math.floor(minutes / 60)} giờ`;
  }
  return `${Math.floor(minutes / 1_440)} ngày`;
}
export interface DeadlineHint { readonly label: string; readonly tone: 'overdue' | 'soon' | 'normal' }
export function getDeadlineHint(dueAt: string | null | undefined, now = Date.now()): DeadlineHint | null {
  const due = toDate(dueAt);
  if (!due) return null;
  const remaining = due.getTime() - now;
  if (remaining < 0) return { label: `Quá hạn ${formatDuration(-remaining)}`, tone: 'overdue' };
  return { label: `Còn ${formatDuration(remaining)}`, tone: remaining < 86_400_000 ? 'soon' : 'normal' };
}

export function getItemState(item: CountItem, recountRound: number): { readonly label: string; readonly tone: PillTone } {
  if (item.countedQuantity !== null) return { label: 'Đã kiểm kê', tone: 'success' };
  if (item.requestedRecountRound === recountRound) return { label: 'Cần đếm lại', tone: 'danger' };
  return { label: 'Chưa kiểm kê', tone: 'neutral' };
}
