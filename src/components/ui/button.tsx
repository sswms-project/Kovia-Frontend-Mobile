import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonVariant = 'primary' | 'outline' | 'ghost';

interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: ButtonVariant;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  /** Receives the label colour so the icon always matches the variant. */
  readonly renderIcon?: (color: string) => ReactNode;
  readonly accessibilityLabel?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  renderIcon,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();
  const isInactive = disabled || loading;
  const labelColor = variant === 'primary' ? theme.onPrimary : variant === 'ghost' ? theme.primary : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && { backgroundColor: theme.primary },
        variant === 'outline' && { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
        isInactive && styles.inactive,
        pressed && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <View style={styles.content}>
          {renderIcon?.(labelColor)}
          <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, maxWidth: '100%' },
  label: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 22, flexShrink: 1, textAlign: 'center' },
  inactive: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
