export interface WarehouseScanLocation {
  readonly slotId?: string;
  readonly slotCode: string;
  readonly slotBarcode?: string | null;
  readonly rackId?: string | null;
  readonly rackCode?: string | null;
  readonly zoneCode?: string | null;
  readonly isSystemDefaultSlot?: boolean;
}

export function codesMatch(code: string, ...candidates: readonly (string | null | undefined)[]) {
  const value = code.trim().toLowerCase();
  return !!value && candidates.some(candidate => candidate?.trim().toLowerCase() === value);
}

// Mirrors TransferScanRules and the web's transferLocationScanCodes for metadata supplied by the API.
export function matchesWarehouseLocation(code: string, location: WarehouseScanLocation) {
  const candidates = [location.slotCode, location.slotBarcode,
    location.slotId ? `KOVIA:LOC:SLOT:${location.slotId}` : null];
  if (location.isSystemDefaultSlot) candidates.push(location.rackCode,
    location.rackId ? `KOVIA:LOC:RACK:${location.rackId}` : null,
    location.zoneCode && location.rackCode ? `${location.zoneCode}-${location.rackCode}` : null);
  else if (location.zoneCode && location.rackCode)
    candidates.push(`${location.zoneCode}-${location.rackCode}-${location.slotCode}`);
  return codesMatch(code, ...candidates);
}

export function nextScanQuantity(current: number, scans: number, step: number, maximum: number) {
  if (![current, scans, step, maximum].every(Number.isFinite) || current < 0 || scans < 0 || !Number.isInteger(scans) || step <= 0)
    return null;
  const quantity = current + scans * step;
  const rounded = Math.round(quantity * 100) / 100;
  return Number.isSafeInteger(Math.round(quantity * 100)) && Math.abs(quantity - rounded) < 1e-7 && rounded <= maximum ? rounded : null;
}
