import { create } from 'zustand';

import { setSessionExpiredHandler } from '@/lib/api';
import { tokenStorage } from '@/lib/token-storage';
import { decodeJwtPayload } from '@/lib/jwt';
import { formDraftStorage } from '@/lib/form-draft-storage';
import { clearSessionQueries } from '@/providers/query-provider';

import { unregisterPush } from '@/features/notifications/push-registration';

import { authApi, type SignInResponse } from './auth.api';

type AuthState = {
  ready: boolean;
  signedIn: boolean;
  loginSessionId: string | null;
  notice: string | null;
  twoFactor: { tempToken: string; expiresAt: number } | null;
  beginTwoFactor: (tempToken: string) => void;
  cancelTwoFactor: () => void;
  clearSession: () => Promise<void>;
  restore: () => Promise<void>;
  applySignIn: (res: SignInResponse) => Promise<void>;
  signOut: () => Promise<void>;
  endLoginSession: (sessionId: string) => Promise<void>;
};

function sessionIdFromToken(token: string) {
  const sid = decodeJwtPayload(token)?.sid;
  return typeof sid === 'string' ? sid : null;
}

export const useAuth = create<AuthState>((set) => ({
  ready: false,
  signedIn: false,
  loginSessionId: null,
  notice: null,
  twoFactor: null,
  beginTwoFactor: (tempToken) =>
    set({ twoFactor: { tempToken, expiresAt: Date.now() + 5 * 60_000 } }),
  cancelTwoFactor: () => set({ twoFactor: null }),
  clearSession: async () => {
    try {
      await tokenStorage.clear();
    } finally {
      await formDraftStorage.clear().catch(() => set({ notice: 'Không xóa hết bản nháp trên thiết bị. Vui lòng mở lại app để thử đăng xuất lại.' }));
      await clearSessionQueries();
      set({ signedIn: false, loginSessionId: null, twoFactor: null });
    }
  },
  restore: async () => {
    try {
      const tokens = await tokenStorage.get();
      set({ signedIn: !!tokens, loginSessionId: tokens ? sessionIdFromToken(tokens.accessToken) : null });
    } catch {
      set({ signedIn: false, notice: 'Không đọc được phiên đã lưu. Vui lòng đăng nhập lại.' });
    } finally {
      set({ ready: true });
    }
  },
  applySignIn: async (res) => {
    if (res.requires2FA || !res.accessToken || !res.refreshToken)
      throw new Error('Phản hồi đăng nhập không hợp lệ');
    await formDraftStorage.clear();
    await tokenStorage.set({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    await clearSessionQueries();
    set({ signedIn: true, loginSessionId: sessionIdFromToken(res.accessToken), twoFactor: null, notice: null });
  },
  endLoginSession: async (sessionId) => {
    const current = useAuth.getState();
    if (!current.signedIn || current.loginSessionId !== sessionId) return;
    set({ signedIn: false, loginSessionId: null, notice: 'Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.' });
    await current.clearSession();
  },
  signOut: async () => {
    await unregisterPush().catch(() => undefined);
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
