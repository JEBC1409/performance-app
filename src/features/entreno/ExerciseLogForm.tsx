import { useState } from "react";
import { startDate } from "@/data/gym";
import type { ExerciseTarget } from "@/data/gym";
import type { SetRecord } from "@/db/db";
import type { LastSession } from "./useEntrenoData";
import { fmtDateHuman } from "@/lib/date";
import { parseRepRange, suggestFromStart, suggestNext } from "@/lib/progression";
import type { SuggestionKind } from "@/lib/progression";

export interface LogSetPayload {
  weight: number | null;
  reps: number | null;
  toFailure: boolean;
  rpe: number | null;
  note: string;
}

const emptyForm = { weight: "", reps: "", toFailure: false, rpe: "", note: "" };

const SUGGESTION_LABEL: Record<SuggestionKind, string> = {
  increase: "Sube peso",
  repeat: "Mismo peso",
  reduce: "Baja peso",
};

const SUGGESTION_COLOR: Record<SuggestionKind, string> = {
  increase: "var(--color-good)",
  repeat: "var(--color-red)",
  reduce: "var(--color-warn)",
};

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
  // Swipe a logged set to the left to delete it.
  const [drag, setDrag] = useState<{ id: number; x0: number; dx: number } | null>(null);

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

  const range = parseRepRange(exercise.repsLabel);
  // Until a session is logged after the starting weights were set, those
  // weights (what you're at today) drive the suggestion, not older history.
  const hasStart = exercise.startKg != null || exercise.startReps != null;
  const fromStart = hasStart && (!lastSession || lastSession.date < startDate(exercise));
  const suggestion = fromStart || !lastSession ? suggestFromStart(range, exercise.startKg, exercise.startReps) : suggestNext(range, lastSession.sets);
  const fmtNum = (n: number) => String(Math.round(n * 10) / 10);

  function applySuggestion() {
    if (!suggestion) return;
    setEditingId(null);
    setForm((f) => ({ ...f, weight: suggestion.weight != null ? fmtNum(suggestion.weight) : "", reps: String(suggestion.reps) }));
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
          <div className="num text-[11px] text-[var(--color-muted-2)]">
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

      {suggestion && done < target ? (
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-line-strong)] bg-[rgb(var(--fg-rgb)/0.03)] px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: SUGGESTION_COLOR[suggestion.kind] }}>
                Hoy · {SUGGESTION_LABEL[suggestion.kind]}
              </span>
              {suggestion.delta != null ? (
                <span className="num text-[11px] text-[var(--color-muted)]">
                  {suggestion.delta > 0 ? "+" : ""}
                  {fmtNum(suggestion.delta)} kg
                </span>
              ) : null}
            </div>
            <div className="num mt-0.5 text-[17px] font-semibold leading-tight">
              {suggestion.weight != null ? `${fmtNum(suggestion.weight)} kg × ${suggestion.reps}` : `${suggestion.reps} reps`}
            </div>
            {exercise.loadNote ? <div className="text-[10.5px] font-medium text-[var(--color-muted)]">{exercise.loadNote}</div> : null}
            <div className="mt-0.5 text-[10.5px] leading-snug text-[var(--color-muted)]">{suggestion.reason}</div>
          </div>
          <button
            onClick={applySuggestion}
            className="glass-accent tap-target flex-none rounded-full px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.1em]"
          >
            Usar
          </button>
        </div>
      ) : !lastSession && range ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-line-strong)] px-3 py-2.5 text-[11px] leading-snug text-[var(--color-muted)]">
          Primera vez: elige un peso con el que llegues al fallo dentro del rango ({exercise.repsLabel}). Desde la próxima te sugiero cuánto subir.
        </div>
      ) : null}

      {sets.length ? (
        <div className="flex flex-wrap gap-1.5">
          {sets.map((s) => (
            <span
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
              className={`num flex touch-pan-y items-center gap-1.5 rounded-full border pl-2.5 pr-1 py-1 text-[11px] transition-colors ${
                editingId === s.id ? "border-[var(--color-red)] bg-[rgb(var(--accent-rgb)/0.12)]" : "border-[var(--color-line-strong)]"
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
                className="hit flex h-4 w-4 flex-none items-center justify-center rounded-full text-[var(--color-muted-2)] hover:bg-[var(--color-red)] hover:text-white"
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
          className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-wide ${
            form.toFailure ? "glass-on" : "glass text-[var(--color-muted)]"
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
      {/* Pinned to the bottom of the sheet so saving never needs a scroll. */}
      <div className="sticky bottom-0 z-10 -mx-5 mt-1 flex gap-2 bg-gradient-to-t from-[var(--color-surface)] via-[var(--color-surface)] to-transparent px-5 pb-1 pt-4">
        {editing ? (
          <button
            onClick={cancelEdit}
            className="glass tap-target rounded-full px-4 text-[12.5px] font-semibold uppercase tracking-wide text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            Cancelar
          </button>
        ) : null}
        <button
          onClick={save}
          className="tap-target flex-1 btn-primary text-white border border-[rgb(var(--accent-light-rgb)/0.5)] rounded-full py-2.5 text-[12.5px] font-semibold uppercase tracking-wide shadow-[0_1px_0_rgb(var(--fg-rgb)/0.35)_inset,0_-6px_10px_-6px_rgba(0,0,0,0.45)_inset,0_10px_24px_-10px_rgb(var(--accent-rgb)/0.75)] hover:brightness-110 active:brightness-95 active:translate-y-px transition-all duration-150"
        >
          {editing ? "Actualizar serie" : "Guardar serie"}
        </button>
      </div>
    </div>
  );
}
