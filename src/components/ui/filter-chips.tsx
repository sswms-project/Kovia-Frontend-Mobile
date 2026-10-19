import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface FilterOption<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
}

interface FilterChipsProps<TValue extends string> {
  /** Names the group for screen readers, e.g. "Lọc theo trạng thái". */
  readonly accessibilityLabel: string;
  readonly options: readonly FilterOption<TValue>[];
  /** Null means "no filter". */
  readonly value: TValue | null;
  readonly onChange: (value: TValue | null) => void;
  readonly allLabel?: string;
}

export function FilterChips<TValue extends string>({
  accessibilityLabel,
  options,
  value,
  onChange,
  allLabel = 'Tất cả',
}: FilterChipsProps<TValue>) {
  const theme = useTheme();
  const chips: readonly { value: TValue | null; label: string }[] = [
    { value: null, label: allLabel },
    ...options,
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={styles.row}>
      {chips.map((chip) => {
        const isSelected = chip.value === value;
        return (
          <Pressable
            key={chip.value ?? 'all'}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            hitSlop={4}
            onPress={() => onChange(chip.value)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isSelected ? theme.primary : theme.card,
                borderColor: isSelected ? theme.primary : theme.border,
              },
              pressed && styles.pressed,
            ]}>
            <Text
              style={[styles.label, { color: isSelected ? theme.onPrimary : theme.text }]}>
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 20 },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 999,
  },
  label: { fontFamily: FontFamily.medium, fontSize: 13 },
  pressed: { opacity: 0.7 },
});
