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

const CHINESE_DIGITS = [
  '零',
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
] as const;

function toChineseNumber(value: number): string {
  if (!Number.isInteger(value) || value <= 0) {
    return '';
  }

  if (value < 10) {
    return CHINESE_DIGITS[value];
  }

  if (value < 100) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    const tensText = tens === 1 ? '十' : `${CHINESE_DIGITS[tens]}十`;
    return ones === 0 ? tensText : `${tensText}${CHINESE_DIGITS[ones]}`;
  }

  if (value < 1000) {
    const hundreds = Math.floor(value / 100);
    const remainder = value % 100;
    const hundredsText = `${CHINESE_DIGITS[hundreds]}百`;

    if (remainder === 0) {
      return hundredsText;
    }

    if (remainder < 10) {
      return `${hundredsText}零${CHINESE_DIGITS[remainder]}`;
    }

    return `${hundredsText}${toChineseNumber(remainder)}`;
  }

  return String(value);
}

function formatChapterLabel(chapterId: string | number | undefined) {
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
  const chineseNumber = toChineseNumber(chapterNumber);

  if (!chineseNumber) {
    return rawValue;
  }

  return `第${chineseNumber}章`;
}

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
  const displayChapter = formatChapterLabel(chapterId);
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
