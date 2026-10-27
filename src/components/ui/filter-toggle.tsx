import { ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface FilterToggleProps {
  readonly open: boolean;
  readonly activeCount: number;
  readonly onToggle: () => void;
  readonly onClear: () => void;
  readonly disabled?: boolean;
}

/** Compact pill that opens/closes a filter panel and clears active filters. */
export function FilterToggle({ open, activeCount, onToggle, onClear, disabled = false }: FilterToggleProps) {
  const theme = useTheme();
  const highlighted = open || activeCount > 0;
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Bộ lọc" accessibilityState={{ expanded: open, disabled }}
        disabled={disabled} onPress={onToggle}
        style={({ pressed }) => [styles.pill, {
          borderColor: highlighted ? theme.primary : theme.border, backgroundColor: theme.card,
        }, disabled && styles.disabled, pressed && styles.pressed]}>
        <SlidersHorizontal size={15} color={theme.primary} />
        <Text style={[styles.label, { color: theme.text }]}>Bộ lọc</Text>
        {activeCount > 0 && <View style={[styles.badge, { backgroundColor: theme.primary }]}>
          <Text style={[styles.badgeText, { color: theme.onPrimary }]}>{activeCount}</Text>
        </View>}
        {open ? <ChevronUp size={15} color={theme.textSecondary} /> : <ChevronDown size={15} color={theme.textSecondary} />}
      </Pressable>
      {activeCount > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Xóa bộ lọc" disabled={disabled} onPress={onClear}
        style={({ pressed }) => [styles.clear, disabled && styles.disabled, pressed && styles.pressed]}>
        <X size={14} color={theme.textSecondary} />
        <Text style={[styles.clearLabel, { color: theme.textSecondary }]}>Xóa</Text>
      </Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    height: 36, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 18, paddingHorizontal: 12,
  },
  label: { fontFamily: FontFamily.semibold, fontSize: 13, lineHeight: 18 },
  badge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontFamily: FontFamily.semibold, fontSize: 11, lineHeight: 14 },
  clear: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  clearLabel: { fontFamily: FontFamily.medium, fontSize: 13, lineHeight: 18 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
