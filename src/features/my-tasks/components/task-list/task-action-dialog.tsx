import { Controller, type UseFormReturn } from 'react-hook-form';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { ACTION_LABELS } from '../../my-tasks';
import type { TaskActionInput, WarehouseTask } from '../../my-tasks.schema';

interface TaskActionDialogProps {
  readonly target: { task: WarehouseTask; action: TaskActionInput['action'] } | null;
  readonly form: UseFormReturn<TaskActionInput>;
  readonly busy: boolean;
  readonly awaitingRefresh: boolean;
  readonly error: Error | null;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function TaskActionDialog({ target, form, busy, awaitingRefresh, error, onConfirm, onCancel }: TaskActionDialogProps) {
  const theme = useTheme();
  return <Modal visible={!!target} animationType="slide" onRequestClose={busy ? undefined : onCancel}>
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{target ? ACTION_LABELS[target.action] : ''}</Text>
          <Text style={[styles.code, { color: theme.primary }]}>{target?.task.referenceCode}</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>{target?.task.warehouseName}</Text>
          <AlertBanner title={target?.action === 'Return' ? 'Công việc sẽ được trả về quản lý và bỏ khỏi danh sách được giao cho bạn.'
            : 'Thao tác cập nhật trạng thái làm việc. Việc nhận, xuất, cất hàng hoặc kiểm kê được ghi nhận ở màn hình nghiệp vụ riêng.'} />
          {target?.action !== 'Start' && <Controller control={form.control} name="reason" render={({ field, fieldState }) => (
            <TextField label="Lý do" accessibilityLabel="Lý do thao tác công việc" value={field.value ?? ''}
              onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message}
              multiline numberOfLines={4} maxLength={501} editable={!busy} autoCapitalize="sentences" />
          )} />}
          {error && <AlertBanner variant="destructive" title="Chưa thể xác nhận thao tác" description={getApiErrorMessage(error)} />}
          <Button label="Xác nhận" loading={busy} disabled={awaitingRefresh} onPress={onConfirm} />
          <Button label="Hủy" variant="outline" disabled={busy} onPress={onCancel} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { width: '100%', maxWidth: 600, alignSelf: 'center', padding: 20, gap: 18 },
  title: { fontFamily: FontFamily.bold, fontSize: 26, lineHeight: 34 },
  code: { fontFamily: FontFamily.mono, fontSize: 18 }, text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 22 },
});
