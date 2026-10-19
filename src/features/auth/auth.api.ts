import { api, unwrap, type ApiResponse } from '@/lib/api';

import type {
  CaptchaChallengeResponse,
  ForgotPasswordRequestDto,
  LoginRequestDto,
  LoginResponseDto,
  ResendVerificationRequestDto,
  ResetPasswordRequestDto,
  Verify2FARequestDto,
} from './auth.types';

// These endpoints answer with a human-readable message the UI shows as-is.
const unwrapMessage = (res: { data: ApiResponse<unknown> }) => res.data.message;

export const authApi = {
  login: (body: LoginRequestDto) =>
    api.post<ApiResponse<LoginResponseDto>>('/auth/login', body).then(unwrap),
  createCaptcha: () =>
    api.post<ApiResponse<CaptchaChallengeResponse>>('/auth/captcha/challenge').then(unwrap),
  verify2FA: (body: Verify2FARequestDto) =>
    api.post<ApiResponse<LoginResponseDto>>('/auth/verify-2fa', body).then(unwrap),
  resendVerification: (body: ResendVerificationRequestDto) =>
    api.post<ApiResponse<unknown>>('/auth/resend-verification', body).then(unwrapMessage),
  verifyEmail: (token: string) =>
    api.get<ApiResponse<unknown>>('/auth/verify-email', { params: { token } }).then(unwrapMessage),
  forgotPassword: (body: ForgotPasswordRequestDto) =>
    api.post<ApiResponse<unknown>>('/auth/forgot-password', body).then(unwrapMessage),
  resetPassword: (body: ResetPasswordRequestDto) =>
    api.post<ApiResponse<unknown>>('/auth/reset-password', body).then(unwrapMessage),
  logout: () => api.post('/auth/logout'),
};
