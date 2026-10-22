import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SelectionOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

interface SelectionFieldProps {
  readonly label: string;
  readonly value: string;
  readonly options: readonly SelectionOption[];
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly onChange: (value: string) => void;
}

export function SelectionField({ label, value, options, placeholder = 'Chọn một mục', disabled = false, onChange }: SelectionFieldProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find((option) => option.value === value);
  const keyword = search.trim().toLocaleLowerCase('vi');
  const filtered = options.filter((option) => `${option.label} ${option.description ?? ''}`.toLocaleLowerCase('vi').includes(keyword));
  function close() { setOpen(false); setSearch(''); }
  return <View style={styles.field}>
    <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
      accessibilityState={{ expanded: open, disabled }} disabled={disabled} onPress={() => setOpen(true)}
      style={({ pressed }) => [styles.trigger, { backgroundColor: theme.card, borderColor: theme.border }, (pressed || disabled) && styles.dim]}>
      <View style={styles.copy}>
        <Text style={[styles.value, { color: theme.text }]} numberOfLines={2}>{selected?.label ?? placeholder}</Text>
        {!!selected?.description && <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={1}>{selected.description}</Text>}
      </View>
      <ChevronDown size={20} color={theme.textSecondary} />
    </Pressable>
    <Modal visible={open && !disabled} transparent animationType="slide" onRequestClose={close}>
      <View style={[styles.overlay, { backgroundColor: theme.scrim }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng bảng chọn" onPress={close} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{label}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Đóng bảng chọn" onPress={close} style={styles.iconButton}><X size={22} color={theme.text} /></Pressable>
          </View>
          {options.length > 5 && <View style={[styles.search, { backgroundColor: theme.muted, borderColor: theme.border }]}>
            <Search size={18} color={theme.textSecondary} />
            <TextInput accessibilityLabel={`Tìm ${label.toLocaleLowerCase('vi')}`} value={search} onChangeText={setSearch}
              placeholder="Tìm theo tên hoặc mã" placeholderTextColor={theme.textSecondary} autoCorrect={false}
              style={[styles.searchInput, { color: theme.text }]} />
          </View>}
          <FlatList style={styles.list} data={filtered} keyExtractor={(option) => option.value} keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: item.value === value }}
              onPress={() => { if (!disabled) onChange(item.value); close(); }}
              style={({ pressed }) => [styles.option, { backgroundColor: item.value === value ? theme.muted : theme.card }, pressed && styles.dim]}>
              <View style={styles.copy}>
                <Text style={[styles.value, { color: theme.text }]}>{item.label}</Text>
                {!!item.description && <Text style={[styles.description, { color: theme.textSecondary }]}>{item.description}</Text>}
              </View>
              {item.value === value && <Check size={20} color={theme.primary} />}
            </Pressable>}
            ListEmptyComponent={<Text style={[styles.empty, { color: theme.textSecondary }]}>Không tìm thấy mục phù hợp.</Text>} />
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: 8 }, label: { fontFamily: FontFamily.medium, fontSize: 13, lineHeight: 18 },
  trigger: { minHeight: 52, borderWidth: 1, borderRadius: Radius.xl, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, gap: 4 }, value: { fontFamily: FontFamily.medium, fontSize: 15, lineHeight: 22 },
  description: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 19 }, dim: { opacity: 0.6 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  title: { flex: 1, fontFamily: FontFamily.semibold, fontSize: 20, lineHeight: 28 },
  iconButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  search: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderWidth: 1, borderRadius: Radius.xl, marginBottom: 8 },
  searchInput: { flex: 1, fontFamily: FontFamily.regular, fontSize: 16, minHeight: 48 },
  option: { minHeight: 56, padding: 14, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  empty: { padding: 20, fontFamily: FontFamily.regular, fontSize: 14 },
  list: { flexGrow: 0 },
});
