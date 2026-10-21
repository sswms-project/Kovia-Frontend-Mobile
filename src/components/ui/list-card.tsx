import { Pressable, StyleSheet, Text, View } from 'react-native';

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

  if (!onPress) return <View style={cardStyle}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [cardStyle, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6, padding: 14, borderWidth: 1, borderRadius: Radius.xl },
  pressed: { opacity: 0.85 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 21 },
  subtitle: { fontFamily: FontFamily.mono, fontSize: 13 },
  line: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
});
