import { Search, X } from 'lucide-react-native';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SearchFieldProps {
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly placeholder: string;
  readonly accessibilityLabel: string;
}

export function SearchField({ value, onChangeText, placeholder, accessibilityLabel }: SearchFieldProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.input }]}>
      <Search size={18} color={theme.textSecondary} />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        selectionColor={theme.primary}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={[styles.input, { color: theme.text }]}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Xóa nội dung tìm kiếm"
          hitSlop={8}
          onPress={() => onChangeText('')}
          style={styles.clear}>
          <X size={18} color={theme.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  input: { flex: 1, minHeight: 48, fontFamily: FontFamily.regular, fontSize: 16 },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
