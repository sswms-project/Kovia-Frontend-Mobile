import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ACTION_LABELS, availableTaskActions, DEADLINE_LABELS, EXECUTION_LABELS,
  TASK_LABELS, taskDate } from '../../my-tasks';
import type { TaskActionInput, WarehouseTask } from '../../my-tasks.schema';

interface TaskCardProps {
  readonly task: WarehouseTask;
  readonly history: boolean;
  readonly canManage: boolean;
  readonly busy: boolean;
  readonly onAction: (task: WarehouseTask, action: TaskActionInput['action']) => void;
  readonly onOpenDocument?: (task: WarehouseTask) => void;
}

export const TaskCard = memo(function TaskCard({ task, history, canManage, busy, onAction, onOpenDocument }: TaskCardProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const actions = availableTaskActions(task, canManage, history);
  const urgent = task.priority === 'Urgent' || task.deadlineStatus === 'Overdue';
  const canOpen = !!onOpenDocument && (task.taskType === 'TransferPick' || task.taskType === 'CycleCount' || task.taskType === 'Picking' || task.taskType === 'PutAway' || (task.taskType === 'Receiving' && !history));
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: urgent ? theme.error : theme.border }]}>
      <View style={styles.heading}>
        <Text style={[styles.kind, { color: theme.primary }]}>{TASK_LABELS[task.taskType]}</Text>
        {task.priority === 'Urgent' && <Text style={[styles.badge, { color: theme.error }]}>Khẩn</Text>}
      </View>
      <Text style={[styles.reference, { color: theme.text }]}>{task.referenceCode}</Text>
      <Text style={[styles.text, { color: theme.textSecondary }]}>{task.workSummary || task.title}</Text>
      <View style={styles.heading}>
        <Text style={[styles.state, { color: theme.text }]}>{EXECUTION_LABELS[task.executionStatus]}</Text>
        <Text style={[styles.text, { color: task.deadlineStatus === 'Overdue' ? theme.error : theme.textSecondary }]}>
          {DEADLINE_LABELS[task.deadlineStatus]}
        </Text>
      </View>
      <Text style={[styles.text, { color: theme.textSecondary }]}>
        Hạn: {taskDate(task.dueAt)} · Tiến độ: {Math.round(task.progressPercentage)}%
      </Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
        accessibilityLabel={`${expanded ? 'Ẩn' : 'Xem'} chi tiết ${task.referenceCode}`}
        onPress={() => setExpanded((value) => !value)} style={styles.detailButton}>
        <Text style={[styles.state, { color: theme.primary }]}>{expanded ? 'Ẩn chi tiết' : 'Xem chi tiết công việc'}</Text>
      </Pressable>
      {expanded && <View style={[styles.details, { borderColor: theme.border }]}>
        <Text style={[styles.text, { color: theme.text }]}>{task.warehouseName}</Text>
        <Text style={[styles.text, { color: theme.textSecondary }]}>Trạng thái phiếu: {task.status}</Text>
        <Text style={[styles.text, { color: theme.textSecondary }]}>Đã xử lý {task.completedItemCount}/{task.itemCount} dòng</Text>
        <Text style={[styles.text, { color: theme.textSecondary }]}>Số lượng: {task.completedQuantity}/{task.totalQuantity}</Text>
        <Text style={[styles.text, { color: theme.textSecondary }]}>Giao lúc: {taskDate(task.assignedAt)}</Text>
        <Text style={[styles.text, { color: theme.textSecondary }]}>Bắt đầu: {taskDate(task.startedAt)} · Kết thúc: {taskDate(task.completedAt)}</Text>
        {task.pauseReason && <Text style={[styles.text, { color: theme.text }]}>Lý do tạm dừng: {task.pauseReason}</Text>}
        {!canOpen && <Text style={[styles.text, { color: theme.textSecondary }]}>
          Chưa hỗ trợ ghi nhận {TASK_LABELS[task.taskType].toLocaleLowerCase('vi')} trên mobile. Liên hệ quản lý để xử lý nghiệp vụ.
        </Text>}
      </View>}
      {canOpen && <Button
        label={task.taskType === 'TransferPick' ? 'Mở lấy hàng điều chuyển' : task.taskType === 'CycleCount' ? 'Mở phiếu kiểm kê' : task.taskType === 'Picking' ? 'Mở lấy hàng và xuất kho' : task.taskType === 'Receiving' ? 'Mở nhận hàng được giao' : 'Mở phiếu cất hàng'}
        variant="outline" disabled={busy} onPress={() => onOpenDocument?.(task)} />}
      {actions.map((action) => <Button key={action}
        label={action === 'Start' && task.executionStatus === 'Paused' ? 'Tiếp tục' : ACTION_LABELS[action]}
        accessibilityLabel={`${ACTION_LABELS[action]} ${task.referenceCode}`} variant={action === 'Start' ? 'primary' : 'outline'}
        disabled={busy} onPress={() => onAction(task, action)} />)}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, borderRadius: Radius.xl, gap: 10 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  kind: { fontFamily: FontFamily.semibold, fontSize: 13 },
  badge: { fontFamily: FontFamily.bold, fontSize: 12 },
  reference: { fontFamily: FontFamily.mono, fontSize: 18, lineHeight: 26 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 },
  state: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 21 },
  detailButton: { minHeight: 44, justifyContent: 'center' },
  details: { borderTopWidth: 1, paddingTop: 12, gap: 8 },
});
