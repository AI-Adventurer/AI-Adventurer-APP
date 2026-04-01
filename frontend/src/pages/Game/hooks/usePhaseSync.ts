import { useEffect, useRef, useState } from 'react';

type UsePhaseSyncInput = {
  hasGameState: boolean;
  localRemainingMs: number;
  narrativePhaseKey: string;
  onBoundarySync: () => void;
};

export function usePhaseSync({
  hasGameState,
  localRemainingMs,
  narrativePhaseKey,
  onBoundarySync,
}: UsePhaseSyncInput) {
  const [phaseSyncArmed, setPhaseSyncArmed] = useState(false);
  const [zeroLockedPhaseKey, setZeroLockedPhaseKey] = useState<string | null>(
    null
  );
  const lastBoundarySyncAtRef = useRef(0);

  useEffect(() => {
    if (zeroLockedPhaseKey && zeroLockedPhaseKey !== narrativePhaseKey) {
      setZeroLockedPhaseKey(null);
    }
  }, [narrativePhaseKey, zeroLockedPhaseKey]);

  useEffect(() => {
    // 同一 phase 若剩餘時間回升，代表先前 0 鎖定是暫態誤判，解除鎖定。
    if (zeroLockedPhaseKey === narrativePhaseKey && localRemainingMs > 300) {
      setZeroLockedPhaseKey(null);
    }
  }, [localRemainingMs, narrativePhaseKey, zeroLockedPhaseKey]);

  useEffect(() => {
    if (localRemainingMs <= 0 && zeroLockedPhaseKey !== narrativePhaseKey) {
      setZeroLockedPhaseKey(narrativePhaseKey);
    }
  }, [localRemainingMs, narrativePhaseKey, zeroLockedPhaseKey]);

  useEffect(() => {
    if (!hasGameState) {
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
    onBoundarySync();
  }, [hasGameState, localRemainingMs, onBoundarySync, phaseSyncArmed]);

  return {
    displayRemainingMs:
      zeroLockedPhaseKey === narrativePhaseKey ? 0 : localRemainingMs,
  };
}
