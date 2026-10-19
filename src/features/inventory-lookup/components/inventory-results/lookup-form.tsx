import { Controller, type UseFormReturn } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { LookupInput } from '../../inventory-lookup.schema';

interface LookupFormProps {
  readonly form: UseFormReturn<LookupInput>;
  readonly busy: boolean;
  readonly onSearch: () => void;
  readonly onCamera: () => void;
  readonly onClear: () => void;
}
export function LookupForm({ form, busy, onSearch, onCamera, onClear }: LookupFormProps) {
  const theme = useTheme();
  return <View style={styles.root}>
    <Controller control={form.control} name="kind" render={({ field }) => <View style={styles.row}>
      <Button label="Mã sản phẩm" variant={field.value === 'Product' ? 'primary' : 'outline'} disabled={busy}
        onPress={() => field.onChange('Product')} />
      <Button label="Mã vị trí" variant={field.value === 'Location' ? 'primary' : 'outline'} disabled={busy}
        onPress={() => field.onChange('Location')} />
    </View>} />
    <Controller control={form.control} name="code" render={({ field, fieldState }) => <View style={styles.field}>
      <Text style={[styles.text, { color: theme.text }]}>SKU, mã vạch hoặc mã vị trí đầy đủ</Text>
      <TextInput accessibilityLabel="Mã cần tra cứu" placeholder="Nhập hoặc quét mã" value={field.value}
        onChangeText={field.onChange} onBlur={field.onBlur} autoCapitalize="none" autoCorrect={false}
        returnKeyType="search" editable={!busy} onSubmitEditing={onSearch} maxLength={513}
        placeholderTextColor={theme.textSecondary} style={[styles.input, { borderColor: theme.border,
          color: theme.text, backgroundColor: theme.card }]} />
      {fieldState.error && <Text accessibilityRole="alert" style={[styles.text, { color: theme.error }]}>{fieldState.error.message}</Text>}
    </View>} />
    <Button label="Tra mã chính xác" loading={busy} onPress={onSearch} />
    <View style={styles.row}>
      <Button label="Quét camera" variant="outline" disabled={busy} onPress={onCamera} />
      <Button label="Xem toàn bộ tồn" variant="ghost" disabled={busy} onPress={onClear} />
    </View>
  </View>;
}
const styles = StyleSheet.create({
  root: { gap: 12 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, field: { gap: 6 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12,
    paddingVertical: 10, fontFamily: FontFamily.regular, fontSize: 16 },
});
