import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { P } from '@/config/permission-codes';
import type { WarehouseTask } from '../my-tasks.schema';

import { MyTaskList, TaskActionDialog } from '../components/task-list';
import { useMyTasks } from '../hooks/use-my-tasks';

export function MyTasksScreen() {
  const state = useMyTasks();
  const theme = useTheme();
  function canOpenDocument(task: WarehouseTask) {
    const permission = task.taskType.startsWith('Transfer') ? P.TRANSFERS_VIEW : task.taskType === 'Picking' ? P.STOCK_ISSUE_REQUESTS_VIEW : task.taskType === 'CycleCount' ? P.CYCLE_COUNTS_VIEW : P.GOODS_RECEIPTS_VIEW;
    if (task.taskType.startsWith('Transfer') && (!task.transferId || !task.transferShipmentId)) return false;
    return !!state.access.profile.data?.permissions.includes(permission);
  }
  function openDocument(task: WarehouseTask) {
    const profile = state.access.profile.data;
    const permission = task.taskType.startsWith('Transfer') ? P.TRANSFERS_VIEW : task.taskType === 'Picking' ? P.STOCK_ISSUE_REQUESTS_VIEW : task.taskType === 'CycleCount' ? P.CYCLE_COUNTS_VIEW : P.GOODS_RECEIPTS_VIEW;
    if (!state.canView || !profile?.permissions.includes(permission) ||
      task.warehouseId !== state.access.warehouse?.id || task.assignedTo !== profile.id) return;
    if (task.taskType === 'Receiving') router.push({ pathname: '/(account)/receiving/[id]', params: { id: task.id } });
    if (task.taskType === 'PutAway') router.push({ pathname: '/(account)/putaway/[id]', params: { id: task.id } });
    if (task.taskType === 'Picking') router.push({ pathname: '/(account)/stock-issue/[id]', params: { id: task.id } });
    if (task.taskType === 'CycleCount') router.push({ pathname: '/(account)/cycle-count/[id]', params: { id: task.id } });
    if (task.taskType === 'TransferPick' && task.transferId && task.transferShipmentId)
      router.push({ pathname: '/(account)/transfer-pick/[id]', params: { id: task.transferId, shipmentId: task.transferShipmentId } });
    if (task.taskType === 'TransferReceive' && task.transferId && task.transferShipmentId)
      router.push({ pathname: '/(account)/transfer-receipt/[id]', params: { id: task.transferId, shipmentId: task.transferShipmentId } });
    if (task.taskType === 'TransferPutAway' && task.transferId && task.transferShipmentId)
      router.push({ pathname: '/(account)/transfer-putaway/[id]', params: { id: task.transferId, shipmentId: task.transferShipmentId } });
  }
  if (!state.canView) {
    const title = !state.access.validated ? 'Đang chờ xác minh kho và quyền truy cập.'
      : !state.access.warehouse ? 'Chọn kho đang hoạt động được giao để xem công việc.'
        : 'Bạn chưa được cấp quyền xem công việc cá nhân.';
    return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.gate}>
        <AlertBanner title={title} description={state.access.selection.notice ?? undefined} />
        <Button label="Chọn kho làm việc" onPress={() => router.navigate('/')} />
        <Button label="Kiểm tra lại quyền" variant="outline" loading={state.access.profile.isFetching}
          onPress={() => { void state.access.refresh(); }} />
      </View>
    </SafeAreaView>;
  }
  return <>
    <MyTaskList warehouseName={state.access.warehouse?.warehouseName ?? ''} data={state.list.data}
      filters={state.filters} loading={state.list.isPending} fetching={state.list.isFetching} error={state.list.error}
      busy={state.mutation.isPending} canManage={state.canManage} notice={state.notice}
      onFilters={state.changeFilters} onRefresh={() => { void state.list.refetch(); }}
      onWarehouse={() => router.navigate('/')} onAction={state.beginAction}
      onOpenDocument={openDocument} canOpenDocument={canOpenDocument} />
    <TaskActionDialog target={state.target} form={state.form} busy={state.mutation.isPending}
      awaitingRefresh={state.list.isFetching || state.list.isError}
      error={state.mutation.error} onConfirm={() => { void state.confirmAction(); }} onCancel={state.closeAction} />
  </>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, gate: { padding: 20, gap: 16 } });
