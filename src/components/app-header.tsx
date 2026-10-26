import { router } from 'expo-router';
import { Bell, User } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { KoviaLogo } from '@/components/kovia-logo';
import { PageTitle } from '@/components/page-title';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import { useTheme } from '@/hooks/use-theme';

interface AppHeaderProps {
  readonly hideProfile?: boolean;
  /** Page name shown as a "Kovia › title" breadcrumb in place of the logo. */
  readonly title?: string;
}

export function AppHeader({ hideProfile = false, title }: AppHeaderProps) {
  const theme = useTheme();
  const notifications = useNotifications(1);
  return (
    <View style={styles.header}>
      {title ? <PageTitle title={title} /> : <KoviaLogo />}
      <View style={styles.actions}>
        {notifications.allowed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thông báo"
            hitSlop={4}
            onPress={() => router.push('/notifications')}
            style={({ pressed }) => [styles.bell, pressed && styles.pressed]}>
            <Bell size={19} color={theme.text} />
            {(notifications.unreadCount ?? 0) > 0 ? <View style={[styles.bellDot, { backgroundColor: theme.error }]} /> : null}
          </Pressable>
        ) : null}
        {hideProfile ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hồ sơ"
            hitSlop={4}
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [styles.avatar, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
            <User size={18} color={theme.onPrimary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 12 },
  avatar: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  bell: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 5, right: 6, width: 9, height: 9, borderRadius: 5 },
  pressed: { opacity: 0.75 },
});
