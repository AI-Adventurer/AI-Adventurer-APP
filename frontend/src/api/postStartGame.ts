import { apiClient } from '@/lib/apiClient';
import type { ApiEnvelope, GameStateSnapshot, StoryResult } from '@/types/game';

export function postStartGame() {
  return apiClient<
    ApiEnvelope<{
      message: string;
      game_state: GameStateSnapshot;
      story: StoryResult;
    }>
  >('/api/game/start', {
    method: 'POST',
  });
}
