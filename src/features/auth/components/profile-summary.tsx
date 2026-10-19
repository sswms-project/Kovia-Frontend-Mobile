import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { getRoleLabel } from '@/config/roles';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { UserProfileResponse } from '../auth.types';

interface ProfileSummaryProps {
  readonly profile: UserProfileResponse;
  readonly isSigningOut: boolean;
  readonly onSignOut: () => void;
}

// Read-only identity card plus sign-out; the editable profile and security settings are WMS-322.
export function ProfileSummary({ profile, isSigningOut, onSignOut }: ProfileSummaryProps) {
  const theme = useTheme();
  const rows = [
    { label: 'Họ tên', value: profile.fullName },
    { label: 'Email', value: profile.email },
    { label: 'Vai trò', value: profile.role ? getRoleLabel(profile.role) : '—' },
    {
      label: 'Kho được giao',
      value: profile.assignedWarehouses.map((warehouse) => warehouse.warehouseName).join(', ') || '—',
    },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
          Hồ sơ
        </Text>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {rows.map((row) => (
            <View key={row.label} accessible style={styles.row}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{row.label}</Text>
              <Text style={[styles.value, { color: theme.text }]}>{row.value}</Text>
            </View>
          ))}
        </View>

        <Button variant="outline" label="Đăng xuất" loading={isSigningOut} onPress={onSignOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { width: '100%', maxWidth: 440, alignSelf: 'center', padding: 20, gap: 20 },
  title: { fontFamily: FontFamily.semibold, fontSize: 26, lineHeight: 32 },
  card: { gap: 14, padding: 16, borderWidth: 1, borderRadius: Radius.xl },
  row: { gap: 2 },
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    letterSpacing: 0.77,
    textTransform: 'uppercase',
  },
  value: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 22 },
});
