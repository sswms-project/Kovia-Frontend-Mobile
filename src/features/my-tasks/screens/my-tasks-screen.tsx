import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { SelectionField } from '@/components/ui/selection-field';
import { getTaskDestination } from '../my-tasks.navigation';
import type { WarehouseTask } from '../my-tasks.schema';

import { MyTaskList, TaskActionDialog } from '../components/task-list';
import { useMyTasks } from '../hooks/use-my-tasks';

export function MyTasksScreen() {
  const state = useMyTasks();
  const theme = useTheme();
  function canOpenDocument(task: WarehouseTask) {
    return !!getTaskDestination(task, state.access.profile.data, state.access.warehouse?.id);
  }
  function openDocument(task: WarehouseTask) {
    if (!state.canView) return;
    const destination = getTaskDestination(task, state.access.profile.data, state.access.warehouse?.id);
    if (destination) router.push(destination);
  }
  if (!state.canView) {
    const title = !state.access.validated ? 'Đang chờ xác minh kho và quyền truy cập.'
      : !state.access.warehouse ? 'Chọn kho đang hoạt động được giao để xem công việc.'
        : 'Bạn chưa được cấp quyền xem công việc cá nhân.';
    return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.gate}>
        <AlertBanner title={title} description={state.access.selection.notice ?? undefined} />
        <Button label="Chọn kho làm việc" onPress={() => router.navigate('/')} />
        <Button label="Tải lại quyền truy cập" variant="outline" loading={state.access.profile.isFetching}
          onPress={() => { void state.access.refresh(); }} />
      </View>
    </SafeAreaView>;
  }
  return <>
    <MyTaskList warehouseName={state.access.warehouse?.warehouseName ?? ''} data={state.list.data}
      filters={state.filters} loading={state.list.isPending} fetching={state.list.isFetching} error={state.list.error}
      busy={state.mutation.isPending} canManage={state.canManage} notice={state.notice}
      onFilters={state.changeFilters} onRefresh={() => { void state.list.refetch(); }}
      warehouseSelector={<SelectionField label="Kho làm việc" value={state.access.warehouse?.id ?? ''}
        options={(state.access.snapshot?.warehouses ?? []).map((warehouse) => ({ value: warehouse.id, label: warehouse.warehouseName, description: warehouse.warehouseCode }))}
        disabled={state.mutation.isPending || state.access.selection.transitioning} onChange={(id) => { void state.access.choose(id); }} />}
      onAction={state.beginAction}
      onOpenDocument={openDocument} canOpenDocument={canOpenDocument} />
    <TaskActionDialog target={state.target} form={state.form} busy={state.mutation.isPending}
      awaitingRefresh={state.list.isFetching || state.list.isError}
      error={state.mutation.error} onConfirm={() => { void state.confirmAction(); }} onCancel={state.closeAction} />
  </>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, gate: { padding: 20, gap: 16 } });
