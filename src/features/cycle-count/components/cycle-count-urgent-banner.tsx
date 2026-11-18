import { Flame } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { formatCountDate, getDeadlineHint, isUrgentOpen } from '../cycle-count.labels';
import type { CycleCount } from '../cycle-count.schema';

interface Props { readonly document: CycleCount; readonly canStart: boolean }
export function CycleCountUrgentBanner({ document, canStart }: Props) {
  const theme = useTheme();
  if (!isUrgentOpen(document)) return null;
  const hint = getDeadlineHint(document.dueAt);
  return <View accessibilityRole="alert" style={[styles.root, { backgroundColor: theme.errorContainer, borderColor: theme.error }]}>
    <Flame size={20} color={theme.onErrorContainer} />
    <Text style={[styles.text, { color: theme.onErrorContainer }]}>
      <Text style={styles.strong}>Phiếu khẩn</Text>
      {document.dueAt ? `: cần hoàn thành trước ${formatCountDate(document.dueAt)}` : ''}
      {hint && <Text style={[styles.strong, hint.tone === 'overdue' && styles.underline]}> ({hint.label})</Text>}
      {canStart ? '. Hãy bắt đầu kiểm kê ngay.' : '.'}
    </Text>
  </View>;
}
const styles = StyleSheet.create({ root: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderWidth: 1, borderRadius: Radius.lg },
  text: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 }, strong: { fontFamily: FontFamily.semibold },
  underline: { textDecorationLine: 'underline' } });
