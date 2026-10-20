import { randomUUID } from 'expo-crypto';

export interface WarehouseCommandMemory { content: string; commandId: string }
export function warehouseCommand(previous: WarehouseCommandMemory | null, payload: unknown): WarehouseCommandMemory {
  const content = JSON.stringify(payload);
  return previous?.content === content ? previous : { content, commandId: randomUUID() };
}
