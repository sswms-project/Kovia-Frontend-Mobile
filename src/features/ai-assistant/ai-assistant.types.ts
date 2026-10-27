// Mirrors Contract/Models/AiAssistant/AiAssistantResponses.cs.
export const AI_CARD_TYPES = {
  actionConfirmation: 'action_confirmation',
  navigation: 'navigation_card',
  quickReplies: 'quick_replies',
  suggestedAction: 'suggested_action',
} as const;

export type AiDraftStatus = 'Pending' | 'Executed' | 'Cancelled' | 'Expired';

export interface AiActionDetail {
  readonly label: string;
  readonly value: string;
}

export interface AiCard {
  readonly type: string;
  readonly title?: string | null;
  readonly description?: string | null;
  readonly draftId?: string | null;
  readonly action?: string | null;
  readonly summary?: string | null;
  readonly details?: readonly AiActionDetail[] | null;
  readonly expiresAt?: string | null;
  readonly options?: readonly string[] | null;
  readonly message?: string | null;
}

export interface AiMessage {
  readonly id: string;
  readonly role: 'User' | 'Assistant';
  readonly content: string;
  readonly cards: readonly AiCard[];
  readonly createdAt: string;
}

export interface AiDraftStatusInfo {
  readonly draftId: string;
  readonly action: string;
  readonly status: AiDraftStatus;
  readonly resultEntityId: string | null;
  readonly expiresAt: string;
}

export interface AiChatResponse {
  readonly conversationId: string;
  readonly userMessage: AiMessage;
  readonly assistantMessage: AiMessage;
  readonly drafts: readonly AiDraftStatusInfo[];
}

export interface AiConversation {
  readonly id: string;
  readonly title: string;
  readonly lastMessageAt: string;
}

export interface AiConversationMessages {
  readonly conversationId: string;
  readonly title: string;
  readonly messages: readonly AiMessage[];
  readonly drafts: readonly AiDraftStatusInfo[];
}

export interface AiActionExecution {
  readonly draftId: string;
  readonly action: string;
  readonly status: AiDraftStatus;
  readonly resultEntityId: string | null;
}

export interface SendAiChatMessageBody {
  readonly conversationId: string | null;
  readonly message: string;
}
