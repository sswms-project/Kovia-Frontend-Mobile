import { ScanBarcode, Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface GreetingCardProps {
  readonly name: string;
  /** "Vai trò • Tên kho" lấy từ hồ sơ và kho đang chọn. */
  readonly subtitle: string;
  readonly onSearch: (query: string) => void;
  readonly onScan: () => void;
}

export function GreetingCard({ name, subtitle, onSearch, onScan }: GreetingCardProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.greeting, { color: theme.text }]} numberOfLines={1}>
        Xin chào, {name}
      </Text>
      <View style={styles.subtitleRow}>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.searchRow}>
        <View style={[styles.search, { backgroundColor: theme.muted, borderColor: theme.border }]}>
          <Search size={18} color={theme.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => {
              const trimmed = query.trim();
              if (trimmed) onSearch(trimmed);
            }}
            returnKeyType="search"
            placeholder="Tìm SKU hoặc mã vạch"
            accessibilityLabel="Tìm sản phẩm theo SKU hoặc mã vạch"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text }]}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quét mã"
          onPress={onScan}
          style={[styles.scan, { backgroundColor: theme.primary }]}>
          <ScanBarcode size={22} color={theme.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 10 },
  greeting: { fontSize: 24, lineHeight: 32, fontFamily: FontFamily.bold },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subtitle: { flexShrink: 1, fontSize: 13, fontFamily: FontFamily.medium },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: Radius.xl,
  },
  input: { flex: 1, fontSize: 14, fontFamily: FontFamily.regular, paddingVertical: 0 },
  scan: { width: 48, height: 48, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
});
