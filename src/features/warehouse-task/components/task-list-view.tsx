import { FlashList } from '@shopify/flash-list';
import { ClipboardList, type LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import type { FilterOption } from '@/components/ui/filter-chips';
import { SelectionField } from '@/components/ui/selection-field';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { useState, type ReactNode } from 'react';
import { LoadingState } from '@/components/ui/loading-state';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isApiErrorResponse } from '@/lib/api-error';
import { executionStatusSchema, taskTypeSchema } from '@/features/my-tasks/my-tasks.schema';

import { TASK_TYPE_FILTERS } from '../warehouse-task.labels';
import type {
  MyWarehouseTask,
  WarehouseTaskExecutionStatus,
  WarehouseTaskStats,
  WarehouseTaskType,
} from '../warehouse-task.types';
import { TaskCard } from './task-card';
import { TaskStatsBar } from './task-stats-bar';

export interface TaskListHeaderAction {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly onPress: () => void;
}

interface TaskListViewProps {
  /** Omit when the screen already has a native header showing the title. */
  readonly title?: string;
  readonly description?: string;
  readonly actions?: readonly TaskListHeaderAction[];
  readonly workspaceControl?: ReactNode;
  readonly stats?: WarehouseTaskStats;
  readonly statusOptions: readonly FilterOption<WarehouseTaskExecutionStatus>[];
  readonly statusFilter: WarehouseTaskExecutionStatus | null;
  readonly onStatusChange: (value: WarehouseTaskExecutionStatus | null) => void;
  readonly typeFilter: WarehouseTaskType | null;
  readonly onTypeChange: (value: WarehouseTaskType | null) => void;
  readonly tasks: readonly MyWarehouseTask[];
  readonly isLoading: boolean;
  readonly error: unknown;
  readonly isRefreshing: boolean;
  readonly isFetchingNextPage: boolean;
  readonly emptyDescription: string;
  readonly onRefresh: () => void;
  readonly onEndReached: () => void;
  readonly onRetry: () => void;
  /** Opens current work or a read-only history detail. */
  readonly onOpenTask?: (task: MyWarehouseTask) => void;
  readonly showAssignee?: boolean;
}

export function TaskListView({
  title,
  description,
  actions = [],
  workspaceControl,
  stats,
  statusOptions,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  tasks,
  isLoading,
  error,
  isRefreshing,
  isFetchingNextPage,
  emptyDescription,
  onRefresh,
  onEndReached,
  onRetry,
  onOpenTask,
  showAssignee = false,
}: TaskListViewProps) {
  const theme = useTheme();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = Number(statusFilter !== null) + Number(typeFilter !== null);
  const hasNativeHeader = title === undefined;

  const blocked = !!error && (tasks.length === 0 || (isApiErrorResponse(error) && [401, 403, 404].includes(error.statusCode)));
  const header = <View style={styles.header}>
      {title !== undefined ? (
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
              {title}
            </Text>
            {description ? (
              <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>
            ) : null}
          </View>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              hitSlop={4}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: theme.card, borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <action.icon size={20} color={theme.text} />
            </Pressable>
          ))}
        </View>
      ) : description ? (
        <Text style={[styles.description, styles.standaloneDescription, { color: theme.textSecondary }]}>
          {description}
        </Text>
      ) : null}

      {workspaceControl && <View style={styles.chips}>{workspaceControl}</View>}
      {stats && !error ? <TaskStatsBar stats={stats} /> : null}
      {!!error && tasks.length > 0 && !(isApiErrorResponse(error) && [401, 403, 404].includes(error.statusCode)) && <AlertBanner
        title="Đang hiển thị danh sách cũ. Tải lại trước khi mở công việc.">
        <Button label="Tải lại danh sách" variant="outline" loading={isRefreshing} onPress={onRetry} />
      </AlertBanner>}

      <View style={styles.chips}>
        <Button label={filtersOpen ? 'Ẩn bộ lọc' : `Bộ lọc${activeFilters ? ` (${activeFilters})` : ''}`}
          variant="outline" onPress={() => setFiltersOpen((value) => !value)} />
        {activeFilters > 0 && <Button label="Xóa bộ lọc" variant="ghost" onPress={() => { onStatusChange(null); onTypeChange(null); }} />}
      </View>
      {filtersOpen && <View style={styles.chips}>
        <SelectionField label="Trạng thái" value={statusFilter ?? ''}
          options={[{ value: '', label: 'Tất cả trạng thái' }, ...statusOptions]}
          onChange={(value) => onStatusChange(value ? executionStatusSchema.parse(value) : null)} />
        <SelectionField label="Loại công việc" value={typeFilter ?? ''}
          options={[{ value: '', label: 'Mọi loại công việc' }, ...TASK_TYPE_FILTERS]}
          onChange={(value) => onTypeChange(value ? taskTypeSchema.parse(value) : null)} />
      </View>}

    </View>;

  return (
    <SafeAreaView edges={hasNativeHeader ? [] : ['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <FlashList
        data={blocked || isLoading ? [] : tasks}
        keyExtractor={(task) => `${task.taskType}-${task.id}`}
        renderItem={({ item }) => <View style={styles.cardInset}><TaskCard task={item} showAssignee={showAssignee} onPress={onOpenTask && !error ? () => onOpenTask(item) : undefined} /></View>}
        ListHeaderComponent={header}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.listContent}
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        onEndReached={() => { if (!blocked && !isLoading) onEndReached(); }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={isLoading ? <LoadingState message="Đang tải công việc…" /> : blocked
          ? <ErrorState error={error} onRetry={onRetry} />
          : <EmptyState icon={ClipboardList} title="Chưa có công việc" description={emptyDescription} />}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={theme.primary} /> : null}
      />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { gap: 16, paddingTop: 16, paddingBottom: 20 },
  cardInset: { paddingHorizontal: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20 },
  titleText: { flex: 1, gap: 2 },
  title: { fontFamily: FontFamily.semibold, fontSize: 26, lineHeight: 32 },
  description: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 19 },
  standaloneDescription: { paddingHorizontal: 20 },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 22,
  },
  pressed: { opacity: 0.7 },
  chips: { gap: 8, paddingHorizontal: 20 },
  listContent: { paddingBottom: 24 },
  separator: { height: 12 },
  footer: { paddingVertical: 16 },
});
