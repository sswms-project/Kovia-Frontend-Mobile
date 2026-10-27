import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { History, MessageSquarePlus, Sparkles } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatRelativeTime } from '@/lib/date-format';

import { AiChatComposer } from '../components/ai-chat-composer';
import { AiAvatar, AiMessageBubble } from '../components/ai-message-bubble';
import {
  useAiConversationsQuery, useAiMessagesQuery, useCancelAiActionMutation,
  useConfirmAiActionMutation, useSendAiMessageMutation,
} from '../hooks/use-ai-assistant';
import type { AiMessage } from '../ai-assistant.types';

const SUGGESTIONS = [
  'Những mặt hàng nào đang dưới mức tồn tối thiểu?',
  'Có lô hàng nào sắp hết hạn không?',
  'Tóm tắt tình hình kho hôm nay',
];

export function AiAssistantScreen() {
  const theme = useTheme();
  const listRef = useRef<FlashListRef<AiMessage>>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const conversationsQuery = useAiConversationsQuery();
  const messagesQuery = useAiMessagesQuery(conversationId);
  const sendMutation = useSendAiMessageMutation();
  const confirmMutation = useConfirmAiActionMutation();
  const cancelMutation = useCancelAiActionMutation();

  const messages = messagesQuery.data?.messages ?? [];
  const drafts = messagesQuery.data?.drafts ?? [];
  const busyDraftId = confirmMutation.isPending ? confirmMutation.variables.draftId
    : cancelMutation.isPending ? cancelMutation.variables.draftId : null;
  const actionError = confirmMutation.error ?? cancelMutation.error ?? sendMutation.error;

  function send(message: string) {
    sendMutation.mutate(
      { conversationId, message },
      { onSuccess: (response) => setConversationId(response.conversationId) },
    );
  }

  function startNewChat() {
    setConversationId(null);
    setIsHistoryOpen(false);
    sendMutation.reset();
  }

  function renderHistory() {
    if (conversationsQuery.isLoading) return <LoadingState message="Đang tải lịch sử..." />;
    if (conversationsQuery.isError) return <ErrorState error={conversationsQuery.error} onRetry={() => void conversationsQuery.refetch()} />;
    const conversations = conversationsQuery.data ?? [];
    if (conversations.length === 0) return <EmptyState icon={History} title="Chưa có cuộc trò chuyện" description="Hãy đặt câu hỏi đầu tiên cho trợ lý AI." />;
    return (
      <FlashList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" accessibilityLabel={`Mở cuộc trò chuyện ${item.title}`}
            onPress={() => { setConversationId(item.id); setIsHistoryOpen(false); }}
            style={[styles.historyItem, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text numberOfLines={2} style={[styles.historyTitle, { color: theme.text }]}>{item.title}</Text>
            <Text style={[styles.historyTime, { color: theme.textSecondary }]}>{formatRelativeTime(item.lastMessageAt)}</Text>
          </Pressable>
        )}
      />
    );
  }

  function renderChat() {
    if (conversationId !== null && messagesQuery.isLoading) return <LoadingState message="Đang tải cuộc trò chuyện..." />;
    if (conversationId !== null && messagesQuery.isError) return <ErrorState error={messagesQuery.error} onRetry={() => void messagesQuery.refetch()} />;
    return (
      <FlashList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.welcome}>
            <View style={[styles.welcomeIcon, { backgroundColor: theme.primaryContainer }]}>
              <Sparkles size={28} color={theme.onPrimaryContainer} />
            </View>
            <Text style={[styles.welcomeTitle, { color: theme.text }]}>Tôi có thể giúp gì cho bạn?</Text>
            <Text style={[styles.welcomeDesc, { color: theme.textSecondary }]}>
              Hỏi về tồn kho, đơn hàng hoặc nhờ tạo phiếu — thao tác ghi luôn cần bạn xác nhận.
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((text) => (
                <Pressable key={text} accessibilityRole="button" accessibilityLabel={text} disabled={sendMutation.isPending}
                  onPress={() => send(text)}
                  style={({ pressed }) => [styles.suggestion, { borderColor: theme.border, backgroundColor: theme.card }, pressed && { backgroundColor: theme.backgroundSelected }]}>
                  <Text style={[styles.suggestionText, { color: theme.text }]}>{text}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListFooterComponent={sendMutation.isPending ? (
          <View style={styles.typingRow}>
            <AiAvatar />
            <View style={[styles.typingBubble, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
              <Text style={[styles.typing, { color: theme.textSecondary }]}>Đang trả lời...</Text>
            </View>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <AiMessageBubble message={item} drafts={drafts} busyDraftId={busyDraftId} isSendBusy={sendMutation.isPending}
            onConfirm={(draftId) => confirmMutation.mutate({ draftId, conversationId: conversationId ?? '' })}
            onCancel={(draftId) => cancelMutation.mutate({ draftId, conversationId: conversationId ?? '' })}
            onQuickReply={send} />
        )}
      />
    );
  }

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel={isHistoryOpen ? 'Đóng lịch sử' : 'Xem lịch sử'}
          onPress={() => setIsHistoryOpen((open) => !open)}
          style={[styles.toolbarButton, { borderColor: theme.border, backgroundColor: isHistoryOpen ? theme.primaryContainer : theme.card }]}>
          <History size={16} color={isHistoryOpen ? theme.onPrimaryContainer : theme.text} />
          <Text style={[styles.toolbarLabel, { color: isHistoryOpen ? theme.onPrimaryContainer : theme.text }]}>{isHistoryOpen ? 'Đóng' : 'Lịch sử'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Cuộc trò chuyện mới" onPress={startNewChat}
          style={[styles.toolbarButton, { borderColor: theme.primary, backgroundColor: theme.primary }]}>
          <MessageSquarePlus size={16} color={theme.onPrimary} />
          <Text style={[styles.toolbarLabel, { color: theme.onPrimary }]}>Cuộc trò chuyện mới</Text>
        </Pressable>
      </View>
      {actionError ? <View style={styles.banner}><AlertBanner variant="destructive" title="Không thực hiện được" description={getApiErrorMessage(actionError)} /></View> : null}
      {isHistoryOpen ? renderHistory() : (
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.screen}>{renderChat()}</View>
          <AiChatComposer isSending={sendMutation.isPending} onSend={send} />
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  toolbarButton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  toolbarLabel: { fontFamily: FontFamily.semibold, fontSize: 13 },
  banner: { padding: 12 },
  listContent: { padding: 12, paddingBottom: 20 },
  separator: { height: 16 },
  welcome: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 8, gap: 8 },
  welcomeIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  welcomeTitle: { fontFamily: FontFamily.bold, fontSize: 18, textAlign: 'center' },
  welcomeDesc: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  suggestions: { alignSelf: 'stretch', gap: 8, marginTop: 16 },
  suggestion: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  suggestionText: { fontFamily: FontFamily.medium, fontSize: 13 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: Radius.xl, borderTopLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  typing: { fontFamily: FontFamily.regular, fontSize: 13 },
  historyItem: { borderWidth: 1, borderRadius: Radius.lg, padding: 12, gap: 4, minHeight: 44 },
  historyTitle: { fontFamily: FontFamily.semibold, fontSize: 14 },
  historyTime: { fontFamily: FontFamily.regular, fontSize: 12 },
});
