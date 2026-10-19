import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

interface StateContainerProps {
  /** True when the state replaces a whole screen and must respect safe areas and the app background. */
  readonly fullScreen: boolean;
  readonly children: ReactNode;
}

export function StateContainer({ fullScreen, children }: StateContainerProps) {
  const theme = useTheme();

  if (!fullScreen) return <View style={styles.body}>{children}</View>;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
});
