import { Stack } from 'expo-router';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ScreenExitBoundary } from '@/providers/screen-exit-boundary';

export default function TasksLayout() {
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
      <Stack.Screen name="history" options={{ title: 'Lịch sử công việc' }} />
      <Stack.Screen name="[taskType]/[taskId]" options={{ title: 'Chi tiết công việc' }} />
    </Stack>
  );
}
