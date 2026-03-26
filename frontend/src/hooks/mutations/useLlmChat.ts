import { postLlmChat } from '@/api/postLlmChat';
import { useMutation } from '@/hooks/useMutation';
import type { LlmChatPayload } from '@/types/game';

type LlmChatVariables = {
  payload: LlmChatPayload;
  signal?: AbortSignal;
};

export function useLlmChat() {
  return useMutation({
    mutationFn: (variables: LlmChatVariables) =>
      postLlmChat(variables.payload, variables.signal),
    showErrorToast: true,
  });
}
