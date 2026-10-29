import { useState } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { codesMatch, matchesWarehouseLocation, nextScanQuantity } from '@/features/scanner/warehouse-scan';
import type { PickForm, StockIssueItem } from '../stock-issue.schema';
import { canCaptureIssueLocation } from '../stock-issue';

export function usePickingScan(item: StockIssueItem, form: UseFormReturn<PickForm>, disabled: boolean) {
  const [eachUnit, setEachUnit] = useState(false);
  const [hardware, setHardware] = useState(false);
  const [sourceInput, setSourceInput] = useState('');
  const [productInput, setProductInput] = useState('');
  const [quantityInput, setQuantityInput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const values = useWatch({ control: form.control });
  const source = item.pickLocations.find(location => location.inventoryStockId === form.getValues('inventoryStockId'));
  const factor = item.conversionFactor;
  const available = Math.max(0, Math.min(item.quantity - item.pickedQuantity, source?.reservedQuantity ?? 0));
  const wholeMaximum = factor === 1 ? available : Math.floor((available + 1e-7) / factor) * factor;
  const maximum = nextScanQuantity(0, 1, wholeMaximum, available) ?? 0;
  const enteredText = (base: number) => String(Number((base / factor).toFixed(6)));
  const verifiedSource = (code: string) => !!source && code.trim() !== '__SYSTEM_DEFAULT__' && matchesWarehouseLocation(code,
    { ...source, isSystemDefaultSlot: source.isSystemDefaultSlot || source.slotCode === '__SYSTEM_DEFAULT__' });
  // The DTO has no rack ID: retain BE verification for structured rack labels, without claiming a local match.
  const matchesSource = (code: string) => verifiedSource(code) || !!source && code.trim().toLowerCase().startsWith('kovia:loc:rack:') &&
    canCaptureIssueLocation(code, source);
  const matchesProduct = (code: string) => codesMatch(code, item.barcode || item.sku);
  const sourceReady = matchesSource(values.scannedSlotCode ?? '');
  const ready = sourceReady && matchesProduct(values.scannedBarcode ?? '');
  const quantity = values.pickedQuantity ?? Number.NaN;
  const quantityError = !ready ? null : !Number.isFinite(quantity) || quantity <= 0 ? 'Số lượng phải lớn hơn 0.'
    : quantity > maximum ? 'Số lượng vượt phần còn được lấy tại vị trí này.'
      : factor !== 1 && Math.abs(quantity / factor - Math.round(quantity / factor)) > 1e-7 ? `Chỉ lấy nguyên ${item.enteredUnitName}.`
        : nextScanQuantity(0, 1, quantity, maximum) === null ? 'Số lượng quy đổi chỉ hỗ trợ tối đa 2 chữ số thập phân.' : null;
  function clearProduct(resetQuantity = true) {
    form.setValue('scannedBarcode', '', { shouldDirty: true });
    if (resetQuantity) { form.setValue('pickedQuantity', Number.NaN, { shouldDirty: true }); setQuantityInput(''); }
    setProductInput('');
  }
  function scanSource(code: string) {
    if (disabled) return false;
    clearProduct(); setError(null);
    form.setValue('scannedSlotCode', '', { shouldDirty: true });
    if (!matchesSource(code)) { setError('Mã vị trí không khớp. Quét mã kệ hoặc nhãn ô thuộc nguồn đang chọn.'); return false; }
    form.setValue('scannedSlotCode', code.trim(), { shouldDirty: true }); setSourceInput(''); return true;
  }
  function scanProduct(code: string) {
    if (disabled) return false;
    if (!matchesSource(form.getValues('scannedSlotCode'))) { setError('Quét vị trí nguồn trước khi quét mã hàng.'); return false; }
    if (!matchesProduct(code)) { clearProduct(!eachUnit); setError('Mã hàng không khớp với sản phẩm cần lấy.'); return false; }
    const current = form.getValues('pickedQuantity');
    const next = eachUnit ? nextScanQuantity(Number.isFinite(current) ? current : 0, 1, factor, maximum) : maximum;
    if (next === null || next <= 0) { setError('Đã đủ số lượng được lấy tại vị trí này.'); return false; }
    form.setValue('scannedBarcode', code.trim(), { shouldDirty: true });
    form.setValue('pickedQuantity', next, { shouldDirty: true, shouldValidate: true });
    setQuantityInput(enteredText(next)); setProductInput(''); setError(null); return true;
  }
  return { source, maximum, factor, eachUnit, hardware, sourceInput, productInput, sourceReady, sourceVerified: verifiedSource(values.scannedSlotCode ?? ''), ready, quantityError, error,
    quantityText: quantityInput ?? (Number.isFinite(quantity) ? enteredText(quantity) : ''),
    canReview: !disabled && ready && !quantityError && !error,
    scanSource, scanProduct,
    scan: (code: string) => !matchesSource(form.getValues('scannedSlotCode')) ? scanSource(code)
      : !eachUnit && matchesProduct(form.getValues('scannedBarcode')) ? undefined : scanProduct(code),
    changeSource: (text: string) => { if (!disabled) { setSourceInput(text); form.setValue('scannedSlotCode', '', { shouldDirty: true }); clearProduct(); setError(null); } },
    changeProduct: (text: string) => { if (!disabled) { clearProduct(!eachUnit); setProductInput(text); setError(null); } },
    changeQuantity: (text: string) => {
      if (disabled || !ready) return;
      setQuantityInput(text); setError(null);
      const entered = text.trim() ? Number(text.replace(',', '.')) : Number.NaN;
      const base = entered * factor;
      // Remove binary noise only when the exact quantity fits the BE's storage scale.
      const normalized = nextScanQuantity(0, 1, base, Number.MAX_SAFE_INTEGER);
      form.setValue('pickedQuantity', normalized ?? base, { shouldDirty: true, shouldValidate: true });
    },
    changeEachUnit: (value: boolean) => { if (!disabled) { setEachUnit(value); clearProduct(); setError(null); } },
    changeHardware: (value: boolean) => { if (!disabled) setHardware(value); },
    reset: () => { if (!disabled) { form.setValue('scannedSlotCode', '', { shouldDirty: true }); clearProduct(); setSourceInput(''); setError(null); } },
  };
}
