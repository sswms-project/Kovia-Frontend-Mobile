import { ArrowUp } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AI_CHAT_MESSAGE_MAX_LENGTH, aiChatMessageSchema } from '../ai-assistant.schema';

interface AiChatComposerProps {
  readonly isSending: boolean;
  readonly onSend: (message: string) => void;
}

export function AiChatComposer({ isSending, onSend }: AiChatComposerProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const parsed = aiChatMessageSchema.safeParse(draft);
  const canSend = parsed.success && !isSending;

  const submit = () => {
    if (!parsed.success || isSending) return;
    onSend(parsed.data);
    setDraft('');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.field, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <TextInput
          accessibilityLabel="Nhập câu hỏi cho trợ lý AI"
          multiline
          maxLength={AI_CHAT_MESSAGE_MAX_LENGTH}
          placeholder="Hỏi trợ lý AI..."
          placeholderTextColor={theme.textSecondary}
          value={draft}
          onChangeText={setDraft}
          style={[styles.input, { color: theme.text }]}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Gửi câu hỏi" accessibilityState={{ disabled: !canSend, busy: isSending }}
          disabled={!canSend} onPress={submit}
          style={[styles.send, { backgroundColor: canSend || isSending ? theme.primary : theme.backgroundSelected }]}>
          {isSending ? <ActivityIndicator size="small" color={theme.onPrimary} />
            : <ArrowUp size={20} color={canSend ? theme.onPrimary : theme.textSecondary} strokeWidth={2.4} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  field: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderWidth: 1, borderRadius: 24, paddingLeft: 16, paddingRight: 6, paddingVertical: 6 },
  input: { flex: 1, minHeight: 36, maxHeight: 120, paddingVertical: 8, fontFamily: FontFamily.regular, fontSize: 14 },
  send: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
