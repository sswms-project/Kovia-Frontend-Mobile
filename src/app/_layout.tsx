import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toaster } from 'sonner-native';

import { useAuth } from '@/features/auth/auth.store';
import { WarehouseSessionProvider } from '@/features/warehouse-access/components/warehouse-session-provider';
import { QueryProvider } from '@/providers/query-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const ready = useAuth((state) => state.ready);
  const signedIn = useAuth((state) => state.signedIn);
  const restore = useAuth((state) => state.restore);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
  });
  // A font failure must not brick the app; text falls back to the system font.
  const fontsSettled = fontsLoaded || !!fontError;

  useEffect(() => {
    restore();
  }, [restore]);

  useEffect(() => {
    if (ready && fontsSettled) SplashScreen.hideAsync();
  }, [ready, fontsSettled]);

  if (!ready || !fontsSettled) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <BottomSheetModalProvider>
            <WarehouseSessionProvider signedIn={signedIn}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Protected guard={signedIn}>
                <Stack.Screen name="(app)" />
                <Stack.Screen name="(account)" />
              </Stack.Protected>
              <Stack.Protected guard={!signedIn}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>
              <Stack.Screen name="auth" />
            </Stack>
            </WarehouseSessionProvider>
          </BottomSheetModalProvider>
          <Toaster />
        </ThemeProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
