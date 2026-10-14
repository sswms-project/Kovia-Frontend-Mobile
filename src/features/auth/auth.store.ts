import { create } from 'zustand';

import { setSessionExpiredHandler } from '@/lib/api';
import { tokenStorage } from '@/lib/token-storage';

import { authApi, type SignInResponse } from './auth.api';

type AuthState = {
  ready: boolean;
  signedIn: boolean;
  restore: () => Promise<void>;
  applySignIn: (res: SignInResponse) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  ready: false,
  signedIn: false,
  restore: async () => set({ signedIn: !!(await tokenStorage.get()), ready: true }),
  applySignIn: async (res) => {
    if (!res.accessToken || !res.refreshToken) throw new Error('Phản hồi đăng nhập không hợp lệ');
    await tokenStorage.set({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    set({ signedIn: true });
  },
  signOut: async () => {
    await authApi.logout().catch(() => undefined);
    await tokenStorage.clear();
    set({ signedIn: false });
  },
}));

setSessionExpiredHandler(() => useAuth.setState({ signedIn: false }));
