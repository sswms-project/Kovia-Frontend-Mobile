import { Baloo2_700Bold } from '@expo-google-fonts/baloo-2';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useReducedMotion } from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { FontFamily } from '@/constants/theme';
import { useAppearance } from '@/stores/appearance.store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toaster } from 'sonner-native';

import { useAuth } from '@/features/auth/auth.store';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { WarehouseSessionProvider } from '@/features/warehouse-access/components/warehouse-session-provider';
import { QueryProvider } from '@/providers/query-provider';
import { ScanFeedbackProvider } from '@/providers/scan-feedback-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = useTheme();
  const reduceMotion = useReducedMotion();
  const hydrateAppearance = useAppearance(state => state.hydrate);
  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = { ...baseTheme, colors: { ...baseTheme.colors, primary: colors.primary, background: colors.background,
    card: colors.card, text: colors.text, border: colors.border, notification: colors.error }, fonts: { ...baseTheme.fonts,
    regular: { ...baseTheme.fonts.regular, fontFamily: FontFamily.regular }, medium: { ...baseTheme.fonts.medium, fontFamily: FontFamily.medium },
    bold: { ...baseTheme.fonts.bold, fontFamily: FontFamily.bold }, heavy: { ...baseTheme.fonts.heavy, fontFamily: FontFamily.bold } } };
  const ready = useAuth((state) => state.ready);
  const signedIn = useAuth((state) => state.signedIn);
  const restore = useAuth((state) => state.restore);
  const [fontsLoaded, fontError] = useFonts({
    Baloo2_700Bold,
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
  useEffect(() => { void hydrateAppearance(); }, [hydrateAppearance]);

  useEffect(() => {
    if (ready && fontsSettled) SplashScreen.hideAsync();
  }, [ready, fontsSettled]);

  if (!ready || !fontsSettled) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryProvider>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <BottomSheetModalProvider>
            <ScanFeedbackProvider>
              <WarehouseSessionProvider signedIn={signedIn}>
                <View style={styles.root}>
                  <OfflineBanner />
                  <Stack screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'default' }}>
                    <Stack.Protected guard={signedIn}>
                      <Stack.Screen name="(app)" />
                      <Stack.Screen name="(account)" />
                      <Stack.Screen name="notifications" options={{ presentation: 'transparentModal', animation: reduceMotion ? 'none' : 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' } }} />
                      <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
                    </Stack.Protected>
                    <Stack.Protected guard={!signedIn}>
                      <Stack.Screen name="(auth)" />
                    </Stack.Protected>
                    <Stack.Screen name="auth" />
                  </Stack>
                </View>
              </WarehouseSessionProvider>
            </ScanFeedbackProvider>
          </BottomSheetModalProvider>
          <Toaster />
        </ThemeProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
