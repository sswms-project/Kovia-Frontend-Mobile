import { create } from 'zustand';

import { setSessionExpiredHandler } from '@/lib/api';
import { tokenStorage } from '@/lib/token-storage';
import { clearSessionQueries } from '@/providers/query-provider';

import { authApi, type SignInResponse } from './auth.api';

type AuthState = {
  ready: boolean;
  signedIn: boolean;
  notice: string | null;
  twoFactor: { tempToken: string; expiresAt: number } | null;
  beginTwoFactor: (tempToken: string) => void;
  cancelTwoFactor: () => void;
  clearSession: () => Promise<void>;
  restore: () => Promise<void>;
  applySignIn: (res: SignInResponse) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  ready: false,
  signedIn: false,
  notice: null,
  twoFactor: null,
  beginTwoFactor: (tempToken) =>
    set({ twoFactor: { tempToken, expiresAt: Date.now() + 5 * 60_000 } }),
  cancelTwoFactor: () => set({ twoFactor: null }),
  clearSession: async () => {
    try {
      await tokenStorage.clear();
    } finally {
      await clearSessionQueries();
      set({ signedIn: false, twoFactor: null });
    }
  },
  restore: async () => {
    try {
      set({ signedIn: !!(await tokenStorage.get()) });
    } catch {
      set({ signedIn: false, notice: 'Không đọc được phiên đã lưu. Vui lòng đăng nhập lại.' });
    } finally {
      set({ ready: true });
    }
  },
  applySignIn: async (res) => {
    if (res.requires2FA || !res.accessToken || !res.refreshToken)
      throw new Error('Phản hồi đăng nhập không hợp lệ');
    await tokenStorage.set({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    await clearSessionQueries();
    set({ signedIn: true, twoFactor: null, notice: null });
  },
  signOut: async () => {
    try {
      await authApi.logout();
    } catch {
      set({
        notice: 'Đã đăng xuất khỏi thiết bị. Không kết nối được máy chủ để thu hồi phiên từ xa.',
      });
    } finally {
      await useAuth.getState().clearSession();
    }
  },
}));

setSessionExpiredHandler(() => {
  // Stop concurrent 401 responses from clearing the same session repeatedly.
  if (!useAuth.getState().signedIn) return;
  useAuth.setState({ signedIn: false, twoFactor: null, notice: 'Phiên đã hết hạn. Vui lòng đăng nhập lại.' });
  void useAuth.getState().clearSession();
});
