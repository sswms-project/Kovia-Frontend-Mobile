import type { PermissionCode } from '@/config/permission-codes';

import { hasPermission } from '../auth.permissions';
import { useMe } from './use-me';

/** UX-only check: hides or explains UI. Every operation is still enforced by the BE. */
export function useCan(code: PermissionCode): boolean {
  const { data } = useMe();
  return data ? hasPermission(data, code) : false;
}
