import { ChevronDown, ScanBarcode, Search, Warehouse } from 'lucide-react-native';
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
  readonly onChangeWarehouse: () => void;
}

export function GreetingCard({ name, subtitle, onSearch, onScan, onChangeWarehouse }: GreetingCardProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');

  return (
    <View style={[styles.card, { backgroundColor: theme.primary }]}>
      <Text style={[styles.greeting, { color: theme.onPrimary }]} numberOfLines={1}>
        Xin chào, {name}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đổi kho làm việc"
        onPress={onChangeWarehouse}
        style={styles.subtitleRow}>
        <Warehouse size={14} color={theme.onPrimary} />
        <Text style={[styles.subtitle, { color: theme.onPrimary }]} numberOfLines={1}>
          {subtitle}
        </Text>
        <ChevronDown size={14} color={theme.onPrimary} />
      </Pressable>
      <View style={styles.searchRow}>
        <View style={[styles.search, { backgroundColor: theme.card }]}>
          <Search size={18} color={theme.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => {
              const trimmed = query.trim();
              if (trimmed) onSearch(trimmed);
            }}
            returnKeyType="search"
            placeholder="Tìm SKU, mã phiếu, vị trí..."
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text }]}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quét mã"
          onPress={onScan}
          style={[styles.scan, { backgroundColor: theme.primaryContainer }]}>
          <ScanBarcode size={22} color={theme.onPrimaryContainer} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 20, gap: 8 },
  greeting: { fontSize: 22, fontFamily: FontFamily.bold },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subtitle: { flexShrink: 1, fontSize: 13, fontFamily: FontFamily.medium, opacity: 0.85 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: Radius.xl,
  },
  input: { flex: 1, fontSize: 14, fontFamily: FontFamily.regular, paddingVertical: 0 },
  scan: { width: 48, height: 48, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
});
