import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { StateContainer } from './state-container';

interface LoadingStateProps {
  readonly message?: string;
  readonly fullScreen?: boolean;
}

export function LoadingState({ message = 'Đang tải…', fullScreen = false }: LoadingStateProps) {
  const theme = useTheme();

  return (
    <StateContainer fullScreen={fullScreen}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={message}
        accessibilityLiveRegion="polite"
        style={styles.content}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
      </View>
    </StateContainer>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: 12 },
  message: { fontFamily: FontFamily.regular, fontSize: 14, textAlign: 'center' },
});
