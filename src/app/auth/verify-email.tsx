import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { authApi } from '@/features/auth/auth.api';
import {
  resendVerificationSchema,
  verifyEmailSchema,
  type ForgotPasswordInput,
  type VerifyEmailInput,
} from '@/features/auth/auth.schema';
import { useAuth } from '@/features/auth/auth.store';
import { ActionButton, AuthFrame, Feedback, FormField } from '@/features/auth/components/auth-form';
import { extractEmailToken } from '@/features/auth/email-token';

export default function VerifyEmailScreen() {
  const { token: tokenParam } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = extractEmailToken(tokenParam);
  const signedIn = useAuth((state) => state.signedIn);
  const form = useForm<VerifyEmailInput>({
    resolver: zodResolver(verifyEmailSchema),
    values: { token },
  });
  const resendForm = useForm<ForgotPasswordInput>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: '' },
  });
  const verify = useMutation({
    mutationFn: ({ token }: VerifyEmailInput) => authApi.verifyEmail(extractEmailToken(token)),
    onSuccess: () => form.reset({ token: '' }),
    onError: () => undefined,
  });
  const resend = useMutation({ mutationFn: authApi.resendVerification, onError: () => undefined });
  return (
    <AuthFrame
      title="Xác thực email"
      description="Dán liên kết hoặc token nhận được trong email để xác thực đăng ký."
    >
      {verify.isSuccess ? (
        <Feedback message="Email đã được xác minh. Đăng ký đang chờ quản trị viên phê duyệt." />
      ) : (
        <>
          <FormField
            form={form}
            name="token"
            label="Token hoặc liên kết xác thực"
            editable={!verify.isPending}
          />
          <Feedback error={verify.error} />
          <ActionButton
            label="Xác thực email"
            busy={verify.isPending}
            onPress={form.handleSubmit((input) => verify.mutate(input))}
          />
          <FormField
            form={resendForm}
            name="email"
            label="Email để gửi lại liên kết"
            keyboardType="email-address"
            autoComplete="email"
            editable={!resend.isPending}
          />
          <Feedback
            error={resend.error}
            message={
              resend.isSuccess
                ? 'Nếu đăng ký hợp lệ và đang chờ xác minh, hệ thống đã gửi một email mới.'
                : undefined
            }
          />
          <ActionButton
            secondary
            label="Gửi lại email xác thực"
            busy={resend.isPending}
            onPress={resendForm.handleSubmit((input) => resend.mutate(input))}
          />
        </>
      )}
      <ActionButton
        secondary
        label="Quay lại"
        disabled={verify.isPending || resend.isPending}
        onPress={() => router.replace(signedIn ? '/' : '/login')}
      />
    </AuthFrame>
  );
}
