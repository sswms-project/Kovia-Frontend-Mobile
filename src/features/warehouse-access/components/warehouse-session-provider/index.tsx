import type { ReactNode } from 'react';

import { WarehouseAccessContext, useWarehouseAccessState } from '../../hooks/use-warehouse-access';

export function WarehouseSessionProvider({ signedIn, children }: { readonly signedIn: boolean; readonly children: ReactNode }) {
  const access = useWarehouseAccessState(signedIn);
  return <WarehouseAccessContext value={access}>{children}</WarehouseAccessContext>;
}
