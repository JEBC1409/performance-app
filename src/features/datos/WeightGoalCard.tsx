import { useState } from "react";
import { useWeightGoal } from "@/hooks/useWeightGoal";
import { Button, Card, CardTitle, DateField, Field, Input } from "@/ui";
import { addDays, fmtDateFull, todayISO } from "@/lib/date";
import { fromKg, toKg, unitLabel } from "@/lib/units";
import type { Unit } from "@/db/db";
import { projectGoal, sanitizeGoal } from "@/lib/weightGoal";
import type { WeightPoint } from "@/lib/weightGoal";
import { showToast } from "@/ui/Toast";

const fmt = (n: number) => String(Math.round(Math.abs(n) * 10) / 10);

/** "75 kg by Dec 31": what's left, the pace you need, the pace you have, and when that gets you there. */
export function WeightGoalCard({ points, unit }: { points: WeightPoint[]; unit: Unit }) {
  const { goal, save, clear } = useWeightGoal();
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState("");
  const [by, setBy] = useState(addDays(todayISO(), 90));
  const u = unitLabel(unit);

  async function submit() {
    const typed = parseFloat(target.replace(",", "."));
    const g = Number.isNaN(typed) ? null : sanitizeGoal({ targetKg: toKg(typed, unit), byDate: by });
    if (!g || by <= todayISO()) {
      showToast("Pon un peso razonable y una fecha futura");
      return;
    }
    await save(g);
    setEditing(false);
    showToast("Meta guardada");
  }

  if (!goal || editing) {
    return (
      <Card>
        <CardTitle>Meta de peso</CardTitle>
        <p className="mt-2 text-[12.5px] text-[var(--color-muted)]">Pon el peso al que quieres llegar y la fecha. Con tus registros te digo si vas a tiempo.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Field label={`Peso meta (${u})`}>
            <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={goal ? String(fromKg(goal.targetKg, unit)) : unit === "lb" ? "165" : "75"} />
          </Field>
          <Field label="Para el">
            <DateField value={by} min={addDays(todayISO(), 1)} onChange={setBy} size="sm" />
          </Field>
        </div>
        <Button variant="outline" className="mt-3 w-full" onClick={submit}>
          Fijar meta
        </Button>
        {editing ? (
          <button onClick={() => setEditing(false)} className="mt-2 text-[11.5px] text-[var(--color-muted)] underline">
            Cancelar
          </button>
        ) : null}
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
      <div className="flex items-center justify-between">
        <CardTitle>Meta de peso</CardTitle>
        <div className="flex items-center gap-3 text-[11px] text-[var(--color-muted)]">
          <button onClick={() => setEditing(true)} className="underline">
            Cambiar
          </button>
          <button
            onClick={async () => {
              await clear();
              showToast("Meta quitada");
            }}
            className="underline"
          >
            Quitar
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="num font-[var(--font-display)] text-[28px] font-light leading-none">{fromKg(goal.targetKg, unit)}</span>
        <span className="text-[12px] text-[var(--color-muted)]">
          {u} · para el {fmtDateFull(goal.byDate)}
        </span>
      </div>
      <div className="mt-3 text-[14px] font-semibold" style={{ color: tone }}>
        {headline}
      </div>
      {detail ? <p className="mt-1 text-[12px] leading-snug text-[var(--color-muted)]">{detail}</p> : null}
    </Card>
  );
}
