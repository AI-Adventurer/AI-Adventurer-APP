import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { postStartGame } from '@/api/postStartGame';
import { useMutation } from '@/hooks/useMutation';
import type { ApiEnvelope, GameStateSnapshot, StoryResult } from '@/types/game';

export function useStartGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postStartGame,
    invalidateQueryKeys: [
      queryKeys.gameState,
      queryKeys.currentStory,
      queryKeys.currentEvent,
    ],
    showErrorToast: true,
    errorMessage: '開始遊戲失敗，請稍後再試。',
    onSuccess: (data: any) => {
      const response = data as ApiEnvelope<{
        message: string;
        game_state: GameStateSnapshot;
        story: StoryResult;
      }>;
      if (response.data?.game_state) {
        queryClient.setQueryData(queryKeys.gameState, {
          data: response.data.game_state,
        });
      }
      if (response.data?.story) {
        queryClient.setQueryData(queryKeys.currentStory, {
          data: response.data.story,
        });
      }
    },
  });
}
