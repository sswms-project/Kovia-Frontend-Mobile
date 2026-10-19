import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toaster } from 'sonner-native';

import { OfflineBanner } from '@/components/ui/offline-banner';
import { useAuth } from '@/features/auth/auth.store';
import { QueryProvider } from '@/providers/query-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { ready, signedIn, restore } = useAuth();
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
            <View style={styles.root}>
              <OfflineBanner />
              <View style={styles.root}>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Protected guard={signedIn}>
                    <Stack.Screen name="(app)" />
                    <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
                  </Stack.Protected>
                  <Stack.Protected guard={!signedIn}>
                    <Stack.Screen name="(auth)" />
                  </Stack.Protected>
                </Stack>
              </View>
            </View>
          </BottomSheetModalProvider>
          <Toaster />
        </ThemeProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
