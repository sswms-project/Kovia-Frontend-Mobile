import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { P } from '@/config/permission-codes';
import { useApprovalContext } from '@/features/approvals/hooks/use-approval-context';
import { ApiError } from '@/lib/api';
import { logApiError } from '@/lib/api-error';

import { inboundRequestsApi } from '../inbound-requests.api';
import { INBOUND_REQUESTS_QUERY_KEY } from './use-inbound-requests';

const APPROVE_PERMISSIONS = [P.INBOUND_REQUESTS_VIEW, P.INBOUND_REQUESTS_APPROVE] as const;
const REJECT_PERMISSIONS = [P.INBOUND_REQUESTS_VIEW, P.INBOUND_REQUESTS_REJECT] as const;

interface Decision { readonly reason: string | null; readonly selfApprovalAcknowledged: boolean }

/** Approve/reject for an inbound request. The BE decides what is allowed (maker-checker, status, warehouse). */
export function useInboundRequestDecision(id: string) {
  const client = useQueryClient();
  const context = useApprovalContext();
  const { identity, warehouseId, revision } = context.access.selection;
  const mayDecide = context.has(P.INBOUND_REQUESTS_VIEW) &&
    (context.has(P.INBOUND_REQUESTS_APPROVE) || context.has(P.INBOUND_REQUESTS_REJECT));

  const actions = useQuery({
    queryKey: [...INBOUND_REQUESTS_QUERY_KEY, 'detail', id, 'allowed-actions'],
    queryFn: () => inboundRequestsApi.allowedActions(id),
    enabled: mayDecide,
  });

  const allowed = actions.data?.allowedActions ?? [];
  const canApprove = context.has(P.INBOUND_REQUESTS_APPROVE) && allowed.includes('Approve');
  const canReject = context.has(P.INBOUND_REQUESTS_REJECT) && allowed.includes('Reject');

  const mutation = useMutation<unknown, Error, Decision>({
    retry: false,
    mutationFn: ({ reason, selfApprovalAcknowledged }) => {
      const version = actions.data?.currentVersion;
      if (!version) throw new Error('Yêu cầu chưa có phiên bản. Vui lòng tải lại.');
      const required = reason === null ? APPROVE_PERMISSIONS : REJECT_PERMISSIONS;
      const assertCurrent = () => context.assertCurrentContext(required);
      assertCurrent();
      const body = { expectedVersion: version, selfApprovalAcknowledged };
      return reason === null
        ? inboundRequestsApi.approve(id, body, assertCurrent)
        : inboundRequestsApi.reject(id, { ...body, reason }, assertCurrent);
    },
    onError: (error) => {
      logApiError(error);
      // Version conflict or already decided: reload so the user sees the latest state before retrying.
      if (error instanceof ApiError && (error.statusCode === 404 || error.statusCode === 409))
        void client.invalidateQueries({ queryKey: INBOUND_REQUESTS_QUERY_KEY });
    },
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: INBOUND_REQUESTS_QUERY_KEY }),
      client.invalidateQueries({ queryKey: ['warehouse', identity, warehouseId, revision] }),
      client.invalidateQueries({ queryKey: ['warehouse-tasks'] }),
      client.invalidateQueries({ queryKey: ['dashboard-overview'] }),
      client.invalidateQueries({ queryKey: ['notifications'] }),
    ]),
  });

  const run = (decision: Decision) => mutation.mutateAsync(decision).then(() => true, () => false);

  return {
    canApprove,
    canReject,
    selfApprovalRequired: actions.data?.selfApprovalRequired ?? false,
    busy: mutation.isPending,
    error: mutation.error,
    approve: (selfApprovalAcknowledged: boolean) => run({ reason: null, selfApprovalAcknowledged }),
    reject: (reason: string, selfApprovalAcknowledged: boolean) => run({ reason, selfApprovalAcknowledged }),
    dismiss: mutation.reset,
  };
}
