import { useCallback, useState, type ReactNode } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { FontFamily, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { TASK_PAGE_SIZE } from '../../my-tasks';
import type { TaskActionInput, TaskFilters, WarehouseTask, WarehouseTaskList } from '../../my-tasks.schema';
import { TaskCard } from './task-card';
import { TaskFiltersPanel } from './task-filters';

interface MyTaskListProps {
  readonly warehouseName: string;
  readonly data?: WarehouseTaskList;
  readonly filters: TaskFilters;
  readonly loading: boolean;
  readonly fetching: boolean;
  readonly error: Error | null;
  readonly busy: boolean;
  readonly canManage: boolean;
  readonly notice: string | null;
  readonly onFilters: (patch: Partial<TaskFilters>) => void;
  readonly onRefresh: () => void;
  readonly warehouseSelector: ReactNode;
  readonly onAction: (task: WarehouseTask, action: TaskActionInput['action']) => void;
  readonly onOpenDocument?: (task: WarehouseTask) => void;
  readonly canOpenDocument?: (task: WarehouseTask) => boolean;
}

export function MyTaskList({ warehouseName, data, filters, loading, fetching, error, busy, canManage, notice,
  onFilters, onRefresh, warehouseSelector, onAction, onOpenDocument, canOpenDocument }: MyTaskListProps) {
  const theme = useTheme();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const renderItem = useCallback(({ item }: { item: WarehouseTask }) => (
    <TaskCard task={item} history={filters.history} canManage={canManage && !error} busy={busy || fetching} onAction={onAction}
      onOpenDocument={!canOpenDocument || canOpenDocument(item) ? onOpenDocument : undefined} />
  ), [filters.history, canManage, error, busy, fetching, onAction, onOpenDocument, canOpenDocument]);
  const total = data?.totalCount ?? 0;
  const activeTask = !filters.history ? data?.items.find((task) => task.executionStatus === 'InProgress') : undefined;
  const pageCount = Math.max(1, Math.ceil(total / (data?.pageSize ?? TASK_PAGE_SIZE)));
  return <SafeAreaView edges={['top', 'left', 'right']} style={[styles.root, { backgroundColor: theme.background }]}>
    <FlatList data={error ? [] : data?.items ?? []} keyExtractor={(task) => `${task.taskType}:${task.id}`}
      renderItem={renderItem} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
      refreshing={fetching && !loading} onRefresh={busy ? undefined : onRefresh}
      ListHeaderComponent={<View style={styles.header}>
        <Text style={[styles.kicker, { color: theme.primary }]}>KOVIA · {warehouseName}</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Công việc của tôi</Text>
        {warehouseSelector}
        <View style={styles.row}>
          <Button label="Đang được giao" variant={filters.history ? 'outline' : 'primary'} disabled={busy}
            onPress={() => onFilters({ history: false, executionStatus: undefined, deadlineStatus: undefined })} />
          <Button label="Lịch sử" variant={filters.history ? 'primary' : 'outline'} disabled={busy}
            onPress={() => onFilters({ history: true, executionStatus: undefined, deadlineStatus: undefined })} />
        </View>
        {!filters.history && data && !error && <Text style={[styles.summary, { color: theme.textSecondary }]}>
          {data.stats.queuedCount} chờ · {data.stats.inProgressCount} đang làm · {data.stats.pausedCount} tạm dừng · {data.stats.overdueCount} quá hạn
        </Text>}
        {!!activeTask && !error && <AlertBanner title={`Đang làm: ${activeTask.referenceCode}`}
          description="Muốn bắt đầu việc khác, mở Chi tiết của việc đang làm và chọn Tạm dừng." />}
        <View style={styles.row}>
          <Button label={filtersOpen ? 'Ẩn bộ lọc' : 'Bộ lọc'} variant="outline" disabled={busy} onPress={() => setFiltersOpen((value) => !value)} />
          {filtersOpen && <Button label="Xóa bộ lọc" variant="ghost" disabled={busy}
            onPress={() => onFilters({ taskType: undefined, executionStatus: undefined, deadlineStatus: undefined, recentlyAssignedFirst: false })} />}
        </View>
        {filtersOpen && <>
          <TaskFiltersPanel filters={filters} onChange={onFilters} disabled={busy} />
          {!filters.history && <Button label={filters.recentlyAssignedFirst ? 'Sắp xếp: Mới giao trước' : 'Sắp xếp: Ưu tiên và thời hạn'} variant="outline" disabled={busy}
            onPress={() => onFilters({ recentlyAssignedFirst: !filters.recentlyAssignedFirst })} />}
        </>}
        {notice && <AlertBanner variant="success" title={notice} />}
        {error && <AlertBanner variant="destructive" title="Không tải được công việc" description={getApiErrorMessage(error)}>
          <Button label="Tải lại công việc" variant="outline" loading={fetching} onPress={onRefresh} />
        </AlertBanner>}
        {loading && <Text style={[styles.summary, { color: theme.textSecondary }]}>Đang tải công việc…</Text>}
        {!loading && !error && <Text style={[styles.summary, { color: theme.textSecondary }]}>{total} công việc · Trang {filters.pageNumber}/{pageCount}</Text>}
      </View>}
      ListEmptyComponent={!loading && !error ? <Text style={[styles.summary, { color: theme.textSecondary }]}>
        {filters.history ? 'Chưa có công việc trong lịch sử theo bộ lọc này.' : 'Chưa có công việc được giao theo bộ lọc này.'}
      </Text> : null}
      ListFooterComponent={!loading && !error ? <View style={styles.footer}>
        {filters.pageNumber > pageCount && <Text style={[styles.summary, { color: theme.textSecondary }]}>Danh sách đã thay đổi. Hãy quay về trang đầu.</Text>}
        <View style={styles.row}>
          <Button label="Trang trước" variant="outline" disabled={busy || fetching || filters.pageNumber <= 1}
            onPress={() => onFilters({ pageNumber: Math.max(1, filters.pageNumber - 1) })} />
          <Button label="Trang sau" variant="outline" disabled={busy || fetching || filters.pageNumber >= pageCount}
            onPress={() => onFilters({ pageNumber: filters.pageNumber + 1 })} />
          {filters.pageNumber > pageCount && <Button label="Trang đầu" variant="outline" disabled={busy || fetching} onPress={() => onFilters({ pageNumber: 1 })} />}
        </View>
      </View> : null}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 16, paddingBottom: 48, gap: 12 },
  header: { gap: 16, paddingTop: 16, paddingBottom: 8 },
  kicker: { fontFamily: FontFamily.semibold, fontSize: 12, lineHeight: 18 },
  title: { fontFamily: FontFamily.bold, fontSize: 28, lineHeight: 36 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summary: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 },
  footer: { gap: 12, paddingTop: 16 },
});
