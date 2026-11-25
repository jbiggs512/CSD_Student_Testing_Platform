import { useState, useEffect, useRef } from 'react';
import { getServerTime } from '../api';

interface UseServerTimerProps {
  startedAt: string | null;
  durationSeconds: number;
  onExpire?: () => void | Promise<void>;
}

export function useServerTimer({
  startedAt,
  durationSeconds,
  onExpire,
}: UseServerTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!startedAt) return;

    expiredRef.current = false;
    let cancelled = false;
    let intervalId: number | undefined;

    const startMs = new Date(startedAt).getTime();
    const endMs = startMs + durationSeconds * 1000;

    async function start() {
      let offsetMs = 0;

      try {
        const serverRaw = await getServerTime();
        const serverMs =
          typeof serverRaw === 'string' ? new Date(serverRaw).getTime() : serverRaw;
        offsetMs = serverMs - Date.now();
      } catch {
        // Fall back to local clock if the time endpoint fails
        offsetMs = 0;
      }

      if (cancelled) return;

      const tick = () => {
        const estimatedServerNow = Date.now() + offsetMs;
        const remainingSec = Math.max(0, Math.ceil((endMs - estimatedServerNow) / 1000));
        setSecondsLeft(remainingSec);

        if (remainingSec <= 0 && !expiredRef.current) {
          expiredRef.current = true;
          clearInterval(intervalId);
          void onExpireRef.current?.();
        }
      };

      tick();
      intervalId = window.setInterval(tick, 500);
    }

    void start();

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [startedAt, durationSeconds]);

  return secondsLeft;
}