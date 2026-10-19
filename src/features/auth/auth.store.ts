import { toast } from 'sonner-native';
import { create } from 'zustand';

import { setSessionExpiredHandler } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
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
    // Cached /auth/me and task data belong to this user; the next sign-in must start clean.
    queryClient.clear();
    set({ signedIn: false, twoFactorTempToken: null });
  },
}));

setSessionExpiredHandler(() => {
  // Several in-flight requests can report 401 together; only the first one should sign out and notify.
  if (!useAuth.getState().signedIn) return;
  queryClient.clear();
  useAuth.setState({ signedIn: false, twoFactorTempToken: null });
  toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
});
