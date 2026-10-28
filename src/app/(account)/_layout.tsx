import { Stack } from 'expo-router';
import { ScreenExitBoundary } from '@/providers/screen-exit-boundary';
export default function AccountLayout() {
  return <Stack screenOptions={{ headerShown: false }} screenLayout={({ children }) => <ScreenExitBoundary standalone>{children}</ScreenExitBoundary>} />;
}
