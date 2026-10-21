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
  const profile = state.access.profile.data;
  function openDocument(task: WarehouseTask) {
    if (!state.canView || !profile || task.warehouseId !== state.access.warehouse?.id ||
      task.assignedTo !== profile.id) return;
    const canReceive = profile.permissions.includes(P.GOODS_RECEIPTS_VIEW);
    if (task.taskType === 'Receiving' && canReceive) router.push({ pathname: '/(account)/receiving/[id]', params: { id: task.id } });
    if (task.taskType === 'PutAway' && canReceive) router.push({ pathname: '/(account)/putaway/[id]', params: { id: task.id } });
    if (task.taskType === 'CycleCount' && profile.permissions.includes(P.CYCLE_COUNTS_VIEW))
      router.push({ pathname: '/(account)/cycle-count/[id]', params: { id: task.id } });
    if (task.taskType === 'Picking' && profile.permissions.includes(P.STOCK_ISSUE_REQUESTS_PICK))
      router.push({ pathname: '/(account)/picking/[id]', params: { id: task.id } });
    if (task.transferId && task.transferShipmentId) {
      const params = { transferId: task.transferId, shipmentId: task.transferShipmentId };
      if (task.taskType === 'TransferPick' && profile.permissions.includes(P.TRANSFERS_PICK))
        router.push({ pathname: '/(account)/transfer-pick/[transferId]/[shipmentId]', params });
      if (task.taskType === 'TransferReceive' && profile.permissions.includes(P.TRANSFERS_RECEIVE))
        router.push({ pathname: '/(account)/transfer-receive/[transferId]/[shipmentId]', params });
    }
  }
  const openPermissions: readonly string[] = [
    P.GOODS_RECEIPTS_VIEW, P.CYCLE_COUNTS_VIEW, P.STOCK_ISSUE_REQUESTS_PICK, P.TRANSFERS_PICK, P.TRANSFERS_RECEIVE,
  ];
  const canOpenDocuments = !!profile?.permissions.some((code) => openPermissions.includes(code));
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
      onOpenDocument={canOpenDocuments ? openDocument : undefined} />
    <TaskActionDialog target={state.target} form={state.form} busy={state.mutation.isPending}
      awaitingRefresh={state.list.isFetching || state.list.isError}
      error={state.mutation.error} onConfirm={() => { void state.confirmAction(); }} onCancel={state.closeAction} />
  </>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, gate: { padding: 20, gap: 16 } });
