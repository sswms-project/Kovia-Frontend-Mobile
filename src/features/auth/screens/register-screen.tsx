import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { registerSchema, type RegisterFormValues } from '../auth.schema';
import { RegisterForm } from '../components/register-page';
import { useRegisterMutation } from '../hooks/use-auth-mutations';

export function RegisterScreen() {
  const router = useRouter();
  const registerMutation = useRegisterMutation();
  const [submittedEmail, setSubmittedEmail] = useState<string>();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      tenantName: '',
      ownerName: '',
      phone: '',
      email: '',
      address: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  async function handleRegister(values: RegisterFormValues) {
    try {
      await registerMutation.mutateAsync(values);
      setSubmittedEmail(values.email);
    } catch {
      // The mutation shows the user-facing error.
    }
  }

  return (
    <RegisterForm
      form={form}
      onSubmit={(values) => void handleRegister(values)}
      isLoading={registerMutation.isPending}
      submittedEmail={submittedEmail}
      onBackToLogin={() => router.replace('/login')}
    />
  );
}
