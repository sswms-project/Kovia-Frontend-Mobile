import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

/** Load state of one section; each section fails on its own so one 403 never blanks the screen. */
export interface SectionQuery<TData> {
  readonly data: TData | undefined;
  readonly isLoading: boolean;
  readonly error: unknown;
  readonly onRetry: () => void;
}

interface DetailSectionProps {
  readonly title: string;
  readonly isLoading: boolean;
  readonly error: unknown;
  readonly isEmpty: boolean;
  readonly emptyText: string;
  readonly onRetry: () => void;
  readonly children: ReactNode;
}

export function DetailSection({
  title,
  isLoading,
  error,
  isEmpty,
  emptyText,
  onRetry,
  children,
}: DetailSectionProps) {
  const theme = useTheme();

  function renderBody() {
    if (isLoading) return <ActivityIndicator color={theme.primary} />;
    if (error) {
      return (
        <View style={styles.errorBlock}>
          <Text accessibilityRole="alert" style={[styles.message, { color: theme.error }]}>
            {getApiErrorMessage(error, 'Không thể tải dữ liệu.')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Thử lại ${title}`}
            hitSlop={8}
            onPress={onRetry}
            style={styles.retry}>
            <Text style={[styles.retryLabel, { color: theme.primary }]}>Thử lại</Text>
          </Pressable>
        </View>
      );
    }
    if (isEmpty) return <Text style={[styles.message, { color: theme.textSecondary }]}>{emptyText}</Text>;
    return children;
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>
      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderWidth: 1, borderRadius: Radius.xl },
  title: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 22 },
  message: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 19 },
  errorBlock: { gap: 4 },
  retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  retryLabel: { fontFamily: FontFamily.semibold, fontSize: 14 },
});
