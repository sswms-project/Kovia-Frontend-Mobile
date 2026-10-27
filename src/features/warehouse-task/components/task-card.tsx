import {
  ArrowLeftRight,
  ClipboardCheck,
  ClipboardList,
  PackageOpen,
  PackagePlus,
  PackageSearch,
  PackageX,
  Truck,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDateTime } from '@/lib/date-format';

import {
  DEADLINE_STATUS_LABEL,
  DEADLINE_STATUS_TONE,
  EXECUTION_STATUS_LABEL,
  EXECUTION_STATUS_TONE,
  TASK_TYPE_LABEL,
} from '../warehouse-task.labels';
import type { MyWarehouseTask, WarehouseTaskType } from '../warehouse-task.types';

export const TASK_TYPE_ICON: Record<WarehouseTaskType, LucideIcon> = {
  Receiving: PackageOpen,
  PutAway: PackagePlus,
  CycleCount: ClipboardCheck,
  DamagedStock: PackageX,
  Relocation: ArrowLeftRight,
  TransferPick: Truck,
  TransferReceive: PackageOpen,
  TransferPutAway: PackagePlus,
  Picking: PackageSearch,
};

interface TaskCardProps {
  readonly task: MyWarehouseTask;
  /** Omit for read-only rows such as history. */
  readonly onPress?: () => void;
  readonly showAssignee?: boolean;
}

export function TaskCard({ task, onPress, showAssignee = false }: TaskCardProps) {
  const theme = useTheme();
  const Icon = TASK_TYPE_ICON[task.taskType] ?? ClipboardList;
  const typeLabel = TASK_TYPE_LABEL[task.taskType] ?? task.taskType;
  const executionLabel = EXECUTION_STATUS_LABEL[task.executionStatus] ?? task.executionStatus;
  const isOverdue = task.deadlineStatus === 'Overdue';
  const progress = Math.max(0, Math.min(100, task.progressPercentage));

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${typeLabel} ${task.referenceCode}, ${executionLabel}, tiến độ ${progress}%`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: isOverdue ? theme.error : theme.border,
        },
        pressed && styles.pressed,
      ]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: theme.secondaryContainer }]}>
          <Icon size={20} color={theme.primary} />
        </View>
        <View style={styles.identity}>
          <Text style={[styles.title, { color: theme.text }]}>
            {typeLabel}
            <Text style={[styles.summary, { color: theme.textSecondary }]}> · {task.workSummary}</Text>
          </Text>
          <Text style={[styles.reference, { color: theme.textSecondary }]}>
            <Text style={{ color: theme.text }}>{task.referenceCode}</Text> · {task.warehouseName}
          </Text>
        </View>
      </View>

      <View style={styles.pills}>
        {showAssignee && <Text style={[styles.meta, { color: theme.textSecondary }]}>Nhân viên: {task.assignedToName ?? 'Chưa phân công'}</Text>}
        <StatusPill label={executionLabel} tone={EXECUTION_STATUS_TONE[task.executionStatus]} />
        {task.priority === 'Urgent' ? <StatusPill label="Khẩn" tone="danger" /> : null}
        <StatusPill
          label={DEADLINE_STATUS_LABEL[task.deadlineStatus]}
          tone={DEADLINE_STATUS_TONE[task.deadlineStatus]}
        />
      </View>

      {task.pauseReason && task.executionStatus === 'Paused' ? (
        <Text style={[styles.pauseReason, { color: theme.textSecondary, borderColor: theme.warning }]} numberOfLines={2}>
          Lý do tạm dừng: {task.pauseReason}
        </Text>
      ) : null}

      <View style={styles.progressRow}>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {task.completedItemCount}/{task.itemCount} dòng
        </Text>
        <Text style={[styles.meta, { color: theme.text }]}>{progress}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.fill, { backgroundColor: theme.primary, width: `${progress}%` }]} />
      </View>

      {task.dueAt ? (
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          Hạn {formatDisplayDateTime(new Date(task.dueAt))}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderWidth: 1, borderRadius: Radius.lg },
  pressed: { opacity: 0.85 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg },
  identity: { flex: 1, minWidth: 0, gap: 6 },
  title: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 23 },
  summary: { fontFamily: FontFamily.regular },
  reference: { fontFamily: FontFamily.mono, fontSize: 13, lineHeight: 20 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pauseReason: {
    paddingLeft: 8,
    borderLeftWidth: 2,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 20 },
  track: { height: 6, overflow: 'hidden', borderRadius: 3 },
  fill: { height: '100%', borderRadius: 3 },
});
