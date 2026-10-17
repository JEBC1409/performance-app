import { EmptyState } from "@/ui/EmptyState";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS } from "@/db/db";
import { Card, CardTitle, Chip, Button, Field, Input, DateField, BarChart, DeltaChip, Headline, type BarPoint } from "@/ui";
import { LineChart } from "@/ui/LineChart";
import { evaluateRate } from "@/lib/weightProjection";
import { changeOver } from "@/lib/changes";
import { todayISO, fmtDateHuman, startOfWeek } from "@/lib/date";
import { fromKg, toKg, unitLabel } from "@/lib/units";
import { showToast } from "@/ui/Toast";
import { WeightGoalCard } from "./WeightGoalCard";

export function PesoTab() {
  const rows = useLiveQuery(() => db.weights.orderBy("date").toArray(), []);
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const goal = settings?.weeklyGoalKg ?? DEFAULT_SETTINGS.weeklyGoalKg;
  const unit = settings?.unit ?? DEFAULT_SETTINGS.unit;
  const u = unitLabel(unit);

  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");

  const kgPoints = useMemo(
    () =>
      (rows ?? [])
        .filter((r) => r.weightKg != null)
        .map((r) => ({ date: r.date, weight: r.weightKg as number })),
    [rows],
  );
  // The ideal path: where you'd be if you gained exactly your weekly goal since the first reading.
  const idealPoints = useMemo(() => {
    if (!kgPoints.length) return [];
    const t0 = new Date(kgPoints[0].date + "T00:00:00").getTime();
    return kgPoints.map((p) => kgPoints[0].weight + goal * ((new Date(p.date + "T00:00:00").getTime() - t0) / (7 * 86_400_000)));
  }, [kgPoints, goal]);
  const displayPoints = kgPoints.map((p) => ({ label: fmtDateHuman(p.date), value: fromKg(p.weight, unit) }));
  const alert = kgPoints.length >= 2 ? evaluateRate(kgPoints) : null;
  const last = rows && rows.length ? rows[rows.length - 1] : null;
  const today = todayISO();
  // Change over the last week and month, in the unit you use. With a gain goal,
  // going up is the win; with a loss goal, going down.
  const week = changeOver(kgPoints.map((p) => ({ date: p.date, value: p.weight })), 7, today);
  const month = changeOver(kgPoints.map((p) => ({ date: p.date, value: p.weight })), 30, today);
  const goodDirection = goal >= 0 ? "up" : "down";
  const perWeek = month ? fromKg(month.diff, unit) / (30 / 7) : null;

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
        <CardTitle>Peso corporal</CardTitle>
        {last && last.weightKg != null ? (
          <>
            <div className="mt-3">
              <Headline
                value={fromKg(last.weightKg, unit)}
                unit={u}
                caption={"Último registro · " + fmtDateHuman(last.date)}
                deltas={
                  <>
                    <DeltaChip diff={week ? fromKg(week.diff, unit) : null} unit={u} good={goodDirection} label="en 7 días" />
                    <DeltaChip diff={month ? fromKg(month.diff, unit) : null} unit={u} good={goodDirection} label="en 30 días" />
                  </>
                }
              />
            </div>
            <div className="mt-4 grid grid-cols-1 sidebar:grid-cols-[1.3fr_1fr] gap-4">
              <div>
                <LineChart points={displayPoints} height={130} unit={u} goalValues={idealPoints.map((v) => fromKg(v, unit))} lastValueLabel={fromKg(last.weightKg, unit) + " " + u} />
              </div>
              <div>
                <div className="mb-1 text-[12px] uppercase tracking-wide text-[var(--color-muted-2)]">Promedio semanal</div>
                <BarChart points={weeklyAvgPoints} height={110} unit="" />
              </div>
            </div>
            <p className="num mt-3 text-[12px] text-[var(--color-muted)]">
              {perWeek != null ? (
                <>
                  Ritmo de 30 días: <span className="font-semibold text-[var(--color-ink)]">{(perWeek >= 0 ? "+" : "") + perWeek.toFixed(2)} {u}/semana</span> · ideal {goal >= 0 ? "+" : ""}
                  {fromKg(goal, unit)} {u}/semana
                </>
              ) : (
                <>Ritmo ideal {goal >= 0 ? "+" : ""}{fromKg(goal, unit)} {u}/semana. Con registros de más de 30 días verás tu ritmo real.</>
              )}
            </p>
          </>
        ) : (
          <EmptyState
            icon="scale"
            title="Aún no hay peso registrado"
            hint="Anota tu primer peso y aquí verás el número, cómo cambia cada semana y tu tendencia."
            action={{
              label: "Anotar mi peso",
              onClick: () => {
                const el = document.getElementById("peso-input");
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
                (el as HTMLInputElement | null)?.focus();
              },
            }}
          />
        )}
        {alert?.overPace ? (
          <div className="mt-3">
            <Chip tone="bad">{alert.suggestion}</Chip>
          </div>
        ) : null}
      </Card>

      <WeightGoalCard points={kgPoints.map((p) => ({ date: p.date, kg: p.weight }))} unit={unit} />

      <Card>
        <CardTitle>Registrar peso</CardTitle>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Field label="Fecha">
            <DateField value={date} max={todayISO()} onChange={setDate} size="sm" />
          </Field>
          <Field label={`Peso (${u})`}>
            <Input id="peso-input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={unit === "lb" ? "158.7" : "72.0"} />
          </Field>
        </div>
        <Button variant="primary" className="w-full mt-3" onClick={addEntry}>
          Guardar
        </Button>
      </Card>

      <Card padded={false}>
        <div className="px-4 py-3 border-b border-[var(--color-line)]">
          <CardTitle>Registro</CardTitle>
        </div>
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
          {!rows?.length ? <EmptyState compact icon="scale" title="Sin registros de peso" hint="Anota tu peso arriba; pesarte a la misma hora da la mejor tendencia." /> : null}
        </div>
      </Card>
    </div>
  );
}
