import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { logApiError } from '@/lib/api-error';

import { aiAssistantApi } from '../ai-assistant.api';
import type { AiConversationMessages, AiDraftStatusInfo } from '../ai-assistant.types';

const CONVERSATIONS_KEY = ['ai-assistant', 'conversations'] as const;
const messagesKey = (conversationId: string) => ['ai-assistant', 'messages', conversationId] as const;

interface DraftVariables {
  readonly draftId: string;
  readonly conversationId: string;
}

function patchDraft(
  current: AiConversationMessages | undefined,
  update: Pick<AiDraftStatusInfo, 'draftId' | 'status' | 'resultEntityId'>,
) {
  if (!current) return current;
  return {
    ...current,
    drafts: current.drafts.map((draft) => (draft.draftId === update.draftId ? { ...draft, ...update } : draft)),
  };
}

export function useAiConversationsQuery() {
  return useQuery({ queryKey: CONVERSATIONS_KEY, queryFn: aiAssistantApi.listConversations, staleTime: 15_000, retry: false });
}

export function useAiMessagesQuery(conversationId: string | null) {
  return useQuery({
    queryKey: messagesKey(conversationId ?? ''),
    enabled: conversationId !== null,
    queryFn: () => aiAssistantApi.getMessages(conversationId ?? ''),
    staleTime: 30_000,
    retry: false,
  });
}

export function useSendAiMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: aiAssistantApi.sendMessage,
    onSuccess: (response) => {
      queryClient.setQueryData<AiConversationMessages>(messagesKey(response.conversationId), (current) => {
        const knownDrafts = new Map((current?.drafts ?? []).map((draft) => [draft.draftId, draft]));
        response.drafts.forEach((draft) => knownDrafts.set(draft.draftId, draft));
        return {
          conversationId: response.conversationId,
          title: current?.title ?? response.userMessage.content,
          messages: [...(current?.messages ?? []), response.userMessage, response.assistantMessage],
          drafts: [...knownDrafts.values()],
        };
      });
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
    onError: logApiError,
  });
}

export function useConfirmAiActionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ draftId }: DraftVariables) => aiAssistantApi.confirmAction(draftId),
    onSuccess: (execution, { conversationId }) => {
      queryClient.setQueryData<AiConversationMessages>(messagesKey(conversationId), (current) => patchDraft(current, execution));
      // The executed draft created a document elsewhere, so every other cached list may be stale.
      void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'ai-assistant' });
    },
    onError: (error, { conversationId }) => {
      logApiError(error);
      // The draft may have expired or been handled elsewhere: reload its real status.
      void queryClient.invalidateQueries({ queryKey: messagesKey(conversationId) });
    },
  });
}

export function useCancelAiActionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ draftId }: DraftVariables) => aiAssistantApi.cancelAction(draftId),
    onSuccess: (_, { draftId, conversationId }) => {
      queryClient.setQueryData<AiConversationMessages>(messagesKey(conversationId), (current) =>
        patchDraft(current, { draftId, status: 'Cancelled', resultEntityId: null }));
    },
    onError: (error, { conversationId }) => {
      logApiError(error);
      void queryClient.invalidateQueries({ queryKey: messagesKey(conversationId) });
    },
  });
}
