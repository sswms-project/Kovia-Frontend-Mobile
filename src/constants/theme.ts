/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Values mirror FE/src/app/index.css (:root and .dark). Keep in sync when the FE palette changes.
export const Colors = {
  light: {
    text: '#18232f',
    background: '#f1fbec',
    backgroundElement: '#e0f2d6',
    backgroundSelected: '#d5ecc8',
    textSecondary: '#3f5442',
    card: '#ffffff',
    border: '#b5d8ab',
    input: '#b5d8ab',
    muted: '#eaf7e2',
    primary: '#2e5a2a',
    onPrimary: '#f9fff6',
    primaryContainer: '#60f040',
    onPrimaryContainer: '#123312',
    secondary: '#436441',
    secondaryContainer: '#c0f0c0',
    onSecondaryContainer: '#234626',
    error: '#ba1a1a',
    onError: '#ffffff',
    errorContainer: '#ffdad6',
    onErrorContainer: '#93000a',
    warning: '#9a5b00',
    warningContainer: '#ffddb0',
    onWarningContainer: '#321b00',
    chart1: '#166534',
    chart2: '#65a30d',
  },
  dark: {
    text: '#d9e3d6',
    background: '#121614',
    backgroundElement: '#1b211d',
    backgroundSelected: '#222a25',
    textSecondary: '#a3b3a0',
    card: '#181e1a',
    border: '#38443b',
    input: '#425048',
    muted: '#1e2520',
    primary: '#9fcf94',
    onPrimary: '#12290f',
    primaryContainer: '#2f4d2b',
    onPrimaryContainer: '#cfe8c8',
    secondary: '#a9c4a5',
    secondaryContainer: '#2c3d2c',
    onSecondaryContainer: '#cde0c9',
    error: '#f0a09a',
    onError: '#3a1210',
    errorContainer: '#5a2a28',
    onErrorContainer: '#ffdad6',
    warning: '#e8b86a',
    warningContainer: '#4d3a14',
    onWarningContainer: '#f6dfb4',
    chart1: '#7fc78a',
    chart2: '#b8cf6a',
  },
} as const;

// Names registered by useFonts in src/app/_layout.tsx (FE uses Inter + JetBrains Mono).
export const FontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: 'JetBrainsMono_400Regular',
} as const;

// FE radius scale (0.125 / 0.25 / 0.375 / 0.5 / 0.75 rem at 16px).
export const Radius = { sm: 2, base: 4, md: 6, lg: 8, xl: 12 } as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
