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
  const source = line.suggestions.find(row => row.inventoryStockId === form.getValues('inventoryStockId'));
  const maximum = Math.min(line.remainingQuantity, source?.suggestedQuantity ?? 0, source?.reservedQuantity ?? 0);
  const matchesSource = (code: string) => !!source && matchesWarehouseLocation(code, source);
  const matchesProduct = (code: string) => codesMatch(code, line.sku, line.productBarcode);
  const sourceReady = matchesSource(values.scannedSlotCode ?? '');
  const ready = sourceReady && matchesProduct(values.scannedProductCode ?? '');
  function clearProduct() {
    form.setValue('scannedProductCode', '', { shouldDirty: true });
    form.setValue('quantity', Number.NaN, { shouldDirty: true }); setProductText('');
  }
  function scanSource(code: string) {
    if (disabled) return false;
    clearProduct(); form.setValue('scannedSlotCode', '', { shouldDirty: true });
    if (!matchesSource(code)) { setError('Mã vị trí không khớp nguồn đang chọn. Chọn Đổi vị trí/lô nếu cần lấy nguồn khác.'); return false; }
    form.setValue('scannedSlotCode', code.trim(), { shouldDirty: true }); setSourceText(''); setError(null); return true;
  }
  function scanProduct(code: string) {
    if (disabled) return false;
    if (!matchesSource(form.getValues('scannedSlotCode'))) { setError('Quét vị trí nguồn trước.'); return false; }
    if (!matchesProduct(code)) { form.setValue('scannedProductCode', '', { shouldDirty: true }); if (!eachUnit) form.setValue('quantity', Number.NaN, { shouldDirty: true }); setError('Mã sản phẩm không khớp dòng hàng.'); return false; }
    const current = form.getValues('quantity');
    const quantity = eachUnit ? nextScanQuantity(Number.isFinite(current) ? current : 0, 1, 1, maximum) : maximum;
    if (quantity === null || quantity <= 0) { setError('Đã đủ số lượng được lấy tại nguồn này.'); return false; }
    form.setValue('scannedProductCode', code.trim(), { shouldDirty: true });
    form.setValue('quantity', quantity, { shouldDirty: true, shouldValidate: true }); setProductText(''); setError(null); return true;
  }
  return { source, maximum, sourceReady, ready, eachUnit, hardware, sourceText, productText, error,
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
