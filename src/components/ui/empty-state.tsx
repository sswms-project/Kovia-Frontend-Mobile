import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { StateContainer } from './state-container';

interface EmptyStateProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly fullScreen?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  fullScreen = false,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <StateContainer fullScreen={fullScreen}>
      <View style={[styles.badge, { backgroundColor: theme.secondaryContainer }]}>
        <Icon size={32} color={theme.primary} />
      </View>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>
      {description ? (
        <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button variant="outline" label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </StateContainer>
  );
}

const styles = StyleSheet.create({
  badge: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 36 },
  title: { fontFamily: FontFamily.semibold, fontSize: 18, lineHeight: 26, textAlign: 'center' },
  description: {
    maxWidth: 320,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  action: { alignSelf: 'stretch', maxWidth: 320, marginTop: 8 },
});
