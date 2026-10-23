export interface LayoutBox {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color?: string | null;
}
export interface LayoutZone extends LayoutBox { readonly zoneCode: string; readonly zoneName: string }
export interface LayoutRack extends LayoutBox {
  readonly zoneId: string;
  readonly rackCode: string;
  readonly rackName?: string;
  readonly capacity?: number;
  readonly currentOccupancy?: number;
}
export interface LayoutSlot {
  readonly id: string;
  readonly zoneId: string;
  readonly rackId: string;
  readonly slotCode: string;
  readonly occupancyStatus?: string;
}
export interface LayoutDecoration extends LayoutBox { readonly type: string; readonly label?: string | null }
export interface LayoutScene {
  readonly warehouseId: string;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly zones: readonly LayoutZone[];
  readonly racks: readonly LayoutRack[];
  readonly slots: readonly LayoutSlot[];
  readonly decorations: readonly LayoutDecoration[];
}
export type LocationType = 'Zone' | 'Rack' | 'Slot';
export type OccupancyStatus = 'Vacant' | 'Occupied' | 'Reserved' | 'Full';
export interface LocationItem {
  readonly id: string;
  readonly type: LocationType;
  readonly code: string;
  readonly name?: string | null;
  readonly lifecycleStatus?: string;
  readonly occupancyStatus?: OccupancyStatus | null;
  readonly zoneCode?: string | null;
  readonly rackCode?: string | null;
  readonly capacity?: number | null;
  readonly currentOccupancy?: number | null;
  readonly barcodeValue?: string | null;
}
export interface LocationSearchParams {
  readonly searchText?: string;
  readonly type?: LocationType;
  readonly occupancyStatus?: OccupancyStatus;
}
