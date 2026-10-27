import type { ExerciseTarget } from "@/data/gym";
import type { Suggestion } from "@/lib/progression";
import { Chip } from "@/ui";
import { Icon } from "@/ui/Icon";
import type { CardLayout } from "./layout";

export function ExerciseCard({
  exercise,
  done,
  stalled,
  ready,
  onOpen,
  photo,
  layout,
}: {
  exercise: ExerciseTarget;
  done: number;
  /** Several sessions in a row without progress (the screen decides when that is worth a badge). */
  stalled?: boolean;
  /** Last session topped the rep range: the suggestion to add weight. */
  ready?: Suggestion;
  onOpen: () => void;
  photo: { src: string | null; caption?: string; custom?: boolean };
  layout: CardLayout;
}) {
  const target = exercise.series;
  const complete = done >= target;
  const imgUrl = photo.src;

  return (
    <button
      onClick={onOpen}
      aria-label={`${exercise.name}, ${done} de ${target} series${complete ? ", completo" : ""}`}
      className={`panel-surface group flex flex-col text-left ${layout.span}`}
    >
      <div className={`relative w-full overflow-hidden bg-[var(--color-surface-2)] ${layout.photo}`}>
        {imgUrl ? (
          <img
            src={imgUrl}
            alt=""
            loading="lazy"
            className={`h-full w-full object-cover object-[50%_30%] transition-opacity duration-300 ${complete ? "opacity-50" : "opacity-90 group-hover:opacity-100"} ${photo.custom ? "" : "photo-tone"}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-[length:var(--fs-meta)] text-[var(--color-muted)]">{exercise.name}</div>
        )}
        {photo.src && !photo.custom ? <div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-color bg-[rgb(var(--accent-rgb)/0.32)]" /> : null}
        {/* The darkening is for legibility over a photo: without one (still loading, or none) it just muddies the card. */}
        {imgUrl ? <div className="photo-scrim pointer-events-none absolute inset-0" /> : null}
        {photo.caption ? (
          <span className="absolute bottom-2 left-2 max-w-[85%] truncate rounded-full bg-black/70 px-2 py-0.5 text-[length:var(--fs-meta)] font-semibold text-white">{photo.caption}</span>
        ) : null}
        {exercise.preFatiga ? (
          <span className="absolute left-2 top-2 rounded-full bg-[rgb(var(--surface-rgb)/0.9)]">
            <Chip tone="accent">Pre-fatiga</Chip>
          </span>
        ) : null}
        {complete ? (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-good)] text-[var(--color-on-solid)]" aria-hidden>
            <Icon name="check" size={14} />
          </span>
        ) : null}
        {stalled && !complete ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-[var(--color-warn)] px-2.5 py-0.5 text-[length:var(--fs-meta)] font-bold text-[var(--color-on-solid)]" title="Varias sesiones sin mejorar">
            Estancado
          </span>
        ) : null}
        {ready && !stalled && !complete ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-[var(--color-good)] px-2.5 py-0.5 text-[length:var(--fs-meta)] font-bold text-[var(--color-on-solid)]" title={ready.reason}>
            {ready.weight != null ? `Sube a ${ready.weight} kg` : "Sube reps"}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="line-clamp-2 text-[length:var(--fs-sm)] font-semibold leading-snug">{exercise.name}</div>
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="num text-[length:var(--fs-sm)] font-semibold text-[var(--color-accent-text)]">
            {done}/{target}
          </span>
          <span className="num text-[length:var(--fs-meta)] text-[var(--color-muted)]">
            {exercise.series}×{exercise.repsLabel}
          </span>
        </div>
      </div>
    </button>
  );
}
