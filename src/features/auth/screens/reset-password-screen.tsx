import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { getApiErrorMessage } from '@/lib/api-error';
import { useAuth } from '../auth.store';

import { resetPasswordSchema, type ResetPasswordFormValues } from '../auth.schema';
import { ResetPasswordForm } from '../components/reset-password-page';
import { useResetPasswordMutation } from '../hooks/use-auth-mutations';

interface ResetPasswordScreenProps {
  readonly token?: string;
}

export function ResetPasswordScreen({ token }: ResetPasswordScreenProps) {
  const router = useRouter();
  const resetPasswordMutation = useResetPasswordMutation();
  const clearSession = useAuth((state) => state.clearSession);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!isSuccess) return;
    const timer = setTimeout(() => router.replace('/login'), 1600);
    return () => clearTimeout(timer);
  }, [isSuccess, router]);

  async function handleResetPassword(values: ResetPasswordFormValues) {
    if (!token) return;

    try {
      setErrorMessage(undefined);
      await resetPasswordMutation.mutateAsync({ token, newPassword: values.password });
      await clearSession();
      setIsSuccess(true);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ.'),
      );
    }
  }

  return (
    <ResetPasswordForm
      form={form}
      hasToken={Boolean(token)}
      onSubmit={(values) => void handleResetPassword(values)}
      isLoading={resetPasswordMutation.isPending}
      isSuccess={isSuccess}
      errorMessage={errorMessage}
      onGoToLogin={() => router.replace('/login')}
      onGoToForgotPassword={() => router.replace('/forgot-password')}
    />
  );
}
