import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { SelectionField } from '@/components/ui/selection-field';
import { WarehousePicker } from '@/features/warehouse-access/components/warehouse-picker';
import { useTheme } from '@/hooks/use-theme';

import type { useTaskWorkspace } from '../hooks/use-task-workspace';

type Workspace = ReturnType<typeof useTaskWorkspace>;

export function TaskWorkspaceGate({ workspace }: { readonly workspace: Workspace }) {
  const { access } = workspace;
  const theme = useTheme();
  if (!access.ready) return <WarehousePicker profile={access.profile.data} warehouses={access.snapshot?.warehouses ?? []}
    selected={access.warehouse} validated={access.validated} loading={access.profile.isFetching}
    error={access.profile.error} notice={access.selection.notice} compatible={access.snapshot?.compatible ?? true}
    onSelect={access.choose} onRefresh={access.refresh} onProfile={() => router.navigate('/profile')} />;
  return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
    <View style={styles.content}>
      <AlertBanner title="Bạn chưa được cấp quyền xem công việc cá nhân tại kho này." />
      <Button label="Tải lại quyền truy cập" variant="outline" loading={access.profile.isFetching} onPress={() => { void access.refresh(); }} />
      <Button label="Về trang chủ" onPress={() => router.navigate('/')} />
    </View>
  </SafeAreaView>;
}

export function TaskWorkspaceControl({ workspace }: { readonly workspace: Workspace }) {
  const { access } = workspace;
  return <View style={styles.control}><SelectionField label="Kho làm việc" value={access.warehouse?.id ?? ''}
    options={(access.snapshot?.warehouses ?? []).map((warehouse) => ({ value: warehouse.id, label: warehouse.warehouseName, description: warehouse.warehouseCode }))}
    disabled={!access.validated || access.selection.transitioning} onChange={(id) => { void access.choose(id); }} />
    {!!access.selection.notice && <AlertBanner title={access.selection.notice} />}
  </View>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, gap: 16 }, control: { gap: 10 } });
