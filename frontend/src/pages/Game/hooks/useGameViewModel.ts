import type { EventRecord, GameStateSnapshot, StoryResult } from '@/types/game';

import { useNarrativeCard } from './useNarrativeCard';
import { usePhaseSync } from './usePhaseSync';
import { useServerClock } from './useServerClock';

type UseGameViewModelInput = {
  gameState?: GameStateSnapshot;
  currentEvent?: EventRecord | null;
  currentStory?: StoryResult | null;
  isStoryLoading: boolean;
  onBoundarySync: () => void;
};

export function useGameViewModel({
  gameState,
  currentEvent,
  currentStory,
  isStoryLoading,
  onBoundarySync,
}: UseGameViewModelInput) {
  const isEventResolved =
    gameState?.judge_result === 'success' || gameState?.judge_result === 'fail';
  const isEventActive = currentEvent?.status === 'active';
  const inEventPhase = isEventActive || isEventResolved;

  const calibratedNowMs = useServerClock(gameState?.server_time);
  const localRemainingMs = Math.max(
    0,
    (gameState?.event_end_time ?? 0) * 1000 - calibratedNowMs
  );

  const narrativePhaseKey = `${inEventPhase ? 'event' : 'story'}-${currentEvent?.event_id ?? 'none'}-${gameState?.judge_result ?? 'pending'}`;

  const { displayRemainingMs } = usePhaseSync({
    hasGameState: Boolean(gameState),
    localRemainingMs,
    narrativePhaseKey,
    onBoundarySync,
  });

  const storyText =
    currentStory?.story_segment?.trim() || '等待後端推進劇情...';

  const { renderedNarrative, cardAnimClass } = useNarrativeCard({
    phaseKey: narrativePhaseKey,
    inEventPhase,
    isEventActive,
    judgeResult: gameState?.judge_result,
    storyText,
    eventText: currentEvent?.text,
    eventSuccessText: currentEvent?.success_text,
    eventFailText: currentEvent?.fail_text,
    targetAction: gameState?.target_action,
  });

  return {
    gameStatusProps: {
      hpRaw: gameState?.player_state.hp,
      score: gameState?.player_state.score,
      chapterId: gameState?.chapter_id,
      displayRemainingMs,
      isEventActive,
      isEventResolved,
      eventTimeLimitMs: currentEvent?.time_limit_ms,
    },
    narrativeProps: {
      narrative: renderedNarrative,
      cardAnimClass,
      judgeResult: gameState?.judge_result,
      isWaitingStory: !inEventPhase && isStoryLoading,
    },
  };
}
