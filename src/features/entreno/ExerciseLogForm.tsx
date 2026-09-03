import { useState } from "react";
import type { ExerciseTarget } from "@/data/gym";
import type { SetRecord } from "@/db/db";
import type { LastSession } from "./useEntrenoData";
import { fmtDateHuman } from "@/lib/date";

export interface LogSetPayload {
  weight: number | null;
  reps: number | null;
  toFailure: boolean;
  rpe: number | null;
  note: string;
}

export function ExerciseLogForm({
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
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[14px] font-semibold">{exercise.name}</div>
          {exercise.note ? <div className="mt-0.5 text-[11px] text-[var(--color-muted)]">{exercise.note}</div> : null}
        </div>
        <div className="flex-none text-right">
          <div className="num text-[13px] font-semibold text-[var(--color-red)]">
            {done}/{target}
          </div>
          <div className="num text-[10px] text-[var(--color-muted-2)]">
            {exercise.series}×{exercise.repsLabel}
          </div>
        </div>
      </div>

      {lastSession ? (
        <div className="num text-[11px] text-[var(--color-muted)]">
          Última vez ({fmtDateHuman(lastSession.date)}): {lastSession.sets.map((s) => `${s.weight ?? "—"}×${s.reps ?? "—"}`).join(" · ")}
          {lastTop != null ? <span className="text-[var(--color-red)]"> · top {lastTop}kg</span> : null}
        </div>
      ) : null}

      {sets.length ? (
        <div className="flex flex-wrap gap-1.5">
          {sets.map((s) => (
            <span key={s.id} className="num rounded-full border border-[var(--color-line-strong)] px-2.5 py-1 text-[11px]">
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
          className="num rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
        />
        <input
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          inputMode="decimal"
          placeholder="reps"
          className="num rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          value={rpe}
          onChange={(e) => setRpe(e.target.value)}
          inputMode="decimal"
          placeholder="RPE (opcional)"
          className="num flex-1 rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
        />
        <button
          onClick={() => setToFailure((v) => !v)}
          className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide ${
            toFailure ? "border-[var(--color-red)] bg-[var(--color-red)] text-black" : "border-[var(--color-line-strong)] text-[var(--color-muted)]"
          }`}
        >
          Al fallo
        </button>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota (opcional)"
        className="mt-2 w-full rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
      />
      <button
        onClick={save}
        className="tap-target mt-1 w-full rounded-full bg-[var(--color-red)] py-2.5 text-[12.5px] font-semibold uppercase tracking-wide text-black hover:brightness-110"
      >
        Guardar serie
      </button>
    </div>
  );
}
