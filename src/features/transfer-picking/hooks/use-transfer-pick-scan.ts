import { useState } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { codesMatch, matchesWarehouseLocation, nextScanQuantity } from '@/features/scanner/warehouse-scan';
import type { TransferPickForm, TransferPickLine } from '../transfer-picking.schema';

export function useTransferPickScan(line: TransferPickLine, form: UseFormReturn<TransferPickForm>, disabled: boolean) {
  const [eachUnit, setEachUnit] = useState(false);
  const [hardware, setHardware] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [productText, setProductText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const values = useWatch({ control: form.control });
  const currentSource = () => line.suggestions.find(row => row.inventoryStockId === form.getValues('inventoryStockId'));
  const source = currentSource();
  const sourceMaximum = () => Math.min(line.remainingQuantity, currentSource()?.suggestedQuantity ?? 0, currentSource()?.reservedQuantity ?? 0);
  const maximum = sourceMaximum();
  const matchesSource = (code: string) => { const selected = currentSource(); return !!selected && matchesWarehouseLocation(code, selected); };
  const matchesProduct = (code: string) => codesMatch(code, line.sku, line.productBarcode);
  const sourceReady = matchesSource(values.scannedSlotCode ?? '');
  const ready = sourceReady && matchesProduct(values.scannedProductCode ?? '');
  function adjustedQuantity(delta: -1 | 1, current: number) {
    const quantity = Number.isFinite(current) ? Math.round((current + delta) * 100) / 100 : Number.NaN;
    const scale = 10 ** line.baseQuantityPrecision;
    return !disabled && matchesSource(form.getValues('scannedSlotCode')) && matchesProduct(form.getValues('scannedProductCode')) &&
      quantity > 0 && quantity <= sourceMaximum() && Math.abs(quantity * scale - Math.round(quantity * scale)) < 1e-7 ? quantity : null;
  }
  function clearProduct() {
    form.setValue('scannedProductCode', '', { shouldDirty: true });
    form.setValue('quantity', Number.NaN, { shouldDirty: true }); setProductText('');
  }
  function scanSource(code: string) {
    if (disabled) return false;
    clearProduct(); form.setValue('scannedSlotCode', '', { shouldDirty: true });
    const candidates = line.suggestions.filter(row => row.suggestedQuantity > 0 && row.reservedQuantity > 0 && matchesWarehouseLocation(code, row));
    const matched = candidates.find(row => row.inventoryStockId === form.getValues('inventoryStockId')) ?? candidates[0];
    if (!matched) { setError('Mã vị trí không thuộc nguồn được phân bổ cho dòng hàng này. Kiểm tra vị trí hoặc dùng Đổi vị trí/lô.'); return false; }
    form.setValue('inventoryStockId', matched.inventoryStockId, { shouldDirty: true });
    form.setValue('scannedSlotCode', code.trim(), { shouldDirty: true }); setSourceText(''); setError(null); return true;
  }
  function scanProduct(code: string) {
    if (disabled) return false;
    if (!matchesSource(form.getValues('scannedSlotCode'))) { setError('Quét vị trí nguồn trước.'); return false; }
    if (!matchesProduct(code)) { form.setValue('scannedProductCode', '', { shouldDirty: true }); if (!eachUnit) form.setValue('quantity', Number.NaN, { shouldDirty: true }); setError('Mã sản phẩm không khớp dòng hàng.'); return false; }
    const current = form.getValues('quantity');
    const quantity = eachUnit ? nextScanQuantity(Number.isFinite(current) ? current : 0, 1, 1, sourceMaximum()) : sourceMaximum();
    if (quantity === null || quantity <= 0) { setError('Đã đủ số lượng được lấy tại nguồn này.'); return false; }
    form.setValue('scannedProductCode', code.trim(), { shouldDirty: true });
    form.setValue('quantity', quantity, { shouldDirty: true, shouldValidate: true }); setProductText(''); setError(null); return true;
  }
  return { source, maximum, sourceReady, ready, eachUnit, hardware, sourceText, productText, error,
    canDecrease: adjustedQuantity(-1, values.quantity ?? Number.NaN) !== null,
    canIncrease: adjustedQuantity(1, values.quantity ?? Number.NaN) !== null,
    adjustQuantity: (delta: -1 | 1) => {
      const quantity = adjustedQuantity(delta, form.getValues('quantity'));
      if (quantity !== null) { form.setValue('quantity', quantity, { shouldDirty: true, shouldValidate: true }); setError(null); }
    },
    scanSource, scanProduct,
    scan: (code: string) => !matchesSource(form.getValues('scannedSlotCode')) ? scanSource(code)
      : !eachUnit && matchesProduct(form.getValues('scannedProductCode')) ? undefined : scanProduct(code),
    changeSource: (text: string) => { if (!disabled) { setSourceText(text); form.setValue('scannedSlotCode', '', { shouldDirty: true }); clearProduct(); setError(null); } },
    changeProduct: (text: string) => { if (!disabled) { setProductText(text); form.setValue('scannedProductCode', '', { shouldDirty: true }); if (!eachUnit) form.setValue('quantity', Number.NaN, { shouldDirty: true }); setError(null); } },
    changeEachUnit: (value: boolean) => { if (!disabled) { setEachUnit(value); clearProduct(); setError(null); } },
    changeHardware: (value: boolean) => { if (!disabled) setHardware(value); },
    reset: () => { if (!disabled) { form.setValue('scannedSlotCode', '', { shouldDirty: true }); clearProduct(); setSourceText(''); setError(null); } },
  };
}
