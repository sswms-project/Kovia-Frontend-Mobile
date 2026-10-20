import { ArrowLeft, Warehouse } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface AuthScreenLayoutProps {
  readonly kicker: string;
  readonly title: string;
  readonly description?: string;
  readonly headerAction?: ReactNode;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
}

export function AuthScreenLayout({
  kicker,
  title,
  description,
  headerAction,
  footer,
  children,
}: AuthScreenLayoutProps) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.column}>
            <View style={styles.header}>
              <View style={styles.brand} accessibilityRole="header">
                <View style={[styles.brandMark, { backgroundColor: theme.primary }]}>
                  <Warehouse size={18} color={theme.onPrimary} />
                </View>
                <Text style={[styles.brandName, { color: theme.text }]}>KOVIA</Text>
              </View>
              {headerAction}
            </View>

            <View style={styles.heading}>
              <Text style={[styles.kicker, { color: theme.textSecondary }]}>{kicker}</Text>
              <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
                {title}
              </Text>
              {description ? (
                <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>
              ) : null}
            </View>

            <View style={styles.content}>{children}</View>
            {footer}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface AuthHeaderButtonProps {
  readonly label: string;
  readonly onPress: () => void;
}

export function AuthHeaderButton({ label, onPress }: AuthHeaderButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
      <ArrowLeft size={14} color={theme.textSecondary} />
      <Text style={[styles.headerButtonLabel, { color: theme.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 12 },
  column: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 28 },
  header: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md },
  brandName: { fontFamily: FontFamily.bold, fontSize: 18, letterSpacing: 1.2 },
  heading: { gap: 8 },
  kicker: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: { fontFamily: FontFamily.semibold, fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  description: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 },
  content: { gap: 20 },
  headerButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerButtonLabel: { fontFamily: FontFamily.medium, fontSize: 13 },
  pressed: { opacity: 0.6 },
});
