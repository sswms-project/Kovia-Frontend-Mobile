import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { authApi } from '@/features/auth/auth.api';
import { profileSchema, type ProfileInput } from '@/features/auth/auth.schema';
import { useAuth } from '@/features/auth/auth.store';
import { ActionButton, AuthFrame, Feedback, FormField } from '@/features/auth/components/auth-form';
import { ProfileDetails } from '@/features/auth/components/profile-details';

export default function ProfileScreen() {
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
  return (
    <AuthFrame title="Hồ sơ cá nhân" description="Thông tin tài khoản và cài đặt bảo mật của bạn.">
      <ProfileDetails profile={profile.data} />
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
      <ActionButton
        secondary
        label="Bảo mật và xác thực hai bước"
        disabled={busy}
        onPress={() => router.push('/security')}
      />
      <ActionButton
        secondary
        label="Đăng xuất"
        busy={logout.isPending}
        disabled={update.isPending}
        onPress={() => logout.mutate()}
      />
    </AuthFrame>
  );
}
