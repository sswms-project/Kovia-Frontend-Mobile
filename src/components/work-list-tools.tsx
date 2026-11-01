import { StyleSheet, Text, View } from 'react-native';
import { SelectionField } from '@/components/ui/selection-field';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type WorkFilter = 'all' | 'pending' | 'done';
const options = [{ value: 'all', label: 'Tất cả dòng hàng' }, { value: 'pending', label: 'Còn cần thực hiện' }, { value: 'done', label: 'Đã xử lý' }];
export function WorkListTools({ search, onSearch, filter, onFilter, shown, total, disabled = false }: {
  readonly search: string; readonly onSearch: (value: string) => void; readonly filter: WorkFilter;
  readonly onFilter: (value: WorkFilter) => void; readonly shown: number; readonly total: number; readonly disabled?: boolean;
}) {
  const theme = useTheme();
  return <View style={styles.root}>
    <TextField label="Tìm trong phiếu" placeholder="SKU, tên hàng, vị trí hoặc lô" value={search} onChangeText={onSearch}
      editable={!disabled} autoCorrect={false} autoCapitalize="none" maxLength={100} returnKeyType="search" />
    <SelectionField label="Hiển thị" value={filter} options={options} disabled={disabled}
      onChange={value => { if (value === 'all' || value === 'pending' || value === 'done') onFilter(value); }} />
    <Text accessibilityLiveRegion="polite" style={[styles.count, { color: theme.textSecondary }]}>{shown}/{total} dòng · Bộ lọc chỉ thay đổi hiển thị</Text>
  </View>;
}
export function matchesWorkLine(search: string, pending: boolean, filter: WorkFilter, values: readonly (string | null | undefined)[]) {
  const keyword = search.trim().toLocaleLowerCase('vi');
  return (filter === 'all' || (filter === 'pending' ? pending : !pending)) && (!keyword || values.filter(Boolean).join(' ').toLocaleLowerCase('vi').includes(keyword));
}
const styles = StyleSheet.create({ root: { gap: 12 }, count: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 20 } });
