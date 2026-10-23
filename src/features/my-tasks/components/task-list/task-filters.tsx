import { StyleSheet, View } from 'react-native';

import { SelectionField } from '@/components/ui/selection-field';

import { DEADLINE_LABELS, EXECUTION_LABELS, TASK_LABELS } from '../../my-tasks';
import { deadlineStatusSchema, executionStatusSchema, taskTypeSchema, type TaskFilters } from '../../my-tasks.schema';

export function TaskFiltersPanel({ filters, onChange, disabled }: {
  readonly filters: TaskFilters; readonly onChange: (patch: Partial<TaskFilters>) => void; readonly disabled: boolean;
}) {
  return <View style={styles.group}>
    <SelectionField label="Loại công việc" value={filters.taskType ?? ''} disabled={disabled}
      options={[{ value: '', label: 'Tất cả công việc' }, ...taskTypeSchema.options.map((value) => ({ value, label: TASK_LABELS[value] }))]}
      onChange={(value) => onChange({ taskType: value ? taskTypeSchema.parse(value) : undefined })} />
    <SelectionField label="Trạng thái" value={filters.executionStatus ?? ''} disabled={disabled}
      options={[{ value: '', label: 'Tất cả trạng thái' }, ...executionStatusSchema.options.filter(
        (status) => filters.history ? status === 'Completed' || status === 'Cancelled' : status !== 'Completed' && status !== 'Cancelled',
      ).map((value) => ({ value, label: EXECUTION_LABELS[value] }))]}
      onChange={(value) => onChange({ executionStatus: value ? executionStatusSchema.parse(value) : undefined })} />
    <SelectionField label="Thời hạn" value={filters.deadlineStatus ?? ''} disabled={disabled}
      options={[{ value: '', label: 'Tất cả thời hạn' }, ...deadlineStatusSchema.options.map((value) => ({ value, label: DEADLINE_LABELS[value] }))]}
      onChange={(value) => onChange({ deadlineStatus: value ? deadlineStatusSchema.parse(value) : undefined })} />
  </View>;
}

const styles = StyleSheet.create({ group: { gap: 12 } });
