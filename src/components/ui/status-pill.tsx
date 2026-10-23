import { StyleSheet, Text, View } from 'react-native';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PillTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

interface StatusPillProps {
  readonly label: string;
  readonly tone: PillTone;
}

/** Small status label. The text always carries the meaning; the tone only reinforces it. */
export function StatusPill({ label, tone }: StatusPillProps) {
  const theme = useTheme();
  const colors = {
    primary: { background: theme.primary, text: theme.onPrimary },
    success: { background: theme.secondaryContainer, text: theme.onSecondaryContainer },
    warning: { background: theme.warningContainer, text: theme.onWarningContainer },
    danger: { background: theme.errorContainer, text: theme.onErrorContainer },
    neutral: { background: theme.muted, text: theme.textSecondary },
  }[tone];

  return (
    <View style={[styles.pill, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  label: { fontFamily: FontFamily.medium, fontSize: 11 },
});
