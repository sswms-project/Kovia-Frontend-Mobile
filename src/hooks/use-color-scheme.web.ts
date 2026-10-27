import { useColorScheme as useRNColorScheme } from 'react-native';
import { useAppearance } from '@/stores/appearance.store';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const hasHydrated = useAppearance(state => state.hydrated);
  const colorScheme = useRNColorScheme();
  const preference = useAppearance(state => state.preference);

  if (hasHydrated) {
    return preference === 'system' ? colorScheme === 'dark' ? 'dark' : 'light' : preference;
  }

  return 'light';
}
