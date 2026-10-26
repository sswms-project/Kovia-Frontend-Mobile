import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { StatusPill, type PillTone } from '@/components/ui/status-pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ListCardProps {
  readonly title: string;
  readonly subtitle?: string | null;
  /** Extra detail lines; empty values are skipped. */
  readonly lines?: readonly (string | null | undefined)[];
  readonly pill?: { readonly label: string; readonly tone: PillTone };
  readonly onPress?: () => void;
}

/** Card row shared by the read-only list screens. Without `onPress` it is a plain display card. */
export function ListCard({ title, subtitle, lines = [], pill, onPress }: ListCardProps) {
  const theme = useTheme();
  const body = (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {title}
        </Text>
        {pill ? <StatusPill label={pill.label} tone={pill.tone} /> : null}
      </View>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.primary }]}>{subtitle}</Text> : null}
      {lines
        .filter((line): line is string => Boolean(line))
        .map((line) => (
          <Text key={line} style={[styles.line, { color: theme.textSecondary }]}>
            {line}
          </Text>
        ))}
    </>
  );
  const cardStyle = [styles.card, { backgroundColor: theme.card, borderColor: theme.border }];

  if (!onPress) return <View style={cardStyle}><View style={styles.copy}>{body}</View></View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, pill?.label].filter(Boolean).join('. ')}
      accessibilityHint="Mở chi tiết"
      onPress={onPress}
      style={({ pressed }) => [cardStyle, pressed && styles.pressed]}>
      <View style={styles.copy}>{body}</View>
      <ChevronRight size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderWidth: 1, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 8 },
  pressed: { opacity: 0.85 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  title: { flexGrow: 1, flexShrink: 1, flexBasis: 160, fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 23 },
  subtitle: { fontFamily: FontFamily.mono, fontSize: 13, lineHeight: 20 },
  line: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 },
});
