import { useState } from "react";
import type { ExerciseTarget } from "@/data/gym";
import type { SetRecord } from "@/db/db";
import type { LastSession } from "./useEntrenoData";
import { Chip } from "@/ui";
import { fmtDateHuman } from "@/lib/date";

export interface LogSetPayload {
  weight: number | null;
  reps: number | null;
  toFailure: boolean;
  rpe: number | null;
  note: string;
}

export function ExerciseCard({
  exercise,
  sets,
  lastSession,
  onLogSet,
}: {
  exercise: ExerciseTarget;
  sets: SetRecord[];
  lastSession: LastSession | null;
  onLogSet: (payload: LogSetPayload) => void;
}) {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [toFailure, setToFailure] = useState(false);
  const [rpe, setRpe] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(sets.length < exercise.series);

  const done = sets.length;
  const target = exercise.series;

  function save() {
    const w = weight.trim() ? parseFloat(weight.replace(",", ".")) : null;
    const r = reps.trim() ? parseFloat(reps.replace(",", ".")) : null;
    if (w === null && r === null) return;
    onLogSet({ weight: w, reps: r, toFailure, rpe: rpe.trim() ? parseFloat(rpe) : null, note: note.trim() });
    setWeight("");
    setReps("");
    setToFailure(false);
    setRpe("");
    setNote("");
  }

  const lastTop = lastSession?.sets.reduce<number | null>((max, s) => (s.weight != null && (max == null || s.weight > max) ? s.weight : max), null);

  return (
    <div className="border border-[var(--color-line)]">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-3.5 py-3 text-left">
        <div>
          <div className="text-[13px] font-semibold flex items-center gap-2">
            {exercise.name}
            {exercise.preFatiga ? <Chip tone="accent">Pre-fatiga</Chip> : null}
          </div>
          {exercise.note ? <div className="text-[11px] text-[var(--color-muted)] mt-0.5">{exercise.note}</div> : null}
        </div>
        <div className="text-right flex-none pl-3">
          <div className="num text-[12px] text-[var(--color-red)] font-semibold">
            {done}/{target}
          </div>
          <div className="text-[10px] text-[var(--color-muted-2)] num">{exercise.series}×{exercise.repsLabel}</div>
        </div>
      </button>

      {open ? (
        <div className="px-3.5 pb-3.5">
          {lastSession ? (
            <div className="text-[11px] text-[var(--color-muted)] mb-2.5 num">
              Última vez ({fmtDateHuman(lastSession.date)}): {lastSession.sets.map((s) => `${s.weight ?? "—"}×${s.reps ?? "—"}`).join(" · ")}
              {lastTop != null ? <span className="text-[var(--color-red)]"> · top {lastTop}kg</span> : null}
            </div>
          ) : null}

          {sets.length ? (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {sets.map((s) => (
                <span key={s.id} className="num text-[11px] border border-[var(--color-line-strong)] px-2 py-1">
                  {s.weight ?? "—"}kg × {s.reps ?? "—"}
                  {s.toFailure ? <span className="text-[var(--color-red)]"> · AF</span> : null}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              inputMode="decimal"
              placeholder="kg"
              className="num bg-[var(--color-surface-2)] border border-[var(--color-line-strong)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
            />
            <input
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              inputMode="decimal"
              placeholder="reps"
              className="num bg-[var(--color-surface-2)] border border-[var(--color-line-strong)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              inputMode="decimal"
              placeholder="RPE (opcional)"
              className="num flex-1 bg-[var(--color-surface-2)] border border-[var(--color-line-strong)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
            />
            <button
              onClick={() => setToFailure((v) => !v)}
              className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-wide border ${
                toFailure ? "bg-[var(--color-red)] text-black border-[var(--color-red)]" : "border-[var(--color-line-strong)] text-[var(--color-muted)]"
              }`}
            >
              Al fallo
            </button>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota (opcional)"
            className="mt-2 w-full bg-[var(--color-surface-2)] border border-[var(--color-line-strong)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
          />
          <button onClick={save} className="tap-target mt-2.5 w-full rounded-full bg-[var(--color-red)] text-black py-2.5 text-[12.5px] font-semibold uppercase tracking-wide hover:brightness-110">
            Guardar serie
          </button>
        </div>
      ) : null}
    </div>
  );
}
