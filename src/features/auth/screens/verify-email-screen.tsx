import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner-native';

import { getApiErrorMessage, logApiError } from '@/lib/api-error';

import { resendVerificationSchema, type ResendVerificationFormValues } from '../auth.schema';
import { VerifyEmailView, type VerifyEmailStatus } from '../components/verify-email-page';
import {
  useResendVerificationMutation,
  useVerifyEmailQuery,
} from '../hooks/use-auth-mutations';

const VERIFY_FAILED_MESSAGE = 'Không thể xác minh email. Vui lòng thử lại sau.';

interface VerifyEmailScreenProps {
  readonly token?: string;
}

export function VerifyEmailScreen({ token }: VerifyEmailScreenProps) {
  const router = useRouter();
  const verifyEmailQuery = useVerifyEmailQuery(token);
  const resendMutation = useResendVerificationMutation();

  const resendForm = useForm<ResendVerificationFormValues>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (!verifyEmailQuery.error) return;
    logApiError(verifyEmailQuery.error);
    toast.error(getApiErrorMessage(verifyEmailQuery.error, VERIFY_FAILED_MESSAGE));
  }, [verifyEmailQuery.error]);

  async function resendVerification(values: ResendVerificationFormValues) {
    try {
      await resendMutation.mutateAsync({ email: values.email });
    } catch {
      // The mutation shows the user-facing error.
    }
  }

  const status: VerifyEmailStatus = !token
    ? 'missing'
    : verifyEmailQuery.isPending
      ? 'loading'
      : verifyEmailQuery.isSuccess
        ? 'success'
        : 'error';
  const message = verifyEmailQuery.isSuccess
    ? verifyEmailQuery.data
    : getApiErrorMessage(verifyEmailQuery.error, VERIFY_FAILED_MESSAGE);

  return (
    <VerifyEmailView
      status={status}
      message={message}
      resendForm={resendForm}
      isResending={resendMutation.isPending}
      onResend={(values) => void resendVerification(values)}
      onGoToLogin={() => router.replace('/login')}
    />
  );
}
