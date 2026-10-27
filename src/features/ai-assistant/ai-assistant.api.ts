import { api, unwrap, type ApiResponse } from '@/lib/api';

import type {
  AiActionExecution, AiChatResponse, AiConversation, AiConversationMessages, SendAiChatMessageBody,
} from './ai-assistant.types';

// The assistant may run several tool calls before answering; the BE allows 90s.
const AI_CHAT_TIMEOUT_MS = 100_000;

export const aiAssistantApi = {
  sendMessage: async (body: SendAiChatMessageBody) =>
    unwrap(await api.post<ApiResponse<AiChatResponse>>('/ai/chat', body, { timeout: AI_CHAT_TIMEOUT_MS })),
  listConversations: async () =>
    unwrap(await api.get<ApiResponse<AiConversation[]>>('/ai/conversations')),
  getMessages: async (conversationId: string) =>
    unwrap(await api.get<ApiResponse<AiConversationMessages>>(`/ai/conversations/${conversationId}/messages`)),
  confirmAction: async (draftId: string) =>
    unwrap(await api.post<ApiResponse<AiActionExecution>>(`/ai/actions/${draftId}/confirm`)),
  cancelAction: async (draftId: string) => {
    await api.post<ApiResponse<unknown>>(`/ai/actions/${draftId}/cancel`);
  },
};
