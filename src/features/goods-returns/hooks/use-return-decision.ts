import { useMutation, useQueryClient } from '@tanstack/react-query';

import { P } from '@/config/permission-codes';
import { useApprovalContext } from '@/features/approvals/hooks/use-approval-context';
import { ApiError } from '@/lib/api';
import { logApiError } from '@/lib/api-error';

import { goodsReturnsApi } from '../goods-returns.api';
import type { GoodsReturnRequest } from '../goods-returns.types';
import { GOODS_RETURNS_QUERY_KEY } from './use-goods-returns';

const REQUIRED = [P.GOODS_RETURN_REQUESTS_VIEW, P.GOODS_RETURN_REQUESTS_APPROVE] as const;

/** Approve/reject for a pending goods return; reason is null for an approval. */
export function useReturnDecision(request: GoodsReturnRequest | undefined) {
  const client = useQueryClient();
  const context = useApprovalContext();
  const { identity, warehouseId, revision } = context.access.selection;

  // The BE rejects the requester approving their own return, so hide the action instead of failing.
  const canDecide = !!request && request.status === 'Requested' && !!context.userId && request.createdBy !== context.userId &&
    REQUIRED.every(context.has);

  const mutation = useMutation<unknown, Error, { reason: string | null }>({
    retry: false,
    mutationFn: ({ reason }) => {
      if (!request) throw new Error('Phiếu trả chưa được tải.');
      const assertCurrent = () => context.assertCurrentContext(REQUIRED);
      assertCurrent();
      return reason === null ? goodsReturnsApi.approve(request.id, assertCurrent) : goodsReturnsApi.reject(request.id, reason, assertCurrent);
    },
    onError: (error) => {
      logApiError(error);
      // Stale or already-decided document: show the server message and reload the latest state.
      if (error instanceof ApiError && (error.statusCode === 404 || error.statusCode === 409))
        void client.invalidateQueries({ queryKey: GOODS_RETURNS_QUERY_KEY });
    },
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: GOODS_RETURNS_QUERY_KEY }),
      client.invalidateQueries({ queryKey: ['stock-issue-requests'] }),
      client.invalidateQueries({ queryKey: ['warehouse', identity, warehouseId, revision] }),
      client.invalidateQueries({ queryKey: ['notifications'] }),
      client.invalidateQueries({ queryKey: ['audit-logs'] }),
    ]),
  });

  const run = (reason: string | null) => mutation.mutateAsync({ reason }).then(() => true, () => false);

  return {
    canDecide,
    busy: mutation.isPending,
    error: mutation.error,
    approve: () => run(null),
    reject: (reason: string) => run(reason),
    dismiss: mutation.reset,
  };
}
