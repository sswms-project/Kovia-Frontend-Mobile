import { AlertCircle, CheckCircle2, ScanLine } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { LastScan } from '../scanner.types';

interface ScanStatusProps {
  readonly isProcessing: boolean;
  readonly lastScan: LastScan | null;
}

export function ScanStatus({ isProcessing, lastScan }: ScanStatusProps) {
  const theme = useTheme();

  if (isProcessing) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.row}>
        <ActivityIndicator color={theme.primary} />
        <Text style={[styles.text, { color: theme.textSecondary }]}>Đang xử lý…</Text>
      </View>
    );
  }

  if (!lastScan) {
    return (
      <View style={styles.row}>
        <ScanLine size={18} color={theme.textSecondary} />
        <Text style={[styles.text, { color: theme.textSecondary }]}>Chưa quét mã nào</Text>
      </View>
    );
  }

  // Colour is paired with an icon and a label so the verdict never depends on colour alone.
  const isInvalid = lastScan.isValid === false;
  const Icon = isInvalid ? AlertCircle : CheckCircle2;
  const color = isInvalid ? theme.error : theme.primary;
  const label = isInvalid ? 'Mã không hợp lệ' : 'Đã quét';

  return (
    <View accessible accessibilityLiveRegion="polite" accessibilityLabel={`${label} ${lastScan.code}`} style={styles.row}>
      <Icon size={18} color={color} />
      <Text style={[styles.text, { color }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.code, { color: theme.text }]}>
        {lastScan.code}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontFamily: FontFamily.medium, fontSize: 13 },
  code: { flex: 1, fontFamily: FontFamily.mono, fontSize: 14 },
});
