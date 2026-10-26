import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useAppearance } from '@/stores/appearance.store';
export function useColorScheme() {
  const system = useNativeColorScheme();
  const preference = useAppearance(state => state.preference);
  return preference === 'system' ? system === 'dark' ? 'dark' : 'light' : preference;
}
