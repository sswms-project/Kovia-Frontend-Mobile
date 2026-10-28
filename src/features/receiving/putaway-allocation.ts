import { formatInventoryLocation } from '@/features/inventory/inventory.labels';
import { matchesWarehouseLocation } from '@/features/scanner/warehouse-scan';
import { formatQuantity } from '@/lib/number-format';
import { assertPlacement } from './receiving';
import type { PutAwayAllocationForm, PutAwayDestination, Receipt } from './receiving.schema';
import type { receivingApi } from './receiving.api';

type ReceiptItem = Receipt['items'][number];
type AllocationLine = PutAwayAllocationForm['lines'][number];
type Unit = ReceiptItem['allowedUnits'][number];
function scaled(value: number, precision: number): bigint | null {
  if (!Number.isFinite(value) || value < 0 || value >= 1e16 || precision < 0 || precision > 6) return null;
  const fixed = value.toFixed(precision);
  return Number(fixed) === value ? BigInt(fixed.replace('.', '')) : null;
}
// Match the web's exact decimal conversion; never round a physical stock quantity for display or submission.
export function putawayBaseQuantity(quantity: number, unit: Unit | undefined, base: Unit | undefined): number | null {
  if (!unit || !base) return null;
  const entered = scaled(quantity, unit.quantityPrecision);
  const factor = scaled(unit.conversionFactor, 6);
  if (entered === null || factor === null || factor <= 0n) return null;
  const denominator = 10n ** BigInt(unit.quantityPrecision + 4);
  if (entered * factor % denominator !== 0n) return null;
  const cents = entered * factor / denominator;
  if (cents > BigInt(Number.MAX_SAFE_INTEGER) || cents % (10n ** BigInt(2 - Math.min(2, base.quantityPrecision))) !== 0n) return null;
  const result = Number(cents) / 100;
  return scaled(result, 2) === cents ? result : null;
}
export function putawayInput(item: ReceiptItem, quantity: number, preferred = item.enteredUnitId) {
  const base = item.allowedUnits.find(unit => unit.unitId === item.baseUnitId);
  for (const id of [preferred, item.enteredUnitId, item.baseUnitId]) {
    const unit = item.allowedUnits.find(unit => unit.unitId === id);
    if (!unit) continue;
    const enteredQuantity = Number((quantity / unit.conversionFactor).toFixed(unit.quantityPrecision));
    if (putawayBaseQuantity(enteredQuantity, unit, base) === quantity) return { enteredUnitId: unit.unitId, enteredQuantity };
  }
  return { enteredUnitId: item.baseUnitId, enteredQuantity: Number.NaN };
}
export function plannedDestination(plan: ReceiptItem['putAwayPlan'][number]): PutAwayDestination {
  return { id: plan.slotId, slotCode: plan.slotCode, rackCode: plan.rackCode, zoneCode: plan.zoneCode ?? undefined,
    isSystemDefaultSlot: plan.isSystemDefaultSlot,
    displayPath: [[plan.zoneCode, plan.zoneName].filter(Boolean).join(' · '),
      formatInventoryLocation({ slotCode: plan.slotCode, rackCode: plan.rackCode, isSystemDefaultSlot: plan.isSystemDefaultSlot })].filter(Boolean).join(' / ') };
}
export function buildPutawayAllocations(receipt: Receipt): PutAwayAllocationForm {
  const lines = receipt.items.filter(item => item.inboundRequestItemId && item.remainingPutAwayQuantity > 0).flatMap(item => {
    let remaining = Math.round(item.remainingPutAwayQuantity * 100);
    const result: AllocationLine[] = [];
    for (const plan of item.putAwayPlan) {
      const cents = Math.min(Math.round(plan.quantity * 100), remaining);
      if (cents <= 0) continue;
      result.push({ goodsReceiptItemId: item.id, destination: plannedDestination(plan), ...putawayInput(item, cents / 100) });
      remaining -= cents;
    }
    if (remaining > 0) result.push({ goodsReceiptItemId: item.id, destination: null, ...putawayInput(item, remaining / 100) });
    return result;
  });
  return { lines, overrideReason: '' };
}
export function layoutDestinations(layout: Awaited<ReturnType<typeof receivingApi.layout>>): PutAwayDestination[] {
  return layout.filter(zone => zone.status === 'Active')
    .flatMap(zone => zone.racks.filter(rack => rack.status === 'Active' && !rack.isIsolationPoint && !rack.isOutboundStaging &&
      // Older layout responses cannot identify the outbound rack's hidden default slot.
      !(rack.storageMode === 'RackLevel' && zone.isDefaultOutboundStagingPoint && rack.isOutboundStaging === undefined)).flatMap(rack => {
    // Rack-level layouts expose the default slot ID on the rack, without a child slot row.
    const slots = rack.storageMode === 'RackLevel' && rack.defaultSlotId ? [{
      id: rack.defaultSlotId, slotCode: '__SYSTEM_DEFAULT__', barcodeValue: null, isActive: true, isOutboundStaging: false,
      isIsolationPoint: false, capacity: rack.capacity, capacityUsed: rack.capacityUsed,
      remainingCapacity: rack.remainingCapacity, capacityUnitName: rack.capacityUnitName,
    }] : rack.slots;
    return slots.filter(slot => slot.isActive && !slot.isOutboundStaging && !slot.isIsolationPoint).map(slot => {
      const isSystemDefaultSlot = slot.id === rack.defaultSlotId || slot.slotCode === '__SYSTEM_DEFAULT__';
      return { id: slot.id, slotCode: slot.slotCode, rackId: rack.id, rackCode: rack.rackCode, zoneCode: zone.zoneCode,
        slotBarcode: slot.barcodeValue, isSystemDefaultSlot,
        displayPath: `${zone.zoneCode} · ${zone.zoneName} / ${formatInventoryLocation({ ...slot, rackCode: rack.rackCode, isSystemDefaultSlot })}`,
        capacityLabel: slot.capacity !== null && slot.capacityUsed !== null
          ? `${formatQuantity(slot.capacityUsed)} / ${formatQuantity(slot.capacity)} ${slot.capacityUnitName ?? ''}${slot.remainingCapacity !== null ? ` · Còn ${formatQuantity(slot.remainingCapacity)}` : ''}` : undefined };
    });
  }));
}
export function matchesPutawayDestination(code: string, destination: PutAwayDestination) {
  // The internal default-slot sentinel is never a physical label.
  if (destination.isSystemDefaultSlot || destination.slotCode === '__SYSTEM_DEFAULT__') {
    const value = code.trim().toLowerCase();
    return !!value && [destination.rackCode, destination.slotBarcode,
      destination.zoneCode && destination.rackCode ? `${destination.zoneCode}-${destination.rackCode}` : null,
      destination.rackId ? `KOVIA:LOC:RACK:${destination.rackId}` : null].some(candidate => candidate?.toLowerCase() === value);
  }
  return matchesWarehouseLocation(code, { ...destination, slotId: destination.id });
}
export function putawayScanKey(line: PutAwayAllocationForm['lines'][number]) {
  return `${line.goodsReceiptItemId}:${line.destination?.id ?? ''}`;
}
interface ScanResolution { index: number; code: string; serverCheck: boolean; message: string }
/** Global scans identify a warehouse destination; row scans may defer an unknown barcode to BE, like web. */
export function resolvePutawayScan(rawCode: string, warehouse: readonly PutAwayDestination[],
  lines: PutAwayAllocationForm['lines'], scans: Readonly<Record<string, string>>, rowIndex?: number): ScanResolution {
  const code = rawCode.trim();
  if (!code) throw new Error('Vui lòng quét hoặc nhập mã vị trí.');
  if (code.length > 100) throw new Error('Mã vị trí tối đa 100 ký tự.');
  if (code.toUpperCase() === '__SYSTEM_DEFAULT__') throw new Error('Đây là mã nội bộ. Vui lòng quét nhãn vị trí thực tế.');
  const candidates = [...new Map(warehouse.map(destination => [destination.id, destination])).values()]
    .filter(destination => matchesPutawayDestination(code, destination));
  if (candidates.length > 1) throw new Error('Mã trùng ở nhiều vị trí. Vui lòng quét QR hoặc nhãn đầy đủ khu/kệ/vị trí.');
  const matched = candidates[0];
  if (rowIndex !== undefined) {
    const selected = lines[rowIndex]?.destination;
    if (!selected) throw new Error('Chọn vị trí cho dòng hàng trước khi quét.');
    if (matched && matched.id !== selected.id) throw new Error('Mã vừa quét không phải vị trí đang chọn. Kiểm tra lại nơi bạn đang đứng.');
    return { index: rowIndex, code, serverCheck: !matched,
      message: matched ? `Đã ghi nhận mã vị trí ${formatInventoryLocation(matched)}.` : 'Đã ghi nhận mã cho dòng đã chọn. BE sẽ đối chiếu mã khi xác nhận cất hàng.' };
  }
  if (!matched) throw new Error(`Không có vị trí nào mang mã ${code} trong kho này.`);
  const matching = lines.flatMap((line, index) => line.destination?.id === matched.id ? [{ line, index }] : []);
  if (!matching.length) throw new Error('Vị trí vừa quét không nằm trong phân bổ của phiếu này. Kiểm tra lại nơi bạn vừa cất hàng.');
  const next = matching.find(({ line }) => !scans[putawayScanKey(line)]);
  if (!next) throw new Error('Vị trí này đã được quét xác nhận cho các dòng hàng đang phân bổ.');
  return { index: next.index, code, serverCheck: false, message: `Đã ghi nhận mã vị trí ${formatInventoryLocation(matched)}.` };
}
export function putawayAllocationState(values: PutAwayAllocationForm, receipt: Receipt, scans: Readonly<Record<string, string>>, scanSkipped = false, forceReason = false) {
  const totals = new Map<string, number>();
  const pairs = new Set<string>();
  const rows = values.lines.map(line => {
    const item = receipt.items.find(item => item.id === line.goodsReceiptItemId);
    const destination = line.destination;
    const unit = item?.allowedUnits.find(unit => unit.unitId === line.enteredUnitId);
    const baseQuantity = putawayBaseQuantity(line.enteredQuantity, unit, item?.allowedUnits.find(unit => unit.unitId === item.baseUnitId));
    let error: string | null = null;
    if (!item?.inboundRequestItemId) error = 'Sản phẩm không thuộc dòng yêu cầu nhập kho.';
    else if (!destination || destination.id === receipt.receivingSlotId) error = 'Chọn vị trí cất khác vị trí nhận.';
    else if (baseQuantity === null || baseQuantity <= 0) error = 'Số lượng hoặc đơn vị không quy đổi chính xác. Vui lòng kiểm tra lại.';
    const pair = `${line.goodsReceiptItemId}:${destination?.id}`;
    if (destination && pairs.has(pair)) error = 'Sản phẩm đã có phân bổ vào vị trí này.';
    pairs.add(pair);
    const cents = baseQuantity === null ? 0 : Math.round(baseQuantity * 100);
    totals.set(line.goodsReceiptItemId, (totals.get(line.goodsReceiptItemId) ?? 0) + cents);
    if (item && totals.get(item.id)! > Math.round(item.remainingPutAwayQuantity * 100)) error = 'Tổng phân bổ vượt số lượng còn phải cất.';
    const planned = item?.putAwayPlan.reduce((sum, plan) => sum + (plan.slotId === destination?.id ? Math.round(plan.quantity * 100) : 0), 0) ?? 0;
    const offPlan = !!item?.putAwayPlan.length && !!destination && cents > planned;
    const code = scans[putawayScanKey(line)]?.trim();
    const confirmed = !!destination && !!code && code.length <= 100 && code.toUpperCase() !== '__SYSTEM_DEFAULT__';
    return { baseQuantity, error, offPlan, confirmed, needsScan: !!item?.putAwayPlan.length && !!destination && !confirmed,
      requiresScan: !!item?.putAwayPlan.length && !!destination, serverCheck: confirmed && !matchesPutawayDestination(code!, destination!) };
  });
  const pendingItems = receipt.items.filter(item => item.remainingPutAwayQuantity > 0);
  const fullyAllocated = pendingItems.filter(item => totals.get(item.id) === Math.round(item.remainingPutAwayQuantity * 100)).length;
  const missingScans = rows.filter(row => row.needsScan).length;
  const needsReason = forceReason || rows.some(row => row.offPlan) || (scanSkipped && missingScans > 0);
  const reasonLength = values.overrideReason.trim().length;
  const reasonValid = !needsReason || (reasonLength <= 500 &&
    (values.overrideReasonCode && values.overrideReasonCode !== 'Other' || reasonLength >= 5));
  return { rows, totals, fullyAllocated, itemCount: pendingItems.length, requiredCount: rows.filter(row => row.requiresScan).length,
    confirmedCount: rows.filter(row => row.requiresScan && row.confirmed).length, missingScans,
    needsReason, reasonValid: !!reasonValid, valid: rows.length > 0 && rows.every(row => !row.error) && !!reasonValid && (missingScans === 0 || scanSkipped) };
}
export function assertPutawayAllocation(values: PutAwayAllocationForm, receipt: Receipt, scans: Readonly<Record<string, string>>, scanSkipped = false, forceReason = false) {
  const state = putawayAllocationState(values, receipt, scans, scanSkipped, forceReason);
  const error = state.rows.find(row => row.error)?.error;
  if (error || !state.valid) throw new Error(error ?? (state.missingScans > 0 && !scanSkipped
    ? `Còn ${state.missingScans} dòng được giao chưa quét mã. Quét đủ hoặc chọn Không quét được mã.`
    : 'Chọn nhóm lý do hoặc mô tả lý do tối thiểu 5 ký tự khi không quét được/cất khác kế hoạch.'));
  for (const [index, line] of values.lines.entries()) assertPlacement({ goodsReceiptItemId: line.goodsReceiptItemId,
    slotId: line.destination!.id, quantity: state.rows[index].baseQuantity!, confirmedSlotCode: '', overrideReason: values.overrideReason }, receipt);
  return state;
}
