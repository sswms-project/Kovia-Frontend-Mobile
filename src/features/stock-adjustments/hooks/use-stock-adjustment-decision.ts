import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { P } from '@/config/permission-codes';
import { useApprovalContext } from '@/features/approvals/hooks/use-approval-context';
import { ApiError } from '@/lib/api';
import { logApiError } from '@/lib/api-error';

import { stockAdjustmentsApi } from '../stock-adjustments.api';
import { STOCK_ADJUSTMENTS_QUERY_KEY } from './use-stock-adjustments';

const REQUIRED = [P.STOCK_ADJUSTMENTS_VIEW, P.STOCK_ADJUSTMENTS_APPROVE] as const;

interface Decision { readonly reason: string | null; readonly selfApprovalAcknowledged: boolean }

/** Approve/reject for an adjustment voucher; the BE decides via allowed-actions (maker-checker, status). */
export function useStockAdjustmentDecision(id: string) {
  const client = useQueryClient();
  const context = useApprovalContext();
  const { identity, warehouseId, revision } = context.access.selection;
  const mayDecide = REQUIRED.every(context.has);

  const actions = useQuery({
    queryKey: [...STOCK_ADJUSTMENTS_QUERY_KEY, 'detail', id, 'allowed-actions'],
    queryFn: () => stockAdjustmentsApi.allowedActions(id),
    enabled: mayDecide,
  });
  const allowed = mayDecide ? actions.data?.allowedActions ?? [] : [];

  const mutation = useMutation<unknown, Error, Decision>({
    retry: false,
    mutationFn: ({ reason, selfApprovalAcknowledged }) => {
      const assertCurrent = () => context.assertCurrentContext(REQUIRED);
      assertCurrent();
      return reason === null
        ? stockAdjustmentsApi.approve(id, selfApprovalAcknowledged, assertCurrent)
        : stockAdjustmentsApi.reject(id, reason, assertCurrent);
    },
    onError: (error) => {
      logApiError(error);
      // Stock moved since the count or the voucher was already decided: reload before anyone retries.
      if (error instanceof ApiError && (error.statusCode === 404 || error.statusCode === 409))
        void client.invalidateQueries({ queryKey: STOCK_ADJUSTMENTS_QUERY_KEY });
    },
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: STOCK_ADJUSTMENTS_QUERY_KEY }),
      client.invalidateQueries({ queryKey: ['cycle-counts'] }),
      client.invalidateQueries({ queryKey: ['warehouse', identity, warehouseId, revision] }),
      client.invalidateQueries({ queryKey: ['notifications'] }),
      client.invalidateQueries({ queryKey: ['audit-logs'] }),
    ]),
  });

  const run = (decision: Decision) => mutation.mutateAsync(decision).then(() => true, () => false);

  return {
    canApprove: allowed.includes('Approve'),
    canReject: allowed.includes('Reject'),
    selfApprovalRequired: actions.data?.selfApprovalRequired ?? false,
    busy: mutation.isPending,
    error: mutation.error,
    approve: (selfApprovalAcknowledged: boolean) => run({ reason: null, selfApprovalAcknowledged }),
    reject: (reason: string) => run({ reason, selfApprovalAcknowledged: false }),
    dismiss: mutation.reset,
  };
}
