import { useEffect, useState, useTransition } from 'react';

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
      targetAction,
    });
  const [cardAnimClass, setCardAnimClass] = useState('game-card-enter-right');
  const [, startTransition] = useTransition();

  const parseEventPhaseKey = (phaseKey: string) => {
    if (!phaseKey.startsWith('event-')) {
      return null;
    }

    const [, ...rest] = phaseKey.split('-');
    if (rest.length < 2) {
      return null;
    }

    const judge = rest.pop() ?? '';
    const eventId = rest.join('-');
    return { eventId, judge };
  };

  useEffect(() => {
    if (input.phaseKey === renderedNarrative.key) {
      return;
    }

    const prevEvent = parseEventPhaseKey(renderedNarrative.key);
    const nextEvent = parseEventPhaseKey(input.phaseKey);
    const isSameEventResolutionChange =
      prevEvent &&
      nextEvent &&
      prevEvent.eventId === nextEvent.eventId &&
      prevEvent.judge !== nextEvent.judge;

    // 同一事件從 pending 變 success/fail 時，直接更新內容避免先退出造成延遲感。
    if (isSameEventResolutionChange) {
      setRenderedNarrative({
        key: input.phaseKey,
        title,
        text,
        targetAction,
      });
      setCardAnimClass('game-card-enter-right');
      return;
    }

    // 先播放退出動畫
    setCardAnimClass('game-card-exit-left');

    const timer = window.setTimeout(() => {
      // 使用 startTransition 是為了讓 React 知道這是一個低優先級的更新
      // 這樣可以防止其他高優先級的更新打斷動畫序列
      startTransition(() => {
        setRenderedNarrative({
          key: input.phaseKey,
          title,
          text,
          targetAction,
        });
        setCardAnimClass('game-card-enter-right');
      });
    }, 210);

    return () => clearTimeout(timer);
  }, [input.phaseKey, title, text, targetAction, renderedNarrative.key]);

  return {
    renderedNarrative,
    cardAnimClass,
  };
}
