import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type GameStatusCardProps = {
  hpRaw?: number;
  score?: number;
  chapterId?: string | number;
  displayRemainingMs: number;
  isEventActive: boolean;
  isEventResolved: boolean;
  eventTimeLimitMs?: number;
};

export default function GameStatusCard({
  hpRaw,
  score,
  chapterId,
  displayRemainingMs,
  isEventActive,
  isEventResolved,
  eventTimeLimitMs,
}: GameStatusCardProps) {
  const maxHp = 5;
  const currentHp = Math.max(0, Math.min(maxHp, hpRaw ?? 0));
  const displayScore = score === undefined ? '-' : Math.max(0, score);
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
  const isEventDangerTime = isEventActive && timeLeftSecondsValue <= 3;

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
            <p className="text-lg font-semibold tabular-nums">{displayScore}</p>
          </div>
          <div className="game-status-tile rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] text-muted-foreground">章節</p>
            <p className="text-lg font-semibold">{chapterId ?? '-'}</p>
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
