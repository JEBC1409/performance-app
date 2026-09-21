import { useState } from "react";
import { Button, Card, Eyebrow, Field, Input, Select, Stepper } from "@/ui";
import { showToast } from "@/ui/Toast";
import { GYM_DAY_ORDER, currentRoutineConfig, defaultRoutine, sanitizeRoutine } from "@/data/gym";
import type { ExerciseTarget, RoutineConfig } from "@/data/gym";
import { MUSCLE_GROUP_LABEL, MUSCLE_GROUP_ORDER, groupForExercise } from "@/data/muscleGroups";
import type { MuscleGroup } from "@/data/muscleGroups";
import type { GymDay } from "@/lib/cycle";
import { CONFIG_ROUTINE, resetConfig, saveRoutine } from "@/lib/appConfig";
import { useConfigVersion } from "@/hooks/useConfigVersion";
import { routineProblems } from "@/lib/routineProblems";
import { stampChangedStarts } from "@/lib/routineProblems";
import { todayISO } from "@/lib/date";

function ToggleChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${on ? "glass-on" : "glass text-[var(--color-muted)]"}`}>
      {children}
    </button>
  );
}

function ExerciseRow({
  ex,
  open,
  first,
  last,
  onToggle,
  onChange,
  onMove,
  onDelete,
}: {
  ex: ExerciseTarget;
  open: boolean;
  first: boolean;
  last: boolean;
  onToggle: () => void;
  onChange: (e: ExerciseTarget) => void;
  onMove: (d: -1 | 1) => void;
  onDelete: () => void;
}) {
  const set = (patch: Partial<ExerciseTarget>) => onChange({ ...ex, ...patch });
  const group = ex.group ?? groupForExercise(ex.name) ?? "";

  return (
    <li className="glass rounded-2xl">
      <div className="flex items-center gap-1 px-3 py-2">
        <button type="button" onClick={onToggle} aria-expanded={open} className="min-w-0 flex-1 text-left">
          <div className="truncate text-[13px] font-semibold">{ex.name || "Sin nombre"}</div>
          <div className="num text-[11px] text-[var(--color-muted)]">
            {ex.series}×{ex.repsLabel || "?"}
            {ex.startKg != null ? ` · ${ex.startKg} kg` : ""}
          </div>
        </button>
        <button type="button" onClick={() => onMove(-1)} disabled={first} aria-label={`Subir ${ex.name}`} className="glass-flat hit flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] disabled:opacity-30">
          ↑
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={last} aria-label={`Bajar ${ex.name}`} className="glass-flat hit flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] disabled:opacity-30">
          ↓
        </button>
      </div>

      {open ? (
        <div className="flex flex-col gap-3 border-t border-[var(--color-line)] px-3 pb-3 pt-3">
          <Field label="Nombre">
            <Input value={ex.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Series">
              <Stepper value={ex.series} min={1} max={12} onChange={(v) => set({ series: v })} />
            </Field>
            <Field label="Repeticiones">
              <Input value={ex.repsLabel} maxLength={24} placeholder="8-10" onChange={(e) => set({ repsLabel: e.target.value })} />
            </Field>
            <Field label="Peso actual (kg)">
              <Input
                inputMode="decimal"
                value={ex.startKg ?? ""}
                placeholder="—"
                onChange={(e) => {
                  const t = e.target.value.replace(",", ".");
                  const n = Number(t);
                  set({ startKg: t.trim() === "" || !Number.isFinite(n) ? undefined : Math.max(0, n) });
                }}
              />
            </Field>
            <Field label="Músculo">
              <Select value={group} onChange={(e) => set({ group: (e.target.value || undefined) as MuscleGroup | undefined })}>
                <option value="">Sin asignar</option>
                {MUSCLE_GROUP_ORDER.map((g) => (
                  <option key={g} value={g}>
                    {MUSCLE_GROUP_LABEL[g]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Cómo se cuenta la carga (opcional)">
            <Input value={ex.loadNote ?? ""} maxLength={40} placeholder="por lado, agarre abierto…" onChange={(e) => set({ loadNote: e.target.value || undefined })} />
          </Field>
          <Field label="Nota (opcional)">
            <Input value={ex.note ?? ""} maxLength={90} onChange={(e) => set({ note: e.target.value || undefined })} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <ToggleChip on={!!ex.preFatiga} onClick={() => set({ preFatiga: !ex.preFatiga || undefined })}>
              Pre-fatiga
            </ToggleChip>
            <ToggleChip on={!!ex.toFailureLast} onClick={() => set({ toFailureLast: !ex.toFailureLast || undefined })}>
              Última al fallo
            </ToggleChip>
            <ToggleChip on={!!ex.dropset} onClick={() => set({ dropset: !ex.dropset || undefined })}>
              Dropset
            </ToggleChip>
          </div>
          <button type="button" onClick={onDelete} className="glass self-start rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)] hover:text-[var(--color-red)]">
            Quitar ejercicio
          </button>
        </div>
      ) : null}
    </li>
  );
}

/** Perfil › Mi rutina: change the exercises, sets, reps, current weights and
 * order of each training day without touching code. Saved to the account. */
export function RoutineEditor() {
  useConfigVersion();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RoutineConfig>(() => currentRoutineConfig());
  const [day, setDay] = useState<GymDay>("A");
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  function start() {
    setDraft(currentRoutineConfig());
    setOpenIdx(null);
    setProblems([]);
    setEditing(true);
  }

  const patchDay = (d: GymDay, patch: Partial<RoutineConfig[GymDay]>) => setDraft((r) => ({ ...r, [d]: { ...r[d], ...patch } }));
  const setEx = (d: GymDay, i: number, e: ExerciseTarget) => patchDay(d, { ex: draft[d].ex.map((x, j) => (j === i ? e : x)) });

  function move(d: GymDay, i: number, dir: -1 | 1) {
    const ex = [...draft[d].ex];
    const j = i + dir;
    if (j < 0 || j >= ex.length) return;
    [ex[i], ex[j]] = [ex[j], ex[i]];
    patchDay(d, { ex });
    setOpenIdx((o) => (o === i ? j : o === j ? i : o));
  }

  async function save() {
    const found = routineProblems(draft);
    if (found.length) {
      setProblems(found);
      return;
    }
    // A weight or reps you changed applies from today: older sessions stop overriding it.
    const clean = sanitizeRoutine(stampChangedStarts(currentRoutineConfig(), draft, todayISO()));
    if (!clean) {
      setProblems(["Hay valores fuera de rango (series de 1 a 12, peso de 0 a 1000 kg)."]);
      return;
    }
    await saveRoutine(clean);
    setEditing(false);
    showToast("Rutina guardada");
  }

  async function restore() {
    if (!window.confirm("¿Volver a la rutina original? Se descartan tus cambios de ejercicios, series y pesos.")) return;
    await resetConfig(CONFIG_ROUTINE);
    setDraft(defaultRoutine());
    setEditing(false);
    showToast("Rutina original restaurada");
  }

  const cfg = draft[day];

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <Eyebrow accent>Mi rutina</Eyebrow>
          <p className="mt-1.5 text-[12px] leading-snug text-[var(--color-muted)]">Ejercicios, series, repeticiones y pesos de cada día. Los cambios se guardan en tu cuenta.</p>
        </div>
        {!editing ? (
          <Button className="flex-none px-4 py-2 text-[11px]" onClick={start}>
            Editar
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="glass-track flex gap-1 rounded-full p-1" role="tablist">
            {GYM_DAY_ORDER.map((d) => (
              <button
                key={d}
                role="tab"
                aria-selected={day === d}
                onClick={() => {
                  setDay(d);
                  setOpenIdx(null);
                }}
                className={`flex-1 rounded-full py-2 text-[12px] font-semibold uppercase ${day === d ? "glass-on" : "glass-flat text-[var(--color-muted)]"}`}
              >
                Día {d}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre del día">
              <Input value={cfg.nombre} maxLength={40} onChange={(e) => patchDay(day, { nombre: e.target.value })} />
            </Field>
            <Field label="Músculos (descripción)">
              <Input value={cfg.grupo} maxLength={60} onChange={(e) => patchDay(day, { grupo: e.target.value })} />
            </Field>
          </div>

          <ul className="flex flex-col gap-2">
            {cfg.ex.map((ex, i) => (
              <ExerciseRow
                key={i}
                ex={ex}
                open={openIdx === i}
                first={i === 0}
                last={i === cfg.ex.length - 1}
                onToggle={() => setOpenIdx(openIdx === i ? null : i)}
                onChange={(e) => setEx(day, i, e)}
                onMove={(dir) => move(day, i, dir)}
                onDelete={() => {
                  patchDay(day, { ex: cfg.ex.filter((_, j) => j !== i) });
                  setOpenIdx(null);
                }}
              />
            ))}
          </ul>

          <button
            type="button"
            onClick={() => {
              patchDay(day, { ex: [...cfg.ex, { name: "", series: 3, repsLabel: "8-12", toFailureLast: true }] });
              setOpenIdx(cfg.ex.length);
            }}
            className="glass-accent tap-target rounded-full py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.1em]"
          >
            + Añadir ejercicio
          </button>

          <p className="text-[11px] leading-snug text-[var(--color-muted-2)]">
            Si le cambias el nombre a un ejercicio, lo que ya registraste queda con el nombre anterior. Un ejercicio nuevo no trae foto: pon la tuya desde Entreno.
          </p>

          {problems.length ? (
            <ul className="rounded-xl border border-[var(--color-red-soft)] bg-[rgb(var(--accent-rgb)/0.08)] px-3 py-2 text-[12px] text-[var(--color-ink)]" role="alert">
              {problems.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          ) : null}

          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className="glass tap-target rounded-full px-5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
              Cancelar
            </button>
            <Button variant="primary" className="flex-1" onClick={save}>
              Guardar rutina
            </Button>
          </div>
          <button type="button" onClick={restore} className="self-center text-[11px] text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-red)] hover:underline">
            Volver a la rutina original
          </button>
        </div>
      ) : null}
    </Card>
  );
}
