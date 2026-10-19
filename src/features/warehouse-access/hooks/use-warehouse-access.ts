import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { AppState, Platform } from 'react-native';

import { authApi } from '@/features/auth/auth.api';
import { subscribeAccessDenied } from '@/lib/api';

import { clearWarehouseQueries, profileQueryKey, reconcileWarehouseAccess,
  selectWarehouse, warehouseSnapshot } from '../warehouse-access';
import { suspendWarehouseAccess, useWarehouseSelection } from '../warehouse-access.store';

export function useWarehouseAccessState(enabled = true) {
  const client = useQueryClient();
  const profile = useQuery({
    queryKey: profileQueryKey,
    enabled,
    queryFn: ({ signal }) => authApi.profile(signal),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 60_000,
  });
  const snapshot = useMemo(() => profile.data ? warehouseSnapshot(profile.data) : null, [profile.data]);
  const selection = useWarehouseSelection();
  useEffect(() => {
    if (enabled && snapshot && profile.isSuccess) void reconcileWarehouseAccess(client, snapshot);
  }, [client, enabled, snapshot, profile.dataUpdatedAt, profile.isSuccess]);

  useEffect(() => {
    if (enabled && profile.isError) {
      suspendWarehouseAccess('Không xác minh được quyền. Kiểm tra kết nối và thử lại.');
      void clearWarehouseQueries(client);
    }
  }, [client, enabled, profile.isError]);

  const refresh = useCallback(async (accessDenied = false) => {
    if (!enabled) return;
    const current = useWarehouseSelection.getState();
    useWarehouseSelection.setState({ deniedSignature: accessDenied
      ? current.signature ?? current.deniedSignature : null });
    suspendWarehouseAccess('Đang xác minh lại kho và quyền truy cập…');
    await clearWarehouseQueries(client);
    await client.resetQueries({ queryKey: profileQueryKey, exact: true });
  }, [client, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = subscribeAccessDenied(() => { void refresh(true); });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    const onFocus = () => { void refresh(); };
    if (Platform.OS === 'web') globalThis.addEventListener?.('focus', onFocus);
    return () => {
      unsubscribe();
      subscription.remove();
      if (Platform.OS === 'web') globalThis.removeEventListener?.('focus', onFocus);
    };
  }, [enabled, refresh]);

  const validated = enabled && profile.isSuccess && !!snapshot?.compatible && snapshot.activeUser &&
    !selection.transitioning && selection.signature === snapshot.signature;
  const warehouse = validated
    ? snapshot.warehouses.find((candidate) => candidate.id === selection.warehouseId) ?? null : null;
  const choose = useCallback(async (id: string) => {
    if (!snapshot || !profile.isSuccess) return false;
    return selectWarehouse(client, snapshot, id);
  }, [client, snapshot, profile.isSuccess]);

  return { profile, snapshot, selection, validated, warehouse, ready: !!warehouse, refresh, choose };
}

export const WarehouseAccessContext = createContext<ReturnType<typeof useWarehouseAccessState> | null>(null);

export function useWarehouseAccess() {
  const context = useContext(WarehouseAccessContext);
  if (!context) throw new Error('WarehouseAccessContext is required.');
  return context;
}
