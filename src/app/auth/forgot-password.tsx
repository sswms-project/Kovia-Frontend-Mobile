import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { authApi } from '@/features/auth/auth.api';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/features/auth/auth.schema';
import { ActionButton, AuthFrame, Feedback, FormField } from '@/features/auth/components/auth-form';
import { useAuth } from '@/features/auth/auth.store';

export default function ForgotPasswordScreen() {
  const signedIn = useAuth((state) => state.signedIn);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });
  const request = useMutation({ mutationFn: authApi.forgotPassword, onError: () => undefined });
  return (
    <AuthFrame
      title="Quên mật khẩu"
      description="Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu qua email nếu tài khoản đủ điều kiện."
    >
      <FormField
        form={form}
        name="email"
        label="Email tài khoản"
        keyboardType="email-address"
        autoComplete="email"
        editable={!request.isPending}
      />
      <Feedback
        error={request.error}
        message={
          request.isSuccess
            ? 'Nếu tài khoản hợp lệ, email đặt lại mật khẩu đã được gửi. Kiểm tra cả thư rác; chờ ít nhất một phút trước khi gửi lại.'
            : undefined
        }
      />
      <ActionButton
        label="Gửi hướng dẫn"
        busy={request.isPending}
        onPress={form.handleSubmit((input) => request.mutate(input))}
      />
      <ActionButton
        secondary
        label="Tôi đã có liên kết đặt lại"
        onPress={() => router.push('/auth/reset-password')}
      />
      <ActionButton
        secondary
        label="Quay lại"
        onPress={() => router.replace(signedIn ? '/' : '/login')}
      />
    </AuthFrame>
  );
}
