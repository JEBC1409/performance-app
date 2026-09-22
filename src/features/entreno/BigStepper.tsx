import { Icon } from "@/ui/Icon";

/** One big +/- control: the primary way to enter a set's weight or reps
 * everywhere in Entreno, in Gym Mode and out of it, so logging a set is the
 * same big-thumb-target motion in either place instead of a tiny keyboard. */
export function BigStepper({
  label,
  value,
  unit,
  onMinus,
  onPlus,
  chip,
}: {
  label: string;
  value: string;
  unit?: string;
  onMinus: () => void;
  onPlus: () => void;
  chip?: React.ReactNode;
}) {
  return (
    <div className="glass-track rounded-3xl px-3 py-4">
      <div className="flex items-center justify-between px-2">
        <span className="eyebrow">{label}</span>
        {chip}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button onClick={onMinus} aria-label={`Menos ${label}`} className="glass flex h-16 w-16 flex-none items-center justify-center rounded-full text-[30px] leading-none">
          <Icon name="minus" size={26} />
        </button>
        <div className="min-w-0 text-center">
          <span className="num font-[var(--font-display)] text-[64px] font-light leading-none tracking-tight">{value}</span>
          {unit ? <span className="ml-1 text-[15px] text-[var(--color-muted)]">{unit}</span> : null}
        </div>
        <button onClick={onPlus} aria-label={`Más ${label}`} className="glass-on flex h-16 w-16 flex-none items-center justify-center rounded-full text-[30px] leading-none">
          <Icon name="plus" size={26} />
        </button>
      </div>
    </div>
  );
}
