import { create } from 'zustand';
import { SecureStore } from '@/lib/secure-store';
import { logger } from '@/lib/logger';

export type AppearancePreference = 'system' | 'light' | 'dark';
const key = 'kovia.appearance.v1';
export const APPEARANCE_OPTIONS = [
  { value: 'system', label: 'Theo thiết bị' }, { value: 'light', label: 'Sáng' }, { value: 'dark', label: 'Tối' },
] as const;
interface AppearanceState {
  preference: AppearancePreference; hydrated: boolean; saving: boolean; error: string | null;
  hydrate: () => Promise<void>; choose: (preference: AppearancePreference) => Promise<void>;
}
let hydration: Promise<void> | null = null;
export const useAppearance = create<AppearanceState>((set, get) => ({
  preference: 'system', hydrated: false, saving: false, error: null,
  hydrate: () => hydration ??= (async () => {
    try {
      const saved = await SecureStore.getItemAsync(key);
      set({ preference: saved === 'light' || saved === 'dark' ? saved : 'system', hydrated: true });
    } catch (error) {
      logger.warn('Không đọc được lựa chọn giao diện.', error);
      set({ hydrated: true, error: 'Chưa đọc được giao diện đã lưu. Bạn có thể chọn lại bên dưới.' });
    }
  })(),
  choose: async preference => {
    if (!get().hydrated || get().saving) return;
    set({ saving: true, error: null });
    try { await SecureStore.setItemAsync(key, preference); set({ preference, saving: false }); }
    catch (error) {
      logger.warn('Không lưu được lựa chọn giao diện.', error);
      set({ saving: false, error: 'Chưa lưu được lựa chọn giao diện. Vui lòng thử lại.' });
    }
  },
}));
