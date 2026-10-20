import { Bell } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/lib/date-format';

import type { AppNotification } from '../notifications.types';

interface NotificationRowProps {
  readonly notification: AppNotification;
  readonly onPress?: (notification: AppNotification) => void;
}

export const NotificationRow = memo(function NotificationRow({ notification, onPress }: NotificationRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress?.(notification)}
      style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.icon, { backgroundColor: theme.primaryContainer }]}>
        <Bell size={16} color={theme.onPrimaryContainer} />
      </View>
      <View style={styles.body}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={[styles.time, { color: theme.textSecondary }]}>{formatRelativeTime(notification.createdAt)}</Text>
        </View>
        <Text style={[styles.message, { color: theme.textSecondary }]} numberOfLines={2}>
          {notification.message}
        </Text>
      </View>
      {!notification.isRead ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: Radius.xl, padding: 12 },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 14, fontFamily: FontFamily.semibold },
  time: { fontSize: 11, fontFamily: FontFamily.regular },
  message: { fontSize: 12, fontFamily: FontFamily.regular },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
