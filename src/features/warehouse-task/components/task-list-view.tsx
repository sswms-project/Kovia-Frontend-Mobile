import { FlashList } from '@shopify/flash-list';
import { ClipboardList, type LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FilterChips, type FilterOption } from '@/components/ui/filter-chips';
import { LoadingState } from '@/components/ui/loading-state';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  /** Omit for read-only lists such as history. */
  readonly onOpenTask?: (task: MyWarehouseTask) => void;
}

export function TaskListView({
  title,
  description,
  actions = [],
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
}: TaskListViewProps) {
  const theme = useTheme();
  const hasNativeHeader = title === undefined;

  function renderBody() {
    if (isLoading) return <LoadingState message="Đang tải công việc…" />;
    if (error && tasks.length === 0) return <ErrorState error={error} onRetry={onRetry} />;
    if (tasks.length === 0) {
      return (
        <EmptyState icon={ClipboardList} title="Chưa có công việc" description={emptyDescription} />
      );
    }

    return (
      <FlashList
        data={tasks}
        keyExtractor={(task) => `${task.taskType}-${task.id}`}
        renderItem={({ item }) => (
          <TaskCard task={item} onPress={onOpenTask ? () => onOpenTask(item) : undefined} />
        )}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.listContent}
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={theme.primary} /> : null
        }
      />
    );
  }

  return (
    <SafeAreaView
      edges={hasNativeHeader ? [] : ['top']}
      style={[styles.root, { backgroundColor: theme.background }]}>
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

      {stats ? <TaskStatsBar stats={stats} /> : null}

      <View style={styles.chips}>
        <FilterChips
          accessibilityLabel="Lọc theo trạng thái"
          options={statusOptions}
          value={statusFilter}
          onChange={onStatusChange}
        />
        <FilterChips
          accessibilityLabel="Lọc theo loại công việc"
          options={TASK_TYPE_FILTERS}
          value={typeFilter}
          onChange={onTypeChange}
          allLabel="Mọi loại việc"
        />
      </View>

      <View style={styles.body}>{renderBody()}</View>
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12, paddingTop: 12 },
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
  chips: { gap: 8 },
  body: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  separator: { height: 12 },
  footer: { paddingVertical: 16 },
});
