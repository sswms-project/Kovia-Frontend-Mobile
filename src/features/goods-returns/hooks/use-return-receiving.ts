import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { P } from '@/config/permission-codes';
import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { stockIssueRequestsApi } from '@/features/stock-issue-requests/stock-issue-requests.api';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { profileQueryKey, warehouseSnapshot } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { API_BASE_URL } from '@/lib/api';
import { logApiError } from '@/lib/api-error';
import { formDraftStorage } from '@/lib/form-draft-storage';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { goodsReturnsApi } from '../goods-returns.api';
import { useGoodsReturnQuery } from './use-goods-returns';

export function useReturnReceiving(id: string) {
  const access = useWarehouseAccess(); const client = useQueryClient(); const query = useGoodsReturnQuery(id);
  const { identity, warehouseId, revision, signature } = access.selection;
  const key = JSON.stringify([identity, warehouseId, revision, signature, id]);
  const storageScope = JSON.stringify([API_BASE_URL, identity, warehouseId, 'return-receiving', id]);
  const request = query.data; const lock = useRef(false);
  const [confirmation, setConfirmation] = useState<{ key: string; fingerprint: string } | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const readable = access.ready && !!access.profile.data?.permissions.includes(P.STOCK_ISSUE_REQUESTS_VIEW) && !!request;
  const original = useQuery({ queryKey: ['warehouse', identity, warehouseId, revision, 'return-source', id],
    enabled: readable, retry: false, queryFn: async () => {
      nonEmptyDotNetGuidSchema('Phiếu xuất gốc không hợp lệ.').parse(request!.stockIssueRequestId);
      const document = await stockIssueRequestsApi.get(request!.stockIssueRequestId);
      if (document.id !== request!.stockIssueRequestId || document.warehouseId !== warehouseId)
        throw new Error('Chọn đúng kho của phiếu xuất gốc để nhận hàng trả.');
      return document;
    } });
  const attempt = useQuery({ queryKey: ['return-attempt', storageScope], enabled: access.ready && !!request,
    queryFn: async () => {
      if (request?.status === 'Restocked') { await formDraftStorage.remove(storageScope); return false; }
      return !!(await formDraftStorage.read(storageScope))?.pending;
    }, retry: false });
  const locationIds = request?.items.filter(item => item.condition !== 'Scrap').flatMap(item => item.restockSlotId ? [item.restockSlotId] : []) ?? [];
  const locations = useQuery({ queryKey: ['warehouse', identity, warehouseId, revision, 'return-locations', locationIds],
    enabled: readable && original.isSuccess && !!access.profile.data?.permissions.includes(P.WAREHOUSES_VIEW), retry: false,
    queryFn: ({ signal }) => goodsReturnsApi.locations(warehouseId!, locationIds, signal) });
  const canReceive = readable && query.isSuccess && !query.isFetching && original.isSuccess && !original.isFetching &&
    locations.isSuccess && !locations.isFetching && locationIds.every(id => locations.data.some(item => item.id === id && item.active)) &&
    attempt.isSuccess && !attempt.data && submitted !== key && request?.status === 'Approved' && !!request.items.length &&
    request.items.every(item => ['Good', 'Damaged', 'Expired', 'Scrap'].includes(item.condition) && item.quantity > 0 &&
      (item.condition === 'Scrap' || !!item.restockSlotId)) && !!access.profile.data?.permissions.includes(P.GOODS_RETURN_REQUESTS_RESTOCK);
  function assertCurrent() {
    const selection = useWarehouseSelection.getState(); const profile = client.getQueryData<UserProfile>(profileQueryKey);
    const snapshot = profile ? warehouseSnapshot(profile) : null;
    if (!useAuth.getState().signedIn || !snapshot?.activeUser || snapshot.signature !== signature || selection.identity !== identity ||
      selection.warehouseId !== warehouseId || selection.revision !== revision || selection.signature !== signature ||
      !profile?.permissions.includes(P.GOODS_RETURN_REQUESTS_RESTOCK) || !profile.permissions.includes(P.GOODS_RETURN_REQUESTS_VIEW) ||
      !profile.permissions.includes(P.STOCK_ISSUE_REQUESTS_VIEW) || !profile.permissions.includes(P.WAREHOUSES_VIEW) || original.data?.warehouseId !== warehouseId)
      throw new Error('Kho, tài khoản hoặc quyền nhận hàng trả đã thay đổi.');
  }
  const mutation = useMutation<unknown, Error, void>({ retry: false, mutationFn: async () => {
    assertCurrent();
    if (!canReceive || confirmation?.key !== key) throw new Error('Vui lòng tải lại và xác nhận phiếu.');
    const latest = await goodsReturnsApi.get(id); assertCurrent();
    if (JSON.stringify(latest) !== confirmation.fingerprint || latest.status !== 'Approved') throw new Error('Phiếu trả đã thay đổi. Vui lòng tải lại.');
    await formDraftStorage.write({ scope: storageScope, version: 'legacy-restock', values: {}, pending: true }, assertCurrent);
    assertCurrent(); setSubmitted(key);
    return goodsReturnsApi.restock(id, assertCurrent);
  }, onError: logApiError, onSuccess: async () => {
    await formDraftStorage.remove(storageScope); setConfirmation(null);
    await Promise.all([client.invalidateQueries({ queryKey: ['goods-return-requests'] }),
      client.invalidateQueries({ queryKey: ['warehouse', identity, warehouseId, revision] }),
      client.invalidateQueries({ queryKey: ['notifications'] }), client.invalidateQueries({ queryKey: ['audit-logs'] }),
      client.invalidateQueries({ queryKey: ['return-attempt', storageScope] })]);
  } });
  return { query, original, locations, access, canReceive, mutation, attempt,
    uncertain: (submitted === key && !mutation.isSuccess) || !!attempt.data,
    confirmation: confirmation?.key === key ? confirmation : null,
    begin: () => { if (canReceive && request) { mutation.reset(); setConfirmation({ key, fingerprint: JSON.stringify(request) }); } },
    cancel: () => { if (!lock.current) setConfirmation(null); },
    confirm: async () => { if (lock.current) return; lock.current = true; try { await mutation.mutateAsync(); } catch { /* No automatic replay: this legacy API has no commandId. */ } finally { lock.current = false; } },
  };
}
