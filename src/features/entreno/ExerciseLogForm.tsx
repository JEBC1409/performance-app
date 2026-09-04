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

const emptyForm = { weight: "", reps: "", toFailure: false, rpe: "", note: "" };

export function ExerciseLogForm({
  exercise,
  sets,
  lastSession,
  onLogSet,
  onUpdateSet,
  onDeleteSet,
}: {
  exercise: ExerciseTarget;
  sets: SetRecord[];
  lastSession: LastSession | null;
  onLogSet: (payload: LogSetPayload) => void;
  onUpdateSet: (id: number, payload: LogSetPayload) => void;
  onDeleteSet: (id: number) => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const done = sets.length;
  const target = exercise.series;
  const editing = editingId != null;

  function startEdit(s: SetRecord) {
    setEditingId(s.id!);
    setForm({
      weight: s.weight != null ? String(s.weight) : "",
      reps: s.reps != null ? String(s.reps) : "",
      toFailure: !!s.toFailure,
      rpe: s.rpe != null ? String(s.rpe) : "",
      note: s.note ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function save() {
    const w = form.weight.trim() ? parseFloat(form.weight.replace(",", ".")) : null;
    const r = form.reps.trim() ? parseFloat(form.reps.replace(",", ".")) : null;
    if (w === null && r === null) return;
    const payload: LogSetPayload = { weight: w, reps: r, toFailure: form.toFailure, rpe: form.rpe.trim() ? parseFloat(form.rpe) : null, note: form.note.trim() };
    if (editingId != null) onUpdateSet(editingId, payload);
    else onLogSet(payload);
    setForm(emptyForm);
    setEditingId(null);
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
            <span
              key={s.id}
              className={`num flex items-center gap-1.5 rounded-full border pl-2.5 pr-1 py-1 text-[11px] transition-colors ${
                editingId === s.id ? "border-[var(--color-red)] bg-[rgba(223,37,49,0.12)]" : "border-[var(--color-line-strong)]"
              }`}
            >
              <button onClick={() => startEdit(s)} className="flex items-center gap-1">
                {s.weight ?? "—"}kg × {s.reps ?? "—"}
                {s.toFailure ? <span className="text-[var(--color-red)]"> · AF</span> : null}
              </button>
              <button
                onClick={() => {
                  if (editingId === s.id) cancelEdit();
                  onDeleteSet(s.id!);
                }}
                aria-label="Eliminar serie"
                className="flex h-4 w-4 flex-none items-center justify-center rounded-full text-[var(--color-muted-2)] hover:bg-[var(--color-red)] hover:text-white"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
                  <path d="M1 1l6 6M7 1l-6 6" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <input
          value={form.weight}
          onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
          inputMode="decimal"
          placeholder="kg"
          className="num rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
        />
        <input
          value={form.reps}
          onChange={(e) => setForm((f) => ({ ...f, reps: e.target.value }))}
          inputMode="decimal"
          placeholder="reps"
          className="num rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          value={form.rpe}
          onChange={(e) => setForm((f) => ({ ...f, rpe: e.target.value }))}
          inputMode="decimal"
          placeholder="RPE (opcional)"
          className="num flex-1 rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
        />
        <button
          onClick={() => setForm((f) => ({ ...f, toFailure: !f.toFailure }))}
          className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide ${
            form.toFailure ? "border-[var(--color-red)] bg-[var(--color-red)] text-black" : "border-[var(--color-line-strong)] text-[var(--color-muted)]"
          }`}
        >
          Al fallo
        </button>
      </div>
      <input
        value={form.note}
        onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        placeholder="Nota (opcional)"
        className="mt-2 w-full rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
      />
      <div className="mt-1 flex gap-2">
        {editing ? (
          <button
            onClick={cancelEdit}
            className="tap-target rounded-full border border-[var(--color-line-strong)] px-4 text-[12.5px] font-semibold uppercase tracking-wide text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            Cancelar
          </button>
        ) : null}
        <button
          onClick={save}
          className="tap-target flex-1 btn-primary text-white border border-[rgba(255,120,128,0.5)] rounded-full py-2.5 text-[12.5px] font-semibold uppercase tracking-wide shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_-6px_10px_-6px_rgba(0,0,0,0.45)_inset,0_10px_24px_-10px_rgba(223,37,49,0.75)] hover:brightness-110 active:brightness-95 active:translate-y-px transition-all duration-150"
        >
          {editing ? "Actualizar serie" : "Guardar serie"}
        </button>
      </div>
    </div>
  );
}
