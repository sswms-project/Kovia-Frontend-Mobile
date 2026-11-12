import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Platform } from 'react-native';
import { toast } from 'sonner-native';

import { isApiErrorResponse } from '@/lib/api-error';

import {
  verifyTwoFactorSchema,
  type VerifyTwoFactorFormValues,
} from '../auth.schema';
import { useAuth } from '../auth.store';
import type { LoginResponseDto } from '../auth.types';
import { LoginSessionSelection } from '../components/login-session-selection';
import {
  classifyVerify2FAError,
  isAccountInactiveError,
  type Verify2FAErrorKind,
} from '../auth.utils';
import { VerifyTwoFactorForm, type VerifyStep } from '../components/verify-two-factor-page';
import { useVerify2FAMutation } from '../hooks/use-auth-mutations';

export function VerifyTwoFactorScreen() {
  const router = useRouter();
  const twoFactor = useAuth((state) => state.twoFactor);
  const tempToken = twoFactor?.tempToken;
  const cancelTwoFactor = useAuth((state) => state.cancelTwoFactor);
  const applySignIn = useAuth((state) => state.applySignIn);
  const verifyMutation = useVerify2FAMutation();
  const [step, setStep] = useState<VerifyStep>({ status: 'form' });
  const [apiErrorKind, setApiErrorKind] = useState<Verify2FAErrorKind | null>(null);
  const [selection, setSelection] = useState<LoginResponseDto | null>(null);
  // Bumped on exit so a response that lands after the user left cannot sign them in.
  const flowIdRef = useRef(0);

  const form = useForm<VerifyTwoFactorFormValues>({
    resolver: zodResolver(verifyTwoFactorSchema),
    defaultValues: { otp: '' },
  });

  useEffect(() => {
    return () => {
      flowIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!twoFactor) return;
    const timer = setTimeout(() => {
      flowIdRef.current += 1;
      cancelTwoFactor();
      setStep({ status: 'sessionExpired' });
    }, Math.max(0, twoFactor.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [twoFactor, cancelTwoFactor]);

  function handleBackToLogin() {
    flowIdRef.current += 1;
    cancelTwoFactor();
    verifyMutation.reset();
    router.replace('/login');
  }

  async function handleVerify(values: VerifyTwoFactorFormValues) {
    if (!tempToken || !twoFactor || Date.now() >= twoFactor.expiresAt || verifyMutation.isPending) return;
    const flowId = flowIdRef.current;

    try {
      const result = await verifyMutation.mutateAsync({ tempToken, otp: values.otp,
        clientLabel: Platform.OS === 'web' ? 'Kovia Web' : `Kovia ${Platform.OS === 'ios' ? 'iOS' : 'Android'}` });
      if (flowId !== flowIdRef.current || Date.now() >= twoFactor.expiresAt) return;

      if (result.sessionSelectionTicket) {
        cancelTwoFactor();
        form.reset();
        setSelection(result);
        return;
      }
      if (result.requires2FA || !result.accessToken || !result.refreshToken) {
        toast.error('Phản hồi xác thực hai yếu tố không hợp lệ. Vui lòng thử lại.');
        return;
      }
      await applySignIn(result);
    } catch (error) {
      if (flowId !== flowIdRef.current) return;
      if (!isApiErrorResponse(error)) {
        setApiErrorKind('unknown');
        return;
      }

      const kind = classifyVerify2FAError(error);
      if (kind === 'sessionExpired') {
        cancelTwoFactor();
        setStep({ status: 'sessionExpired' });
        return;
      }
      if (kind === 'accountUnavailable') {
        cancelTwoFactor();
        setStep({
          status: 'accountUnavailable',
          reason: isAccountInactiveError(error) ? 'inactive' : 'userNotFound',
        });
        return;
      }
      if (kind === 'invalidOtp') form.setValue('otp', '');
      setApiErrorKind(kind);
    }
  }

  if (selection) return <LoginSessionSelection initial={selection} onBack={handleBackToLogin} />;

  return (
    <VerifyTwoFactorForm
      form={form}
      hasTempToken={Boolean(tempToken)}
      step={step}
      onSubmit={(values) => void handleVerify(values)}
      isLoading={verifyMutation.isPending}
      apiErrorKind={apiErrorKind}
      onErrorClear={() => setApiErrorKind(null)}
      onBackToLogin={handleBackToLogin}
    />
  );
}
