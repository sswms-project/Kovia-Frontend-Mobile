import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AI_DRAFT_STATUS_LABELS, AI_DRAFT_STATUS_TONES } from '../ai-assistant.labels';
import { AI_CARD_TYPES, type AiCard as AiCardModel, type AiDraftStatusInfo } from '../ai-assistant.types';

interface AiCardProps {
  readonly card: AiCardModel;
  readonly draft: AiDraftStatusInfo | undefined;
  readonly isActionBusy: boolean;
  readonly isSendBusy: boolean;
  readonly onConfirm: (draftId: string) => void;
  readonly onCancel: (draftId: string) => void;
  readonly onQuickReply: (text: string) => void;
}

export function AiCard({ card, draft, isActionBusy, isSendBusy, onConfirm, onCancel, onQuickReply }: AiCardProps) {
  const theme = useTheme();

  if (card.type === AI_CARD_TYPES.quickReplies) {
    return (
      <View style={styles.chips}>
        {(card.options ?? []).map((option) => (
          <Pressable key={option} accessibilityRole="button" accessibilityLabel={option} disabled={isSendBusy}
            onPress={() => onQuickReply(option)}
            style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.card }, isSendBusy && styles.disabled]}>
            <Text style={[styles.chipLabel, { color: theme.primary }]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  if (card.type === AI_CARD_TYPES.actionConfirmation) {
    const status = draft?.status ?? 'Pending';
    return (
      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{card.title ?? 'Xác nhận thao tác'}</Text>
          <StatusPill label={AI_DRAFT_STATUS_LABELS[status]} tone={AI_DRAFT_STATUS_TONES[status]} />
        </View>
        {card.summary ? <Text style={[styles.body, { color: theme.textSecondary }]}>{card.summary}</Text> : null}
        {(card.details ?? []).map((detail) => (
          <View key={`${detail.label}-${detail.value}`} style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{detail.label}</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{detail.value}</Text>
          </View>
        ))}
        {status === 'Pending' && card.draftId ? (
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button label="Huỷ" variant="outline" disabled={isActionBusy} onPress={() => onCancel(card.draftId ?? '')} />
            </View>
            <View style={styles.action}>
              <Button label="Xác nhận" loading={isActionBusy} onPress={() => onConfirm(card.draftId ?? '')} />
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  // Navigation and suggested-action cards are informational: web routes do not map onto mobile routes.
  const text = card.description ?? card.message;
  return (
    <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
      {card.title ? <Text style={[styles.title, { color: theme.text }]}>{card.title}</Text> : null}
      {text ? <Text style={[styles.body, { color: theme.textSecondary }]}>{text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 12, gap: 8 },
  header: { gap: 6 },
  title: { fontFamily: FontFamily.semibold, fontSize: 14 },
  body: { fontFamily: FontFamily.regular, fontSize: 13 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  detailLabel: { fontFamily: FontFamily.regular, fontSize: 13, flexShrink: 1 },
  detailValue: { fontFamily: FontFamily.semibold, fontSize: 13, flexShrink: 1, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  action: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14 },
  chipLabel: { fontFamily: FontFamily.semibold, fontSize: 13 },
  disabled: { opacity: 0.5 },
});
