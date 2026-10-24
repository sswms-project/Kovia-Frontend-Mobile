import { Eye, EyeOff } from 'lucide-react-native';
import { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface TextFieldProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  readonly label: string;
  readonly error?: string;
  readonly hint?: string;
  /** Renders a show/hide toggle and masks the value. */
  readonly isPassword?: boolean;
  /** Shown on the label row's right side, e.g. a "Forgot password?" link. */
  readonly labelAccessory?: ReactNode;
  readonly inputRef?: Ref<ComponentRef<typeof TextInput>>;
}

export function TextField({
  label,
  error,
  hint,
  isPassword = false,
  labelAccessory,
  inputRef,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const borderColor = error ? theme.error : isFocused ? theme.primary : theme.input;

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        {labelAccessory}
      </View>
      <View style={[styles.inputWrapper, { borderColor, backgroundColor: theme.card }]}>
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          placeholderTextColor={theme.textSecondary}
          selectionColor={theme.primary}
          secureTextEntry={isPassword && !isRevealed}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, { color: theme.text }, isPassword && styles.inputWithToggle]}
          {...inputProps}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isRevealed ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            hitSlop={8}
            onPress={() => setIsRevealed((value) => !value)}
            style={styles.toggle}>
            {isRevealed ? (
              <EyeOff size={18} color={theme.textSecondary} />
            ) : (
              <Eye size={18} color={theme.textSecondary} />
            )}
          </Pressable>
        ) : null}
      </View>
      {hint && !error ? <Text style={[styles.message, { color: theme.textSecondary }]}>{hint}</Text> : null}
      {error ? (
        <Text accessibilityRole="alert" style={[styles.message, { color: theme.error }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 20 },
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    letterSpacing: 0.77,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  input: { flex: 1, minHeight: 48, paddingHorizontal: 12, fontFamily: FontFamily.regular, fontSize: 16 },
  inputWithToggle: { paddingRight: 4 },
  toggle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  message: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
});
