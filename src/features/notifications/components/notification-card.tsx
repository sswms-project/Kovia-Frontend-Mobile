import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { WarehouseNotification } from '../notifications.schema';

interface Props { readonly item: WarehouseNotification; readonly busy: boolean; readonly canOpen: boolean;
  readonly onRead: (id: string) => void; readonly onOpen: (item: WarehouseNotification) => void }
export const NotificationCard = memo(function NotificationCard({ item, busy, canOpen, onRead, onOpen }: Props) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: item.isRead ? theme.border : theme.primary }]}>
    <Text style={[styles.status, { color: theme.primary }]}>{item.isRead ? 'Đã đọc' : 'Chưa đọc'} · {new Date(item.createdAt).toLocaleString('vi-VN')}</Text>
    <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>{item.message}</Text>
    <View style={styles.actions}>{!item.isRead && <Button label="Đánh dấu đã đọc" variant="ghost" disabled={busy} onPress={() => onRead(item.id)} />}
    {canOpen && <Button label="Xem nội dung" variant="ghost" disabled={busy} onPress={() => onOpen(item)} />}
    </View>
  </View>;
});
const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, card: { padding: 14, gap: 6, borderWidth: 1, borderRadius: Radius.lg },
  status: { fontFamily: FontFamily.medium, fontSize: 12, lineHeight: 20 },
  title: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24 }, text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
