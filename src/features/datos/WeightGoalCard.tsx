import { useState } from "react";
import { useWeightGoal } from "@/hooks/useWeightGoal";
import { Button, Card, DateField, Field, Input, Sheet } from "@/ui";
import { addDays, fmtDateFull, todayISO } from "@/lib/date";
import { fromKg, toKg, unitLabel } from "@/lib/units";
import type { Unit } from "@/db/db";
import { projectGoal, sanitizeGoal } from "@/lib/weightGoal";
import type { WeightPoint } from "@/lib/weightGoal";
import { showToast } from "@/ui/Toast";
import { FieldError } from "./components";

const fmt = (n: number) => String(Math.round(Math.abs(n) * 10) / 10);

/** "75 kg by Dec 31": what's left, the pace you need, the pace you have, and when that gets you there.
 * Without a goal it is a single line; the form lives in a sheet so it never pushes the chart away. */
export function WeightGoalCard({ points, unit }: { points: WeightPoint[]; unit: Unit }) {
  const { goal, save, clear } = useWeightGoal();
  const [editing, setEditing] = useState(false);
  const u = unitLabel(unit);

  const sheet = (
    <Sheet open={editing} onClose={() => setEditing(false)} title="Meta de peso">
      <GoalForm
        unit={unit}
        initialKg={goal?.targetKg}
        initialBy={goal?.byDate}
        onSave={async (g) => {
          await save(g);
          setEditing(false);
          showToast("Meta guardada");
        }}
        onClear={
          goal
            ? async () => {
                await clear();
                setEditing(false);
                showToast("Meta quitada");
              }
            : undefined
        }
      />
    </Sheet>
  );

  if (!goal) {
    return (
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="card-title">Meta de peso</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Fija un peso y una fecha y te digo si vas a tiempo.</p>
          </div>
          <Button variant="secondary" className="flex-none" onClick={() => setEditing(true)}>
            Fijar meta
          </Button>
        </div>
        {sheet}
      </Card>
    );
  }

  const p = projectGoal(points, goal, todayISO());
  const dir = goal.targetKg < (p?.currentKg ?? goal.targetKg) ? "bajar" : "subir";
  const weekly = (kg: number) => `${fmt(fromKg(Math.abs(kg), unit))} ${u}/semana`;

  let headline = "Registra tu peso para ver la proyección.";
  let detail = "";
  let tone = "var(--color-muted)";
  if (p) {
    const left = `${fmt(fromKg(Math.abs(p.remainingKg), unit))} ${u}`;
    switch (p.status) {
      case "reached":
        headline = "¡Meta alcanzada!";
        detail = `Estás en ${fromKg(p.currentKg, unit)} ${u}.`;
        tone = "var(--color-good)";
        break;
      case "on-track":
        headline = `Vas a tiempo: llegas hacia el ${fmtDateFull(p.etaDate!)}`;
        detail = `Te faltan ${left} para ${dir}; llevas ${weekly(p.pace!)} y necesitas ${weekly(p.neededPerWeek)}.`;
        tone = "var(--color-good)";
        break;
      case "behind":
        headline = p.etaDate ? `A este ritmo llegas el ${fmtDateFull(p.etaDate)}` : "A este ritmo no llegas a tiempo";
        detail = `Te faltan ${left} para ${dir}. Llevas ${weekly(p.pace!)} y necesitas ${weekly(p.neededPerWeek)} para llegar el ${fmtDateFull(goal.byDate)}.`;
        tone = "var(--color-warn)";
        break;
      case "wrong-way":
        headline = "Tu peso no va hacia la meta";
        detail = `Te faltan ${left} para ${dir}, pero la tendencia de las últimas semanas va en otra dirección o está quieta.`;
        tone = "var(--color-warn)";
        break;
      case "expired":
        headline = "La fecha de tu meta ya pasó";
        detail = `Estás en ${fromKg(p.currentKg, unit)} ${u}; te faltan ${left}. Puedes fijar una fecha nueva.`;
        tone = "var(--color-warn)";
        break;
      case "no-pace":
        headline = `Te faltan ${left} para ${dir}`;
        detail = `Necesitas ${weekly(p.neededPerWeek)}. Con 3 registros en una semana o más te digo si vas a tiempo.`;
        break;
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="card-title">Meta de peso</h2>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="num font-[var(--font-display)] text-screen font-light leading-none">{fromKg(goal.targetKg, unit)}</span>
            <span className="text-sm text-[var(--color-muted)]">
              {u} · para el {fmtDateFull(goal.byDate)}
            </span>
          </div>
        </div>
        <Button variant="ghost" className="flex-none" onClick={() => setEditing(true)}>
          Cambiar
        </Button>
      </div>
      <div className="mt-3 text-sm font-semibold" style={{ color: tone }}>
        {headline}
      </div>
      {detail ? <p className="mt-1 text-sm leading-snug text-[var(--color-muted)]">{detail}</p> : null}
      {sheet}
    </Card>
  );
}

function GoalForm({
  unit,
  initialKg,
  initialBy,
  onSave,
  onClear,
}: {
  unit: Unit;
  initialKg?: number;
  initialBy?: string;
  onSave: (g: NonNullable<ReturnType<typeof sanitizeGoal>>) => Promise<void>;
  onClear?: () => Promise<void>;
}) {
  const u = unitLabel(unit);
  const [target, setTarget] = useState(initialKg != null ? String(fromKg(initialKg, unit)) : "");
  const [by, setBy] = useState(initialBy && initialBy > todayISO() ? initialBy : addDays(todayISO(), 90));
  const [error, setError] = useState("");

  async function submit() {
    const typed = parseFloat(target.replace(",", "."));
    const g = Number.isNaN(typed) ? null : sanitizeGoal({ targetKg: toKg(typed, unit), byDate: by });
    if (!g || by <= todayISO()) {
      setError("Pon un peso razonable y una fecha futura.");
      return;
    }
    await onSave(g);
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="text-sm text-[var(--color-muted)]">Pon el peso al que quieres llegar y la fecha. Con tus registros te digo si vas a tiempo.</p>
      <Field label={`Peso meta (${u})`}>
        <Input
          autoFocus
          inputMode="decimal"
          value={target}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            setTarget(e.target.value);
            setError("");
          }}
          placeholder={unit === "lb" ? "165" : "75"}
        />
      </Field>
      <Field label="Para el">
        <DateField value={by} min={addDays(todayISO(), 1)} onChange={setBy} />
      </Field>
      {error ? <FieldError>{error}</FieldError> : null}
      <Button type="submit" variant="primary" className="w-full">
        Fijar meta
      </Button>
      {onClear ? (
        <Button type="button" variant="ghost" className="w-full" onClick={() => void onClear()}>
          Quitar meta
        </Button>
      ) : null}
    </form>
  );
}
