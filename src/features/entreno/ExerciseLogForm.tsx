import { useMemo, useState } from "react";
import { startDate } from "@/data/gym";
import type { ExerciseTarget } from "@/data/gym";
import type { SetRecord } from "@/db/db";
import type { LastSession } from "./useEntrenoData";
import { fmtDateHuman } from "@/lib/date";
import { parseRepRange, suggestFromStart, suggestNext } from "@/lib/progression";
import type { SuggestionKind } from "@/lib/progression";
import { Button } from "@/ui";
import { Field, Input } from "@/ui/Field";
import { Icon } from "@/ui/Icon";
import { BigStepper } from "./BigStepper";
import { StepChip } from "./StepChip";
import { ExercisePhotoOptions, ExercisePhotoThumb } from "./ExercisePhoto";
import { WEIGHT_STEPS, fmtNum, readStep, writeStep } from "./stepperConfig";
import { seedWeightReps } from "./setSeed";
import { useSavedFlash } from "./useSavedFlash";
import { stallAdvice } from "@/lib/stagnation";
import type { Stall } from "@/lib/stagnation";

export interface LogSetPayload {
  weight: number | null;
  reps: number | null;
  toFailure: boolean;
  rpe: number | null;
  note: string;
}

/** `false` = the set was NOT saved (so the form keeps what was typed). Anything else counts as saved. */
export type LogSetResult = boolean | void;

const SUGGESTION_LABEL: Record<SuggestionKind, string> = {
  increase: "Sube peso",
  repeat: "Mismo peso",
  reduce: "Baja peso",
};

const SUGGESTION_COLOR: Record<SuggestionKind, string> = {
  increase: "var(--color-good)",
  repeat: "var(--color-accent-text)",
  reduce: "var(--color-warn)",
};

export function ExerciseLogForm({
  exercise,
  stall,
  sets,
  lastSession,
  onLogSet,
  onUpdateSet,
  onDeleteSet,
}: {
  exercise: ExerciseTarget;
  /** Set when the last few sessions of this exercise made no progress. */
  stall?: Stall | null;
  sets: SetRecord[];
  lastSession: LastSession | null;
  onLogSet: (payload: LogSetPayload) => LogSetResult | Promise<LogSetResult>;
  onUpdateSet: (id: number, payload: LogSetPayload) => void | Promise<void>;
  onDeleteSet: (id: number) => void;
}) {
  const range = parseRepRange(exercise.repsLabel);
  // Until a session is logged after the starting weights were set, those
  // weights (what you're at today) drive the suggestion, not older history.
  const hasStart = exercise.startKg != null || exercise.startReps != null;
  const fromStart = hasStart && (!lastSession || lastSession.date < startDate(exercise));
  const suggestion = fromStart || !lastSession ? suggestFromStart(range, exercise.startKg, exercise.startReps) : suggestNext(range, lastSession.sets);
  const fallbackReps = range && range !== "fail" ? range.min : 8;

  // Same big +/- controls as Gym Mode, seeded the same way, so logging a set
  // from an exercise card feels identical to logging it from there — no
  // keyboard popping up over a cramped sheet, no fat-fingered typos.
  const lastKey = lastSession?.date ?? null;
  const seed = useMemo(() => seedWeightReps(sets, suggestion, lastSession, fallbackReps), [lastKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const [weight, setWeight] = useState<number | null>(seed.weight);
  const [reps, setReps] = useState<number>(seed.reps ?? fallbackReps);
  const [rpe, setRpe] = useState("");
  const [note, setNote] = useState("");
  const [toFailure, setToFailure] = useState(false);
  const [step, setStep] = useState(readStep);
  const [editingId, setEditingId] = useState<number | null>(null);
  // Swipe a logged set to the left to delete it.
  const [drag, setDrag] = useState<{ id: number; x0: number; dx: number } | null>(null);
  const [savedMsg, flashSaved] = useSavedFlash();
  // The last session can arrive after the sheet opened: until the controls are touched, re-seed them from it.
  const [seededFor, setSeededFor] = useState(lastKey);
  const [touched, setTouched] = useState(false);
  if (lastKey !== seededFor) {
    setSeededFor(lastKey);
    if (!touched && sets.length === 0) {
      setWeight(seed.weight);
      setReps(seed.reps ?? fallbackReps);
    }
  }

  const done = sets.length;
  const target = exercise.series;
  const editing = editingId != null;
  const editingIndex = editing ? sets.findIndex((s) => s.id === editingId) + 1 : 0;
  const bodyweight = seed.weight == null && exercise.startKg == null && !lastSession?.sets.some((s) => s.weight != null) && !editing;

  function cycleStep() {
    const next = WEIGHT_STEPS[(WEIGHT_STEPS.indexOf(step) + 1) % WEIGHT_STEPS.length];
    setStep(next);
    writeStep(next);
  }

  function startEdit(s: SetRecord) {
    setEditingId(s.id!);
    setTouched(true);
    setWeight(s.weight);
    setReps(s.reps ?? fallbackReps);
    setToFailure(!!s.toFailure);
    setRpe(s.rpe != null ? String(s.rpe) : "");
    setNote(s.note ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setWeight(seed.weight);
    setReps(seed.reps ?? fallbackReps);
    setToFailure(false);
    setRpe("");
    setNote("");
  }

  async function save() {
    const parsedRpe = rpe.trim() ? parseFloat(rpe.replace(",", ".")) : null;
    const payload: LogSetPayload = { weight, reps, toFailure, rpe: parsedRpe != null && Number.isFinite(parsedRpe) ? parsedRpe : null, note: note.trim() };
    if (editingId != null) {
      await onUpdateSet(editingId, payload);
      flashSaved(`Serie ${editingIndex} actualizada`);
    } else {
      const ok = await onLogSet(payload);
      if (ok === false) return; // not saved: keep what was typed so a retry is one tap
      flashSaved(`Serie ${done + 1} guardada`);
    }
    setToFailure(false);
    setRpe("");
    setNote("");
    setEditingId(null);
  }

  function applySuggestion() {
    if (!suggestion) return;
    setEditingId(null);
    setTouched(true);
    setWeight(suggestion.weight);
    setReps(suggestion.reps);
  }

  const lastTop = lastSession?.sets.reduce<number | null>((max, s) => (s.weight != null && (max == null || s.weight > max) ? s.weight : max), null);
  const showSuggestion = suggestion && done < target;
  const firstTime = !lastSession && !!range && !showSuggestion;
  const hasBrief = showSuggestion || !!lastSession || !!stall || firstTime;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <ExercisePhotoThumb name={exercise.name}>
          <div className="num text-[length:var(--fs-body)] font-semibold">
            <span className="text-[var(--color-accent-text)]">
              {done}/{target}
            </span>
            <span className="font-normal text-[var(--color-muted)]">
              {" "}
              series · {exercise.series}×{exercise.repsLabel}
            </span>
          </div>
          {exercise.note ? <div className="mt-0.5 text-[length:var(--fs-meta)] leading-snug text-[var(--color-muted)]">{exercise.note}</div> : null}
          {exercise.loadNote ? <div className="text-[length:var(--fs-meta)] leading-snug text-[var(--color-muted)]">{exercise.loadNote}</div> : null}
        </ExercisePhotoThumb>
      </div>

      {hasBrief ? (
        <section className="panel-surface flex flex-col divide-y divide-[var(--color-line)]" aria-label="Qué hacer hoy">
          {showSuggestion ? (
            <div className="flex items-center gap-3 px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[length:var(--fs-meta)] font-semibold" style={{ color: SUGGESTION_COLOR[suggestion.kind] }}>
                    Hoy · {SUGGESTION_LABEL[suggestion.kind]}
                  </span>
                  {suggestion.delta != null ? (
                    <span className="num text-[length:var(--fs-meta)] text-[var(--color-muted)]">
                      {suggestion.delta > 0 ? "+" : ""}
                      {fmtNum(suggestion.delta)} kg
                    </span>
                  ) : null}
                </div>
                <div className="num text-[length:var(--fs-title)] font-semibold leading-tight">
                  {suggestion.weight != null ? `${fmtNum(suggestion.weight)} kg × ${suggestion.reps}` : `${suggestion.reps} reps`}
                </div>
                <div className="mt-0.5 text-[length:var(--fs-meta)] leading-snug text-[var(--color-muted)] [@media(max-height:700px)]:hidden">{suggestion.reason}</div>
              </div>
              <button onClick={applySuggestion} className="glass-accent btn flex-none rounded-full px-5 text-[length:var(--fs-sm)]">
                Usar
              </button>
            </div>
          ) : null}

          {lastSession ? (
            <div className="num px-3.5 py-2.5 text-[length:var(--fs-meta)] leading-snug text-[var(--color-muted)]">
              Última vez ({fmtDateHuman(lastSession.date)}): {lastSession.sets.map((s) => `${s.weight ?? "—"}×${s.reps ?? "—"}`).join(" · ")}
              {lastTop != null ? <span className="text-[var(--color-accent-text)]"> · top {lastTop} kg</span> : null}
            </div>
          ) : null}

          {firstTime ? (
            <div className="px-3.5 py-2.5 text-[length:var(--fs-meta)] leading-snug text-[var(--color-muted)]">
              Primera vez: elige un peso con el que llegues al fallo dentro del rango ({exercise.repsLabel}). Desde la próxima te sugiero cuánto subir.
            </div>
          ) : null}

          {stall ? (
            <details className="group">
              <summary className="flex min-h-[var(--control-h)] cursor-pointer list-none items-center justify-between gap-2 px-3.5 text-[length:var(--fs-sm)] font-semibold text-[var(--color-warn)] [&::-webkit-details-marker]:hidden">
                <span>Estancado · {stall.sessions} sesiones sin mejorar</span>
                <span className="transition-transform group-open:rotate-90" aria-hidden>
                  <Icon name="chevron-right" size={16} />
                </span>
              </summary>
              <p className="px-3.5 pb-3 text-[length:var(--fs-sm)] leading-snug">{stallAdvice(stall)}</p>
            </details>
          ) : null}
        </section>
      ) : null}

      {!bodyweight ? (
        <BigStepper
          label="Peso"
          value={weight != null ? fmtNum(weight) : "—"}
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
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2" aria-label="Series de hoy">
            {sets.map((s, i) => (
              <div
                key={s.id}
                onTouchStart={(e) => setDrag({ id: s.id!, x0: e.touches[0].clientX, dx: 0 })}
                onTouchMove={(e) => setDrag((d) => (d && d.id === s.id ? { ...d, dx: Math.min(0, e.touches[0].clientX - d.x0) } : d))}
                onTouchEnd={() => {
                  if (drag && drag.id === s.id && drag.dx < -70) {
                    if (editingId === s.id) cancelEdit();
                    onDeleteSet(s.id!);
                  }
                  setDrag(null);
                }}
                style={drag && drag.id === s.id ? { transform: `translateX(${drag.dx}px)`, opacity: 1 + drag.dx / 160, transition: "none" } : { transition: "transform 180ms ease, opacity 180ms ease" }}
                className="touch-pan-y"
              >
                <Button onClick={() => startEdit(s)} selected={editingId === s.id} className="num px-4 text-[length:var(--fs-sm)]" aria-label={`Corregir serie ${i + 1}: ${s.weight ?? "sin peso"} por ${s.reps ?? "sin"} repeticiones${s.toFailure ? ", al fallo" : ""}`}>
                  {s.weight != null ? `${fmtNum(s.weight)} kg × ${s.reps ?? "—"}` : `${s.reps ?? "—"} reps`}
                  {s.toFailure ? <span className="text-[var(--color-accent-text)]">· AF</span> : null}
                </Button>
              </div>
            ))}
          </div>
          {editing ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[length:var(--fs-sm)] font-semibold">Corrigiendo la serie {editingIndex}</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="px-4"
                  onClick={() => {
                    const id = editingId!;
                    cancelEdit();
                    onDeleteSet(id);
                  }}
                >
                  Eliminar
                </Button>
                <Button className="px-4" onClick={cancelEdit}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-[length:var(--fs-meta)] text-[var(--color-muted)]">Toca una serie para corregirla o desliza hacia la izquierda para quitarla.</p>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <Field label="RPE (opcional)">
          <Input value={rpe} onChange={(e) => setRpe(e.target.value)} inputMode="decimal" placeholder="Ej. 8" className="num w-full" />
        </Field>
        <Field label="Nota (opcional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Codo molesto, bajé el peso" className="w-full" />
        </Field>
        <ExercisePhotoOptions name={exercise.name} />
      </div>

      {/* Pinned to the bottom of the sheet so saving never needs a scroll. Flush with the sheet's own edge:
          it cancels the sheet's bottom padding so nothing scrolls past underneath it. */}
      <div className="sticky bottom-[calc(-1.25rem-env(safe-area-inset-bottom))] z-10 -mx-5 -mb-[calc(1.25rem+env(safe-area-inset-bottom))] flex gap-2 border-t border-[var(--color-line)] bg-[rgb(var(--raised-rgb))] px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <Button selected={toFailure} onClick={() => setToFailure((f) => !f)} className="h-14 flex-none px-5">
          Al fallo
        </Button>
        <Button variant="primary" className="h-14 flex-1 text-[length:var(--fs-body)]" onClick={save}>
          {savedMsg ? (
            <>
              <Icon name="check" size={20} /> {savedMsg}
            </>
          ) : editing ? (
            "Actualizar serie"
          ) : (
            "Guardar serie"
          )}
        </Button>
        <span role="status" aria-live="polite" className="sr-only">
          {savedMsg ?? ""}
        </span>
      </div>
    </div>
  );
}
