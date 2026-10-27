import { fmtNum } from "./stepperConfig";

/** The "paso 2.5" control of the weight stepper. It looks like a small pill but the
 * button around it is 44px tall (the negative margin keeps the stepper's header the same height). */
export function StepChip({ step, onCycle }: { step: number; onCycle: () => void }) {
  return (
    <button onClick={onCycle} aria-label={`Paso de peso ${step} kilos; toca para cambiar`} className="tap-target -my-2 flex items-center px-1">
      <span className="rounded-full border border-[var(--color-line-strong)] px-3 py-1 text-[length:var(--fs-sm)] font-semibold text-[var(--color-muted)]">paso {fmtNum(step)}</span>
    </button>
  );
}
