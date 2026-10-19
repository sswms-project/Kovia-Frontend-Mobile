import {
  MOBILE_SUPPORTED_ROLES,
  MOBILE_TABS,
  type MobileTab,
} from '@/config/mobile-navigation';
import type { PermissionCode } from '@/config/permission-codes';

import type { UserProfileResponse } from './auth.types';

type PermissionSubject = Pick<UserProfileResponse, 'role' | 'permissions'>;

// Effective permissions include backend grants/revocations; role names cannot override them.
export function hasPermission(subject: PermissionSubject, code: PermissionCode): boolean {
  return subject.permissions.includes(code);
}

export function isMobileSupportedRole(role: string | null): boolean {
  return MOBILE_SUPPORTED_ROLES.some((supported) => supported === role);
}

export function getAllowedTabs(subject: PermissionSubject): readonly MobileTab[] {
  return MOBILE_TABS.filter(
    (tab) => tab.permission === null || hasPermission(subject, tab.permission),
  );
}
