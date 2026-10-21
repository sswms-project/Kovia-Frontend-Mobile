import type {
  PickSheet,
  PickSheetLine,
  PickSuggestion,
  ReceivableSlot,
  ReceiptBody,
  ReceiveLine,
  ReceiveLot,
  ReceiveSheet,
} from './transfer-tasks.types';

const EPSILON = 1e-6;
const QUANTITY_PATTERN = /^\d+([.,]\d{1,2})?$/;

/** Shelf labels vary in punctuation and case, so codes are compared on letters and digits only. */
export const normalizeCode = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

export function parseQuantity(value: string): number | null {
  const text = value.trim();
  if (text === '') return 0;
  if (!QUANTITY_PATTERN.test(text)) return null;
  return Number(text.replace(',', '.'));
}

// ---- Picking -------------------------------------------------------------------------------

export const canPickSheet = (sheet: PickSheet) => sheet.shipmentStatus === 'Picking';

/** Every code that identifies a suggested shelf, mirroring the labels the BE accepts. */
function suggestionCodes(suggestion: PickSuggestion): string[] {
  const codes = [suggestion.slotCode, suggestion.slotBarcode];
  if (suggestion.isSystemDefaultSlot && suggestion.rackCode) codes.push(suggestion.rackCode);
  if (suggestion.zoneCode && suggestion.rackCode) {
    codes.push(`${suggestion.zoneCode}-${suggestion.rackCode}`);
    codes.push(`${suggestion.zoneCode}-${suggestion.rackCode}-${suggestion.slotCode}`);
  }
  return codes.filter((code): code is string => Boolean(code)).map(normalizeCode);
}

export function findSuggestion(line: PickSheetLine, code: string): PickSuggestion | undefined {
  const normalized = normalizeCode(code);
  return line.suggestions.find((suggestion) => suggestionCodes(suggestion).includes(normalized));
}

export function matchesLineProduct(line: { sku: string; productBarcode?: string | null }, code: string): boolean {
  const normalized = normalizeCode(code);
  return (
    normalizeCode(line.sku) === normalized ||
    (line.productBarcode ? normalizeCode(line.productBarcode) === normalized : false)
  );
}

/** Completing is blocked while a line is short, over-picked or waiting on a manager. */
export function canCompletePicking(sheet: PickSheet): boolean {
  return (
    canPickSheet(sheet) &&
    sheet.lines.length > 0 &&
    sheet.lines.every(
      (line) =>
        line.remainingQuantity <= EPSILON && line.pendingReturnQuantity <= EPSILON && line.status !== 'PendingManager',
    )
  );
}

// ---- Receiving -----------------------------------------------------------------------------

export interface ReceiveDraft {
  readonly key: string;
  readonly line: ReceiveLine;
  readonly lot: ReceiveLot;
  readonly good: string;
  readonly damaged: string;
  readonly missing: string;
  readonly slot: ReceivableSlot | null;
  readonly scannedSlotCode: string | null;
  readonly scannedProductCode: string | null;
  readonly reasonCode: string | null;
  readonly deviationReasonCode: string | null;
  readonly note: string;
}

export const lotRemaining = (lot: ReceiveLot) => Math.max(0, lot.dispatchedQuantity - lot.receivedQuantity);

/** One draft per line and lot, defaulting to everything arriving in good condition. */
export function buildReceiveDrafts(sheet: ReceiveSheet): readonly ReceiveDraft[] {
  return sheet.lines.flatMap((line) =>
    line.lots
      .filter((lot) => lotRemaining(lot) > EPSILON)
      .map((lot) => ({
        key: `${line.lineId}:${lot.lotId ?? 'none'}`,
        line,
        lot,
        good: String(lotRemaining(lot)),
        damaged: '',
        missing: '',
        slot: null,
        scannedSlotCode: null,
        scannedProductCode: null,
        reasonCode: null,
        deviationReasonCode: null,
        note: '',
      })),
  );
}

/** A slot outside the manager's plan, or more than its remaining budget, needs a deviation reason. */
export function isOffPlan(draft: ReceiveDraft): boolean {
  const plan = draft.lot.plan;
  if (!plan || plan.length === 0 || !draft.slot) return false;
  const planned = plan.find((entry) => entry.slotId === draft.slot?.id);
  if (!planned) return true;
  return (parseQuantity(draft.good) ?? 0) > planned.remainingBudget + EPSILON;
}

export function validateReceive(drafts: readonly ReceiveDraft[]): string | null {
  if (drafts.length === 0) return 'Không còn hàng cần nhận trong đợt này.';

  for (const draft of drafts) {
    const name = draft.line.productName;
    const good = parseQuantity(draft.good);
    const damaged = parseQuantity(draft.damaged);
    const missing = parseQuantity(draft.missing);
    if (good === null || damaged === null || missing === null) {
      return `${name}: số lượng không hợp lệ (tối đa 2 chữ số thập phân).`;
    }
    if (Math.abs(good + damaged + missing - lotRemaining(draft.lot)) > EPSILON) {
      return `${name}: tổng tốt, hỏng và thiếu phải bằng ${lotRemaining(draft.lot)}.`;
    }
    if ((damaged > 0 || missing > 0) && !draft.reasonCode) return `${name}: chọn lý do hàng hỏng hoặc thiếu.`;
    if ((good > 0 || damaged > 0) && !draft.slot) return `${name}: quét vị trí đặt hàng.`;
    if (isOffPlan(draft)) {
      if (!draft.deviationReasonCode) return `${name}: chọn lý do đặt khác kế hoạch.`;
      if (draft.deviationReasonCode === 'Other' && (draft.note.trim().length < 5 || draft.note.trim().length > 500)) {
        return `${name}: ghi chú lý do khác cần từ 5 đến 500 ký tự.`;
      }
    }
  }
  return null;
}

export function buildReceiptBody(sheet: ReceiveSheet, drafts: readonly ReceiveDraft[]): ReceiptBody {
  return {
    expectedVersion: sheet.version,
    ...(sheet.planVersion ? { planVersion: sheet.planVersion } : {}),
    entries: drafts.map((draft) => {
      const good = parseQuantity(draft.good) ?? 0;
      const damaged = parseQuantity(draft.damaged) ?? 0;
      const missing = parseQuantity(draft.missing) ?? 0;
      return {
        lineId: draft.line.lineId,
        lotId: draft.lot.lotId,
        destinationSlotId: good > 0 || damaged > 0 ? (draft.slot?.id ?? null) : null,
        goodQuantity: good,
        damagedQuantity: damaged,
        missingQuantity: missing,
        ...(damaged > 0 || missing > 0 ? { reasonCode: draft.reasonCode ?? undefined } : {}),
        ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
        ...(draft.scannedSlotCode ? { scannedSlotCode: draft.scannedSlotCode } : {}),
        ...(draft.scannedProductCode ? { scannedProductCode: draft.scannedProductCode } : {}),
        ...(isOffPlan(draft) && draft.deviationReasonCode ? { deviationReasonCode: draft.deviationReasonCode } : {}),
      };
    }),
  };
}
