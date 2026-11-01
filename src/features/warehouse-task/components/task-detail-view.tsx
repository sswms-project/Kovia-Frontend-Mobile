import { Pause, Play, Undo2 } from 'lucide-react-native';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDateTime } from '@/lib/date-format';

import {
  DEADLINE_STATUS_LABEL,
  DEADLINE_STATUS_TONE,
  EXECUTION_STATUS_LABEL,
  EXECUTION_STATUS_TONE,
  getTaskTypeLabel,
} from '../warehouse-task.labels';
import type { MyWarehouseTask, WarehouseTaskAction } from '../warehouse-task.types';

interface TaskDetailViewProps {
  readonly task: MyWarehouseTask;
  readonly availableActions: readonly WarehouseTaskAction[];
  readonly isPending: boolean;
  readonly onAction: (action: WarehouseTaskAction) => void;
  readonly onOpenDocument?: () => void;
  readonly openingDocument?: boolean;
  readonly documentLabel?: string;
  readonly isRefreshing?: boolean;
  readonly onRefresh?: () => void;
}

const formatTime = (value: string | null) => (value ? formatDisplayDateTime(new Date(value)) : '—');

export function TaskDetailView({ task, availableActions, isPending, onAction, onOpenDocument, openingDocument, documentLabel = 'Mở chứng từ và thực hiện', isRefreshing = false, onRefresh }: TaskDetailViewProps) {
  const theme = useTheme();
  const rows: readonly { label: string; value: string }[] = [
    { label: 'Mã tham chiếu', value: task.referenceCode },
    { label: 'Kho', value: task.warehouseName },
    { label: 'Nội dung', value: task.workSummary },
    {
      label: 'Số lượng',
      value: `${task.completedQuantity.toLocaleString('vi-VN')}/${task.totalQuantity.toLocaleString('vi-VN')}`,
    },
    { label: 'Số dòng', value: `${task.completedItemCount}/${task.itemCount}` },
    { label: 'Hạn hoàn thành', value: formatTime(task.dueAt) },
    { label: 'Bắt đầu lúc', value: formatTime(task.startedAt) },
    { label: 'Cập nhật', value: formatTime(task.updatedAt) },
  ];
  const isResume = task.executionStatus === 'Paused';

  return (
    <ScrollView contentContainerStyle={styles.content}
      refreshControl={onRefresh ? <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} /> : undefined}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
          {getTaskTypeLabel(task)}
        </Text>
        <View style={styles.pills}>
          <StatusPill
            label={EXECUTION_STATUS_LABEL[task.executionStatus]}
            tone={EXECUTION_STATUS_TONE[task.executionStatus]}
          />
          {task.priority === 'Urgent' ? <StatusPill label="Khẩn" tone="danger" /> : null}
          <StatusPill
            label={DEADLINE_STATUS_LABEL[task.deadlineStatus]}
            tone={DEADLINE_STATUS_TONE[task.deadlineStatus]}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {rows.map((row) => (
          <View key={row.label} accessible style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{row.label}</Text>
            <Text style={[styles.value, { color: theme.text }]}>{row.value}</Text>
          </View>
        ))}
        {task.pauseReason && isResume ? (
          <View accessible style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Lý do tạm dừng</Text>
            <Text style={[styles.value, { color: theme.text }]}>{task.pauseReason}</Text>
          </View>
        ) : null}
      </View>

      {onOpenDocument && <Button label={documentLabel} onPress={onOpenDocument}
        loading={openingDocument} disabled={isPending} />}
      {availableActions.length > 0 ? (
        <View style={styles.actions}>
          {availableActions.includes('Start') ? (
            <Button
              label={isResume ? 'Tiếp tục' : 'Bắt đầu'}
              loading={isPending}
              renderIcon={(color) => <Play size={16} color={color} />}
              onPress={() => onAction('Start')}
            />
          ) : null}
          {availableActions.includes('Pause') ? (
            <Button
              variant="outline"
              label="Tạm dừng"
              disabled={isPending}
              renderIcon={(color) => <Pause size={16} color={color} />}
              onPress={() => onAction('Pause')}
            />
          ) : null}
          {availableActions.includes('Return') ? (
            <Button
              variant="ghost"
              label="Trả lại"
              disabled={isPending}
              renderIcon={(color) => <Undo2 size={16} color={color} />}
              onPress={() => onAction('Return')}
            />
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 16, padding: 20 },
  heading: { gap: 8 },
  title: { fontFamily: FontFamily.semibold, fontSize: 22, lineHeight: 30 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  card: { gap: 14, padding: 16, borderWidth: 1, borderRadius: Radius.lg },
  row: { gap: 2 },
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    lineHeight: 20,
  },
  value: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 22 },
  actions: { gap: 10 },
});
