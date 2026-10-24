import { Check, FileImage, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ReceiptStepProps {
  readonly step: number; readonly title: string; readonly done?: boolean;
  /** Short status on the right of the title, e.g. "2/5" or "Không bắt buộc". */
  readonly meta?: string; readonly children: ReactNode;
}

/** Numbered card for one step of the receiving checklist; the badge turns into a tick once the step is satisfied. */
export function ReceiptStep({ step, title, done = false, meta, children }: ReceiptStepProps) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: done ? theme.primary : theme.border }]}>
    <View style={styles.header}>
      <View accessibilityLabel={done ? `Bước ${step} đã xong` : `Bước ${step}`}
        style={[styles.badge, done ? { backgroundColor: theme.primary } : { backgroundColor: theme.muted, borderColor: theme.border, borderWidth: 1 }]}>
        {done ? <Check size={14} color={theme.onPrimary} strokeWidth={3} />
          : <Text style={[styles.badgeText, { color: theme.textSecondary }]}>{step}</Text>}
      </View>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
      {meta && <Text style={[styles.meta, { color: theme.textSecondary }]}>{meta}</Text>}
    </View>
    {children}
  </View>;
}

/** One attached photo inside a step: file name plus a small remove control. */
export function EvidenceFileRow({ fileName, disabled, onRemove }: { readonly fileName: string; readonly disabled: boolean; readonly onRemove: () => void }) {
  const theme = useTheme();
  return <View style={[styles.file, { backgroundColor: theme.backgroundElement }]}>
    <FileImage size={18} color={theme.textSecondary} />
    <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>{fileName}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Bỏ ảnh ${fileName}`} accessibilityState={{ disabled }} disabled={disabled}
      hitSlop={8} onPress={onRemove} style={({ pressed }) => [styles.remove, (disabled || pressed) && styles.dim]}>
      <X size={18} color={theme.textSecondary} />
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  file: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingLeft: 12, borderRadius: Radius.md },
  fileName: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.5 },
  card: { gap: 12, padding: 14, borderWidth: 1, borderRadius: Radius.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: FontFamily.semibold, fontSize: 12, lineHeight: 16 },
  title: { flex: 1, fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 21 },
  meta: { fontFamily: FontFamily.medium, fontSize: 13, lineHeight: 18 },
});
