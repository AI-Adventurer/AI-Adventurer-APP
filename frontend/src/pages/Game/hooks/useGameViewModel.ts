import type { EventRecord, GameStateSnapshot, StoryResult } from '@/types/game';

import { useNarrativeCard } from './useNarrativeCard';
import { usePhaseSync } from './usePhaseSync';
import { useServerClock } from './useServerClock';

const EVENT_READ_GRACE_MS = 5000;

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
  const hasEventId = Boolean(gameState?.event_id);
  const isEventResolved =
    gameState?.judge_result === 'success' || gameState?.judge_result === 'fail';
  const isEventActive = hasEventId && !isEventResolved;
  const inEventPhase = hasEventId || isEventResolved;

  const calibratedNowMs = useServerClock(gameState?.server_time);
  const serverRemainingMs = Math.max(
    0,
    (gameState?.event_end_time ?? 0) * 1000 - calibratedNowMs
  );

  const narrativePhaseKey = `${inEventPhase ? 'event' : 'story'}-${gameState?.event_id ?? 'none'}-${gameState?.judge_result ?? 'pending'}`;

  const eventElapsedMs = currentEvent?.created_at
    ? Math.max(0, calibratedNowMs - currentEvent.created_at * 1000)
    : Number.POSITIVE_INFINITY;
  const readingGuardRemainingMs = Math.max(
    0,
    EVENT_READ_GRACE_MS - eventElapsedMs
  );
  const isReadingGuard =
    isEventActive &&
    gameState?.judge_result === 'pending' &&
    readingGuardRemainingMs > 0;

  const eventTimeLimitMs = currentEvent?.time_limit_ms ?? 10000;
  const hasEventTimelineAnchor = Boolean(currentEvent?.created_at);
  const activeEventRemainingMs = hasEventTimelineAnchor
    ? Math.max(
        0,
        eventTimeLimitMs - Math.max(0, eventElapsedMs - EVENT_READ_GRACE_MS)
      )
    : Math.max(serverRemainingMs, eventTimeLimitMs);

  const timelineRemainingMs = isEventActive
    ? activeEventRemainingMs
    : serverRemainingMs;

  const { displayRemainingMs } = usePhaseSync({
    hasGameState: Boolean(gameState),
    localRemainingMs: timelineRemainingMs,
    narrativePhaseKey,
    onBoundarySync,
  });

  const syncedStoryText =
    gameState?.story_segment?.trim() || currentStory?.story_segment?.trim();
  const storyText = syncedStoryText || '等待後端推進劇情...';

  const { renderedNarrative, cardAnimClass } = useNarrativeCard({
    phaseKey: narrativePhaseKey,
    inEventPhase,
    isEventActive,
    judgeResult: gameState?.judge_result,
    storyText,
    eventText: gameState?.story_segment ?? currentEvent?.text,
    eventSuccessText:
      gameState?.judge_result === 'success'
        ? (gameState?.story_segment ?? currentEvent?.success_text)
        : currentEvent?.success_text,
    eventFailText:
      gameState?.judge_result === 'fail'
        ? (gameState?.story_segment ?? currentEvent?.fail_text)
        : currentEvent?.fail_text,
    targetAction: gameState?.target_action,
  });

  return {
    gameStatusProps: {
      hpRaw: gameState?.player_state.hp,
      score: gameState?.player_state.score,
      chapterId: gameState?.chapter_id,
      storyCount: gameState?.story_count,
      displayRemainingMs,
      isEventActive,
      isEventResolved,
      eventTimeLimitMs,
      isReadingGuard,
    },
    narrativeProps: {
      narrative: renderedNarrative,
      cardAnimClass,
      judgeResult: gameState?.judge_result,
      isWaitingStory: !inEventPhase && isStoryLoading,
      isReadingGuard,
      readingGuardRemainingMs,
    },
  };
}
