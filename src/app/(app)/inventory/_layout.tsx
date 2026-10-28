import { Stack } from 'expo-router';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ScreenExitBoundary } from '@/providers/screen-exit-boundary';

export default function InventoryLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenLayout={({ children }) => <ScreenExitBoundary>{children}</ScreenExitBoundary>}
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.primary,
        headerTitleStyle: { fontFamily: FontFamily.semibold, color: theme.text },
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="lookup" options={{ title: 'Tra cứu mã' }} />
      <Stack.Screen name="[stockId]" options={{ title: 'Chi tiết tồn kho' }} />
      <Stack.Screen name="movements" options={{ title: 'Lịch sử biến động' }} />
      <Stack.Screen name="scan" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}
