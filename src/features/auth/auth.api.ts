import { api, unwrap, type ApiResponse } from '@/lib/api';

import type { OtpInput, ProfileInput } from './auth.schema';

import type {
  CaptchaChallengeResponse,
  ForgotPasswordRequestDto,
  LoginRequestDto,
  LoginResponseDto,
  RegisterRequestDto,
  ResendVerificationRequestDto,
  ResetPasswordRequestDto,
  Verify2FARequestDto,
  TwoFactorSetup,
  UserProfile,
} from './auth.types';

export type { SignInResponse } from './auth.types';

// These endpoints answer with a human-readable message the UI shows as-is.
const unwrapMessage = (res: { data: ApiResponse<unknown> }) => res.data.message;
const getProfile = (signal?: AbortSignal) =>
  api.get<ApiResponse<UserProfile>>('/auth/me', { signal }).then(unwrap);

export const authApi = {
  login: (body: LoginRequestDto) =>
    api.post<ApiResponse<LoginResponseDto>>('/auth/login', body).then(unwrap),
  createCaptcha: () =>
    api.post<ApiResponse<CaptchaChallengeResponse>>('/auth/captcha/challenge').then(unwrap),
  verify2FA: (body: Verify2FARequestDto) =>
    api.post<ApiResponse<LoginResponseDto>>('/auth/verify-2fa', body).then(unwrap),
  register: (body: RegisterRequestDto) =>
    api.post<ApiResponse<unknown>>('/auth/register', body).then(unwrapMessage),
  resendVerification: (body: ResendVerificationRequestDto) =>
    api.post<ApiResponse<unknown>>('/auth/resend-verification', body).then(unwrapMessage),
  verifyEmail: (token: string) =>
    api.get<ApiResponse<unknown>>('/auth/verify-email', { params: { token } }).then(unwrapMessage),
  forgotPassword: (body: ForgotPasswordRequestDto) =>
    api.post<ApiResponse<unknown>>('/auth/forgot-password', body).then(unwrapMessage),
  resetPassword: (body: ResetPasswordRequestDto) =>
    api.post<ApiResponse<unknown>>('/auth/reset-password', body).then(unwrapMessage),
  profile: getProfile,
  getMe: getProfile,
  updateProfile: (body: ProfileInput) =>
    api.put<ApiResponse<unknown>>('/auth/me', body).then(unwrap),
  setupTwoFactor: () => api.post<ApiResponse<TwoFactorSetup>>('/settings/2fa/setup').then(unwrap),
  confirmTwoFactor: (body: OtpInput) =>
    api.post<ApiResponse<unknown>>('/settings/2fa/confirm', body).then(unwrap),
  disableTwoFactor: (body: OtpInput) =>
    api.delete<ApiResponse<unknown>>('/settings/2fa', { data: body }).then(unwrap),
  logout: () => api.post<ApiResponse<unknown>>('/auth/logout').then(unwrap),
};
