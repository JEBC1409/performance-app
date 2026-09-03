import type { RestTimerState } from "./useRestTimer";

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
  const pct = timer.total > 0 ? (timer.total - timer.remaining) / timer.total : 0;
  const m = Math.floor(timer.remaining / 60);
  const s = timer.remaining % 60;

  return (
    <div className="fixed bottom-16 sidebar:bottom-4 left-0 right-0 z-40 flex justify-center px-4">
      <div className="panel-surface w-full max-w-md p-3.5">
        <div className="flex items-center justify-between">
          <div className="eyebrow">Descanso</div>
          <div className={`num text-lg font-semibold ${timer.remaining <= 5 ? "pulse text-[var(--color-red)]" : ""}`}>
            {m}:{s.toString().padStart(2, "0")}
          </div>
        </div>
        <div className="mt-2 h-1 bg-[var(--color-surface-2)] relative overflow-hidden">
          <div className="h-full bg-[var(--color-red)]" style={{ width: `${pct * 100}%`, transition: "width 1s linear" }} />
        </div>
        <div className="mt-2.5 flex gap-2">
          <button
            onClick={() => {
              timer.addTime(30);
              onAdd?.();
            }}
            className="tap-target flex-1 border border-[var(--color-line-strong)] py-1.5 text-[11.5px] font-semibold uppercase tracking-wide hover:border-[var(--color-red)]"
          >
            +30s
          </button>
          <button
            onClick={() => {
              timer.skip();
              onSkip?.();
            }}
            className="tap-target flex-1 border border-[var(--color-line-strong)] py-1.5 text-[11.5px] font-semibold uppercase tracking-wide hover:border-[var(--color-red)]"
          >
            Saltar
          </button>
        </div>
      </div>
    </div>
  );
}
