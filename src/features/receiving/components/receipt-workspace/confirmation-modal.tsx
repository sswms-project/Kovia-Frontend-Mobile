import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

interface ConfirmationModalProps {
  readonly visible: boolean; readonly title: string; readonly description: string; readonly busy: boolean;
  readonly error?: Error | null; readonly onConfirm: () => void; readonly onCancel: () => void;
}
export function ConfirmationModal({ visible, title, description, busy, error, onConfirm, onCancel }: ConfirmationModalProps) {
  const theme = useTheme();
  return <Modal visible={visible} animationType="slide" onRequestClose={busy ? undefined : onCancel}>
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.text, { color: theme.textSecondary }]}>{description}</Text>
        {error && <AlertBanner variant="destructive" title="Chưa thể ghi nhận" description={getApiErrorMessage(error)} />}
        <Button label="Xác nhận" loading={busy} onPress={onConfirm} />
        <Button label="Quay lại" variant="outline" disabled={busy} onPress={onCancel} />
      </View>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 32 }, text: { fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 24 } });
