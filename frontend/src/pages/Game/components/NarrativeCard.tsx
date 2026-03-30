import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toActionLabelZh } from '@/config/actionLabels';

import type { NarrativeViewModel } from '../lib/stream';

type NarrativeCardProps = {
  narrative: NarrativeViewModel;
  cardAnimClass: string;
  judgeResult?: string | null;
  isWaitingStory?: boolean;
};

export default function NarrativeCard({
  narrative,
  cardAnimClass,
  judgeResult,
  isWaitingStory = false,
}: NarrativeCardProps) {
  const targetActionLabel = toActionLabelZh(narrative.targetAction);

  const cardOutcomeClass =
    judgeResult === 'success'
      ? 'game-card-success'
      : judgeResult === 'fail'
        ? 'game-card-fail'
        : '';

  return (
    <Card className={`${cardAnimClass} ${cardOutcomeClass}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>{narrative.title}卡</span>
          <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
            {narrative.badge}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isWaitingStory ? (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
            劇情生成中，請稍候...
          </div>
        ) : null}

        <p className="min-h-40 rounded-lg border border-border/60 bg-muted/30 p-4 leading-relaxed">
          {narrative.text}
        </p>

        {targetActionLabel ? (
          <div className="relative overflow-hidden rounded-xl border border-primary/45 bg-[linear-gradient(135deg,hsl(var(--primary)/0.2),hsl(var(--primary)/0.06))] p-4 shadow-[0_0_0_1px_hsl(var(--primary)/0.15),0_14px_35px_-20px_hsl(var(--primary)/0.7)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,hsl(var(--primary)/0.22),transparent_45%)]" />
            <p className="relative inline-flex items-center rounded-full border border-primary/30 bg-background/70 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-primary/90">
              目標動作
            </p>
            <p className="relative mt-2 text-2xl font-extrabold tracking-wide text-primary drop-shadow-[0_2px_10px_hsl(var(--primary)/0.4)]">
              {targetActionLabel}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
