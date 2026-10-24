import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { taskScopeMatches } from '@/features/my-tasks/my-tasks';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { profileQueryKey, warehouseSnapshot } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { ApiError } from '@/lib/api';

/**
 * Shared guard for approve/reject commands: the session, warehouse and permissions the screen was
 * rendered with must still be current when the command is sent.
 */
export function useApprovalContext() {
  const access = useWarehouseAccess();
  const client = useQueryClient();
  const { identity, warehouseId, signature, revision } = access.selection;
  const permissions = access.profile.data?.permissions;

  const has = useCallback((permission: string) => access.ready && !!permissions?.includes(permission), [access.ready, permissions]);

  const assertCurrentContext = useCallback((required: readonly string[]) => {
    const profile = client.getQueryData<UserProfile>(profileQueryKey);
    const snapshot = profile ? warehouseSnapshot(profile) : null;
    if (!identity || !warehouseId || !signature || !useAuth.getState().signedIn || !snapshot?.activeUser || !snapshot.compatible ||
      !taskScopeMatches({ identity, warehouseId, signature, revision }, useWarehouseSelection.getState()) ||
      snapshot.signature !== signature || !required.every((permission) => profile?.permissions.includes(permission)))
      throw new ApiError('Kho, quyền hoặc phiên làm việc đã thay đổi. Vui lòng tải lại chứng từ.', 409);
  }, [client, identity, warehouseId, signature, revision]);

  return { access, userId: access.profile.data?.id ?? null, has, assertCurrentContext };
}
