import { Controller, type UseFormReturn } from 'react-hook-form';
import { KeyboardAvoidingView, Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { TaskActionReasonFormValues } from '../warehouse-task.schema';

interface TaskReasonDialogProps {
  readonly visible: boolean;
  readonly title: string;
  readonly description: string;
  readonly form: UseFormReturn<TaskActionReasonFormValues>;
  readonly isPending: boolean;
  readonly onSubmit: (values: TaskActionReasonFormValues) => void;
  readonly onCancel: () => void;
}

export function TaskReasonDialog({
  visible,
  title,
  description,
  form,
  isPending,
  onSubmit,
  onCancel,
}: TaskReasonDialogProps) {
  const theme = useTheme();
  const submit = form.handleSubmit(onSubmit);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isPending) onCancel();
      }}>
      <KeyboardAvoidingView
        behavior="padding"
        style={[styles.backdrop, { backgroundColor: theme.scrim }]}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
            {title}
          </Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>

          <Controller
            control={form.control}
            name="reason"
            render={({ field, fieldState }) => (
              <TextField
                label="Lý do"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                multiline
                maxLength={500}
                autoFocus
                editable={!isPending}
              />
            )}
          />

          <View style={styles.actions}>
            <Button variant="outline" label="Hủy" disabled={isPending} onPress={onCancel} />
            <Button label="Xác nhận" loading={isPending} onPress={submit} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, gap: 14, padding: 20, borderWidth: 1, borderRadius: Radius.xl },
  title: { fontFamily: FontFamily.semibold, fontSize: 18, lineHeight: 26 },
  description: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 },
  actions: { gap: 10 },
});
