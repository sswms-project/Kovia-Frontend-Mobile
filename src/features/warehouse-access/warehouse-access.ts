import type { QueryClient } from '@tanstack/react-query';

import type { PermissionCode } from '@/config/permission-codes';
import type { UserProfile } from '@/features/auth/auth.types';

import { useWarehouseSelection } from './warehouse-access.store';

export const profileQueryKey = ['auth', 'profile'] as const;
export type AssignedWarehouse = UserProfile['assignedWarehouses'][number];

export function warehouseSnapshot(profile: UserProfile) {
  const warehouses = [...new Map(
    profile.assignedWarehouses
      .filter((warehouse) => warehouse.status === 'Active')
      .map((warehouse) => [warehouse.id, warehouse]),
  ).values()];
  const identity = `${profile.tenantId}:${profile.id}`;
  const signature = JSON.stringify([
    identity,
    profile.status,
    [...new Set(profile.permissions)].sort(),
    profile.assignedWarehouses.map((warehouse) => `${warehouse.id}:${warehouse.status}`).sort(),
  ]);
  return {
    identity,
    signature,
    warehouses,
    compatible: profile.assignedWarehouses.every(
      (warehouse) => warehouse.status === 'Active' || warehouse.status === 'Inactive',
    ),
    activeUser: profile.status === 'Active',
  };
}

export type WarehouseSnapshot = ReturnType<typeof warehouseSnapshot>;

export async function clearWarehouseQueries(client: QueryClient) {
  const predicate = (query: { queryKey: readonly unknown[] }) =>
    !(query.queryKey[0] === 'auth' && query.queryKey[1] === 'profile');
  await client.cancelQueries({ predicate });
  client.removeQueries({ predicate });
}

async function transition(client: QueryClient, snapshot: WarehouseSnapshot, warehouseId: string | null) {
  const previous = useWarehouseSelection.getState();
  const revision = previous.revision + 1;
  useWarehouseSelection.setState({
    identity: snapshot.identity,
    signature: null,
    warehouseId,
    revision,
    transitioning: true,
    deniedSignature: null,
    notice: previous.warehouseId && !warehouseId
      ? 'Kho trước đó không còn khả dụng. Vui lòng chọn lại kho được giao.'
      : null,
  });
  await clearWarehouseQueries(client);
  // A newer switch, 403 or logout must win over a late cancellation.
  if (useWarehouseSelection.getState().revision === revision)
    useWarehouseSelection.setState({ signature: snapshot.signature, transitioning: false });
}

export async function reconcileWarehouseAccess(client: QueryClient, snapshot: WarehouseSnapshot) {
  const state = useWarehouseSelection.getState();
  if (state.deniedSignature === snapshot.signature) {
    useWarehouseSelection.setState({ signature: null, transitioning: false,
      notice: 'Truy cập bị từ chối. Chọn Kiểm tra lại quyền sau khi quyền hoặc môi trường đã được cập nhật.' });
    await clearWarehouseQueries(client);
    return;
  }
  if (state.signature === snapshot.signature) return;
  const warehouseId = state.identity === snapshot.identity && snapshot.compatible && snapshot.activeUser &&
    snapshot.warehouses.some((warehouse) => warehouse.id === state.warehouseId)
    ? state.warehouseId : null;
  await transition(client, snapshot, warehouseId);
}

export async function selectWarehouse(client: QueryClient, snapshot: WarehouseSnapshot, warehouseId: string) {
  const state = useWarehouseSelection.getState();
  if (client.isMutating() > 0) {
    useWarehouseSelection.setState({ notice: 'Đợi thao tác đang gửi hoàn tất trước khi đổi kho.' });
    return false;
  }
  if (state.transitioning || state.signature !== snapshot.signature || !snapshot.compatible ||
    !snapshot.activeUser || !snapshot.warehouses.some((warehouse) => warehouse.id === warehouseId)) return false;
  if (state.warehouseId === warehouseId) return true;
  useWarehouseSelection.setState({ notice: null });
  await transition(client, snapshot, warehouseId);
  return useWarehouseSelection.getState().warehouseId === warehouseId &&
    useWarehouseSelection.getState().signature === snapshot.signature;
}

export function hasWarehousePermission(profile: UserProfile | undefined, ready: boolean, permission: PermissionCode) {
  return ready && !!profile?.permissions.includes(permission);
}

export function warehouseQueryKey(resource: string, params?: unknown) {
  const state = useWarehouseSelection.getState();
  if (state.transitioning || !state.signature || !state.warehouseId)
    throw new Error('Chọn kho và xác minh quyền trước khi tải dữ liệu.');
  return ['warehouse', state.identity, state.warehouseId, state.revision, resource, params] as const;
}
