import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Boxes,
  ChevronRight,
  Lock,
  LogOut,
  Mail,
  Map as MapIcon,
  ShieldAlert,
  ShieldCheck,
  Warehouse,
  type LucideIcon,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getRoleLabel } from '@/config/roles';
import { FontFamily, MaxContentWidth, Radius } from '@/constants/theme';
import { authApi } from '@/features/auth/auth.api';
import { profileSchema, type ProfileInput } from '@/features/auth/auth.schema';
import { useAuth } from '@/features/auth/auth.store';
import { ActionButton, AuthFrame, Feedback, FormField } from '@/features/auth/components/auth-form';
import { useTheme } from '@/hooks/use-theme';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

function Card({ children }: { readonly children: ReactNode }) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>{children}</View>;
}

function IconBox({ icon: Icon, color, background }: { readonly icon: LucideIcon; readonly color: string; readonly background: string }) {
  return (
    <View style={[styles.iconBox, { backgroundColor: background }]}>
      <Icon size={18} color={color} />
    </View>
  );
}

function InfoRow({ icon, label, value, ok }: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
  readonly ok?: boolean;
}) {
  const theme = useTheme();
  const good = ok !== false;
  return (
    <View style={styles.row}>
      <IconBox
        icon={icon}
        color={good ? theme.onPrimaryContainer : theme.error}
        background={good ? theme.primaryContainer : theme.errorContainer}
      />
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: ok === false ? theme.error : theme.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function MenuItem({ icon, label, disabled, onPress, last }: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly disabled: boolean;
  readonly onPress: () => void;
  readonly last?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        styles.menuRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
      ]}>
      <IconBox icon={icon} color={theme.onPrimaryContainer} background={theme.primaryContainer} />
      <Text style={[styles.menuLabel, { color: theme.text }]}>{label}</Text>
      <ChevronRight size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

export function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const signOut = useAuth((state) => state.signOut);
  const profile = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: ({ signal }) => authApi.profile(signal),
  });
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    values: { fullName: profile.data?.fullName ?? '', phone: profile.data?.phone ?? '' },
  });
  const update = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
    },
    onError: () => undefined,
  });
  const logout = useMutation({ mutationFn: signOut, onError: () => undefined });
  const busy = update.isPending || logout.isPending;
  if (profile.isPending)
    return (
      <AuthFrame title="Hồ sơ cá nhân">
        <Feedback message="Đang tải hồ sơ…" />
      </AuthFrame>
    );
  if (!profile.data)
    return (
      <AuthFrame title="Hồ sơ cá nhân">
        <Feedback error={profile.error} />
        <ActionButton
          label="Tải lại hồ sơ"
          busy={profile.isFetching}
          onPress={() => {
            void profile.refetch();
          }}
        />
        <ActionButton
          secondary
          label="Đăng xuất"
          busy={logout.isPending}
          onPress={() => logout.mutate()}
        />
      </AuthFrame>
    );

  const data = profile.data;
  const warehouses = data.assignedWarehouses.length
    ? data.assignedWarehouses.map((w) => `${w.warehouseCode} — ${w.warehouseName}`).join('\n')
    : 'Chưa được phân công kho';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Hồ sơ cá nhân</Text>

        <View style={[styles.hero, { backgroundColor: theme.primary }]}>
          <View style={styles.avatar}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>{initials(data.fullName ?? '')}</Text>
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.heroName, { color: theme.onPrimary }]} numberOfLines={2}>{data.fullName}</Text>
            <Text style={[styles.heroRole, { color: theme.onPrimary }]}>
              {data.role ? getRoleLabel(data.role) : 'Chưa có vai trò'}
            </Text>
            <Text style={[styles.heroEmail, { color: theme.onPrimary }]} numberOfLines={1}>{data.email}</Text>
          </View>
        </View>

        <Card>
          <InfoRow
            icon={Mail}
            label="Email"
            value={data.emailVerified ? 'Đã xác minh' : 'Chưa xác minh'}
            ok={data.emailVerified}
          />
          <InfoRow
            icon={data.isTwoFactorEnabled ? ShieldCheck : ShieldAlert}
            label="Xác thực hai bước"
            value={data.isTwoFactorEnabled ? 'Đang bật' : 'Đang tắt'}
            ok={data.isTwoFactorEnabled}
          />
          <InfoRow icon={Warehouse} label="Kho được phân công" value={warehouses} />
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Thông tin liên hệ</Text>
        <Card>
          <FormField
            form={form}
            name="fullName"
            label="Họ và tên"
            autoCapitalize="words"
            editable={!busy}
          />
          <FormField
            form={form}
            name="phone"
            label="Số điện thoại"
            keyboardType="phone-pad"
            editable={!busy}
          />
          <Feedback
            error={update.error ?? profile.error}
            message={update.isSuccess ? 'Đã lưu hồ sơ.' : undefined}
          />
          <ActionButton
            label="Lưu hồ sơ"
            busy={update.isPending}
            disabled={logout.isPending}
            onPress={form.handleSubmit((input) => update.mutate(input))}
          />
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Tiện ích</Text>
        <View style={[styles.card, styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <MenuItem icon={Boxes} label="Sản phẩm" disabled={busy} onPress={() => router.push('/products')} />
          <MenuItem icon={MapIcon} label="Sơ đồ và vị trí kho" disabled={busy} onPress={() => router.push('/locations')} />
          <MenuItem icon={Lock} label="Bảo mật và xác thực hai bước" disabled={busy} onPress={() => router.push('/security')} last />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đăng xuất"
          accessibilityState={{ disabled: update.isPending, busy: logout.isPending }}
          disabled={update.isPending || logout.isPending}
          onPress={() => logout.mutate()}
          style={({ pressed }) => [
            styles.logout,
            { backgroundColor: theme.errorContainer, borderColor: theme.error, opacity: update.isPending ? 0.5 : pressed ? 0.8 : 1 },
          ]}>
          <LogOut size={18} color={theme.error} />
          <Text style={[styles.logoutText, { color: theme.error }]}>
            {logout.isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  title: { fontSize: 24, fontFamily: FontFamily.bold },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontFamily: FontFamily.bold },
  heroText: { flex: 1, gap: 2 },
  heroName: { fontSize: 18, fontFamily: FontFamily.bold },
  heroRole: { fontSize: 13, fontFamily: FontFamily.medium, opacity: 0.9 },
  heroEmail: { fontSize: 13, fontFamily: FontFamily.regular, opacity: 0.8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 14 },
  menuCard: { padding: 0, gap: 0, overflow: 'hidden' },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuRow: { paddingHorizontal: 16, paddingVertical: 12 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 12, fontFamily: FontFamily.medium },
  rowValue: { fontSize: 15, fontFamily: FontFamily.semibold },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: FontFamily.semibold },
  sectionTitle: { fontSize: 16, fontFamily: FontFamily.bold },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.xl + 4,
  },
  logoutText: { fontSize: 15, fontFamily: FontFamily.semibold },
});
