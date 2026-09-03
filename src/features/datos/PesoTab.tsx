import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS } from "@/db/db";
import { Card, Eyebrow, Chip, Button, Field, Input, BarChart, type BarPoint } from "@/ui";
import { LineChart } from "@/ui/LineChart";
import { evaluateRate } from "@/lib/weightProjection";
import { todayISO, fmtDateHuman, startOfWeek } from "@/lib/date";
import { fromKg, toKg, unitLabel } from "@/lib/units";
import { showToast } from "@/ui/Toast";

export function PesoTab() {
  const rows = useLiveQuery(() => db.weights.orderBy("date").toArray(), []);
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const goal = settings?.weeklyGoalKg ?? DEFAULT_SETTINGS.weeklyGoalKg;
  const unit = settings?.unit ?? DEFAULT_SETTINGS.unit;
  const u = unitLabel(unit);

  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");

  const kgPoints = (rows ?? [])
    .filter((r) => r.weightKg != null)
    .map((r) => ({ date: r.date, weight: r.weightKg as number }));
  const displayPoints = kgPoints.map((p) => ({ label: p.date, value: fromKg(p.weight, unit) }));
  const alert = kgPoints.length >= 2 ? evaluateRate(kgPoints) : null;
  const last = rows && rows.length ? rows[rows.length - 1] : null;

  const weeklyAvgPoints: BarPoint[] = useMemo(() => {
    const byWeek = new Map<string, number[]>();
    kgPoints.forEach((p) => {
      const wk = startOfWeek(p.date);
      if (!byWeek.has(wk)) byWeek.set(wk, []);
      byWeek.get(wk)!.push(p.weight);
    });
    const weeks = Array.from(byWeek.keys()).sort();
    return weeks.map((wk, i) => {
      const vals = byWeek.get(wk)!;
      const avgKg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return { label: fmtDateHuman(wk), value: fromKg(avgKg, unit), highlight: i === weeks.length - 1 };
    });
  }, [kgPoints, unit]);

  async function addEntry() {
    const typed = parseFloat(weight.replace(",", "."));
    if (Number.isNaN(typed)) return;
    const kg = toKg(typed, unit);
    const existing = await db.weights.where("date").equals(date).first();
    if (existing) await db.weights.update(existing.id!, { weightKg: kg });
    else await db.weights.add({ date, weightKg: kg, pechoCm: null, brazoCm: null, note: "" });
    setWeight("");
    showToast("Peso guardado");
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center justify-between">
          <Eyebrow accent>Peso corporal</Eyebrow>
          <span className="text-[10.5px] text-[var(--color-muted)] num">
            meta +{fromKg(goal, unit)} {u}/semana
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 sidebar:grid-cols-[1.3fr_1fr] gap-4">
          <div>
            <LineChart
              points={displayPoints}
              height={110}
              goalPerStep={fromKg(goal, unit)}
              lastValueLabel={last?.weightKg != null ? `${fromKg(last.weightKg, unit)} ${u}` : undefined}
            />
          </div>
          <div>
            <div className="mb-1 text-[9.5px] uppercase tracking-wide text-[var(--color-muted-2)]">Promedio semanal</div>
            <BarChart points={weeklyAvgPoints} height={110} unit="" />
          </div>
        </div>
        {alert?.overPace ? (
          <div className="mt-3">
            <Chip tone="bad">{alert.suggestion}</Chip>
          </div>
        ) : null}
      </Card>

      <Card>
        <Eyebrow>Registrar peso</Eyebrow>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Field label="Fecha">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={`Peso (${u})`}>
            <Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={unit === "lb" ? "158.7" : "72.0"} />
          </Field>
        </div>
        <Button variant="primary" className="w-full mt-3" onClick={addEntry}>
          Guardar
        </Button>
      </Card>

      <Card padded={false}>
        <div className="px-4 py-3 border-b border-[var(--color-line)] eyebrow">Registro</div>
        <div className="divide-y divide-[var(--color-line)]">
          {(rows ?? [])
            .slice()
            .reverse()
            .map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2.5 text-[12.5px]">
                <span className="text-[var(--color-muted)] num">{fmtDateHuman(r.date)}</span>
                <span className="num font-semibold">
                  {r.weightKg != null ? fromKg(r.weightKg, unit) : "—"} {u}
                </span>
              </div>
            ))}
          {!rows?.length ? <div className="px-4 py-6 text-center text-[12px] text-[var(--color-muted)]">Sin registros aún.</div> : null}
        </div>
      </Card>
    </div>
  );
}
