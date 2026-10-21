import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { transferTasksApi } from '../transfer-tasks.api';
import type { ReceiptBody, RecordPickBody } from '../transfer-tasks.types';

export const TRANSFER_TASKS_QUERY_KEY = ['transfer-tasks'] as const;

export function useTransferPickSheetQuery(transferId: string, shipmentId: string) {
  return useQuery({
    queryKey: [...TRANSFER_TASKS_QUERY_KEY, 'pick-sheet', transferId, shipmentId],
    queryFn: () => transferTasksApi.getPickSheet(transferId, shipmentId),
  });
}

export function useTransferReceiveSheetQuery(transferId: string, shipmentId: string) {
  return useQuery({
    queryKey: [...TRANSFER_TASKS_QUERY_KEY, 'receive-sheet', transferId, shipmentId],
    queryFn: () => transferTasksApi.getReceiveSheet(transferId, shipmentId),
  });
}

/** Mutations refetch the sheet after every attempt: a 409 or a timeout means it may have changed. */
export function useTransferTaskMutations(transferId: string, shipmentId: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: TRANSFER_TASKS_QUERY_KEY });

  const recordPick = useMutation({
    mutationFn: (body: RecordPickBody) => transferTasksApi.recordPick(transferId, shipmentId, body),
    onSettled: refresh,
  });
  const completePicking = useMutation({
    mutationFn: (expectedVersion: string) => transferTasksApi.completePicking(transferId, shipmentId, expectedVersion),
    onSettled: refresh,
  });
  const submitReceipt = useMutation({
    mutationFn: (body: ReceiptBody) => transferTasksApi.submitReceipt(transferId, shipmentId, body),
    onSettled: refresh,
  });
  return { recordPick, completePicking, submitReceipt };
}
