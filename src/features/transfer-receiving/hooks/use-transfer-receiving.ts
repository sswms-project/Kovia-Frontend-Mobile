import { useQuery, useQueryClient } from '@tanstack/react-query';

import { P } from '@/config/permission-codes';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { getApiErrorKind } from '@/lib/api-error';

import { useTransferChanges } from '@/features/transfer-picking/hooks/use-transfer-changes';
import { TransferDestinationScopeError } from '../transfer-receiving';
import { transferReceivingApi } from '../transfer-receiving.api';
import type { TransferReceivingMode } from '../transfer-receiving.schema';

export function useTransferReceiving(transferId: string, shipmentId: string, mode: TransferReceivingMode) {
  const access = useWarehouseAccess();
  const client = useQueryClient();
  const validId = [transferId, shipmentId].every(value => nonEmptyDotNetGuidSchema('Mã điều chuyển không hợp lệ.').safeParse(value).success);
  const canView = validId && access.ready && !!access.profile.data?.permissions.includes(P.TRANSFERS_VIEW);
  const { identity, warehouseId, revision, signature } = access.selection;
  const prefix = ['warehouse', identity, warehouseId, revision, 'transfer-receiving', transferId, shipmentId, mode];
  const detail = useQuery({ queryKey: [...prefix, signature], enabled: canView, retry: false, staleTime: 0,
    queryFn: ({ signal }) => transferReceivingApi.load(transferId, shipmentId, warehouseId!, access.profile.data!.id, mode, signal) });
  const realtime = useTransferChanges(transferId, access, canView);
  const lostAccess = detail.error instanceof TransferDestinationScopeError ||
    ['unauthorized', 'forbidden', 'notFound'].includes(getApiErrorKind(detail.error));
  return { realtime, access, validId, canView, detail, mode, data: canView && !lostAccess ? detail.data : undefined,
    refresh: async () => { const seen = realtime.capture(); await client.invalidateQueries({ queryKey: prefix }); if (client.getQueryState([...prefix, signature])?.status === 'success') realtime.accept(seen); },
  };
}
