import type { PickRequestBody } from './stock-issue-requests.api';
import type { PickLocation, StockIssueItem, StockIssueRequest } from './stock-issue-requests.types';

const PICKABLE_STATUSES: readonly string[] = ['ReleasedForPicking', 'Picking'];
const EPSILON = 1e-6;

export interface PickRow {
  readonly key: string;
  readonly item: StockIssueItem;
  readonly location: PickLocation;
}

/** Shelf labels vary in punctuation and case, so codes are compared on letters and digits only. */
export const normalizeCode = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

export const factorOf = (item: StockIssueItem) => (item.conversionFactor > 0 ? item.conversionFactor : 1);

export const itemRemaining = (item: StockIssueItem) => Math.max(0, item.quantity - item.pickedQuantity);

export const parseEntered = (value: string | undefined): number | null => {
  if (!value || value.trim() === '') return null;
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export function canPick(request: StockIssueRequest, userId: string | undefined): boolean {
  if (!PICKABLE_STATUSES.includes(request.status)) return false;
  return !request.assignedStaffId || request.assignedStaffId === userId;
}

/** One row per reserved shelf location, in walking order (zone, rack, slot). */
export function buildPickRows(request: StockIssueRequest): readonly PickRow[] {
  const rows = request.items.flatMap((item) =>
    item.pickLocations.map((location) => ({ key: `${item.id}:${location.inventoryStockId}`, item, location })),
  );
  return rows.sort((a, b) =>
    `${a.location.zoneCode ?? ''}-${a.location.rackCode ?? ''}-${a.location.slotCode}`.localeCompare(
      `${b.location.zoneCode ?? ''}-${b.location.rackCode ?? ''}-${b.location.slotCode}`,
      'vi',
      { numeric: true },
    ),
  );
}

/** Most the picker may enter for a row, in the line's entered unit: the shelf reservation and what the line still needs. */
export function rowLimit(row: PickRow, rows: readonly PickRow[], entries: Readonly<Record<string, string>>): number {
  const factor = factorOf(row.item);
  const otherPicked = rows
    .filter((other) => other.item.id === row.item.id && other.key !== row.key)
    .reduce((sum, other) => sum + (parseEntered(entries[other.key]) ?? 0), 0);
  const lineLimit = itemRemaining(row.item) / factor - otherPicked;
  return Math.max(0, Math.min(row.location.reservedQuantity / factor, lineLimit));
}

export function findItemsByCode(request: StockIssueRequest, code: string): readonly StockIssueItem[] {
  const normalized = normalizeCode(code);
  return request.items.filter(
    (item) =>
      normalizeCode(item.sku) === normalized || (item.barcode ? normalizeCode(item.barcode) === normalized : false),
  );
}

/** Mirrors the BE pick rules so a bad entry is caught before the whole batch is rejected. */
export function validateEntries(
  rows: readonly PickRow[],
  entries: Readonly<Record<string, string>>,
  scannedBarcodes: Readonly<Record<string, string>>,
): string | null {
  const totals = new Map<string, { item: StockIssueItem; base: number }>();

  for (const row of rows) {
    const text = entries[row.key];
    if (!text || text.trim() === '') continue;
    const quantity = parseEntered(text);
    const name = row.item.productName;
    if (quantity === null || quantity <= 0) return `Số lượng không hợp lệ cho ${name}.`;

    const factor = factorOf(row.item);
    if (factor !== 1 && !Number.isInteger(quantity)) {
      return `${name}: chỉ lấy theo số nguyên ${row.item.enteredUnitName ?? 'đơn vị'}.`;
    }
    if (quantity * factor > row.location.reservedQuantity + EPSILON) {
      return `${name}: vượt số lượng được giữ tại ${row.location.slotCode}.`;
    }
    if (row.item.barcode && !scannedBarcodes[row.item.id]) return `Quét mã ${name} trước khi xác nhận.`;

    const current = totals.get(row.item.id);
    totals.set(row.item.id, { item: row.item, base: (current?.base ?? 0) + quantity * factor });
  }

  if (totals.size === 0) return 'Nhập số lượng lấy cho ít nhất một dòng.';
  for (const { item, base } of totals.values()) {
    if (base > itemRemaining(item) + EPSILON) return `${item.productName}: vượt số lượng còn phải lấy.`;
  }
  return null;
}

export function buildPickBody(
  rows: readonly PickRow[],
  entries: Readonly<Record<string, string>>,
  scannedBarcodes: Readonly<Record<string, string>>,
  currentSlot: string | null,
): PickRequestBody {
  const items = rows.flatMap((row) => {
    const quantity = parseEntered(entries[row.key]);
    if (quantity === null || quantity <= 0) return [];
    const scannedBarcode = scannedBarcodes[row.item.id];
    const slotWasScanned =
      currentSlot !== null && normalizeCode(currentSlot) === normalizeCode(row.location.slotCode);
    return [
      {
        stockIssueRequestItemId: row.item.id,
        inventoryStockId: row.location.inventoryStockId,
        pickedQuantity: round2(quantity * factorOf(row.item)),
        ...(scannedBarcode ? { scannedBarcode } : {}),
        ...(slotWasScanned ? { scannedSlotCode: row.location.slotCode } : {}),
      },
    ];
  });
  return { items };
}
