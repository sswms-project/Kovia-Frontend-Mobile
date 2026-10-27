import type { ReservationStatus } from './reservations.types';

export const RESERVATION_STATUS_LABELS: Readonly<Record<ReservationStatus, string>> = {
  Active: 'Đang giữ',
  Released: 'Đã nhả',
  Consumed: 'Đã dùng',
};

export const RESERVATION_STATUS_FILTERS = (Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[])
  .map((value) => ({ value, label: RESERVATION_STATUS_LABELS[value] }));

export const RESERVATION_STATUS_TONES: Readonly<Record<ReservationStatus, 'success' | 'neutral' | 'warning'>> = {
  Active: 'warning',
  Released: 'neutral',
  Consumed: 'success',
};

const REFERENCE_TYPE_LABELS: Readonly<Record<string, string>> = {
  StockIssueRequestLine: 'Yêu cầu xuất',
  StockIssuePick: 'Lấy hàng xuất',
  StockTransfer: 'Điều chuyển',
  SupplierReturnLine: 'Trả nhà cung cấp',
};

export const formatReservationReference = (referenceType: string) => REFERENCE_TYPE_LABELS[referenceType] ?? referenceType;
