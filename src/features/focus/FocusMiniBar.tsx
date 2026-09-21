import { fmtClock, useFocusTimer, useNow } from "@/hooks/useFocusTimer";
import { pauseFocus, remainingSeconds, resumeFocus } from "@/lib/focusTimer";

/** When a Focus block is running and you're on another screen, the big dial
 * shrinks to this little pill: time left, what you're on, pause/resume, and a
 * tap to jump back. */
export function FocusMiniBar({ visible, onOpen }: { visible: boolean; onOpen: () => void }) {
  const timer = useFocusTimer();
  const active = timer.status !== "idle";
  const now = useNow(active && timer.status === "running");
  if (!visible || !active) return null;

  const isBreak = timer.phase === "break";
  const paused = timer.status === "paused";
  const left = Math.min(remainingSeconds(timer, now), timer.totalSec);
  const progress = timer.totalSec > 0 ? 1 - left / timer.totalSec : 0;
  const color = isBreak ? "var(--color-good)" : "var(--color-red)";

  return (
    <div className="fixed right-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 sidebar:bottom-5 enter">
      <div className="glass flex items-center gap-1 rounded-full py-1 pl-1 pr-1.5" style={{ boxShadow: `0 10px 26px -12px ${color}` }}>
        <button onClick={onOpen} aria-label="Abrir Focus" className="flex items-center gap-2.5 rounded-full py-1 pl-2 pr-2">
          <span className="relative flex h-7 w-7 flex-none items-center justify-center">
            <svg viewBox="0 0 28 28" width="28" height="28" className="-rotate-90" aria-hidden>
              <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="3" />
              <circle cx="14" cy="14" r="11" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={69.1} strokeDashoffset={69.1 * (1 - progress)} />
            </svg>
          </span>
          <span className="text-left leading-none">
            <span className="num block text-[15px] font-semibold">{fmtClock(left)}</span>
            <span className="mt-0.5 block max-w-[110px] truncate text-[10.5px] text-[var(--color-muted)]">{isBreak ? "Descanso" : paused ? `En pausa · ${timer.task}` : timer.task}</span>
          </span>
        </button>
        <button
          onClick={paused ? resumeFocus : pauseFocus}
          aria-label={paused ? "Reanudar" : "Pausar"}
          className="glass-flat hit flex h-8 w-8 flex-none items-center justify-center rounded-full text-[var(--color-ink)]"
        >
          {paused ? (
            <svg width="12" height="12" viewBox="0 0 20 20" aria-hidden>
              <path d="M6 3.6v12.8a.6.6 0 0 0 .9.5l10-6.4a.6.6 0 0 0 0-1L6.9 3.1a.6.6 0 0 0-.9.5Z" fill="currentColor" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 20 20" aria-hidden>
              <rect x="5" y="3.5" width="3.6" height="13" rx="1.2" fill="currentColor" />
              <rect x="11.4" y="3.5" width="3.6" height="13" rx="1.2" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
