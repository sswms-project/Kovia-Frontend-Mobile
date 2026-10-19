import { create } from 'zustand';

interface WarehouseSelection {
  identity: string | null;
  signature: string | null;
  warehouseId: string | null;
  revision: number;
  transitioning: boolean;
  notice: string | null;
  deniedSignature: string | null;
}

// Only client selection metadata lives here; profile and permissions stay in Query.
export const useWarehouseSelection = create<WarehouseSelection>(() => ({
  identity: null,
  signature: null,
  warehouseId: null,
  revision: 0,
  transitioning: false,
  notice: null,
  deniedSignature: null,
}));

export function resetWarehouseSelection() {
  useWarehouseSelection.setState((state) => ({
    identity: null,
    signature: null,
    warehouseId: null,
    transitioning: false,
    notice: null,
    deniedSignature: null,
    revision: state.revision + 1,
  }));
}

export function suspendWarehouseAccess(notice: string) {
  useWarehouseSelection.setState((state) => ({
    signature: null,
    transitioning: true,
    notice,
    revision: state.revision + 1,
  }));
}
