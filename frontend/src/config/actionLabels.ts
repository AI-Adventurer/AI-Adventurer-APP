export const ACTION_LABELS_ZH: Record<string, string> = {
  stand: '站立',
  crouch: '下蹲',
  jump: '跳躍',
  run_forward: '向前跑',
  push: '推開',
};

export function toActionLabelZh(action: string | null | undefined) {
  if (!action) {
    return '';
  }

  const normalized = action.trim().toLowerCase();
  return ACTION_LABELS_ZH[normalized] ?? action;
}
