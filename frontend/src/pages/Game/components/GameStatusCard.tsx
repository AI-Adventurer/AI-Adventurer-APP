import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type GameStatusCardProps = {
  hpRaw?: number;
  score?: number;
  chapterId?: string | number;
  storyCount?: number;
  displayRemainingMs: number;
  isEventActive: boolean;
  isEventResolved: boolean;
  eventTimeLimitMs?: number;
  isReadingGuard?: boolean;
};

function formatChapterLabel(
  chapterId: string | number | undefined,
  storyCount?: number
) {
  const normalizedStoryCount =
    typeof storyCount === 'number' && Number.isFinite(storyCount)
      ? Math.max(1, Math.floor(storyCount))
      : null;

  // 進度顯示以累積劇情數為主：1-1 ~ 1-10, 2-1 ~ 2-10
  if (normalizedStoryCount !== null) {
    const chapterFromProgress = Math.min(
      2,
      Math.floor((normalizedStoryCount - 1) / 10) + 1
    );
    const segmentFromProgress = ((normalizedStoryCount - 1) % 10) + 1;
    return `${chapterFromProgress}-${segmentFromProgress}`;
  }

  if (chapterId === undefined || chapterId === null || chapterId === '') {
    return '-';
  }

  const rawValue = String(chapterId).trim();
  const numericPart =
    /^chapter-(\d+)$/i.exec(rawValue)?.[1] ??
    /^chapter(\d+)$/i.exec(rawValue)?.[1] ??
    (/^\d+$/.test(rawValue) ? rawValue : null);

  if (!numericPart) {
    return rawValue;
  }

  const chapterNumber = Number.parseInt(numericPart, 10);
  if (!Number.isFinite(chapterNumber) || chapterNumber <= 0) {
    return rawValue;
  }

  return `${chapterNumber}-1`;
}

export default function GameStatusCard({
  hpRaw,
  score,
  chapterId,
  storyCount,
  displayRemainingMs,
  isEventActive,
  isEventResolved,
  eventTimeLimitMs,
  isReadingGuard = false,
}: GameStatusCardProps) {
  const previousScoreRef = useRef<number | null>(null);
  const scoreDeltaHideTimerRef = useRef<number | null>(null);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const [scoreDeltaAnimKey, setScoreDeltaAnimKey] = useState(0);

  const maxHp = 5;
  const currentHp = Math.max(0, Math.min(maxHp, hpRaw ?? 0));
  const displayScore = score === undefined ? '-' : Math.max(0, score);
  const displayChapter = formatChapterLabel(chapterId, storyCount);
  const hpPercent = (currentHp / maxHp) * 100;
  const phaseTotalMs = isEventActive
    ? (eventTimeLimitMs ?? 10000)
    : isEventResolved
      ? 5000
      : 10000;

  const phaseProgress = Math.max(
    0,
    Math.min(
      100,
      phaseTotalMs > 0 ? (displayRemainingMs / phaseTotalMs) * 100 : 0
    )
  );

  const timeLeftSecondsValue = Math.max(0, displayRemainingMs / 1000);
  const timeLeftSecondsDisplay = timeLeftSecondsValue.toFixed(1);
  const isEventDangerTime =
    isEventActive && !isReadingGuard && timeLeftSecondsValue <= 3;

  useEffect(() => {
    const nextScore = typeof score === 'number' ? Math.max(0, score) : null;
    if (nextScore === null) {
      return;
    }

    const previousScore = previousScoreRef.current;
    previousScoreRef.current = nextScore;

    if (previousScore === null) {
      return;
    }

    const delta = nextScore - previousScore;
    if (delta === 0) {
      return;
    }

    setScoreDelta(delta);
    setScoreDeltaAnimKey((value) => value + 1);

    if (scoreDeltaHideTimerRef.current !== null) {
      window.clearTimeout(scoreDeltaHideTimerRef.current);
    }

    scoreDeltaHideTimerRef.current = window.setTimeout(() => {
      setScoreDelta(null);
      scoreDeltaHideTimerRef.current = null;
    }, 900);
  }, [score]);

  useEffect(
    () => () => {
      if (scoreDeltaHideTimerRef.current !== null) {
        window.clearTimeout(scoreDeltaHideTimerRef.current);
      }
    },
    []
  );

  return (
    <Card className="game-status-card relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_14%,hsl(var(--primary)/0.15),transparent_44%),radial-gradient(circle_at_86%_86%,hsl(var(--primary)/0.08),transparent_44%)]" />
      <CardHeader className="relative space-y-2">
        <CardTitle className="flex items-center justify-between">
          <span>遊戲狀態</span>
        </CardTitle>
        <div className="h-px w-full bg-gradient-to-r from-primary/20 via-border/70 to-transparent" />
      </CardHeader>
      <CardContent className="relative space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="game-status-tile rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] text-muted-foreground">血量</p>
            <p className="text-lg font-semibold tabular-nums">
              {currentHp}/{maxHp}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all duration-500"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>
          <div className="game-status-tile rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] text-muted-foreground">分數</p>
            <div className="relative inline-flex items-center gap-2">
              <p className="text-lg font-semibold tabular-nums">
                {displayScore}
              </p>
              {scoreDelta !== null ? (
                <span
                  key={scoreDeltaAnimKey}
                  className={`game-score-delta ${
                    scoreDelta > 0
                      ? 'game-score-delta-positive'
                      : 'game-score-delta-negative'
                  }`}
                >
                  {scoreDelta > 0 ? `+${scoreDelta}` : `${scoreDelta}`}
                </span>
              ) : null}
            </div>
          </div>
          <div className="game-status-tile rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] text-muted-foreground">進度</p>
            <p className="text-lg font-semibold">{displayChapter}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">剩餘時間</span>
            <span
              className={`font-semibold tabular-nums ${
                isEventDangerTime ? 'game-status-danger text-destructive' : ''
              }`}
            >
              {timeLeftSecondsDisplay}s
            </span>
          </div>
          <Progress
            value={phaseProgress}
            className={
              isEventDangerTime
                ? 'game-status-progress h-2 [&_[data-slot=progress-indicator]]:bg-destructive'
                : 'game-status-progress h-2'
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
