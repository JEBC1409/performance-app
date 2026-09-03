import type { ExerciseTarget } from "@/data/gym";
import { exerciseImageUrl } from "@/data/exerciseImages";
import { Chip } from "@/ui";

export function ExerciseCard({
  exercise,
  done,
  onOpen,
}: {
  exercise: ExerciseTarget;
  done: number;
  onOpen: () => void;
}) {
  const target = exercise.series;
  const complete = done >= target;
  const imgUrl = exerciseImageUrl(exercise.name);

  return (
    <button onClick={onOpen} className="panel-surface group flex flex-col text-left">
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface-2)]">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={exercise.name}
            loading="lazy"
            className="h-full w-full object-cover opacity-85 transition-all duration-300 group-hover:scale-105 group-hover:opacity-100"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-[9.5px] uppercase tracking-wide text-[var(--color-muted-2)]">
            {exercise.name}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
        {exercise.preFatiga ? (
          <span className="absolute left-2 top-2">
            <Chip tone="accent">Pre-fatiga</Chip>
          </span>
        ) : null}
        {complete ? (
          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-good)] text-[10px] font-bold text-black">
            ✓
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="line-clamp-2 text-[12px] font-semibold leading-snug">{exercise.name}</div>
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="num text-[11.5px] font-semibold text-[var(--color-red)]">
            {done}/{target}
          </span>
          <span className="num text-[9.5px] text-[var(--color-muted-2)]">
            {exercise.series}×{exercise.repsLabel}
          </span>
        </div>
      </div>
    </button>
  );
}
