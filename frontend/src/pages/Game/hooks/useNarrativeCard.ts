import { useEffect, useState } from 'react';

import type { NarrativeViewModel } from '../lib/stream';

type UseNarrativeCardInput = {
  phaseKey: string;
  inEventPhase: boolean;
  isEventActive: boolean;
  judgeResult?: string | null;
  storyText: string;
  eventText?: string | null;
  eventSuccessText?: string | null;
  eventFailText?: string | null;
  targetAction?: string | null;
};

export function useNarrativeCard(input: UseNarrativeCardInput) {
  const title = input.inEventPhase ? '事件' : '劇情';
  const badge = input.isEventActive ? 'Action' : 'Story';

  const eventNarrativeText = input.isEventActive
    ? input.eventText?.trim() || '事件即將開始...'
    : input.judgeResult === 'success'
      ? input.eventSuccessText?.trim() || '你成功化解危機。'
      : input.judgeResult === 'fail'
        ? input.eventFailText?.trim() || '你未能及時化解危機。'
        : '事件即將開始...';

  const text = input.inEventPhase ? eventNarrativeText : input.storyText;
  const targetAction = input.isEventActive ? (input.targetAction ?? '-') : null;

  const [renderedNarrative, setRenderedNarrative] =
    useState<NarrativeViewModel>({
      key: input.phaseKey,
      title,
      text,
      badge,
      targetAction,
    });
  const [cardAnimClass, setCardAnimClass] = useState('game-card-enter-right');

  useEffect(() => {
    if (input.phaseKey === renderedNarrative.key) {
      return;
    }

    setCardAnimClass('game-card-exit-left');
    const timer = window.setTimeout(() => {
      setRenderedNarrative({
        key: input.phaseKey,
        title,
        text,
        badge,
        targetAction,
      });
      setCardAnimClass('game-card-enter-right');
    }, 210);

    return () => clearTimeout(timer);
  }, [input.phaseKey, title, text, badge, targetAction, renderedNarrative.key]);

  return {
    renderedNarrative,
    cardAnimClass,
  };
}
