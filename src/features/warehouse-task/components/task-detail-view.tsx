import { Pause, Play, Undo2 } from 'lucide-react-native';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { WorkActionBar } from '@/components/work-action-bar';
import { WorkDetails } from '@/components/ui/work-details';

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
  const rows = [
    { label: 'Giao lúc', value: formatTime(task.assignedAt) },
    { label: 'Bắt đầu lúc', value: formatTime(task.startedAt) },
    { label: 'Cập nhật', value: formatTime(task.updatedAt) },
  ];
  const isResume = task.executionStatus === 'Paused';

  return (
    <SafeAreaView edges={['bottom']} style={[styles.root, { backgroundColor: theme.background }]}>
    <ScrollView style={styles.root} contentContainerStyle={styles.content}
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

      <Text selectable style={[styles.reference, { color: theme.textSecondary }]}>{task.referenceCode}</Text>
      <Text style={[styles.value, { color: theme.textSecondary }]}>{task.warehouseName}</Text>
      <Text style={[styles.summary, { color: theme.text }]}>{task.workSummary}</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={[styles.label, { color: theme.textSecondary }]}>Số lượng đã xử lý</Text>
            <Text style={[styles.quantity, { color: theme.primary }]}>{task.completedQuantity.toLocaleString('vi-VN')} / {task.totalQuantity.toLocaleString('vi-VN')}</Text></View>
          <View style={styles.metric}><Text style={[styles.label, { color: theme.textSecondary }]}>Dòng hoàn tất</Text>
            <Text style={[styles.quantity, { color: theme.text }]}>{task.completedItemCount} / {task.itemCount}</Text></View>
        </View>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Hạn hoàn thành: {formatTime(task.dueAt)}</Text>
        {task.pauseReason && isResume && <Text style={[styles.value, { color: theme.warning }]}>Lý do tạm dừng: {task.pauseReason}</Text>}
        <WorkDetails title="Thông tin phân công và thời gian">

        {rows.map((row) => (
          <View key={row.label} accessible style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{row.label}</Text>
            <Text style={[styles.value, { color: theme.text }]}>{row.value}</Text>
          </View>
        ))}
        </WorkDetails>
      </View>
    </ScrollView>
    {(onOpenDocument || availableActions.length > 0) && <WorkActionBar>
      {availableActions.includes('Start') && <Button label={isResume ? 'Tiếp tục' : 'Bắt đầu'} loading={isPending}
        renderIcon={color => <Play size={16} color={color} />} onPress={() => onAction('Start')} />}
      {onOpenDocument && <Button label={documentLabel} onPress={onOpenDocument}
        variant={availableActions.includes('Start') ? 'outline' : 'primary'} loading={openingDocument} disabled={isPending} />}
      {(availableActions.includes('Pause') || availableActions.includes('Return')) && <View style={styles.secondaryActions}>
        {availableActions.includes('Pause') && <View style={styles.secondaryAction}><Button variant="outline" label="Tạm dừng" disabled={isPending}
          renderIcon={color => <Pause size={16} color={color} />} onPress={() => onAction('Pause')} /></View>}
        {availableActions.includes('Return') && <View style={styles.secondaryAction}><Button variant="ghost" label="Trả lại công việc" disabled={isPending}
          renderIcon={color => <Undo2 size={16} color={color} />} onPress={() => onAction('Return')} /></View>}
      </View>}
    </WorkActionBar>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  reference: { fontFamily: FontFamily.mono, fontSize: 13, lineHeight: 21 },
  summary: { fontFamily: FontFamily.medium, fontSize: 16, lineHeight: 24 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  metric: { flexBasis: 130, flexGrow: 1, gap: 4 },
  quantity: { fontFamily: FontFamily.semibold, fontSize: 24, lineHeight: 34 },
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
  secondaryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondaryAction: { flexBasis: 132, flexGrow: 1, minWidth: 0 },
});
