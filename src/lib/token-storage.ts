import * as SecureStore from 'expo-secure-store';

const ACCESS = 'sswms.access';
const REFRESH = 'sswms.refresh';

export type Tokens = { accessToken: string; refreshToken: string };

export const tokenStorage = {
  async get(): Promise<Tokens | null> {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS),
      SecureStore.getItemAsync(REFRESH),
    ]);
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  },
  async set({ accessToken, refreshToken }: Tokens) {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS, accessToken),
      SecureStore.setItemAsync(REFRESH, refreshToken),
    ]);
  },
  async clear() {
    await Promise.all([SecureStore.deleteItemAsync(ACCESS), SecureStore.deleteItemAsync(REFRESH)]);
  },
};
