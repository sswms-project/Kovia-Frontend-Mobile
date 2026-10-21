export interface PickSuggestion {
  readonly inventoryStockId: string;
  readonly slotId: string;
  readonly slotCode: string;
  readonly slotBarcode?: string | null;
  readonly lotId?: string | null;
  readonly lotNumber?: string | null;
  readonly expiryDate?: string | null;
  readonly suggestedQuantity: number;
  readonly reservedQuantity: number;
  readonly rackCode?: string | null;
  readonly isSystemDefaultSlot: boolean;
  readonly zoneCode?: string | null;
}

export interface PickSheetLine {
  readonly lineId: string;
  readonly productName: string;
  readonly sku: string;
  readonly productBarcode?: string | null;
  readonly baseUnitName?: string | null;
  readonly plannedQuantity: number;
  readonly pickedQuantity: number;
  readonly remainingQuantity: number;
  readonly pendingReturnQuantity: number;
  readonly status: string;
  readonly suggestions: readonly PickSuggestion[];
}

export interface PickSheet {
  readonly shipmentId: string;
  readonly shipmentNumber: string;
  readonly transferId: string;
  readonly transferCode: string;
  readonly sourceWarehouseName: string;
  readonly destinationWarehouseName: string;
  readonly shipmentStatus: string;
  /** Opaque row version; echoed back when completing the pick. */
  readonly version: string;
  readonly lines: readonly PickSheetLine[];
}

export interface PlanSlot {
  readonly slotId: string;
  readonly slotCode: string;
  readonly path: string;
  readonly plannedQuantity: number;
  readonly remainingBudget: number;
}

export interface ReceiveLot {
  readonly lotId: string | null;
  readonly lotNumber?: string | null;
  readonly expiryDate?: string | null;
  readonly dispatchedQuantity: number;
  readonly receivedQuantity: number;
  readonly plan?: readonly PlanSlot[] | null;
}

export interface ReceiveLine {
  readonly lineId: string;
  readonly productName: string;
  readonly sku: string;
  readonly productBarcode?: string | null;
  readonly baseUnitName?: string | null;
  readonly suggestedSlotCode?: string | null;
  readonly planMode?: string | null;
  readonly lots: readonly ReceiveLot[];
}

export interface ReceiveSheet {
  readonly shipmentId: string;
  readonly shipmentNumber: string;
  readonly transferId: string;
  readonly transferCode: string;
  readonly destinationWarehouseId: string;
  readonly destinationWarehouseName: string;
  readonly shipmentStatus: string;
  readonly version: string;
  readonly planVersion?: string | null;
  readonly lines: readonly ReceiveLine[];
}

export interface ReceivableSlot {
  readonly id: string;
  readonly code: string;
  readonly path: string;
}

export interface RecordPickBody {
  /** Idempotency key: the same id with the same body is a safe replay. */
  readonly commandId: string;
  readonly lineId: string;
  readonly inventoryStockId: string;
  readonly quantity: number;
  readonly scannedSlotCode: string;
  readonly scannedProductCode?: string;
}

export interface ReceiptEntryBody {
  readonly lineId: string;
  readonly lotId: string | null;
  readonly destinationSlotId: string | null;
  readonly goodQuantity: number;
  readonly damagedQuantity: number;
  readonly missingQuantity: number;
  readonly reasonCode?: string;
  readonly note?: string;
  readonly scannedSlotCode?: string;
  readonly scannedProductCode?: string;
  readonly deviationReasonCode?: string;
}

export interface ReceiptBody {
  readonly expectedVersion: string;
  readonly planVersion?: string;
  readonly entries: readonly ReceiptEntryBody[];
}

export const RECEIPT_REASON_LABEL: Readonly<Record<string, string>> = {
  TransitDamage: 'Hỏng khi vận chuyển',
  Lost: 'Thất lạc',
  WrongShipment: 'Sai hàng',
  Other: 'Lý do khác',
};

export const DEVIATION_REASON_LABEL: Readonly<Record<string, string>> = {
  SlotFull: 'Ô đã đầy',
  SlotBlocked: 'Ô bị chặn',
  LabelMismatch: 'Nhãn không khớp',
  Consolidation: 'Gom hàng',
  Other: 'Lý do khác',
};
