export interface LoginRequestDto {
  email: string;
  password: string;
  captchaId?: string;
  captchaAnswer?: string;
}

export interface LoginResponseDto {
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresIn: number;
  requires2FA: boolean;
  tempToken?: string | null;
}

export interface CaptchaChallengeResponse {
  captchaId: string;
  imageDataUrl: string;
  expiresInSeconds: number;
}

export interface Verify2FARequestDto {
  tempToken: string;
  otp: string;
}

export interface ResendVerificationRequestDto {
  email: string;
}

export interface ForgotPasswordRequestDto {
  email: string;
}

export interface ResetPasswordRequestDto {
  token: string;
  newPassword: string;
}
