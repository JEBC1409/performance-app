import { useCallback, useEffect, useRef, useState } from "react";

/** A short-lived confirmation message ("Serie 2 guardada") that clears itself.
 * Lives in the screen itself rather than a toast, so it stays where the thumb is
 * and works the same offline (the save is local). */
export function useSavedFlash(ms = 2200): readonly [string | null, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flash = useCallback(
    (next: string) => {
      setMessage(next);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), ms);
    },
    [ms],
  );

  useEffect(() => () => clearTimeout(timer.current), []);
  return [message, flash] as const;
}
