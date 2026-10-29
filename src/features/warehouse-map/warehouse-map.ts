import { z } from 'zod';

import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

const id = nonEmptyDotNetGuidSchema('Mã sơ đồ không hợp lệ.');
const number = z.number().finite();
const physical = { storageCapacity: number.nullable(), storageCapacityUnit: z.string().nullable(),
  physicalLength: number.nullable(), physicalLengthUnit: z.string().nullable(),
  physicalWidth: number.nullable(), physicalWidthUnit: z.string().nullable(),
  physicalHeight: number.nullable(), physicalHeightUnit: z.string().nullable() };
const geometry = { x: number.nullable(), y: number.nullable(), width: number.nullable(), height: number.nullable(),
  rotation: number, zIndex: z.number().int(), color: z.string().nullable() };
const capacity = { capacityType: z.string().nullable(), capacity: number.nullable(), capacityUnitId: id.nullable(),
  capacityUnitName: z.string().nullable(), capacityUnitSymbol: z.string().nullable(), currentOccupancy: number.nullable(),
  capacityUsed: number.nullable(), remainingCapacity: number.nullable(), utilizationPercent: number.nullable(),
  requiresCapacityConfiguration: z.boolean(), onHandQuantity: number, skuCount: z.number().int() };
const rackSchema = z.object({ id, zoneId: id, zoneCode: z.string(), rackCode: z.string(), rackName: z.string(),
  description: z.string().nullable(), status: z.string(), storageMode: z.string(), allowsMixedProducts: z.boolean().nullable(),
  layoutShape: z.string(), defaultSlotId: id.nullable(), rowVersion: z.string(), ...physical, ...capacity, ...geometry });
export const warehouseMapSchema = z.object({ warehouseId: id, version: z.number().int().nonnegative(),
  canvas: z.object({ width: number.positive(), height: number.positive(), gridSize: number.positive() }),
  zones: z.array(z.object({ id, zoneCode: z.string(), zoneName: z.string(), description: z.string().nullable(),
    status: z.string(), rowVersion: z.string(), isDefaultReceivingPoint: z.boolean(), isDefaultIsolationPoint: z.boolean(),
    isDefaultOutboundStagingPoint: z.boolean(), ...physical, ...geometry })),
  racks: z.array(rackSchema),
  slots: z.array(z.object({ id, zoneId: id, rackId: id, slotCode: z.string(), slotName: z.string(),
    description: z.string().nullable(), occupancyStatus: z.string(), isActive: z.boolean(),
    isOutboundStaging: z.boolean(), isIsolationPoint: z.boolean(), allowsMixedProducts: z.boolean(),
    rowVersion: z.string(), ...physical, ...capacity })),
  decorations: z.array(z.object({ id, type: z.string(), label: z.string(), x: number, y: number,
    width: number.positive(), height: number.positive(), rotation: number, zIndex: z.number().int(), color: z.string().nullable() })),
});
export type WarehouseMap = z.infer<typeof warehouseMapSchema>;
export type MapRack = z.infer<typeof rackSchema>;
export interface PlacedRack extends MapRack { x: number; y: number; width: number; height: number }

export function placedRack(rack: MapRack): rack is PlacedRack {
  return rack.x !== null && rack.y !== null && rack.width !== null && rack.height !== null && rack.width > 0 && rack.height > 0;
}

/** Resolve by stable slot IDs, including rack-level default slots absent from scene.slots. */
export function locateMapSlot(scene: WarehouseMap, slotId: string) {
  const same = (value: string | null) => value?.toLowerCase() === slotId.toLowerCase();
  const slots = scene.slots.filter(slot => same(slot.id));
  const racks = scene.racks.filter(rack => same(rack.defaultSlotId) || slots.some(slot =>
    slot.rackId.toLowerCase() === rack.id.toLowerCase() && slot.zoneId.toLowerCase() === rack.zoneId.toLowerCase()));
  if (racks.length !== 1 || slots.length > 1) return null;
  const rack = racks[0];
  const zone = scene.zones.find(item => item.id.toLowerCase() === rack.zoneId.toLowerCase());
  if (!zone || rack.status !== 'Active' || zone.status !== 'Active' || slots.some(slot => !slot.isActive)) return null;
  return { rack, path: [zone.zoneCode, rack.rackCode, slots[0]?.slotCode ?? 'Ô mặc định của kệ'].join(' / ') };
}

export function mapFocus(scene: WarehouseMap, rack: PlacedRack | null) {
  if (!rack) return `0 0 ${scene.canvas.width} ${scene.canvas.height}`;
  // Match FE geometry: rotation is around the rectangle centre, not its upper-left corner.
  const radians = rack.rotation * Math.PI / 180;
  const width = Math.abs(rack.width * Math.cos(radians)) + Math.abs(rack.height * Math.sin(radians));
  const height = Math.abs(rack.width * Math.sin(radians)) + Math.abs(rack.height * Math.cos(radians));
  const margin = Math.max(scene.canvas.gridSize * 2, width / 2, height / 2);
  const viewWidth = Math.min(scene.canvas.width, width + margin * 2);
  const viewHeight = Math.min(scene.canvas.height, height + margin * 2);
  const x = Math.max(0, Math.min(scene.canvas.width - viewWidth, rack.x + rack.width / 2 - viewWidth / 2));
  const y = Math.max(0, Math.min(scene.canvas.height - viewHeight, rack.y + rack.height / 2 - viewHeight / 2));
  return `${x} ${y} ${viewWidth} ${viewHeight}`;
}
