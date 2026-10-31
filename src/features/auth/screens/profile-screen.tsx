import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  LogOut,
  Mail,
  Pencil,
  Phone,
  Shield,
  ShieldOff,
  Warehouse,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { SelectionField } from '@/components/ui/selection-field';
import { APPEARANCE_OPTIONS, useAppearance } from '@/stores/appearance.store';
import { useSpeechPreference } from '@/stores/speech.store';
import { getRoleLabel } from '@/config/roles';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDateTime } from '@/lib/date-format';

import { authApi } from '../auth.api';
import { profileSchema, type ProfileInput } from '../auth.schema';
import { useAuth } from '../auth.store';

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View accessible style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: theme.muted }]}>
        <Icon size={18} color={theme.textSecondary} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
        <Text selectable style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function StatusRow({ label, ok, text, icon }: { label: string; ok: boolean; text: string; icon: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.statusRow}>
      <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View style={styles.statusValue}>
        {icon}
        <Text style={[styles.statusText, { color: ok ? theme.primary : theme.textSecondary }]}>{text}</Text>
      </View>
    </View>
  );
}

function MenuRow({ label, onPress, disabled, icon: Icon }: { label: string; onPress: () => void; disabled: boolean; icon: LucideIcon }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
    >
      <View style={[styles.infoIcon, { backgroundColor: theme.muted }]}>
        <Icon size={18} color={theme.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: theme.text }]}>{label}</Text>
      <ChevronRight size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

export function ProfileScreen() {
  const theme = useTheme();
  const preference = useAppearance(state => state.preference);
  const appearanceHydrated = useAppearance(state => state.hydrated);
  const savingAppearance = useAppearance(state => state.saving);
  const appearanceError = useAppearance(state => state.error);
  const chooseAppearance = useAppearance(state => state.choose);
  const autoReadAlerts = useSpeechPreference(state => state.autoReadAlerts);
  const speechHydrated = useSpeechPreference(state => state.hydrated);
  const setAutoReadAlerts = useSpeechPreference(state => state.setAutoReadAlerts);
  const queryClient = useQueryClient();
  const signOut = useAuth((state) => state.signOut);
  const [editing, setEditing] = useState(false);
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
      setEditing(false);
    },
    onError: () => undefined,
  });
  const logout = useMutation({ mutationFn: signOut, onError: () => undefined });
  const busy = update.isPending || logout.isPending;
  const data = profile.data;
  const active = data?.status?.toLowerCase() === 'active';
  const card = { backgroundColor: theme.card, borderColor: theme.border };

  const body = !data ? (
    <View style={styles.stack}>
      {profile.isPending ? (
        <AlertBanner title="Đang tải hồ sơ…" />
      ) : (
        <AlertBanner variant="destructive" title="Chưa thể tải hồ sơ" description={profile.error?.message} />
      )}
      {!profile.isPending && (
        <Button label="Tải lại hồ sơ" loading={profile.isFetching} onPress={() => { void profile.refetch(); }} />
      )}
      <Button variant="outline" label="Đăng xuất" loading={logout.isPending} onPress={() => logout.mutate()} />
    </View>
  ) : (
    <View style={styles.stack}>
      <View style={[styles.card, styles.hero, card]}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <Text style={[styles.avatarText, { color: theme.onPrimary }]}>{initials(data.fullName)}</Text>
        </View>
        <Text style={[styles.name, { color: theme.text }]}>{data.fullName}</Text>
        {data.role ? (
          <View style={[styles.badge, { backgroundColor: theme.primaryContainer }]}>
            <Text style={[styles.badgeText, { color: theme.primary }]}>{getRoleLabel(data.role)}</Text>
          </View>
        ) : null}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <StatusRow
          label="Trạng thái"
          ok={active}
          text={active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
          icon={<View style={[styles.dot, { backgroundColor: active ? theme.primary : theme.textSecondary }]} />}
        />
        <StatusRow
          label="Email"
          ok={data.emailVerified}
          text={data.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
          icon={data.emailVerified ? <CheckCircle2 size={15} color={theme.primary} /> : <XCircle size={15} color={theme.textSecondary} />}
        />
        <StatusRow
          label="Xác thực 2 lớp"
          ok={data.isTwoFactorEnabled}
          text={data.isTwoFactorEnabled ? 'Đã bật' : 'Chưa bật'}
          icon={data.isTwoFactorEnabled ? <Shield size={15} color={theme.primary} /> : <ShieldOff size={15} color={theme.textSecondary} />}
        />
        <StatusRow
          label="Đăng nhập lần cuối"
          ok={false}
          text={data.lastLoginAt ? formatDisplayDateTime(new Date(data.lastLoginAt)) : 'Chưa đăng nhập'}
          icon={<Clock size={15} color={theme.textSecondary} />}
        />
      </View>

      <View style={[styles.card, card]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Thông tin liên hệ</Text>
          {!editing && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chỉnh sửa hồ sơ"
              disabled={busy}
              onPress={() => setEditing(true)}
              style={[styles.editPill, { backgroundColor: theme.muted }]}
            >
              <Pencil size={14} color={theme.primary} />
              <Text style={[styles.editText, { color: theme.primary }]}>Chỉnh sửa</Text>
            </Pressable>
          )}
        </View>
        {editing ? (
          <View style={styles.form}>
            <Controller
              control={form.control}
              name="fullName"
              render={({ field, fieldState }) => (
                <TextField label="Họ và tên" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
                  autoCapitalize="words" editable={!busy} error={fieldState.error?.message} />
              )}
            />
            <Controller
              control={form.control}
              name="phone"
              render={({ field, fieldState }) => (
                <TextField label="Số điện thoại" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
                  keyboardType="phone-pad" editable={!busy} error={fieldState.error?.message} />
              )}
            />
            {update.error ? (
              <AlertBanner variant="destructive" title="Chưa thể lưu hồ sơ" description={update.error.message} />
            ) : null}
            <View style={styles.formActions}>
              <View style={styles.flex}>
                <Button variant="outline" label="Hủy" disabled={busy}
                  onPress={() => { form.reset(); update.reset(); setEditing(false); }} />
              </View>
              <View style={styles.flex}>
                <Button label="Lưu" loading={update.isPending} disabled={logout.isPending}
                  onPress={form.handleSubmit((input) => update.mutate(input))} />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.form}>
            <InfoRow icon={Mail} label="Email" value={data.email} />
            <InfoRow icon={Phone} label="Số điện thoại" value={data.phone || 'Chưa cập nhật'} />
            <InfoRow
              icon={Warehouse}
              label="Kho đang làm việc"
              value={data.assignedWarehouses.map((w) => `${w.warehouseCode} · ${w.warehouseName}`).join('\n') || 'Chưa được phân công kho'}
            />
            {update.isSuccess ? <AlertBanner title="Đã lưu hồ sơ." /> : null}
          </View>
        )}
      </View>

      <View style={[styles.card, card]}>
        <SelectionField label="Giao diện" value={preference} options={APPEARANCE_OPTIONS}
          disabled={busy || !appearanceHydrated || savingAppearance} onChange={value => {
            if (value === 'system' || value === 'light' || value === 'dark') void chooseAppearance(value);
          }} />
        {appearanceError && <AlertBanner variant="destructive" title={appearanceError} />}
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={[styles.switchLabel, { color: theme.text }]}>Tự đọc cảnh báo và công việc mới</Text>
            <Text style={[styles.switchHint, { color: theme.textSecondary }]}>Đọc thành tiếng khi có hàng dưới mức tối thiểu hoặc quá hạn, mỗi kho một lần mỗi phiên.</Text>
          </View>
          <Switch value={autoReadAlerts} disabled={!speechHydrated} onValueChange={value => void setAutoReadAlerts(value)} accessibilityLabel="Tự đọc cảnh báo và công việc mới" />
        </View>
      </View>
      <View style={[styles.card, styles.menu, card]}>
        <MenuRow icon={Shield} label="Bảo mật và xác thực hai bước" disabled={busy} onPress={() => router.push('/security')} />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <MenuRow icon={Warehouse} label="Danh mục và tra cứu" disabled={busy} onPress={() => router.push('/catalog')} />
      </View>

      <Button
        variant="outline"
        label="Đăng xuất"
        loading={logout.isPending}
        disabled={update.isPending}
        onPress={() => logout.mutate()}
        renderIcon={(color) => <LogOut size={18} color={color} />}
      />
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <AppHeader hideProfile title="Hồ sơ cá nhân" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchText: { flex: 1, gap: 2 },
  switchLabel: { fontFamily: FontFamily.semibold, fontSize: 15 },
  switchHint: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 16 },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: 20, paddingTop: 16, paddingBottom: 40, gap: 16 },
  title: { fontFamily: FontFamily.semibold, fontSize: 26, lineHeight: 32 },
  stack: { gap: 16 },
  card: { borderWidth: 1, borderRadius: Radius.xl, padding: 16, gap: 12 },
  hero: { alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: FontFamily.bold, fontSize: 26 },
  name: { fontFamily: FontFamily.bold, fontSize: 18, lineHeight: 26, textAlign: 'center' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontFamily: FontFamily.semibold, fontSize: 12 },
  divider: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  statusRow: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  statusLabel: { fontFamily: FontFamily.regular, fontSize: 13 },
  statusValue: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  statusText: { fontFamily: FontFamily.semibold, fontSize: 13 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: 15 },
  editPill: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, paddingHorizontal: 12, borderRadius: 999 },
  editText: { fontFamily: FontFamily.semibold, fontSize: 13 },
  form: { gap: 14 },
  formActions: { flexDirection: 'row', gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontFamily: FontFamily.semibold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  infoValue: { fontFamily: FontFamily.medium, fontSize: 15, lineHeight: 22 },
  menu: { paddingVertical: 4, gap: 0 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  menuLabel: { flex: 1, fontFamily: FontFamily.medium, fontSize: 15 },
  pressed: { opacity: 0.7 },
});
