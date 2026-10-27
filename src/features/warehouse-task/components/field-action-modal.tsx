import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

interface Props {
  readonly visible: boolean; readonly title: string; readonly busy: boolean; readonly children: ReactNode;
  readonly error?: Error | null; readonly onReview: () => void; readonly onClose: () => void;
  readonly reviewDisabled?: boolean;
}
// Mounted beside the screen list so native/web form scrolling has its own bounded viewport.
export function FieldActionModal({ visible, title, busy, children, error, reviewDisabled = false, onReview, onClose }: Props) {
  const theme = useTheme();
  return <Modal visible={visible} animationType="slide" onRequestClose={busy ? undefined : onClose}>
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
          {children}
          {error && <AlertBanner variant="destructive" title="Chưa thể ghi nhận" description={getApiErrorMessage(error)} />}
          <Button label="Kiểm tra và tiếp tục" disabled={busy || reviewDisabled} onPress={onReview} />
          <Button label="Quay lại" variant="outline" disabled={busy} onPress={onClose} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1, minHeight: 0 }, content: { padding: 20, paddingBottom: 48, gap: 18,
  width: '100%', maxWidth: 640, alignSelf: 'center' }, title: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 32 } });
