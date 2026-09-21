import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ExerciseTarget } from "@/data/gym";
import { startDate } from "@/data/gym";
import type { SetRecord } from "@/db/db";
import { useSwipe } from "@/hooks/useSwipe";
import { haptic } from "@/lib/feedback";
import { parseRepRange, suggestFromStart, suggestNext } from "@/lib/progression";
import { holdScreenAwake } from "@/lib/wakeLock";
import { Button } from "@/ui";
import type { LogSetPayload } from "./ExerciseLogForm";
import { resolvePhoto, useExercisePhotos } from "./photos";
import type { RestTimerState } from "./useRestTimer";
import { useLastSession } from "./useEntrenoData";

const WEIGHT_STEPS = [0.5, 1, 2.5, 5];
const STEP_KEY = "performance_gym_step_v1";
const fmt = (n: number) => String(Math.round(n * 10) / 10);

function readStep(): number {
  try {
    const n = Number(localStorage.getItem(STEP_KEY));
    return WEIGHT_STEPS.includes(n) ? n : 2.5;
  } catch {
    return 2.5;
  }
}

function BigStepper({ label, value, unit, onMinus, onPlus, chip }: { label: string; value: string; unit?: string; onMinus: () => void; onPlus: () => void; chip?: React.ReactNode }) {
  return (
    <div className="glass-track rounded-3xl px-3 py-4">
      <div className="flex items-center justify-between px-2">
        <span className="eyebrow">{label}</span>
        {chip}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button onClick={onMinus} aria-label={`Menos ${label}`} className="glass flex h-16 w-16 flex-none items-center justify-center rounded-full text-[30px] leading-none">
          −
        </button>
        <div className="min-w-0 text-center">
          <span className="num font-[var(--font-display)] text-[64px] font-light leading-none tracking-tight">{value}</span>
          {unit ? <span className="ml-1 text-[15px] text-[var(--color-muted)]">{unit}</span> : null}
        </div>
        <button onClick={onPlus} aria-label={`Más ${label}`} className="glass-on flex h-16 w-16 flex-none items-center justify-center rounded-full text-[30px] leading-none">
          +
        </button>
      </div>
    </div>
  );
}

/** One exercise at a time, big and thumb-friendly: weight and reps steppers,
 * one huge Save button, and the rest timer front and center. Keeps the screen
 * awake and swipes between exercises. */
export function GymMode({
  day,
  date,
  exercises,
  sessionSets,
  timer,
  onLogSet,
  onClose,
}: {
  day: string;
  date: string;
  exercises: ExerciseTarget[];
  sessionSets: SetRecord[];
  timer: RestTimerState & { addTime: (s: number) => void; skip: () => void };
  onLogSet: (exerciseName: string, payload: LogSetPayload) => void;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(() => {
    const firstOpen = exercises.findIndex((e) => sessionSets.filter((s) => s.exercise === e.name).length < e.series);
    return firstOpen >= 0 ? firstOpen : 0;
  });

  useEffect(() => holdScreenAwake(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const go = (d: number) => setIdx((i) => Math.min(exercises.length - 1, Math.max(0, i + d)));
  const swipe = useSwipe({ onLeft: () => go(1), onRight: () => go(-1) });
  const ex = exercises[idx];
  const doneCount = sessionSets.filter((s) => s.exercise === ex.name).length;
  const totalDone = sessionSets.length;
  const totalTarget = exercises.reduce((a, e) => a + e.series, 0);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-[var(--color-bg)]" role="dialog" aria-modal aria-label="Modo gimnasio" {...swipe}>
      <div className="ambient-bg" aria-hidden>
        <div className="ambient-glow" />
      </div>

      <header className="flex items-center justify-between gap-3 px-4 pb-2" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}>
        <button onClick={onClose} aria-label="Salir del modo gimnasio" className="glass hit flex h-10 w-10 flex-none items-center justify-center rounded-full text-[var(--color-muted)]">
          <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden>
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="eyebrow eyebrow-accent">Día {day} · modo gimnasio</div>
          <div className="num mt-0.5 text-[11px] text-[var(--color-muted)]">
            Ejercicio {idx + 1}/{exercises.length} · {totalDone}/{totalTarget} series
          </div>
        </div>
        <span className="h-10 w-10 flex-none" aria-hidden />
      </header>

      <div className="mx-4 h-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div className="h-full rounded-full bg-[var(--color-red)]" style={{ width: `${totalTarget ? (totalDone / totalTarget) * 100 : 0}%`, transition: "width 300ms ease-out" }} />
      </div>

      <GymExercise key={ex.name} ex={ex} date={date} sets={sessionSets.filter((s) => s.exercise === ex.name)} timer={timer} doneCount={doneCount} onLogSet={onLogSet} />

      <footer className="flex items-center gap-3 px-4 pt-2" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <button onClick={() => go(-1)} disabled={idx === 0} className="glass tap-target flex-1 rounded-full py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)] disabled:opacity-30">
          ← Anterior
        </button>
        <button
          onClick={() => go(1)}
          disabled={idx === exercises.length - 1}
          className={`tap-target flex-1 rounded-full py-3 text-[12px] font-semibold uppercase tracking-[0.1em] disabled:opacity-30 ${doneCount >= ex.series ? "glass-on" : "glass text-[var(--color-muted)]"}`}
        >
          Siguiente →
        </button>
      </footer>
    </div>,
    document.body,
  );
}

function GymExercise({
  ex,
  date,
  sets,
  timer,
  doneCount,
  onLogSet,
}: {
  ex: ExerciseTarget;
  date: string;
  sets: SetRecord[];
  timer: RestTimerState & { addTime: (s: number) => void; skip: () => void };
  doneCount: number;
  onLogSet: (exerciseName: string, payload: LogSetPayload) => void;
}) {
  const photos = useExercisePhotos();
  const last = useLastSession(ex.name, date);
  const range = parseRepRange(ex.repsLabel);
  const hasStart = ex.startKg != null || ex.startReps != null;
  const suggestion = useMemo(
    () => (hasStart && (!last || last.date < startDate(ex)) ? suggestFromStart(range, ex.startKg, ex.startReps) : last ? suggestNext(range, last.sets) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ex.name, last?.date],
  );

  // What the steppers open on: what you just did today, else the suggestion, else last time's best set.
  const seed = useMemo(() => {
    const prevToday = sets[sets.length - 1];
    if (prevToday?.weight != null || prevToday?.reps != null) return { weight: prevToday.weight, reps: prevToday.reps ?? 8 };
    if (suggestion) return { weight: suggestion.weight, reps: suggestion.reps };
    const top = last?.sets.reduce<{ weight: number | null; reps: number | null } | null>((m, st) => (m == null || (st.weight ?? 0) > (m.weight ?? 0) ? st : m), null);
    const fallbackReps = range && range !== "fail" ? range.min : 8;
    return { weight: top?.weight ?? null, reps: top?.reps ?? fallbackReps };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [weight, setWeight] = useState<number | null>(seed.weight);
  const [reps, setReps] = useState<number>(seed.reps ?? 8);
  const [failure, setFailure] = useState(false);
  const [step, setStep] = useState(readStep);
  const bodyweight = seed.weight == null && ex.startKg == null && !last?.sets.some((st) => st.weight != null);
  const complete = doneCount >= ex.series;
  const photo = resolvePhoto(ex.name, photos.get(ex.name));

  function cycleStep() {
    const next = WEIGHT_STEPS[(WEIGHT_STEPS.indexOf(step) + 1) % WEIGHT_STEPS.length];
    setStep(next);
    try {
      localStorage.setItem(STEP_KEY, String(next));
    } catch {
      /* not remembered */
    }
  }

  function save() {
    onLogSet(ex.name, { weight, reps, toFailure: failure, rpe: null, note: "" });
    haptic(30);
    setFailure(false);
  }

  const m = Math.floor(timer.remaining / 60).toString().padStart(2, "0");
  const s = (timer.remaining % 60).toString().padStart(2, "0");

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-3">
      <div className="flex items-center gap-3">
        {photo.src ? <img src={photo.src} alt="" className="h-16 w-16 flex-none rounded-2xl border border-[var(--color-line)] object-cover" /> : null}
        <div className="min-w-0">
          <h2 className="font-[var(--font-display)] text-[22px] leading-tight">{ex.name}</h2>
          <div className="num mt-0.5 text-[12px] text-[var(--color-muted)]">
            {ex.series}×{ex.repsLabel}
            {ex.loadNote ? <span className="text-[var(--color-muted-2)]"> · {ex.loadNote}</span> : null}
          </div>
        </div>
        <div className="ml-auto flex-none text-right">
          <div className="num font-[var(--font-display)] text-[26px] font-light leading-none" style={{ color: complete ? "var(--color-good)" : undefined }}>
            {doneCount}/{ex.series}
          </div>
          <div className="eyebrow mt-1">series</div>
        </div>
      </div>

      {suggestion ? (
        <div className="glass flex items-center gap-3 rounded-2xl px-3.5 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="eyebrow eyebrow-accent">Hoy</div>
            <div className="num text-[17px] font-semibold leading-tight">{suggestion.weight != null ? `${fmt(suggestion.weight)} kg × ${suggestion.reps}` : `${suggestion.reps} reps`}</div>
          </div>
          <button
            onClick={() => {
              setWeight(suggestion.weight);
              setReps(suggestion.reps);
            }}
            className="glass-accent tap-target rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em]"
          >
            Usar
          </button>
        </div>
      ) : null}

      {!bodyweight ? (
        <BigStepper
          label="Peso"
          value={weight != null ? fmt(weight) : "—"}
          unit="kg"
          onMinus={() => setWeight((w) => Math.max(0, Math.round(((w ?? 0) - step) * 10) / 10))}
          onPlus={() => setWeight((w) => Math.round(((w ?? 0) + step) * 10) / 10)}
          chip={
            <button onClick={cycleStep} className="glass-flat rounded-full px-2.5 py-1 text-[11px] font-semibold text-[var(--color-muted)]" aria-label={`Paso de peso ${step} kilos; toca para cambiar`}>
              paso {fmt(step)}
            </button>
          }
        />
      ) : null}
      <BigStepper label="Repeticiones" value={String(reps)} onMinus={() => setReps((r) => Math.max(0, r - 1))} onPlus={() => setReps((r) => r + 1)} />

      {sets.length ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Series de hoy">
          {sets.map((st, i) => (
            <span key={st.id ?? i} className="glass num rounded-full px-3 py-1 text-[12px]">
              {st.weight != null ? `${fmt(st.weight)}×` : ""}
              {st.reps ?? "—"}
              {st.toFailure ? <span className="text-[var(--color-red)]"> AF</span> : null}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-2 pb-1 pt-1">
        {timer.running ? (
          <div className="glass-track flex items-center justify-between gap-3 rounded-3xl px-4 py-3" role="timer" aria-live="off">
            <div>
              <div className={`eyebrow ${timer.remaining <= 5 ? "eyebrow-accent" : ""}`}>Descanso</div>
              <div className={`num font-[var(--font-display)] text-[44px] font-light leading-none ${timer.remaining <= 5 ? "pulse text-[var(--color-red)]" : ""}`}>
                {m}:{s}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => timer.addTime(30)} className="glass tap-target rounded-full px-4 text-[12px] font-semibold">
                +30s
              </button>
              <button onClick={timer.skip} className="glass tap-target rounded-full px-4 text-[12px] font-semibold text-[var(--color-muted)]">
                Saltar
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex gap-2">
          <button
            onClick={() => setFailure((f) => !f)}
            aria-pressed={failure}
            className={`tap-target flex-none rounded-full px-5 text-[12px] font-semibold uppercase tracking-[0.1em] ${failure ? "glass-on" : "glass text-[var(--color-muted)]"}`}
          >
            Al fallo
          </button>
          <Button variant="primary" className="h-16 flex-1 text-[15px]" onClick={save}>
            Guardar serie
          </Button>
        </div>
      </div>
    </div>
  );
}
