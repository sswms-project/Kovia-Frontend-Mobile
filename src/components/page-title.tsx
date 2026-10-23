import { ChevronRight } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { KoviaLogo } from '@/components/kovia-logo';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Breadcrumb-style page title: "Kovia › Công việc". */
export function PageTitle({ title }: { readonly title: string }) {
  const theme = useTheme();
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={title} style={styles.row}>
      <KoviaLogo />
      <ChevronRight size={18} color={theme.textSecondary} />
      <Text numberOfLines={1} style={[styles.current, { color: theme.text }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 },
  current: { flexShrink: 1, fontFamily: FontFamily.semibold, fontSize: 17, lineHeight: 24 },
});
