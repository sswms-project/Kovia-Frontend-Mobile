import {
  MOBILE_SUPPORTED_ROLES,
  MOBILE_TABS,
  type MobileTab,
} from '@/config/mobile-navigation';
import type { PermissionCode } from '@/config/permission-codes';
import { USER_ROLES } from '@/config/roles';

import type { UserProfileResponse } from './auth.types';

type PermissionSubject = Pick<UserProfileResponse, 'role' | 'permissions'>;

// Tenant Owner implicitly holds every tenant permission, mirroring the web FE.
export function hasPermission(subject: PermissionSubject, code: PermissionCode): boolean {
  return subject.role === USER_ROLES.TenantOwner || subject.permissions.includes(code);
}

export function isMobileSupportedRole(role: string | null): boolean {
  return MOBILE_SUPPORTED_ROLES.some((supported) => supported === role);
}

export function getAllowedTabs(subject: PermissionSubject): readonly MobileTab[] {
  return MOBILE_TABS.filter(
    (tab) => tab.permission === null || hasPermission(subject, tab.permission),
  );
}
