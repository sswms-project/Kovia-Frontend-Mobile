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

export type SignInResponse = LoginResponseDto;
export type CaptchaChallenge = CaptchaChallengeResponse;

export interface TwoFactorSetup {
  secret: string;
  qrUri: string;
}

export interface UserProfile {
  id: string;
  tenantId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  role: string | null;
  status: string;
  lastLoginAt: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  isTwoFactorEnabled: boolean;
  permissions: string[];
  assignedWarehouses: {
    id: string;
    warehouseCode: string;
    warehouseName: string;
    status: string;
  }[];
  accessibleWarehouses?: UserProfile['assignedWarehouses'];
}

export type UserProfileResponse = UserProfile;
export type AssignedWarehouse = UserProfile['assignedWarehouses'][number];
