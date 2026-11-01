import type { TransferAllocationForm, TransferSuggestions } from './transfer-execution.schema';
import type { TransferPutAwayRow, TransferPutAwaySheet } from './transfer-receiving.schema';
import { codesMatch } from '@/features/scanner/warehouse-scan';

export const transferPutawayKey = (lineId: string, lotId: string | null) => `${lineId}:${lotId ?? 'none'}`;
function cents(quantity: number) {
  const value = Math.round(quantity * 100);
  if (!Number.isFinite(quantity) || quantity < 0 || !Number.isSafeInteger(value) || Math.abs(quantity * 100 - value) > 1e-7)
    throw new Error('Số lượng phải chính xác theo đơn vị cơ sở, tối đa hai chữ số thập phân.');
  return value;
}

/** Plan/suggestion quantities belong to the item, so lots must share one budget. */
export function buildTransferAllocations(rows: readonly TransferPutAwayRow[], suggestions?: TransferSuggestions): TransferAllocationForm {
  const budgets = new Map<string, number>();
  return { lines: rows.filter(row => row.qualityStatus === 'Good' && row.remainingQuantity > 0).flatMap(row => {
    let left = cents(row.remainingQuantity);
    const proposed = suggestions?.items.find(item => item.itemId === row.itemId)?.suggestions;
    const slots = proposed ? proposed.map(slot => ({ id: slot.slotId, code: slot.slotCode, path: slot.path, quantity: slot.suggestedQuantity }))
      : row.planBudgets.map(slot => ({ id: slot.slotId, code: slot.slotCode, path: slot.path, quantity: slot.remainingBudget }));
    const result: TransferAllocationForm['lines'] = [];
    for (const slot of slots) {
      const key = `${row.itemId}:${slot.id}`;
      if (!budgets.has(key)) budgets.set(key, cents(slot.quantity));
      const amount = Math.min(left, budgets.get(key) ?? 0);
      if (amount <= 0) continue;
      result.push({ lineId: row.lineId, lotId: row.lotId, destination: { id: slot.id, code: slot.code, path: slot.path }, quantity: String(amount / 100), note: '', reasonCode: null });
      budgets.set(key, (budgets.get(key) ?? 0) - amount); left -= amount;
    }
    if (left > 0) result.push({ lineId: row.lineId, lotId: row.lotId, destination: null, quantity: String(left / 100), note: '', reasonCode: null });
    return result;
  }) };
}

export function transferAllocationEntries(form: TransferAllocationForm, sheet: TransferPutAwaySheet,
  scans: Readonly<Record<string, { slot: string; product: string }>>) {
  const totals = new Map<string, number>(), budgets = new Map<string, number>(), used = new Set<string>();
  for (const row of sheet.rows) for (const budget of row.planBudgets) {
    const key = `${row.itemId}:${budget.slotId}`;
    if (!budgets.has(key)) budgets.set(key, cents(budget.remainingBudget));
  }
  return form.lines.map((line, index) => {
    const key = transferPutawayKey(line.lineId, line.lotId);
    const row = sheet.rows.find(row => transferPutawayKey(row.lineId, row.lotId) === key && row.qualityStatus === 'Good');
    const quantity = line.quantity.trim() ? Number(line.quantity.replace(',', '.')) : Number.NaN;
    const amount = cents(quantity);
    if (!row || !line.destination || amount <= 0 || Number(quantity.toFixed(row.baseQuantityPrecision)) !== quantity)
      throw new Error(`Phân bổ ${index + 1}: chọn vị trí và số lượng đúng đơn vị cơ sở.`);
    const total = (totals.get(key) ?? 0) + amount;
    if (total > cents(row.remainingQuantity)) throw new Error(`${row.sku}: tổng phân bổ vượt lượng thực nhận còn được cất.`);
    totals.set(key, total);
    const unique = `${key}:${line.destination.id}`;
    if (used.has(unique)) throw new Error(`${row.sku}: gộp các phân bổ trùng lô và vị trí.`);
    used.add(unique);
    const budgetKey = `${row.itemId}:${line.destination.id}`;
    const budget = budgets.get(budgetKey) ?? 0;
    const offPlan = row.planMode === 'Planned' && amount > budget;
    budgets.set(budgetKey, Math.max(0, budget - amount));
    if (offPlan && (!line.reasonCode || (line.reasonCode === 'Other' && line.note.trim().length < 5)))
      throw new Error(`${row.sku}: chọn lý do khác kế hoạch; lý do khác cần ghi chú ít nhất 5 ký tự.`);
    const scan = scans[`${index}:${line.destination.id}`];
    const unreadable = line.slotCodeUnreadable === true;
    if (unreadable && (!['LabelMismatch', 'Other'].includes(line.reasonCode ?? '') ||
      line.reasonCode === 'Other' && line.note.trim().length < 5)) throw new Error(`${row.sku}: không quét được mã cần lý do nhãn hỏng hoặc lý do khác có ghi chú ít nhất 5 ký tự.`);
    if (!unreadable && !scan?.slot.trim()) throw new Error(`Phân bổ ${index + 1}: xác nhận mã vị trí thực tế.`);
    const product = sheet.receipt.lines.find(value => value.lineId === line.lineId);
    if (scan?.product.trim() && (!product || !codesMatch(scan.product, product.sku, product.barcode))) throw new Error(`${row.sku}: mã sản phẩm không khớp dòng hàng.`);
    return { lineId: line.lineId, lotId: line.lotId, qualityStatus: 'Good' as const, destinationSlotId: line.destination.id,
      quantity, scannedSlotCode: unreadable ? null : scan!.slot.trim(), scannedProductCode: scan?.product.trim() || null,
      deviationReasonCode: offPlan || unreadable ? line.reasonCode : null, note: line.note.trim() || null, slotCodeUnreadable: unreadable };

  });
}
