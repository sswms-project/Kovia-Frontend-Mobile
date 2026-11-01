import { router } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { useScreenExit } from '@/hooks/use-screen-exit';
import { useAuth } from '@/features/auth/auth.store';
import { taskScopeMatches } from '@/features/my-tasks/my-tasks';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { canContinueTransferPutaway } from '../transfer-receiving';
import type { useTransferReceiving } from './use-transfer-receiving';

/** Only a confirmed receipt submission may advance this mounted screen to its next assigned phase. */
export function useTransferReceiptHandoff(state: ReturnType<typeof useTransferReceiving>, transferId: string, shipmentId: string) {
  const focused = useIsFocused();
  const exit = useScreenExit();
  const { identity, warehouseId, revision, signature } = state.access.selection;
  const key = JSON.stringify([identity, warehouseId, revision, signature, transferId, shipmentId]);
  const [submitted, setSubmitted] = useState<string | null>(null);
  useEffect(() => {
    if (submitted !== key || !focused || exit?.leaving || state.mode !== 'Receive' || !state.canView ||
      !state.detail.isSuccess || state.detail.isFetching || state.detail.isError || state.realtime.changed || !state.data ||
      !identity || !warehouseId || !signature || !useAuth.getState().signedIn ||
      !taskScopeMatches({ identity, warehouseId, revision, signature }, useWarehouseSelection.getState())) return;
    if (!canContinueTransferPutaway(state.data.document, state.data.receipt, state.access.profile.data?.id,
      warehouseId, state.access.profile.data?.permissions ?? [])) return;
    const current = exit?.capture() ?? (() => true);
    const frame = requestAnimationFrame(() => {
      if (!current() || !useAuth.getState().signedIn ||
        !taskScopeMatches({ identity, warehouseId, revision, signature }, useWarehouseSelection.getState())) return;
      setSubmitted(null);
      router.replace({ pathname: '/(account)/transfer-putaway/[id]', params: { id: transferId, shipmentId } });
    });
    return () => cancelAnimationFrame(frame);
  }, [submitted, key, focused, exit, state, identity, warehouseId, revision, signature, transferId, shipmentId]);
  return { submitted: () => setSubmitted(key) };
}
