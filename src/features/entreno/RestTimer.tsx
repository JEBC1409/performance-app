import { Button } from "@/ui";
import type { RestTimerState } from "./useRestTimer";

/** The rest countdown floating above the nav while you rest between sets (not in Gym Mode, which has its own). */
export function RestTimer({
  timer,
  onAdd,
  onSkip,
}: {
  timer: RestTimerState & { addTime: (s: number) => void; skip: () => void };
  onAdd?: () => void;
  onSkip?: () => void;
}) {
  if (!timer.running) return null;
  const pct = timer.total > 0 ? Math.min(1, Math.max(0, (timer.total - timer.remaining) / timer.total)) : 0;
  const m = Math.floor(timer.remaining / 60).toString().padStart(2, "0");
  const s = (timer.remaining % 60).toString().padStart(2, "0");
  const urgent = timer.remaining <= 5;

  return (
    <div className="fixed bottom-[calc(5.75rem_+_env(safe-area-inset-bottom))] sidebar:bottom-4 left-0 right-0 z-40 flex justify-center px-4">
      <div className={`surface-2 flex w-full max-w-md flex-col gap-2 rounded-[var(--r-card)] px-4 pb-3 pt-2.5`} style={urgent ? { borderColor: "var(--color-accent-text)" } : undefined} role="timer" aria-live="off" aria-label="Descanso">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className={`eyebrow ${urgent ? "eyebrow-accent" : ""}`}>Descanso</span>
            <span className={`num font-[var(--font-display)] text-[34px] font-light leading-none ${urgent ? "pulse text-[var(--color-accent-text)]" : ""}`}>
              {m}:{s}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                timer.addTime(30);
                onAdd?.();
              }}
              className="whitespace-nowrap px-4 text-[length:var(--fs-sm)]"
            >
              +30 s
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                timer.skip();
                onSkip?.();
              }}
              className="whitespace-nowrap px-4 text-[length:var(--fs-sm)]"
            >
              Saltar
            </Button>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[rgb(var(--fg-rgb)/0.1)]">
          <div className="h-full rounded-full bg-[rgb(var(--accent-solid-rgb))]" style={{ width: `${pct * 100}%`, transition: "width 1s linear" }} />
        </div>
      </div>
    </div>
  );
}
