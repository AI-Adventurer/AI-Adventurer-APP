import { useEffect, useRef, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import BackHomeButton from '@/components/common/BackHomeButton';
import { useCurrentEvent } from '@/hooks/queries/useCurrentEvent';
import { useCurrentStory } from '@/hooks/queries/useCurrentStory';
import { useGameState } from '@/hooks/queries/useGameState';
const maxHp = 3;

export default function Game() {
  const gameStateQuery = useGameState();
  const currentEventQuery = useCurrentEvent();
  const currentStoryQuery = useCurrentStory();
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [phaseSyncArmed, setPhaseSyncArmed] = useState(false);
  const [zeroLockedPhaseKey, setZeroLockedPhaseKey] = useState<string | null>(
    null
  );
  const lastBoundarySyncAtRef = useRef(0);

  const gameState = gameStateQuery.data?.data;
  const currentEvent = currentEventQuery.data?.data;
  const currentStory = currentStoryQuery.data?.data;
  const currentHp = Math.max(
    0,
    Math.min(maxHp, gameState?.player_state.hp ?? 0)
  );
  const storyText =
    currentStory?.story_segment?.trim() || '等待後端推進劇情...';

  const eventResolved =
    gameState?.judge_result === 'success' || gameState?.judge_result === 'fail';
  const isEventActive = currentEvent?.status === 'active';
  const inEventPhase = isEventActive || eventResolved;
  const phaseLabel = isEventActive
    ? '事件挑戰'
    : eventResolved
      ? '結果回饋'
      : '劇情推進';
  const calibratedNowMs = clockMs + serverOffsetMs;
  const localRemainingMs = Math.max(
    0,
    (gameState?.event_end_time ?? 0) * 1000 - calibratedNowMs
  );
  const narrativeCardTitle = inEventPhase ? '事件' : '劇情';
  const narrativePhaseKey = `${narrativeCardTitle}-${currentEvent?.event_id ?? 'none'}-${gameState?.judge_result ?? 'pending'}`;
  const displayRemainingMs =
    zeroLockedPhaseKey === narrativePhaseKey ? 0 : localRemainingMs;

  const phaseTotalMs = isEventActive
    ? (currentEvent?.time_limit_ms ?? 10000)
    : eventResolved
      ? 5000
      : 10000;

  const phaseProgress = Math.max(
    0,
    Math.min(
      100,
      phaseTotalMs > 0 ? (displayRemainingMs / phaseTotalMs) * 100 : 0
    )
  );

  const eventNarrativeText = isEventActive
    ? currentEvent?.text?.trim() || '事件即將開始...'
    : eventResolved && gameState?.judge_result === 'success'
      ? currentEvent?.success_text?.trim() || '你成功化解危機。'
      : eventResolved && gameState?.judge_result === 'fail'
        ? currentEvent?.fail_text?.trim() || '你未能及時化解危機。'
        : '事件即將開始...';

  const narrativeText = inEventPhase ? eventNarrativeText : storyText;
  const narrativeBadge = isEventActive ? 'Action' : 'Story';
  const narrativeTargetAction = isEventActive
    ? (gameState?.target_action ?? '-')
    : null;
  const [renderedNarrative, setRenderedNarrative] = useState({
    key: narrativePhaseKey,
    title: narrativeCardTitle,
    text: narrativeText,
    badge: narrativeBadge,
    targetAction: narrativeTargetAction,
  });
  const [cardAnimClass, setCardAnimClass] = useState('game-card-enter-right');

  const timeLeftSecondsValue = Math.max(0, displayRemainingMs / 1000);
  const timeLeftSecondsDisplay = timeLeftSecondsValue.toFixed(1);
  const isEventDangerTime = isEventActive && timeLeftSecondsValue <= 3;

  const cardOutcomeClass =
    eventResolved && gameState?.judge_result === 'success'
      ? 'game-card-success'
      : eventResolved && gameState?.judge_result === 'fail'
        ? 'game-card-fail'
        : '';

  // 本地時鐘：用 server_time 校正後自行更新剩餘時間。
  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockMs(Date.now());
    }, 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!gameState) {
      return;
    }
    setServerOffsetMs(gameState.server_time * 1000 - Date.now());
  }, [gameState?.server_time]);

  // 同一個 phase 一旦歸零，鎖定為 0，避免切換延遲造成倒數回彈。
  useEffect(() => {
    if (zeroLockedPhaseKey && zeroLockedPhaseKey !== narrativePhaseKey) {
      setZeroLockedPhaseKey(null);
    }
  }, [narrativePhaseKey, zeroLockedPhaseKey]);

  useEffect(() => {
    if (localRemainingMs <= 0 && zeroLockedPhaseKey !== narrativePhaseKey) {
      setZeroLockedPhaseKey(narrativePhaseKey);
    }
  }, [localRemainingMs, narrativePhaseKey, zeroLockedPhaseKey]);

  // 到點後改為節流重試同步，避免卡在 0 秒卻沒切到下一輪。
  useEffect(() => {
    if (!gameState) {
      return;
    }

    if (localRemainingMs > 120) {
      if (phaseSyncArmed) {
        setPhaseSyncArmed(false);
      }
      return;
    }

    const nowMs = Date.now();
    const retryGapMs = phaseSyncArmed ? 650 : 0;
    if (nowMs - lastBoundarySyncAtRef.current < retryGapMs) {
      return;
    }

    lastBoundarySyncAtRef.current = nowMs;
    if (!phaseSyncArmed) {
      setPhaseSyncArmed(true);
    }
    void gameStateQuery.refetch();
    void currentEventQuery.refetch();
    void currentStoryQuery.refetch();
  }, [
    gameState,
    localRemainingMs,
    phaseSyncArmed,
    gameStateQuery,
    currentEventQuery,
    currentStoryQuery,
  ]);

  useEffect(() => {
    if (narrativePhaseKey === renderedNarrative.key) {
      return;
    }

    setCardAnimClass('game-card-exit-left');
    const timer = window.setTimeout(() => {
      setRenderedNarrative({
        key: narrativePhaseKey,
        title: narrativeCardTitle,
        text: narrativeText,
        badge: narrativeBadge,
        targetAction: narrativeTargetAction,
      });
      setCardAnimClass('game-card-enter-right');
    }, 210);

    return () => clearTimeout(timer);
  }, [
    narrativePhaseKey,
    narrativeCardTitle,
    narrativeText,
    narrativeBadge,
    narrativeTargetAction,
    renderedNarrative.key,
  ]);

  return (
    <section className="space-y-5 pb-8">
      <BackHomeButton />
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>鏡頭畫面</CardTitle>
          </CardHeader>
          <CardContent className="h-full">
            <div className="relative flex h-[min(74vh,700px)] min-h-[420px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/60 bg-[linear-gradient(145deg,hsl(var(--muted)/0.5),hsl(var(--card)))] text-sm text-muted-foreground">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,hsl(var(--primary)/0.2),transparent_38%),radial-gradient(circle_at_78%_80%,hsl(var(--primary)/0.12),transparent_42%)]" />
              TODO: Camera Stream Preview
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-rows-[auto_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>遊戲狀態</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <p className="text-[11px] text-muted-foreground">血量</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {currentHp}/{maxHp}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <p className="text-[11px] text-muted-foreground">分數</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {gameState?.player_state.score ?? '-'}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <p className="text-[11px] text-muted-foreground">章節</p>
                  <p className="text-lg font-semibold">
                    {gameState?.chapter_id ?? '-'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{phaseLabel}</span>
                  <span className="font-semibold tabular-nums">
                    {timeLeftSecondsDisplay}s
                  </span>
                </div>
                <Progress
                  value={phaseProgress}
                  className={
                    isEventDangerTime
                      ? 'h-2 [&_[data-slot=progress-indicator]]:bg-destructive'
                      : 'h-2'
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardAnimClass} ${cardOutcomeClass}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>{renderedNarrative.title}卡</span>
                <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                  {renderedNarrative.badge}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="min-h-40 rounded-lg border border-border/60 bg-muted/30 p-4 leading-relaxed">
                {renderedNarrative.text}
              </p>

              {renderedNarrative.targetAction ? (
                <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">目標動作</p>
                  <p className="mt-1 text-lg font-semibold text-primary">
                    {renderedNarrative.targetAction}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
