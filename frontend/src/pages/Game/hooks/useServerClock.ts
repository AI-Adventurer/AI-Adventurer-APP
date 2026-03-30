import { useEffect, useState } from 'react';

export function useServerClock(serverTimeSeconds?: number) {
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [serverOffsetMs, setServerOffsetMs] = useState(0);

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
    setServerOffsetMs(serverTimeSeconds * 1000 - Date.now());
  }, [serverTimeSeconds]);

  return clockMs + serverOffsetMs;
}
