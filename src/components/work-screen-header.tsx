import { ArrowLeft, House } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useScreenExit } from '@/hooks/use-screen-exit';

export function NavigationIcon({ home = false, onPress, disabled = false }: { readonly home?: boolean; readonly onPress: () => void; readonly disabled?: boolean }) {
  const theme = useTheme();
  const Icon = home ? House : ArrowLeft;
  return <Pressable accessibilityRole="button" accessibilityLabel={home ? 'Về trang chủ' : 'Quay lại'}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.action, (pressed || disabled) && styles.dim]}>
    <Icon size={22} color={theme.primary} />
  </Pressable>;
}

export function WorkScreenHeader({ title, subtitle, onBack, modal = false }: {
  readonly title: string; readonly subtitle?: string; readonly onBack?: () => void; readonly modal?: boolean;
}) {
  const theme = useTheme();
  const exit = useScreenExit();
  const back = onBack ?? (() => exit?.back());
  return <SafeAreaView edges={modal ? [] : ['top']} style={{ backgroundColor: theme.background }}>
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      <NavigationIcon onPress={back} disabled={exit?.leaving} />
      <View style={styles.heading}>
        <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {exit ? <NavigationIcon home onPress={exit.home} disabled={exit.leaving} /> : <View style={styles.action} />}
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  action: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, minWidth: 0, paddingHorizontal: 4, paddingVertical: 6 },
  title: { fontFamily: FontFamily.semibold, fontSize: 18 },
  subtitle: { fontFamily: FontFamily.regular, fontSize: 13, marginTop: 2 }, dim: { opacity: 0.45 },
});
