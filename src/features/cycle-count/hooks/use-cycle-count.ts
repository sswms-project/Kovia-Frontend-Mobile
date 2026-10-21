import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cycleCountApi, type RecordCountBody } from '../cycle-count.api';

export const CYCLE_COUNT_QUERY_KEY = ['cycle-count'] as const;

export function useCycleCountQuery(id: string) {
  return useQuery({
    queryKey: [...CYCLE_COUNT_QUERY_KEY, id, 'detail'],
    queryFn: () => cycleCountApi.get(id),
  });
}

export function useCycleCountActionsQuery(id: string) {
  return useQuery({
    queryKey: [...CYCLE_COUNT_QUERY_KEY, id, 'actions'],
    queryFn: () => cycleCountApi.getActions(id),
  });
}

/** Every mutation refetches detail and allowed-actions, including after a 409 from a changed count. */
export function useCycleCountMutations(id: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: [...CYCLE_COUNT_QUERY_KEY, id] });

  const start = useMutation({ mutationFn: () => cycleCountApi.start(id), onSettled: refresh });
  const submit = useMutation({ mutationFn: () => cycleCountApi.submit(id), onSettled: refresh });
  const record = useMutation({
    mutationFn: (variables: { itemId: string; body: RecordCountBody }) =>
      cycleCountApi.recordCount(id, variables.itemId, variables.body),
    onSettled: refresh,
  });

  return { start, submit, record };
}
