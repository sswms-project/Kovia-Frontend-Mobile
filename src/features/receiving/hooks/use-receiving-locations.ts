import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { formatInventoryLocation } from '@/features/inventory/inventory.labels';

import { receivingApi } from '../receiving.api';
import { locationSearchSchema, type LocationSearch, type ReceivingLocation, type SelectedReceivingLocation } from '../receiving.schema';
import type { ReceiptContext } from './use-receipt-context';
import type { useReceiptExecution } from './use-receipt-execution';

export function useReceivingLocations(context: ReceiptContext) {
  const [stored, setStored] = useState<{ key: string; open: boolean; search: string; page: number; isolation: boolean; selected: SelectedReceivingLocation | null } | null>(null);
  const key = `${context.contextKey}:${context.receiptId}`;
  const state = stored?.key === key ? stored : { key, open: false, search: '', page: 1, isolation: false, selected: null };
  const form = useForm<LocationSearch>({ resolver: zodResolver(locationSearchSchema), defaultValues: { searchTerm: '' } });
  const autoReceiving = context.mode === 'receiving' && !context.receipt.data?.arrivalConfirmedAt && !state.isolation;
  const query = useQuery({
    queryKey: [...context.prefix, 'locations', state.search, state.page, state.isolation, context.mode], enabled: context.canView && (state.open || autoReceiving),
    queryFn: ({ signal }) => receivingApi.locations(context.scope!.warehouseId, state.search, state.page, signal, state.isolation,
      context.mode === 'putaway' && !state.isolation), retry: false,
  });
  const selected = state.selected ?? (context.canView && autoReceiving && !state.search && state.page === 1 && query.isSuccess && !query.isFetching
    ? query.data.items.find(item => item.isSuggested) ?? null : null);
  return { ...state, selected, isOpen: state.open, form, query,
    open: () => { form.reset({ searchTerm: state.isolation ? '' : state.search });
      setStored({ ...state, selected: state.isolation ? null : selected, open: true, isolation: false,
        ...(state.isolation ? { search: '', page: 1 } : {}) }); },
    openIsolation: () => { form.reset({ searchTerm: '' }); setStored({ ...state, selected: state.isolation ? selected : null,
      open: true, isolation: true, search: '', page: 1 }); },
    close: () => setStored({ ...state, open: false }),
    search: () => form.handleSubmit(value => setStored({ ...state, selected, search: value.searchTerm, page: 1 }))(),
    page: state.page,
    changePage: (page: number) => setStored({ ...state, selected, page }),
    choose: (location: ReceivingLocation) => {
      if (query.isSuccess && !query.isFetching && query.data.items.some(item => item.id === location.id))
        setStored({ ...state, selected: location, open: false });
    },
    chooseSuggested: (result: ReturnType<typeof useReceiptExecution>['suggestions']['data'], slotId: string) => {
      if (!result || result.key !== context.contextKey || result.version !== context.receipt.data?.version || !context.allowed('PutAway')) return;
      const suggestion = result.data.items.flatMap(item => item.suggestions).find(item => item.slotId === slotId);
      if (suggestion && suggestion.slotId !== context.receipt.data.receivingSlotId)
        setStored({ ...state, selected: { id: suggestion.slotId, slotCode: suggestion.slotCode,
          displayPath: `${suggestion.zoneName} · ${formatInventoryLocation(suggestion)}` }, open: false });
    },
  };
}
