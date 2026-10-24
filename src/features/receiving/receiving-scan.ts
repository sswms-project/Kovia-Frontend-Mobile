const LOCATION_PREFIX = 'kovia:loc:';

/** Location labels are either the plain slot code or `KOVIA:LOC:SLOT:<id>`; returns the slot id if encoded. */
export function parseLocationScan(code: string) {
  const value = code.trim();
  const lower = value.toLowerCase();
  if (!lower.startsWith(LOCATION_PREFIX)) return { code: value, slotId: null };
  const slotId = lower.startsWith(`${LOCATION_PREFIX}slot:`) ? value.slice(LOCATION_PREFIX.length + 5) : null;
  return { code: value, slotId };
}
export function matchesLocationScan(code: string, slotId: string, slotCode: string) {
  const parsed = parseLocationScan(code);
  return parsed.slotId ? parsed.slotId.toLowerCase() === slotId.toLowerCase()
    : parsed.code.toLowerCase() === slotCode.trim().toLowerCase();
}
