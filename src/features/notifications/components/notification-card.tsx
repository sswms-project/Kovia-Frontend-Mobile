import { Bell } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDateTime } from '@/lib/date-format';

import type { WarehouseNotification } from '../notifications.schema';

function timeAgo(iso: string) {
  const date = new Date(iso);
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`;
  return formatDisplayDateTime(date);
}

interface Props { readonly item: WarehouseNotification; readonly busy: boolean; readonly canOpen: boolean;
  readonly onRead: (id: string) => void; readonly onOpen: (item: WarehouseNotification) => void }
export const NotificationCard = memo(function NotificationCard({ item, busy, canOpen, onRead, onOpen }: Props) {
  const theme = useTheme();
  return <Pressable accessibilityRole={canOpen ? 'button' : undefined} disabled={!canOpen || busy} onPress={() => onOpen(item)}
    style={({ pressed }) => [styles.card, { backgroundColor: theme.card, borderColor: theme.border }, pressed && styles.pressed]}>
    <View style={[styles.icon, { backgroundColor: item.isRead ? theme.muted : theme.primary }]}>
      <Bell size={18} color={item.isRead ? theme.textSecondary : theme.onPrimary} />
    </View>
    <View style={styles.body}>
      <View style={styles.row}>
        <Text numberOfLines={1} style={[styles.title, { color: item.isRead ? theme.textSecondary : theme.primary }]}>{item.title}</Text>
        <Text style={[styles.time, { color: theme.textSecondary }]}>{timeAgo(item.createdAt)}</Text>
        {!item.isRead && <View style={[styles.dot, { backgroundColor: theme.primary }]} />}
      </View>
      <Text numberOfLines={3} style={[styles.text, item.isRead ? { color: theme.textSecondary } : { color: theme.text, fontFamily: FontFamily.bold }]}>{item.message}</Text>
      {!item.isRead && <Pressable accessibilityRole="button" accessibilityLabel={`Đánh dấu đã đọc: ${item.title}`}
        disabled={busy} style={styles.readAction} onPress={event => { event.stopPropagation(); onRead(item.id); }}>
        <Text style={[styles.link, { color: theme.primary }]}>Đánh dấu đã đọc</Text></Pressable>}
    </View>
  </Pressable>;
});
const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, padding: 14, borderWidth: 1, borderRadius: Radius.lg }, pressed: { opacity: 0.85 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { flex: 1, fontFamily: FontFamily.semibold, fontSize: 12, lineHeight: 18, textTransform: 'uppercase' },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 },
  time: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 18 },
  link: { fontFamily: FontFamily.semibold, fontSize: 13, lineHeight: 20 },
  readAction: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
});
