import * as NativeSecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// expo-secure-store has no web implementation. A browser build is only used for local testing, so
// there values live in sessionStorage and disappear with the tab; native keeps the keychain.
const webSecureStore = {
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: undefined,
  isAvailableAsync: async () => true,
  getItemAsync: async (key: string) => window.sessionStorage.getItem(key),
  setItemAsync: async (key: string, value: string) => window.sessionStorage.setItem(key, value),
  deleteItemAsync: async (key: string) => window.sessionStorage.removeItem(key),
} as unknown as typeof NativeSecureStore;

export const SecureStore = Platform.OS === 'web' ? webSecureStore : NativeSecureStore;
