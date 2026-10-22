import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import type { InventoryStock } from '@/features/inventory/inventory.types';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { DiscrepancyComposer } from '../components/discrepancy-composer';
import { useDiscrepancyComposer } from '../hooks/use-discrepancy-composer';

export function ReportDiscrepancyAction({ stock, disabled }: { readonly stock: InventoryStock; readonly disabled: boolean }) {
  const selection = useWarehouseSelection();
  return <ReportAction key={`${selection.identity}:${selection.signature}:${selection.revision}:${stock.id}`} stock={stock} disabled={disabled} />;
}
function ReportAction({ stock, disabled }: { readonly stock: InventoryStock; readonly disabled: boolean }) {
  const state = useDiscrepancyComposer(stock, undefined, (id) => router.push({ pathname: '/catalog/discrepancies/[id]', params: { id } }));
  if (!state.canReport) return null;
  return <><Button label="Báo thiếu, thừa hoặc sai vị trí" variant="outline" disabled={disabled} onPress={state.begin} />
    <DiscrepancyComposer state={state} title="Báo chênh lệch tại kho" summary={`${stock.sku} · ${stock.slotCode} · ${stock.lotNumber ?? 'Không theo lô'} · ${stock.unitName ?? 'đơn vị cơ sở'}`} />
  </>;
}
