import { useCallback, useEffect, useRef, useState } from "react";

export interface RestTimerState {
  running: boolean;
  remaining: number;
  total: number;
}

export function useRestTimer() {
  const [state, setState] = useState<RestTimerState>({ running: false, remaining: 0, total: 0 });
  const intervalRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const start = useCallback(
    (seconds: number) => {
      clear();
      setState({ running: true, remaining: seconds, total: seconds });
      intervalRef.current = window.setInterval(() => {
        setState((s) => {
          if (s.remaining <= 1) {
            clear();
            if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([200, 80, 200]);
            return { ...s, remaining: 0, running: false };
          }
          return { ...s, remaining: s.remaining - 1 };
        });
      }, 1000);
    },
    [clear],
  );

  const addTime = useCallback((seconds: number) => {
    setState((s) => ({ ...s, remaining: s.remaining + seconds, total: s.total + seconds, running: s.remaining + seconds > 0 }));
  }, []);

  const skip = useCallback(() => {
    clear();
    setState((s) => ({ ...s, remaining: 0, running: false }));
  }, [clear]);

  return { ...state, start, addTime, skip };
}
