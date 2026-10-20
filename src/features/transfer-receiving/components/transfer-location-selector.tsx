import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import type { TransferExecutionSlot } from '../transfer-execution.schema';
import { transferReceivingApi } from '../transfer-receiving.api';

export function TransferLocationSelector({ warehouseId, scopeKey, title, selected, onSelect, disabled }: {
  readonly warehouseId: string; readonly scopeKey: string; readonly title: string; readonly selected: TransferExecutionSlot | null;
  readonly onSelect: (slot: TransferExecutionSlot) => void; readonly disabled: boolean;
}) {
  const theme = useTheme();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const slots = useQuery({ queryKey: ['warehouse', scopeKey, warehouseId, 'transfer-locations', search], retry: false,
    queryFn: ({ signal }) => transferReceivingApi.slots(warehouseId, search, signal) });
  return <View style={styles.section}>
    <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
    {selected && <Text style={[styles.text, { color: theme.textSecondary }]}>Đã chọn: {selected.path}</Text>}
    <TextField label="Tìm mã vị trí / kệ" value={input} onChangeText={setInput} maxLength={100} editable={!disabled} autoCapitalize="characters" />
    <Button label="Tìm vị trí" variant="outline" disabled={disabled || slots.isFetching} onPress={() => setSearch(input.trim())} />
    {slots.error && <AlertBanner title="Chưa tải được vị trí" description={getApiErrorMessage(slots.error)} />}
    {!slots.isError && (slots.data ?? []).map(slot => <Button key={slot.id} label={slot.path} variant="outline"
      disabled={disabled || slots.isFetching} onPress={() => onSelect(slot)} />)}
    {slots.data?.length === 20 && <Text style={[styles.text, { color: theme.textSecondary }]}>Đang hiển thị tối đa 20 vị trí. Thu hẹp từ khóa nếu chưa thấy vị trí cần chọn.</Text>}
    {slots.isSuccess && !slots.data.length && <Text style={[styles.text, { color: theme.textSecondary }]}>Không có vị trí phù hợp.</Text>}
  </View>;
}
const styles = StyleSheet.create({ section: { gap: 10 }, title: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
