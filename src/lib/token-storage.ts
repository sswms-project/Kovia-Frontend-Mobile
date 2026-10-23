import * as NativeSecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS = 'sswms.access';
const REFRESH = 'sswms.refresh';

// expo-secure-store has no web implementation. A browser build is only used for local testing, so
// there the session lives in sessionStorage and disappears with the tab; native keeps the keychain.
const SecureStore =
  Platform.OS === 'web'
    ? {
        getItemAsync: async (key: string) => window.sessionStorage.getItem(key),
        setItemAsync: async (key: string, value: string) => window.sessionStorage.setItem(key, value),
        deleteItemAsync: async (key: string) => window.sessionStorage.removeItem(key),
      }
    : NativeSecureStore;

export type Tokens = { accessToken: string; refreshToken: string };

let pendingWrite: Promise<unknown> = Promise.resolve();
function serializeWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = pendingWrite.then(operation, operation);
  pendingWrite = result.catch(() => undefined);
  return result;
}

async function readTokens(): Promise<Tokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS),
    SecureStore.getItemAsync(REFRESH),
  ]);
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

async function writeTokens({ accessToken, refreshToken }: Tokens) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS, accessToken),
    SecureStore.setItemAsync(REFRESH, refreshToken),
  ]);
}

export const tokenStorage = {
  async get(): Promise<Tokens | null> {
    await pendingWrite;
    return readTokens();
  },
  set(tokens: Tokens) {
    return serializeWrite(() => writeTokens(tokens));
  },
  replaceIfCurrent(expectedRefreshToken: string, tokens: Tokens) {
    return serializeWrite(async () => {
      if ((await readTokens())?.refreshToken !== expectedRefreshToken) return false;
      await writeTokens(tokens);
      return true;
    });
  },
  clear() {
    return serializeWrite(() =>
      Promise.all([SecureStore.deleteItemAsync(ACCESS), SecureStore.deleteItemAsync(REFRESH)]).then(
        () => undefined,
      ),
    );
  },
  clearIfCurrent(expectedRefreshToken: string) {
    return serializeWrite(async () => {
      if ((await readTokens())?.refreshToken !== expectedRefreshToken) return;
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS),
        SecureStore.deleteItemAsync(REFRESH),
      ]);
    });
  },
};
