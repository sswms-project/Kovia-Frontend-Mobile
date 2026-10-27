import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { ClipboardCheck } from 'lucide-react-native';
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
  const reduceMotion = useReducedMotion();
  return <Modal visible={visible} animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={busy ? undefined : onCancel}>
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.icon, { backgroundColor: theme.muted }]}><ClipboardCheck size={26} color={theme.primary} /></View>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.text, { color: theme.textSecondary }]}>{description}</Text>
        {error && <AlertBanner variant="destructive" title="Chưa thể ghi nhận" description={getApiErrorMessage(error)} />}
        <Button label="Xác nhận" loading={busy} onPress={onConfirm} />
        <Button label="Quay lại" variant="outline" disabled={busy} onPress={onCancel} />
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1, minHeight: 0 }, content: { padding: 20, paddingBottom: 48, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' },
  icon: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 32 }, text: { fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 24 } });
