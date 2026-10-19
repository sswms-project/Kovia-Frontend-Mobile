import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface OtpInputProps {
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly length?: number;
  readonly invalid?: boolean;
  readonly disabled?: boolean;
}

export function OtpInput({ value, onChangeText, length = 6, invalid = false, disabled = false }: OtpInputProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <Pressable
      accessibilityRole="none"
      onPress={() => inputRef.current?.focus()}
      disabled={disabled}
      style={styles.row}>
      {Array.from({ length }).map((_, index) => {
        const isActive = isFocused && index === activeIndex;
        const borderColor = invalid ? theme.error : isActive ? theme.primary : theme.input;
        return (
          <View
            key={index}
            style={[styles.slot, { borderColor, backgroundColor: theme.card }, isActive && styles.slotActive]}>
            <Text style={[styles.digit, { color: theme.text }]}>{value[index] ?? ''}</Text>
          </View>
        );
      })}
      {/* A single hidden input receives all typing, paste and one-time-code autofill. */}
      <TextInput
        ref={inputRef}
        accessibilityLabel={`Mã OTP ${length} chữ số`}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, length))}
        editable={!disabled}
        keyboardType="number-pad"
        maxLength={length}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        caretHidden
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  slot: {
    width: 46,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  slotActive: { borderWidth: 2 },
  digit: { fontFamily: FontFamily.mono, fontSize: 22 },
  hiddenInput: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.01 },
});
