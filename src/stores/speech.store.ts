import { create } from 'zustand';
import { SecureStore } from '@/lib/secure-store';
import { logger } from '@/lib/logger';

const key = 'kovia.speech.autoread.v1';
interface SpeechState {
  autoReadAlerts: boolean; hydrated: boolean;
  hydrate: () => Promise<void>; setAutoReadAlerts: (value: boolean) => Promise<void>;
}
let hydration: Promise<void> | null = null;
export const useSpeechPreference = create<SpeechState>(set => ({
  autoReadAlerts: false, hydrated: false,
  hydrate: () => hydration ??= (async () => {
    try { set({ autoReadAlerts: (await SecureStore.getItemAsync(key)) === 'true', hydrated: true }); }
    catch (error) { logger.warn('Không đọc được cài đặt đọc cảnh báo.', error); set({ hydrated: true }); }
  })(),
  setAutoReadAlerts: async value => {
    set({ autoReadAlerts: value });
    try { await SecureStore.setItemAsync(key, String(value)); }
    catch (error) { logger.warn('Không lưu được cài đặt đọc cảnh báo.', error); }
  },
}));
