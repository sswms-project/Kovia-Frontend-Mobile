import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { DEADLINE_LABELS, EXECUTION_LABELS, TASK_LABELS } from '../../my-tasks';
import { deadlineStatusSchema, executionStatusSchema, taskTypeSchema, type TaskFilters } from '../../my-tasks.schema';

function FilterChoices<T extends string>({ label, values, labels, value, onChange, disabled }: {
  readonly label: string; readonly values: readonly T[]; readonly labels: Record<T, string>;
  readonly value?: T; readonly onChange: (value?: T) => void; readonly disabled: boolean;
}) {
  const theme = useTheme();
  return <View style={styles.group}>
    <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>
      <Pressable accessibilityRole="radio" accessibilityState={{ checked: !value, disabled }}
        accessibilityLabel={`${label}: Tất cả`} disabled={disabled} onPress={() => onChange(undefined)}
        style={[styles.choice, { backgroundColor: !value ? theme.primaryContainer : theme.card, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.text }]}>Tất cả</Text>
      </Pressable>
      {values.map((candidate) => <Pressable key={candidate} accessibilityRole="radio" disabled={disabled}
        accessibilityState={{ checked: candidate === value, disabled }} accessibilityLabel={`${label}: ${labels[candidate]}`}
        onPress={() => onChange(candidate)} style={[styles.choice, {
          backgroundColor: candidate === value ? theme.primaryContainer : theme.card, borderColor: theme.border,
        }]}><Text style={[styles.label, { color: theme.text }]}>{labels[candidate]}</Text></Pressable>)}
    </ScrollView>
  </View>;
}

export function TaskFiltersPanel({ filters, onChange, disabled }: {
  readonly filters: TaskFilters; readonly onChange: (patch: Partial<TaskFilters>) => void; readonly disabled: boolean;
}) {
  return <View style={styles.group}>
    <FilterChoices label="Loại công việc" values={taskTypeSchema.options} labels={TASK_LABELS}
      value={filters.taskType} onChange={(taskType) => onChange({ taskType })} disabled={disabled} />
    <FilterChoices label="Trạng thái thực hiện" values={executionStatusSchema.options.filter(
      (status) => filters.history ? status === 'Completed' || status === 'Cancelled' : status !== 'Completed' && status !== 'Cancelled',
    )} labels={EXECUTION_LABELS} value={filters.executionStatus}
      onChange={(executionStatus) => onChange({ executionStatus })} disabled={disabled} />
    <FilterChoices label="Thời hạn" values={deadlineStatusSchema.options} labels={DEADLINE_LABELS}
      value={filters.deadlineStatus} onChange={(deadlineStatus) => onChange({ deadlineStatus })} disabled={disabled} />
  </View>;
}

const styles = StyleSheet.create({
  group: { gap: 10 }, choices: { gap: 8, paddingVertical: 2 },
  label: { fontFamily: FontFamily.medium, fontSize: 13 },
  choice: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderRadius: Radius.lg },
});
