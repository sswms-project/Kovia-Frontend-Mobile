import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { authApi } from '@/features/auth/auth.api';
import { otpSchema, type OtpInput } from '@/features/auth/auth.schema';
import { useAuth } from '@/features/auth/auth.store';
import {
  ActionButton,
  AuthFrame,
  DetailText,
  Feedback,
  FormField,
} from '@/features/auth/components/auth-form';
import { TwoFactorSetupDetails } from '@/features/auth/components/two-factor-setup';

export default function SecurityScreen() {
  const queryClient = useQueryClient();
  const clearSession = useAuth((state) => state.clearSession);
  const form = useForm<OtpInput>({ resolver: zodResolver(otpSchema), defaultValues: { otp: '' } });
  const profile = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: ({ signal }) => authApi.profile(signal),
  });
  const setup = useMutation({ mutationFn: authApi.setupTwoFactor, onError: () => undefined });
  const confirm = useMutation({
    mutationFn: authApi.confirmTwoFactor,
    onSuccess: async () => {
      setup.reset();
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
    },
    onError: () => form.resetField('otp'),
  });
  const disable = useMutation({
    mutationFn: authApi.disableTwoFactor,
    onSuccess: clearSession,
    onError: () => form.resetField('otp'),
  });
  const busy = setup.isPending || confirm.isPending || disable.isPending;
  if (profile.isPending)
    return (
      <AuthFrame title="Bảo mật">
        <Feedback message="Đang kiểm tra trạng thái bảo mật…" />
      </AuthFrame>
    );
  return (
    <AuthFrame title="Bảo mật" description="Bảo vệ tài khoản bằng mã từ ứng dụng xác thực.">
      {!profile.data ? (
        <>
          <Feedback error={profile.error} />
          <ActionButton
            label="Thử lại"
            busy={profile.isFetching}
            onPress={() => {
              void profile.refetch();
            }}
          />
        </>
      ) : profile.data.isTwoFactorEnabled ? (
        <>
          <DetailText>
            Xác thực hai bước đang bật. Để tắt, nhập mã hiện tại và xác nhận. Sau đó bạn sẽ cần đăng
            nhập lại.
          </DetailText>
          <FormField
            form={form}
            name="otp"
            label="Mã xác thực để tắt 2FA"
            maxLength={6}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            editable={!busy}
          />
          <ActionButton
            label="Xác nhận tắt 2FA và đăng xuất"
            busy={disable.isPending}
            onPress={form.handleSubmit((input) => disable.mutate(input))}
          />
        </>
      ) : (
        <>
          <DetailText>
            Xác thực hai bước chưa bật. Tính năng chỉ được bật sau khi bạn xác nhận đúng mã từ ứng
            dụng.
          </DetailText>
          {setup.data ? (
            <>
              <TwoFactorSetupDetails setup={setup.data} />
              <FormField
                form={form}
                name="otp"
                label="Mã xác nhận bật 2FA"
                maxLength={6}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                editable={!busy}
              />
              <ActionButton
                label="Xác nhận bật 2FA"
                busy={confirm.isPending}
                onPress={form.handleSubmit((input) => confirm.mutate(input))}
              />
              <ActionButton
                secondary
                label="Hủy thiết lập"
                disabled={busy}
                onPress={() => {
                  setup.reset();
                  confirm.reset();
                  form.reset();
                }}
              />
            </>
          ) : null}
          <ActionButton
            secondary
            label={setup.data ? 'Tải lại thiết lập' : 'Thiết lập xác thực hai bước'}
            busy={setup.isPending}
            disabled={confirm.isPending}
            onPress={() => {
              confirm.reset();
              form.reset();
              setup.mutate();
            }}
          />
        </>
      )}
      <Feedback
        error={setup.error ?? confirm.error ?? disable.error}
        message={confirm.isSuccess ? 'Đã bật xác thực hai bước.' : undefined}
      />
      <ActionButton
        secondary
        label="Về hồ sơ"
        disabled={busy}
        onPress={() => router.replace('/profile')}
      />
    </AuthFrame>
  );
}
