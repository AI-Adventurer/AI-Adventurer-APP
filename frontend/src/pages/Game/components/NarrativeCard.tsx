import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toActionLabelZh } from '@/config/actionLabels';

import type { NarrativeViewModel } from '../lib/stream';
import TargetActionIllustration from './TargetActionIllustration';

type NarrativeCardProps = {
  narrative: NarrativeViewModel;
  cardAnimClass: string;
  judgeResult?: string | null;
  isWaitingStory?: boolean;
};

function NarrativeCardContent({
  narrative,
  cardAnimClass,
  judgeResult,
  isWaitingStory = false,
}: NarrativeCardProps) {
  const targetActionLabel = toActionLabelZh(narrative.targetAction);
  const isResolved = judgeResult === 'success' || judgeResult === 'fail';
  const shouldFadeTargetAction = isResolved && Boolean(targetActionLabel);
  const shouldShowStoryLoading =
    isWaitingStory && narrative.title === '劇情';

  const cardOutcomeClass =
    judgeResult === 'success'
      ? 'game-card-success'
      : judgeResult === 'fail'
        ? 'game-card-fail'
        : '';

  return (
    <Card className={`${cardAnimClass} ${cardOutcomeClass}`}>
      <CardHeader className="pb-3">
        <CardTitle>{narrative.title}卡</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {shouldShowStoryLoading ? (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
            劇情生成中，請稍候...
          </div>
        ) : null}

        <p className="min-h-40 rounded-lg border border-border/60 bg-muted/30 p-4 leading-relaxed">
          {narrative.text}
        </p>
        {targetActionLabel ? (
          <>
            <p className="relative inline-flex items-center rounded-full py-0.5 font-semibold tracking-wide text-primary/90">
              目標動作
            </p>
            <div
              className={`relative overflow-hidden rounded-xl border border-primary/45 bg-[linear-gradient(135deg,hsl(var(--primary)/0.2),hsl(var(--primary)/0.06))] p-4 shadow-[0_0_0_1px_hsl(var(--primary)/0.15),0_14px_35px_-20px_hsl(var(--primary)/0.7)] ${
                shouldFadeTargetAction ? 'game-target-action-fade-out' : ''
              }`}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,hsl(var(--primary)/0.22),transparent_45%)]" />
              <div className="relative mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
                <div className="space-y-1">
                  <p className="text-2xl text-center font-extrabold tracking-wide text-primary drop-shadow-[0_2px_10px_hsl(var(--primary)/0.4)]">
                    {targetActionLabel}
                  </p>
                </div>
                <TargetActionIllustration
                  action={narrative.targetAction}
                  label={targetActionLabel}
                  className="justify-self-start md:justify-self-end"
                />
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function NarrativeCard(props: NarrativeCardProps) {
  return <NarrativeCardContent {...props} />;
}

const MemoizedNarrativeCard = React.memo(
  NarrativeCard,
  (prevProps, nextProps) => {
    // 只有當動畫類或敘述內容改變時，才需要重新渲染
    return (
      prevProps.cardAnimClass === nextProps.cardAnimClass &&
      prevProps.narrative.key === nextProps.narrative.key &&
      prevProps.narrative.text === nextProps.narrative.text &&
      prevProps.narrative.title === nextProps.narrative.title &&
      prevProps.narrative.targetAction === nextProps.narrative.targetAction &&
      prevProps.judgeResult === nextProps.judgeResult &&
      prevProps.isWaitingStory === nextProps.isWaitingStory
    );
  }
);

export { MemoizedNarrativeCard as NarrativeCard };
