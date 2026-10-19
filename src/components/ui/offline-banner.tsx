import { WifiOff } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamily } from '@/constants/theme';
import { useIsOffline } from '@/hooks/use-is-offline';
import { useTheme } from '@/hooks/use-theme';

/** Sits above the whole navigator so every screen, signed in or not, shows the same notice. */
export function OfflineBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isOffline = useIsOffline();

  if (!isOffline) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: theme.warningContainer, paddingTop: insets.top + 8 }]}>
      <WifiOff size={16} color={theme.onWarningContainer} />
      <Text style={[styles.message, { color: theme.onWarningContainer }]}>
        Không có kết nối mạng. Một số thao tác có thể không hoạt động.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  message: { flex: 1, fontFamily: FontFamily.medium, fontSize: 13, lineHeight: 18 },
});
