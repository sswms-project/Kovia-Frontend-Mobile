import { Stack } from 'expo-router';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function LookupLayout() {
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
      <Stack.Screen name="products/index" options={{ title: 'Sản phẩm' }} />
      <Stack.Screen name="products/[productId]" options={{ title: 'Chi tiết sản phẩm' }} />
      <Stack.Screen name="products/scan" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}
