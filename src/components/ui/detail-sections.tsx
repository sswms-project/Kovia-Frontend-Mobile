import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FontFamily, MaxContentWidth, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface DetailScrollProps {
  readonly children: ReactNode;
  readonly isRefreshing?: boolean;
  readonly onRefresh?: () => void;
}

export function DetailScroll({ children, isRefreshing = false, onRefresh }: DetailScrollProps) {
  const theme = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} /> : undefined}>
      {children}
    </ScrollView>
  );
}

export function DetailHeading({ title, subtitle }: { readonly title: string; readonly subtitle?: string | null }) {
  const theme = useTheme();
  return (
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {children}
    </View>
  );
}

interface InfoRowProps {
  readonly label: string;
  readonly value?: string | number | null;
}

/** One label/value pair; a missing value shows a dash so the layout stays stable. */
export function InfoRow({ label, value }: InfoRowProps) {
  const theme = useTheme();
  const text = value === null || value === undefined || value === '' ? '—' : String(value);
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text selectable style={[styles.infoValue, { color: theme.text }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 20, paddingBottom: 48, gap: 20 },
  heading: { gap: 4 },
  title: { fontFamily: FontFamily.semibold, fontSize: 22, lineHeight: 30 },
  subtitle: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 },
  section: { gap: 14, padding: 16, borderWidth: 1, borderRadius: Radius.lg },
  sectionTitle: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 23 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8 },
  infoLabel: { flexBasis: 104, flexGrow: 1, fontFamily: FontFamily.medium, fontSize: 13, lineHeight: 21 },
  infoValue: { flexBasis: 152, flexGrow: 2, flexShrink: 1, fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 22 },
});
