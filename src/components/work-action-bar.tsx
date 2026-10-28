import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FontFamily, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A sibling of the scrolling work list, so physical confirmation is always reachable. */
export function WorkActionBar({ children, hint }: { readonly children: ReactNode; readonly hint?: string }) {
  const theme = useTheme();
  return <View style={[styles.bar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {hint && <Text accessibilityLiveRegion="polite" style={[styles.hint, { color: theme.textSecondary }]}>{hint}</Text>}
      {children}
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({ bar: { flexShrink: 0, maxHeight: '45%', borderTopWidth: 1 }, scroll: { flexGrow: 0 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  hint: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 19 } });
