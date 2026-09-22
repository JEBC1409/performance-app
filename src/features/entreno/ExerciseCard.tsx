import type { ExerciseTarget } from "@/data/gym";
import { Chip } from "@/ui";

export function ExerciseCard({
  exercise,
  done,
  onOpen,
  photo,
}: {
  exercise: ExerciseTarget;
  done: number;
  onOpen: () => void;
  photo: { src: string | null; caption?: string; custom?: boolean };
}) {
  const target = exercise.series;
  const complete = done >= target;
  const imgUrl = photo.src;

  return (
    <button
      onClick={onOpen}
      className={`panel-surface group flex flex-col text-left transition-opacity ${complete ? "opacity-60 hover:opacity-100" : ""}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface-2)]">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={exercise.name}
            loading="lazy"
            className={`h-full w-full object-cover object-[50%_30%] opacity-90 transition-all duration-300 group-hover:scale-105 group-hover:opacity-100 ${photo.custom ? "" : "photo-tone"}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10.5px] uppercase tracking-wide text-[var(--color-muted-2)]">
            {exercise.name}
          </div>
        )}
        {photo.src && !photo.custom ? <div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-color bg-[rgb(var(--accent-rgb)/0.32)]" /> : null}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
        {photo.caption ? (
          <span className="absolute bottom-2 left-2 max-w-[85%] truncate rounded-full bg-black/70 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink)]">
            {photo.caption}
          </span>
        ) : null}
        {exercise.preFatiga ? (
          <span className="absolute left-2 top-2">
            <Chip tone="accent">Pre-fatiga</Chip>
          </span>
        ) : null}
        {complete ? (
          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-good)] text-[11px] font-bold text-black">
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
          <span className="num text-[10.5px] text-[var(--color-muted-2)]">
            {exercise.series}×{exercise.repsLabel}
          </span>
        </div>
      </div>
    </button>
  );
}
