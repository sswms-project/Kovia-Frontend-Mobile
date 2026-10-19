import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { receivingApi } from '../receiving.api';
import { locationSearchSchema, type LocationSearch, type ReceivingLocation, type SelectedReceivingLocation } from '../receiving.schema';
import type { ReceiptContext } from './use-receipt-context';
import type { useReceiptExecution } from './use-receipt-execution';

export function useReceivingLocations(context: ReceiptContext) {
  const [stored, setStored] = useState<{ key: string; open: boolean; search: string; page: number; isolation: boolean; selected: SelectedReceivingLocation | null } | null>(null);
  const key = `${context.contextKey}:${context.receiptId}`;
  const state = stored?.key === key ? stored : { key, open: false, search: '', page: 1, isolation: false, selected: null };
  const form = useForm<LocationSearch>({ resolver: zodResolver(locationSearchSchema), defaultValues: { searchTerm: '' } });
  const query = useQuery({
    queryKey: [...context.prefix, 'locations', state.search, state.page, state.isolation], enabled: context.canView && state.open,
    queryFn: ({ signal }) => receivingApi.locations(context.scope!.warehouseId, state.search, state.page, signal, state.isolation), retry: false,
  });
  return { ...state, isOpen: state.open, form, query,
    open: () => { form.reset({ searchTerm: state.search }); setStored({ ...state, open: true, isolation: false }); },
    openIsolation: () => { form.reset({ searchTerm: '' }); setStored({ ...state, open: true, isolation: true, search: '', page: 1 }); },
    close: () => setStored({ ...state, open: false }),
    search: () => form.handleSubmit(value => setStored({ ...state, search: value.searchTerm, page: 1 }))(),
    page: state.page,
    changePage: (page: number) => setStored({ ...state, page }),
    choose: (location: ReceivingLocation) => {
      if (query.isSuccess && !query.isFetching && query.data.items.some(item => item.id === location.id))
        setStored({ ...state, selected: location, open: false });
    },
    chooseSuggested: (result: ReturnType<typeof useReceiptExecution>['suggestions']['data'], slotId: string) => {
      if (!result || result.key !== context.contextKey || result.version !== context.receipt.data?.version || !context.allowed('PutAway')) return;
      const suggestion = result.data.items.flatMap(item => item.suggestions).find(item => item.slotId === slotId);
      if (suggestion && suggestion.slotId !== context.receipt.data.receivingSlotId)
        setStored({ ...state, selected: { id: suggestion.slotId, slotCode: suggestion.slotCode,
          displayPath: `${suggestion.zoneName} · ${suggestion.rackCode} · ${suggestion.slotCode}` }, open: false });
    },
  };
}
