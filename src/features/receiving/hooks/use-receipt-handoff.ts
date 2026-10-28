import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { P } from '@/config/permission-codes';
import { useScreenExit } from '@/hooks/use-screen-exit';
import type { Receipt } from '../receiving.schema';
import type { ReceiptContext } from './use-receipt-context';

export function canContinueToPutaway(receipt: Receipt, userId: string, actions: { currentVersion: string | null; allowedActions: readonly string[] }) {
  return receipt.status === 'Approved' && receipt.putAwayAssignedTo === userId && !!userId &&
    !receipt.keptAtReceiving && !!receipt.receivingSlotId && !!receipt.arrivalStockPostedAt &&
    !receipt.putAwayTaskRequiresReconciliation && !receipt.putAwayTaskCancelledAt &&
    receipt.putAwayTaskExecutionStatus !== 'Cancelled' && receipt.putAwayTaskExecutionStatus !== 'Completed' &&
    receipt.items.some(item => item.remainingPutAwayQuantity > 0) &&
    actions.currentVersion === receipt.version && actions.allowedActions.includes('PutAway');
}

/** Follow an approval only while the employee stays on this receiving screen. */
export function useReceiptHandoff(context: ReceiptContext, paused: boolean) {
  const exit = useScreenExit();
  const exitRef = useRef(exit);
  useEffect(() => { exitRef.current = exit; }, [exit]);
  const latest = useRef(context);
  useEffect(() => { latest.current = context; }, [context]);
  const followed = useRef<string | null>(null);
  const receipt = context.receipt.data;
  const watching = context.mode === 'receiving' && context.canView && !!context.receiptId && !paused &&
    !exit?.leaving && (receipt?.status === 'PendingApproval' || receipt?.status === 'Approved') &&
    !receipt.keptAtReceiving && !receipt.putAwayTaskCancelledAt && !receipt.putAwayTaskRequiresReconciliation &&
    receipt.putAwayTaskExecutionStatus !== 'Cancelled' && receipt.putAwayTaskExecutionStatus !== 'Completed' &&
    receipt.items.some(item => item.remainingPutAwayQuantity > 0);
  const key = `${context.contextKey}:${context.receiptId}`;
  useFocusEffect(useCallback(() => {
    if (!watching) return;
    let active = true;
    let foreground = AppState.currentState === 'active';
    let running = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function cancelTimer() { if (timer) clearTimeout(timer); timer = undefined; }
    async function check() {
      if (!active || !foreground || running || followed.current === key) return;
      running = true;
      const canNavigate = exitRef.current?.capture() ?? (() => true);
      try {
        latest.current.assertCurrent(P.GOODS_RECEIPTS_VIEW);
        const detail = await latest.current.receipt.refetch();
        if (!active || !foreground || detail.isError || !detail.data) return;
        const actions = await latest.current.actions.refetch();
        if (!active || !foreground || !canNavigate() || actions.isError || !actions.data) return;
        const current = latest.current;
        current.assertCurrent(P.GOODS_RECEIPTS_PUTAWAY);
        if (`${current.contextKey}:${current.receiptId}` !== key || detail.data.id !== current.receiptId ||
          detail.data.warehouseId !== current.scope?.warehouseId || detail.data.inboundRequestId !== current.documentId ||
          detail.data.receivingAssignedTo !== current.userId || !canContinueToPutaway(detail.data, current.userId, actions.data)) return;
        if (!canNavigate()) return;
        followed.current = key;
        router.replace({ pathname: '/(account)/putaway/[id]', params: { id: detail.data.id } });
      } catch {
        // Query errors remain visible on the receipt screen; revoked scope/permissions prevent navigation.
      } finally {
        running = false;
        if (active && foreground && followed.current !== key) timer = setTimeout(() => { void check(); }, 5000);
      }
    }
    const subscription = AppState.addEventListener('change', state => {
      foreground = state === 'active'; cancelTimer();
      if (foreground) void check();
    });
    void check();
    return () => { active = false; cancelTimer(); subscription.remove(); };
  }, [watching, key]));
  return { watching };
}
