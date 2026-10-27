import { Icon } from "@/ui/Icon";
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
import { BigStepper } from "./BigStepper";
import { StepChip } from "./StepChip";
import { WEIGHT_STEPS, fmtNum as fmt, readStep, writeStep } from "./stepperConfig";
import type { LogSetPayload, LogSetResult } from "./ExerciseLogForm";
import { resolvePhoto, useExercisePhotos } from "./photos";
import { seedWeightReps } from "./setSeed";
import type { RestTimerState } from "./useRestTimer";
import { useLastSession } from "./useEntrenoData";
import { useSavedFlash } from "./useSavedFlash";

type GymTimer = RestTimerState & { addTime: (s: number) => void; skip: () => void };

/** One exercise at a time, big and thumb-friendly: weight and reps steppers,
 * one huge Save button, and the rest timer front and center. Keeps the screen
 * awake and swipes between exercises. */
export function GymMode({
  day,
  date,
  exercises,
  sessionSets,
  priorSets,
  timer,
  onLogSet,
  onClose,
}: {
  day: string;
  date: string;
  exercises: ExerciseTarget[];
  sessionSets: SetRecord[];
  /** Everything logged before `date`, already loaded by the Entreno screen (undefined while it loads). */
  priorSets?: SetRecord[];
  timer: GymTimer;
  onLogSet: (exerciseName: string, payload: LogSetPayload) => LogSetResult | Promise<LogSetResult>;
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

      <header className="flex items-center justify-between gap-3 px-4 pb-2" style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}>
        {/* A small exit up here for the thumb that wanders; the main one is "Salir" in the footer, where the thumb rests. */}
        <button onClick={onClose} aria-label="Salir del modo gimnasio" className="glass hit flex h-11 w-11 flex-none items-center justify-center rounded-full text-[var(--color-muted)]">
          <Icon name="close" size={18} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="eyebrow eyebrow-accent">Día {day} · modo gimnasio</div>
          <div className="num mt-0.5 text-[length:var(--fs-meta)] text-[var(--color-muted)]">
            Ejercicio {idx + 1}/{exercises.length} · {totalDone}/{totalTarget} series
          </div>
        </div>
        <span className="h-11 w-11 flex-none" aria-hidden />
      </header>

      <div
        className="mx-4 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]"
        role="progressbar"
        aria-label="Series de la sesión"
        aria-valuemin={0}
        aria-valuemax={totalTarget}
        aria-valuenow={Math.min(totalDone, totalTarget)}
      >
        <div className="h-full rounded-full bg-[rgb(var(--accent-solid-rgb))]" style={{ width: `${totalTarget ? Math.min(100, (totalDone / totalTarget) * 100) : 0}%`, transition: "width 300ms ease-out" }} />
      </div>

      <GymExercise key={ex.name} ex={ex} date={date} sets={sessionSets.filter((s) => s.exercise === ex.name)} priorSets={priorSets} timer={timer} doneCount={doneCount} onLogSet={onLogSet} />

      <footer className="flex items-center gap-2 px-4 pt-2" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
        <Button onClick={() => go(-1)} disabled={idx === 0} className="flex-1 px-3 text-[length:var(--fs-sm)]">
          <Icon name="arrow-left" size={15} /> Anterior
        </Button>
        <Button variant="ghost" onClick={onClose} className="flex-none px-4 text-[length:var(--fs-sm)]">
          Salir
        </Button>
        <Button
          variant={doneCount >= ex.series ? "primary" : "secondary"}
          onClick={() => go(1)}
          disabled={idx === exercises.length - 1}
          className="flex-1 px-3 text-[length:var(--fs-sm)]"
        >
          Siguiente <Icon name="arrow-right" size={15} />
        </Button>
      </footer>
    </div>,
    document.body,
  );
}

function GymExercise({
  ex,
  date,
  sets,
  priorSets,
  timer,
  doneCount,
  onLogSet,
}: {
  ex: ExerciseTarget;
  date: string;
  sets: SetRecord[];
  priorSets: SetRecord[] | undefined;
  timer: GymTimer;
  doneCount: number;
  onLogSet: (exerciseName: string, payload: LogSetPayload) => LogSetResult | Promise<LogSetResult>;
}) {
  const photos = useExercisePhotos();
  // Same strategy as the exercise sheet: from the sets Entreno already holds when logging for today,
  // from this one exercise's rows in the database otherwise.
  const last = useLastSession(ex.name, date, { priorSets });
  const range = parseRepRange(ex.repsLabel);
  const hasStart = ex.startKg != null || ex.startReps != null;
  const lastKey = last?.date ?? null;
  const suggestion = useMemo(
    () => (hasStart && (!last || last.date < startDate(ex)) ? suggestFromStart(range, ex.startKg, ex.startReps) : last ? suggestNext(range, last.sets) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ex.name, lastKey],
  );

  // What the steppers open on: what you just did today, else the suggestion, else last time's best set.
  const seed = useMemo(
    () => seedWeightReps(sets, suggestion, last, range && range !== "fail" ? range.min : 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lastKey, suggestion],
  );

  const [weight, setWeight] = useState<number | null>(seed.weight);
  const [reps, setReps] = useState<number>(seed.reps ?? 8);
  const [failure, setFailure] = useState(false);
  const [step, setStep] = useState(readStep);
  const [savedMsg, flashSaved] = useSavedFlash();
  // The last session can arrive after this opened: until a control is touched, re-seed from it.
  const [seededFor, setSeededFor] = useState(lastKey);
  const [touched, setTouched] = useState(false);
  if (lastKey !== seededFor) {
    setSeededFor(lastKey);
    if (!touched && sets.length === 0) {
      setWeight(seed.weight);
      setReps(seed.reps ?? 8);
    }
  }
  const bodyweight = seed.weight == null && ex.startKg == null && !last?.sets.some((st) => st.weight != null);
  const complete = doneCount >= ex.series;
  const photo = resolvePhoto(ex.name, photos.get(ex.name));

  function cycleStep() {
    const next = WEIGHT_STEPS[(WEIGHT_STEPS.indexOf(step) + 1) % WEIGHT_STEPS.length];
    setStep(next);
    writeStep(next);
  }

  async function save() {
    const ok = await onLogSet(ex.name, { weight, reps, toFailure: failure, rpe: null, note: "" });
    if (ok === false) return; // not saved: keep the numbers so the retry is one tap
    haptic(30);
    setFailure(false);
    flashSaved(`Serie ${doneCount + 1} guardada`);
  }

  const m = Math.floor(timer.remaining / 60).toString().padStart(2, "0");
  const s = (timer.remaining % 60).toString().padStart(2, "0");
  const urgent = timer.remaining <= 5;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Everything you read or set scrolls here; the timer and the save button below never do,
          so on a small phone "Guardar serie" is always on screen. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          {photo.src ? <img src={photo.src} alt="" className="h-16 w-16 flex-none rounded-2xl border border-[var(--color-line)] object-cover [@media(max-height:700px)]:hidden" /> : null}
          <div className="min-w-0">
            <h2 className="font-[var(--font-display)] text-[length:var(--fs-title)] leading-tight">{ex.name}</h2>
            <div className="num mt-0.5 text-[length:var(--fs-meta)] text-[var(--color-muted)]">
              {ex.series}×{ex.repsLabel}
              {ex.loadNote ? <span> · {ex.loadNote}</span> : null}
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
          <div className="glass flex items-center gap-3 rounded-2xl py-2 pl-3.5 pr-2">
            <div className="min-w-0 flex-1">
              <div className="eyebrow eyebrow-accent">Hoy</div>
              <div className="num text-[length:var(--fs-title)] font-semibold leading-tight">{suggestion.weight != null ? `${fmt(suggestion.weight)} kg × ${suggestion.reps}` : `${suggestion.reps} reps`}</div>
            </div>
            <button
              onClick={() => {
                setTouched(true);
                setWeight(suggestion.weight);
                setReps(suggestion.reps);
              }}
              className="glass-accent btn flex-none rounded-full px-5 text-[length:var(--fs-sm)]"
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
            onMinus={() => {
              setTouched(true);
              setWeight((w) => Math.max(0, Math.round(((w ?? 0) - step) * 10) / 10));
            }}
            onPlus={() => {
              setTouched(true);
              setWeight((w) => Math.round(((w ?? 0) + step) * 10) / 10);
            }}
            chip={<StepChip step={step} onCycle={cycleStep} />}
          />
        ) : null}
        <BigStepper
          label="Repeticiones"
          value={String(reps)}
          onMinus={() => {
            setTouched(true);
            setReps((r) => Math.max(0, r - 1));
          }}
          onPlus={() => {
            setTouched(true);
            setReps((r) => r + 1);
          }}
        />

        {sets.length ? (
          <div className="flex flex-wrap gap-1.5" aria-label="Series de hoy">
            {sets.map((st, i) => (
              <span key={st.id ?? i} className="glass num rounded-full px-3 py-1 text-[length:var(--fs-meta)]">
                {st.weight != null ? `${fmt(st.weight)}×` : ""}
                {st.reps ?? "—"}
                {st.toFailure ? <span className="text-[var(--color-accent-text)]"> AF</span> : null}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 px-4 pt-1">
        {timer.running ? (
          <div className="glass-track flex items-center justify-between gap-3 rounded-3xl py-2 pl-4 pr-2" role="timer" aria-live="off" aria-label="Descanso">
            <div className="flex flex-col">
              <span className={`eyebrow ${urgent ? "eyebrow-accent" : ""}`}>Descanso</span>
              <span className={`num font-[var(--font-display)] text-[34px] font-light leading-none ${urgent ? "pulse text-[var(--color-accent-text)]" : ""}`}>
                {m}:{s}
              </span>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => timer.addTime(30)} className="whitespace-nowrap px-4 text-[length:var(--fs-sm)]">
                +30 s
              </Button>
              <Button variant="ghost" onClick={timer.skip} className="whitespace-nowrap px-4 text-[length:var(--fs-sm)]">
                Saltar
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button selected={failure} onClick={() => setFailure((f) => !f)} className="h-16 flex-none px-5 text-[length:var(--fs-sm)] [@media(max-height:700px)]:h-14">
            Al fallo
          </Button>
          <Button variant="primary" className="h-16 flex-1 text-[length:var(--fs-body)] [@media(max-height:700px)]:h-14" onClick={save}>
            {savedMsg ? (
              <>
                <Icon name="check" size={22} /> {savedMsg}
              </>
            ) : (
              "Guardar serie"
            )}
          </Button>
        </div>
        <span role="status" aria-live="polite" className="sr-only">
          {savedMsg ?? ""}
        </span>
      </div>
    </div>
  );
}
