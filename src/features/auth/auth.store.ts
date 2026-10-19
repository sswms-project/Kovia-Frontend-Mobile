import { create } from 'zustand';

import { setSessionExpiredHandler } from '@/lib/api';
import { tokenStorage } from '@/lib/token-storage';

import { authApi } from './auth.api';
import type { LoginResponseDto } from './auth.types';

type AuthState = {
  ready: boolean;
  signedIn: boolean;
  // Kept in memory only: it is a short-lived credential for /auth/verify-2fa and must not outlive the app.
  twoFactorTempToken: string | null;
  restore: () => Promise<void>;
  applySignIn: (res: LoginResponseDto) => Promise<void>;
  setTwoFactorTempToken: (tempToken: string | null) => void;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  ready: false,
  signedIn: false,
  twoFactorTempToken: null,
  restore: async () => set({ signedIn: !!(await tokenStorage.get()), ready: true }),
  applySignIn: async (res) => {
    if (!res.accessToken || !res.refreshToken) throw new Error('Phản hồi đăng nhập không hợp lệ');
    await tokenStorage.set({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    set({ signedIn: true, twoFactorTempToken: null });
  },
  setTwoFactorTempToken: (tempToken) => set({ twoFactorTempToken: tempToken }),
  signOut: async () => {
    await authApi.logout().catch(() => undefined);
    await tokenStorage.clear();
    set({ signedIn: false, twoFactorTempToken: null });
  },
}));

setSessionExpiredHandler(() => useAuth.setState({ signedIn: false }));
