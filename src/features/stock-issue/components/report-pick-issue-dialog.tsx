import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { reportPickIssueFormSchema } from '../stock-issue.schema';

interface Props { readonly code: string; readonly busy: boolean; readonly error: Error | null;
  readonly onSubmit: (reason: string) => void; readonly onClose: () => void }
export function ReportPickIssueDialog({ code, busy, error, onSubmit, onClose }: Props) {
  const theme = useTheme();
  const [reason, setReason] = useState('');
  const [issue, setIssue] = useState<string | null>(null);
  function submit() {
    const parsed = reportPickIssueFormSchema.safeParse({ reason });
    if (!parsed.success) return setIssue(parsed.error.issues[0]?.message ?? 'Dữ liệu chưa hợp lệ.');
    setIssue(null); onSubmit(parsed.data.reason);
  }
  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Báo hàng lỗi - phiếu {code}</Text>
      {(issue || error) && <AlertBanner variant="destructive" title={issue ?? 'Chưa thể gửi báo cáo'} description={issue ? undefined : getApiErrorMessage(error)} />}
      <TextField label="Mô tả vấn đề" value={reason} editable={!busy} multiline maxLength={500} onChangeText={setReason} />
      <Button label="Gửi báo cáo" loading={busy} onPress={submit} />
      <Button label="Đóng" variant="outline" disabled={busy} onPress={onClose} />
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, gap: 18 },
  title: { fontFamily: FontFamily.bold, fontSize: 25, lineHeight: 34 } });
