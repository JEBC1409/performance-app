import type { RestTimerState } from "./useRestTimer";

function DigitBox({ value, urgent }: { value: string; urgent: boolean }) {
  return (
    <div
      className={`num flex h-11 w-11 items-center justify-center rounded-xl border text-[19px] font-bold transition-colors ${
        urgent ? "border-[var(--color-red)] text-[var(--color-red)]" : "border-[var(--color-line-strong)] text-[var(--color-ink)]"
      }`}
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.3))",
        boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 -3px 6px -3px rgba(0,0,0,0.6) inset",
      }}
    >
      {value}
    </div>
  );
}

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
  const m = Math.floor(timer.remaining / 60).toString().padStart(2, "0");
  const s = (timer.remaining % 60).toString().padStart(2, "0");
  const urgent = timer.remaining <= 5;

  return (
    <div className="fixed bottom-16 sidebar:bottom-4 left-0 right-0 z-40 flex justify-center px-4">
      <div
        className={`flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 ${urgent ? "border-[var(--color-red)]" : "border-[var(--color-line-strong)]"}`}
        style={{
          background: "linear-gradient(155deg, rgba(255,255,255,0.05), rgba(10,10,12,0.85) 55%, rgba(0,0,0,0.9) 100%)",
          boxShadow: `0 18px 40px -20px rgba(0,0,0,0.85), 0 0 ${urgent ? 36 : 22}px -8px rgba(223,37,49,${urgent ? 0.75 : 0.4}), 0 1px 0 rgba(255,255,255,0.04) inset`,
          transition: "box-shadow 300ms ease, border-color 300ms ease",
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <span className={`eyebrow ${urgent ? "text-[var(--color-red)]" : ""}`}>Descanso</span>
          <div className="relative h-1 w-10 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
            <div className="h-full rounded-full bg-[var(--color-red)]" style={{ width: `${pct * 100}%`, transition: "width 1s linear" }} />
          </div>
        </div>

        <div className={`flex items-center gap-1 ${urgent ? "pulse" : ""}`}>
          <DigitBox value={m} urgent={urgent} />
          <span className="num text-[16px] font-bold text-[var(--color-muted-2)]">:</span>
          <DigitBox value={s} urgent={urgent} />
        </div>

        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => {
              timer.addTime(30);
              onAdd?.();
            }}
            className="tap-target rounded-full border border-[var(--color-line-strong)] px-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)] hover:border-[var(--color-red)] hover:text-[var(--color-red)]"
          >
            +30s
          </button>
          <button
            onClick={() => {
              timer.skip();
              onSkip?.();
            }}
            className="tap-target rounded-full border border-[var(--color-line-strong)] px-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)] hover:border-[var(--color-ink)]"
          >
            Saltar
          </button>
        </div>
      </div>
    </div>
  );
}
