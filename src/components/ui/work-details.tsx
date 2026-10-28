import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function WorkDetails({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const Icon = open ? ChevronUp : ChevronDown;
  return <View style={[styles.root, { borderColor: theme.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}
      style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}>
      <Text style={[styles.title, { color: theme.primary }]}>{title}</Text><Icon size={18} color={theme.primary} />
    </Pressable>
    {open && <View style={styles.content}>{children}</View>}
  </View>;
}
const styles = StyleSheet.create({ root: { borderTopWidth: 1 }, trigger: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 21 }, content: { gap: 10, paddingBottom: 8 }, pressed: { opacity: 0.65 } });
