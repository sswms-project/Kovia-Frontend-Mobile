import { z } from 'zod';

// Mirrors SendAiChatMessageCommandValidator.
export const AI_CHAT_MESSAGE_MAX_LENGTH = 2000;

export const aiChatMessageSchema = z
  .string()
  .trim()
  .min(1, 'Hãy nhập câu hỏi.')
  .max(AI_CHAT_MESSAGE_MAX_LENGTH, `Câu hỏi tối đa ${AI_CHAT_MESSAGE_MAX_LENGTH} ký tự.`);
