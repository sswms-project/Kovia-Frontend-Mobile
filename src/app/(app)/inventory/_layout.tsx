import { Stack } from 'expo-router';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function InventoryLayout() {
  const theme = useTheme();

  return (
    <Stack
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
