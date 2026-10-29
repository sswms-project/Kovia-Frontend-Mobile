import { useCallback, useMemo, useRef, useState } from 'react';
import { useIsFocused } from 'expo-router/react-navigation';
import { z } from 'zod';
import { P } from '@/config/permission-codes';
import { useNotificationRealtime } from '@/features/notifications/hooks/use-notification-realtime';
import type { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

const eventSchema = z.object({ transferId: nonEmptyDotNetGuidSchema('Mã phiếu không hợp lệ.') });

/** Editable workflows receive hints, never a background overwrite of quantities or scans. */
export function useTransferChanges(transferId: string, access: ReturnType<typeof useWarehouseAccess>, canView: boolean) {
  const focused = useIsFocused();
  const { identity, signature, revision, warehouseId } = access.selection;
  const key = JSON.stringify([identity, signature, revision, warehouseId, transferId]);
  const [pending, setPending] = useState<{ key: string; generation: number } | null>(null);
  const generation = useRef(0);
  const onChange = useCallback((event?: unknown) => {
    if (event !== undefined) {
      const parsed = eventSchema.safeParse(event);
      if (!parsed.success || parsed.data.transferId !== transferId) return;
    }
    setPending({ key, generation: ++generation.current });
  }, [key, transferId]);
  const transfer = useMemo(() => ({ id: transferId, onChange }), [transferId, onChange]);
  const connected = useNotificationRealtime(focused && canView && !!access.profile.data?.permissions.includes(P.NOTIFICATIONS_VIEW), identity, signature, undefined, transfer);
  return { changed: pending?.key === key, connected,
    capture: () => generation.current,
    accept: (seen: number) => { if (seen === generation.current) setPending(null); } };
}
