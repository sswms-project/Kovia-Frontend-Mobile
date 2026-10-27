import { Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { AiDraftStatusInfo, AiMessage } from '../ai-assistant.types';
import { AiCard } from './ai-card';

interface AiMessageBubbleProps {
  readonly message: AiMessage;
  readonly drafts: readonly AiDraftStatusInfo[];
  readonly busyDraftId: string | null;
  readonly isSendBusy: boolean;
  readonly onConfirm: (draftId: string) => void;
  readonly onCancel: (draftId: string) => void;
  readonly onQuickReply: (text: string) => void;
}

export function AiAvatar() {
  const theme = useTheme();
  return (
    <View style={[styles.avatar, { backgroundColor: theme.primaryContainer }]}>
      <Sparkles size={14} color={theme.onPrimaryContainer} />
    </View>
  );
}

export function AiMessageBubble({ message, drafts, busyDraftId, isSendBusy, onConfirm, onCancel, onQuickReply }: AiMessageBubbleProps) {
  const theme = useTheme();
  const isUser = message.role === 'User';
  const body = (
    <View style={[styles.content, isUser && styles.contentUser]}>
      {message.content ? (
        <View style={[styles.bubble, isUser
          ? [styles.bubbleUser, { backgroundColor: theme.primary }]
          : [styles.bubbleAssistant, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]]}>
          <Text selectable style={[styles.text, { color: isUser ? theme.onPrimary : theme.text }]}>{message.content}</Text>
        </View>
      ) : null}
      {message.cards.map((card, index) => (
        <AiCard key={`${message.id}-${index}`} card={card}
          draft={drafts.find((draft) => draft.draftId === card.draftId)}
          isActionBusy={busyDraftId !== null && busyDraftId === card.draftId}
          isSendBusy={isSendBusy} onConfirm={onConfirm} onCancel={onCancel} onQuickReply={onQuickReply} />
      ))}
    </View>
  );
  if (isUser) return <View style={styles.rowUser}>{body}</View>;
  return (
    <View style={styles.rowAssistant}>
      <AiAvatar />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  rowUser: { alignSelf: 'flex-end', maxWidth: '85%' },
  rowAssistant: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, maxWidth: '92%', alignSelf: 'flex-start' },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  content: { flexShrink: 1, gap: 8 },
  contentUser: { alignItems: 'flex-end' },
  bubble: { borderRadius: Radius.xl, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAssistant: { borderTopLeftRadius: 4 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 },
});
