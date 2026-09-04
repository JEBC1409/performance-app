import { useEffect, useState } from "react";
import { parseISODate } from "@/lib/date";
import { useJourneyStart } from "@/hooks/useJourneyStart";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** A small live "match clock" under the wordmark — days/hours/minutes/seconds
 * since the first thing ever logged, ticking every second like a scoreboard
 * halftime clock, not a countdown to anything. */
export function JourneyTicker() {
  const startISO = useJourneyStart();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const startMs = parseISODate(startISO).getTime();
  const elapsed = Math.max(0, now - startMs);
  const totalSeconds = Math.floor(elapsed / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="flex items-center gap-1.5 num text-[10px] text-[var(--color-muted-2)]" aria-label="Días desde tu primer registro">
      <span className="w-1 h-1 rounded-full bg-[var(--color-red)] glow-dot" />
      <span className="text-[var(--color-muted)]">
        Día <span className="text-[var(--color-red)] font-semibold">{days}</span>
      </span>
      <span className="tabular-nums">
        {pad2(hours)}:{pad2(minutes)}:{pad2(seconds)}
      </span>
    </div>
  );
}
