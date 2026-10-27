export const RESERVATION_STATUSES = ['Active', 'Released', 'Consumed'] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export interface InventoryReservation {
  readonly id: string;
  readonly productId: string;
  readonly productSku: string;
  readonly productName: string;
  readonly warehouseId: string;
  readonly slotCode: string;
  readonly lotNumber: string | null;
  readonly referenceType: string;
  readonly referenceCode: string | null;
  readonly reservedQuantity: number;
  readonly status: ReservationStatus;
  readonly createdByName: string | null;
  readonly releasedAt: string | null;
  readonly createdAt: string;
}

export interface ReservationListResponse {
  readonly items: readonly InventoryReservation[];
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
}

export interface ReservationListQuery {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly warehouseId: string;
  readonly status?: ReservationStatus;
}
