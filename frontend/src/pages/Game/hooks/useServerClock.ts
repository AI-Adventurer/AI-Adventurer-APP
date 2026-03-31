import { useEffect, useState } from 'react';

export function useServerClock(serverTimeSeconds?: number) {
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [serverOffsetMs, setServerOffsetMs] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockMs(Date.now());
    }, 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!serverTimeSeconds) {
      return;
    }
    setServerOffsetMs((prevOffsetMs) => {
      const nextOffsetMs = serverTimeSeconds * 1000 - Date.now();

      if (prevOffsetMs === null) {
        return nextOffsetMs;
      }

      // 只接受會讓校準時間往前走的 offset，避免 phase 切換時倒數回朔。
      return Math.max(prevOffsetMs, nextOffsetMs);
    });
  }, [serverTimeSeconds]);

  return clockMs + (serverOffsetMs ?? 0);
}
