import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../auth.schema';
import { ForgotPasswordForm } from '../components/forgot-password-page';
import { useForgotPasswordMutation } from '../hooks/use-auth-mutations';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const forgotPasswordMutation = useForgotPasswordMutation();
  const [submittedEmail, setSubmittedEmail] = useState<string>();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function handleForgotPassword(values: ForgotPasswordFormValues) {
    try {
      await forgotPasswordMutation.mutateAsync({ email: values.email });
      setSubmittedEmail(values.email);
    } catch {
      // The mutation shows the user-facing error.
    }
  }

  return (
    <ForgotPasswordForm
      form={form}
      onSubmit={(values) => void handleForgotPassword(values)}
      isLoading={forgotPasswordMutation.isPending}
      submittedEmail={submittedEmail}
      onReset={() => {
        setSubmittedEmail(undefined);
        form.reset();
      }}
      onBackToLogin={() => router.replace('/login')}
    />
  );
}
