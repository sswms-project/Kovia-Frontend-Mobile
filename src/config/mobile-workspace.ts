import { USER_ROLES } from './roles';

// This selects entry points for the device; effective API permissions remain authoritative.
export function isFieldWorkspace(role: string | null | undefined) {
  return role === USER_ROLES.WarehouseStaff;
}

const FIELD_ENTRIES = new Set(['products', 'damage-cases', 'discrepancies', 'audit-logs']);
export function isMobileEntryVisible(key: string, role: string | null | undefined) {
  return !isFieldWorkspace(role) || FIELD_ENTRIES.has(key);
}
