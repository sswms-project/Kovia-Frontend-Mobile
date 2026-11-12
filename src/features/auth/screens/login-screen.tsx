import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Platform } from 'react-native';
import { toast } from 'sonner-native';

import { getApiErrorMessage, isApiErrorResponse } from '@/lib/api-error';
import { logger } from '@/lib/logger';

import { loginSchema, type LoginFormValues } from '../auth.schema';
import { useAuth } from '../auth.store';
import type { CaptchaChallengeResponse, LoginResponseDto } from '../auth.types';
import { LoginSessionSelection } from '../components/login-session-selection';
import { getTemporaryLockSeconds } from '../auth.utils';
import { LoginForm } from '../components/login-page';
import {
  useCaptchaMutation,
  useLoginMutation,
  useResendVerificationMutation,
} from '../hooks/use-auth-mutations';

export function LoginScreen() {
  const router = useRouter();
  const applySignIn = useAuth((state) => state.applySignIn);
  const beginTwoFactor = useAuth((state) => state.beginTwoFactor);
  const cancelTwoFactor = useAuth((state) => state.cancelTwoFactor);
  const sessionNotice = useAuth((state) => state.notice);
  const loginMutation = useLoginMutation();
  const captchaMutation = useCaptchaMutation();
  const resendMutation = useResendVerificationMutation();
  const [captcha, setCaptcha] = useState<CaptchaChallengeResponse | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [lastEmail, setLastEmail] = useState('');
  const [lockSeconds, setLockSeconds] = useState(0);
  const [selection, setSelection] = useState<LoginResponseDto | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', captchaId: undefined, captchaAnswer: '' },
  });

  // Keyed on the boolean so one interval runs for the whole lock instead of restarting every tick.
  const isLocked = lockSeconds > 0;
  useEffect(() => {
    if (!isLocked) return;
    const timer = setInterval(() => setLockSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(timer);
  }, [isLocked]);

  async function refreshCaptcha() {
    try {
      const challenge = await captchaMutation.mutateAsync();
      setCaptcha(challenge);
      form.setValue('captchaId', challenge.captchaId);
      form.setValue('captchaAnswer', '');
    } catch {
      // The mutation shows the user-facing error.
    }
  }

  async function resendVerification() {
    if (!lastEmail) return;
    try {
      await resendMutation.mutateAsync({ email: lastEmail });
    } catch {
      // The mutation shows the user-facing error.
    }
  }

  async function handleLogin(values: LoginFormValues) {
    cancelTwoFactor();
    setAuthNotice(null);
    setRequiresVerification(false);
    setLastEmail(values.email);

    try {
      const data = await loginMutation.mutateAsync({
        email: values.email,
        password: values.password,
        clientLabel: Platform.OS === 'web' ? 'Kovia Web' : `Kovia ${Platform.OS === 'ios' ? 'iOS' : 'Android'}`,
        ...(values.captchaId ? { captchaId: values.captchaId } : {}),
        ...(values.captchaAnswer ? { captchaAnswer: values.captchaAnswer } : {}),
      });

      if (data.requires2FA) {
        const tempToken = data.tempToken?.trim();
        if (!tempToken) {
          toast.error('Không thể bắt đầu phiên xác thực hai yếu tố. Vui lòng thử lại.');
          return;
        }
        beginTwoFactor(tempToken);
        router.push('/verify-2fa');
        return;
      }

      if (data.sessionSelectionTicket) {
        form.reset({ email: values.email, password: '', captchaAnswer: '' });
        setCaptcha(null);
        setSelection(data);
        return;
      }

      await applySignIn(data);
    } catch (error) {
      if (!isApiErrorResponse(error)) {
        logger.error('Login failed', error);
        toast.error(getApiErrorMessage(error, 'Đăng nhập thất bại. Vui lòng thử lại.'));
        return;
      }

      if (error.errors?.requiresCaptcha?.includes('true')) void refreshCaptcha();

      const authState = error.errors?.authState?.[0];
      if (authState === 'EmailVerificationRequired') {
        setRequiresVerification(true);
        setAuthNotice(error.message);
      } else if (
        authState === 'PendingAdminApproval' ||
        authState === 'TenantSuspended' ||
        authState === 'Inactive'
      ) {
        setAuthNotice(error.message);
      }
      if (error.statusCode === 429) setLockSeconds(getTemporaryLockSeconds(error));

      const isInlineError = Boolean(authState) || error.statusCode === 429;
      if (!isInlineError) toast.error(error.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    }
  }

  if (selection) return <LoginSessionSelection initial={selection} onBack={() => setSelection(null)} />;

  return (
    <LoginForm
      form={form}
      onSubmit={(values) => void handleLogin(values)}
      isLoading={loginMutation.isPending}
      captcha={captcha}
      isCaptchaLoading={captchaMutation.isPending}
      authNotice={authNotice ?? sessionNotice}
      requiresVerification={requiresVerification}
      isResending={resendMutation.isPending}
      lockSeconds={lockSeconds}
      onRefreshCaptcha={() => void refreshCaptcha()}
      onResendVerification={() => void resendVerification()}
      onForgotPassword={() => router.push('/forgot-password')}
    />
  );
}
