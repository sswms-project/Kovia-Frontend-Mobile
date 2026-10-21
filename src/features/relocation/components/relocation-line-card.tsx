import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { RelocationLine } from '../relocation.schema';

interface Props { readonly line: RelocationLine; readonly canExecute: boolean; readonly busy: boolean; readonly onOpen: (line: RelocationLine) => void }
export const RelocationLineCard = memo(function RelocationLineCard({ line, canExecute, busy, onOpen }: Props) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <Text style={[styles.title, { color: theme.text }]}>{line.sku} · {line.productName}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>Từ {line.sourceSlotCode} → {line.proposedDestinationSlotCode ?? 'Vị trí được hệ thống gợi ý'}</Text>
    <Text style={[styles.text, { color: theme.text }]}>Đã chuyển {line.completedQuantity}/{line.quantity} · Còn {line.remainingQuantity}</Text>
    {canExecute && line.remainingQuantity > 0 && <Button label={`Ghi nhận chuyển ${line.sku}`} disabled={busy} onPress={() => onOpen(line)} />}
    {line.remainingQuantity === 0 && <Text style={[styles.text, { color: theme.textSecondary }]}>Dòng hàng đã hoàn tất.</Text>}
  </View>;
});
const styles = StyleSheet.create({ card: { padding: 16, gap: 10, borderWidth: 1, borderRadius: Radius.xl },
  title: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24 }, text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
