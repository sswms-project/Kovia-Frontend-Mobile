import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { authApi } from '@/features/auth/auth.api';
import { resetPasswordRequestSchema, type ResetPasswordInput } from '@/features/auth/auth.schema';
import { useAuth } from '@/features/auth/auth.store';
import { ActionButton, AuthFrame, Feedback, FormField } from '@/features/auth/components/auth-form';
import { extractEmailToken } from '@/features/auth/email-token';

export default function ResetPasswordScreen() {
  const { token: tokenParam } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = extractEmailToken(tokenParam);
  const clearSession = useAuth((state) => state.clearSession);
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordRequestSchema),
    values: { token, newPassword: '' },
  });
  const reset = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: async () => {
      form.reset({ token: '', newPassword: '' });
      await clearSession();
    },
    onError: () => form.resetField('newPassword'),
  });
  return (
    <AuthFrame
      title="Đặt lại mật khẩu"
      description="Mật khẩu mới cần ít nhất 8 ký tự gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt."
    >
      {reset.isSuccess ? (
        <Feedback message="Mật khẩu đã được đặt lại. Hãy đăng nhập bằng mật khẩu mới." />
      ) : (
        <>
          <FormField
            form={form}
            name="token"
            label="Token hoặc liên kết từ email"
            editable={!reset.isPending}
          />
          <FormField
            form={form}
            name="newPassword"
            label="Mật khẩu mới"
            secureTextEntry
            autoComplete="new-password"
            editable={!reset.isPending}
          />
          <Feedback error={reset.error} />
          <ActionButton
            label="Đặt lại mật khẩu"
            busy={reset.isPending}
            onPress={form.handleSubmit((input) =>
              reset.mutate({ ...input, token: extractEmailToken(input.token) }),
            )}
          />
          <ActionButton
            secondary
            label="Liên kết hết hạn? Gửi yêu cầu mới"
            disabled={reset.isPending}
            onPress={() => router.replace('/auth/forgot-password')}
          />
        </>
      )}
      <ActionButton
        secondary
        label="Về đăng nhập"
        disabled={reset.isPending}
        onPress={() => router.replace('/login')}
      />
    </AuthFrame>
  );
}
