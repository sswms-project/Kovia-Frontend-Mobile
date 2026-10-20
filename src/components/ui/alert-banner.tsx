import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface AlertBannerProps {
  readonly variant?: 'default' | 'destructive' | 'success';
  readonly title: string;
  readonly description?: string;
  /** Optional action rendered under the text, e.g. a "resend" button. */
  readonly children?: ReactNode;
}

export function AlertBanner({ variant = 'default', title, description, children }: AlertBannerProps) {
  const theme = useTheme();
  const isDestructive = variant === 'destructive';
  const backgroundColor = isDestructive ? theme.errorContainer : theme.card;
  const borderColor = isDestructive ? theme.error : variant === 'success' ? theme.primary : theme.border;
  const textColor = isDestructive ? theme.onErrorContainer : theme.text;
  const iconColor = isDestructive ? theme.error : variant === 'success' ? theme.primary : theme.textSecondary;
  const Icon = isDestructive ? AlertCircle : variant === 'success' ? CheckCircle2 : Info;

  return (
    <View
      accessibilityRole="alert"
      accessible
      style={[styles.container, { backgroundColor, borderColor }]}>
      <Icon size={18} color={iconColor} style={styles.icon} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        {description ? <Text style={[styles.description, { color: textColor }]}>{description}</Text> : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 10, padding: 12, borderWidth: 1, borderRadius: Radius.md },
  icon: { marginTop: 1 },
  body: { flex: 1, gap: 4 },
  title: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 },
  description: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
});
