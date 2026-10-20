import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { getApiErrorMessage, logApiError } from '@/lib/api-error';

import { authApi } from '../auth.api';

export function useLoginMutation() {
  return useMutation({
    mutationFn: authApi.login,
    // The screen maps login failures (captcha, lock, account state) itself.
    onError: logApiError,
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: authApi.register,
    onError: (error) => {
      logApiError(error);
      toast.error(getApiErrorMessage(error, 'Đăng ký thất bại. Vui lòng thử lại.'));
    },
  });
}

export function useCaptchaMutation() {
  return useMutation({
    mutationFn: authApi.createCaptcha,
    onError: (error) => {
      logApiError(error);
      toast.error(getApiErrorMessage(error, 'Không thể tải CAPTCHA. Vui lòng thử lại.'));
    },
  });
}

export function useVerify2FAMutation() {
  return useMutation({
    mutationFn: authApi.verify2FA,
    // The screen classifies the failure and renders it inline, so no toast here.
    onError: logApiError,
  });
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationFn: authApi.resendVerification,
    onSuccess: (message) => toast.success(message),
    onError: (error) => {
      logApiError(error);
      toast.error(getApiErrorMessage(error, 'Không thể gửi lại email xác minh. Vui lòng thử lại.'));
    },
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: authApi.forgotPassword,
    onError: (error) => {
      logApiError(error);
      toast.error(
        getApiErrorMessage(error, 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.'),
      );
    },
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: authApi.resetPassword,
    // The screen shows the message inline above the form.
    onError: logApiError,
  });
}

export function useVerifyEmailQuery(token?: string) {
  return useQuery({
    queryKey: ['auth', 'verify-email', token],
    queryFn: () => authApi.verifyEmail(token ?? ''),
    enabled: Boolean(token),
    retry: false,
  });
}
