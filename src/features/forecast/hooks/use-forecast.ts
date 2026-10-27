import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { P } from '@/config/permission-codes';
import { useCan } from '@/features/auth/hooks/use-can';
import { useInventoryWorkspace } from '@/features/inventory/hooks/use-inventory-workspace';
import { warehouseQueryKey } from '@/features/warehouse-access/warehouse-access';
import { logApiError } from '@/lib/api-error';

import { forecastApi } from '../forecast.api';
import type { CreateForecastRunBody, ForecastRun, RejectForecastSuggestionBody } from '../forecast.types';

const FORECAST_QUERY_KEY = ['forecast'] as const;
const POLL_INTERVAL_MS = 3_000;

function isRunInProgress(run: ForecastRun | undefined) {
  return run?.status === 'Pending' || run?.status === 'Running';
}

export function useForecastRunsQuery() {
  const workspace = useInventoryWorkspace();
  const { canView, warehouseId } = workspace;
  const canManage = useCan(P.PRODUCTS_CONFIGURE_POLICY);
  const query = useQuery({
    queryKey: canView ? warehouseQueryKey('forecast', { list: true }) : [...FORECAST_QUERY_KEY, 'disabled'],
    enabled: canView,
    queryFn: ({ signal }) => forecastApi.listRuns(warehouseId, signal),
    staleTime: 15_000, retry: false,
  });
  return { ...query, workspace, canManage };
}

export function useForecastRunQuery(runId: string | null) {
  return useQuery({
    queryKey: [...FORECAST_QUERY_KEY, 'run', runId],
    enabled: runId !== null,
    queryFn: ({ signal }) => forecastApi.getRun(runId ?? '', signal),
    refetchInterval: (query) => (isRunInProgress(query.state.data) ? POLL_INTERVAL_MS : false),
    staleTime: 10_000, retry: false,
  });
}

/** Creates the run and starts it; the detail query then polls until it settles. */
export function useStartForecastRunMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async (body: CreateForecastRunBody) => {
      const runId = await forecastApi.createRun(body);
      await forecastApi.executeRun(runId);
      return runId;
    },
    onError: logApiError,
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: FORECAST_QUERY_KEY }); },
  });
}

export function useEvaluateForecastRunMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: (runId: string) => forecastApi.evaluateRun(runId),
    onError: logApiError,
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: FORECAST_QUERY_KEY }); },
  });
}

export function useRejectForecastSuggestionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: ({ suggestionId, body }: { suggestionId: string; body: RejectForecastSuggestionBody }) => forecastApi.rejectSuggestion(suggestionId, body),
    onError: logApiError,
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: FORECAST_QUERY_KEY }); },
  });
}
