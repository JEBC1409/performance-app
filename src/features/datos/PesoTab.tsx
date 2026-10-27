import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS, type Unit } from "@/db/db";
import { Button, Card, Chip, DateField, DeltaChip, Field, Headline, Input, LineChart, Sheet } from "@/ui";
import { EmptyState } from "@/ui/EmptyState";
import { evaluateRate } from "@/lib/weightProjection";
import { changeOver } from "@/lib/changes";
import { todayISO, fmtDateHuman } from "@/lib/date";
import { fromKg, toKg, unitLabel } from "@/lib/units";
import { showToast } from "@/ui/Toast";
import { WeightGoalCard } from "./WeightGoalCard";
import { EntryList, FieldError, Segmented } from "./components";
import { RANGES, windowSeries, type Range } from "./series";

/** Most recent readings kept in memory: a bit over a year of daily weigh-ins. */
const MAX_ROWS = 400;

export function PesoTab() {
  const rowsDesc = useLiveQuery(() => db.weights.orderBy("date").reverse().limit(MAX_ROWS).toArray(), []);
  const rows = useMemo(() => (rowsDesc ? rowsDesc.slice().reverse() : undefined), [rowsDesc]);
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const goal = settings?.weeklyGoalKg ?? DEFAULT_SETTINGS.weeklyGoalKg;
  const unit = settings?.unit ?? DEFAULT_SETTINGS.unit;
  const u = unitLabel(unit);

  const [range, setRange] = useState<Range>(90);
  const [sheet, setSheet] = useState(false);
  const today = todayISO();

  const kgPoints = useMemo(
    () =>
      (rows ?? [])
        .filter((r) => r.weightKg != null)
        .map((r) => ({ date: r.date, weight: r.weightKg as number })),
    [rows],
  );
  const dated = useMemo(() => kgPoints.map((p) => ({ date: p.date, value: p.weight })), [kgPoints]);

  // What the chart draws: the chosen period (a year is averaged per week), and the
  // ideal path from its first point at your weekly goal.
  const windowed = useMemo(() => windowSeries(dated, range, today), [dated, range, today]);
  const chartPoints = windowed.map((p) => ({ label: fmtDateHuman(p.date), value: fromKg(p.value, unit) }));
  const idealValues = useMemo(() => {
    if (!windowed.length) return [];
    const t0 = new Date(windowed[0].date + "T00:00:00").getTime();
    return windowed.map((p) => fromKg(windowed[0].value + goal * ((new Date(p.date + "T00:00:00").getTime() - t0) / (7 * 86_400_000)), unit));
  }, [windowed, goal, unit]);

  // An ideal path that has run far from where you are only squashes the chart against its top edge: leave it out.
  const showIdeal = idealValues.length > 0 && Math.abs(idealValues[idealValues.length - 1] - chartPoints[chartPoints.length - 1].value) <= fromKg(3, unit);

  const alert = kgPoints.length >= 2 ? evaluateRate(kgPoints) : null;
  const last = kgPoints.length ? kgPoints[kgPoints.length - 1] : null;
  const lastRow = rows && rows.length ? rows[rows.length - 1] : null;
  // Change over the last week and month. With a gain goal, going up is the win;
  // with a loss goal, going down.
  const week = changeOver(dated, 7, today);
  const month = changeOver(dated, 30, today);
  const goodDirection = goal >= 0 ? "up" : "down";
  const perWeek = month ? fromKg(month.diff, unit) / (30 / 7) : null;
  const idealText = (goal >= 0 ? "+" : "") + fromKg(goal, unit) + " " + u + "/semana";

  return (
    <div className="flex flex-col gap-4">
      <Card className="panel-surface-glow">
        <div className="flex items-center justify-between gap-3">
          <h2 className="card-title">Peso corporal</h2>
          {last ? (
            <Button variant="secondary" onClick={() => setSheet(true)}>
              Anotar
            </Button>
          ) : null}
        </div>
        {last ? (
          <>
            <div className="mt-3">
              <Headline
                value={fromKg(last.weight, unit)}
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
            <Segmented className="mt-4" label="Periodo de la gráfica" items={RANGES} value={range} onChange={setRange} />
            <div className="mt-3">
              {windowed.length >= 2 ? (
                <LineChart points={chartPoints} height={150} unit={u} goalValues={showIdeal ? idealValues : undefined}lastValueLabel={fromKg(last.weight, unit) + " " + u} />
              ) : (
                <p className="py-6 text-center text-sm text-[var(--color-muted)]">Con dos registros en este periodo verás la curva. Prueba uno más largo.</p>
              )}
              {range === 365 && windowed.length >= 2 ? <p className="mt-1 text-meta text-[var(--color-muted-2)]">Promedio de cada semana</p> : null}
            </div>
            <p className="num mt-3 text-sm text-[var(--color-muted)]">
              {perWeek != null ? (
                <>
                  Ritmo de 30 días: <span className="font-semibold text-[var(--color-ink)]">{(perWeek >= 0 ? "+" : "") + perWeek.toFixed(2)} {u}/semana</span> · ideal {idealText}
                </>
              ) : (
                <>Ritmo ideal {idealText}. Con registros de más de 30 días verás tu ritmo real.</>
              )}
            </p>
            {alert?.overPace ? (
              <div className="mt-3">
                <Chip tone="bad">{alert.suggestion}</Chip>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState
            icon="scale"
            title="Aún no hay peso registrado"
            hint="Anota tu primer peso y aquí verás el número, cómo cambia cada semana y tu tendencia."
            action={{ label: "Anotar mi peso", onClick: () => setSheet(true) }}
          />
        )}
      </Card>

      <WeightGoalCard points={kgPoints.map((p) => ({ date: p.date, kg: p.weight }))} unit={unit} />

      {lastRow ? (
        <Card padded={false}>
          <div className="border-b border-[var(--color-line)] px-4 py-3">
            <h2 className="card-title">Registro</h2>
          </div>
          <EntryList
            noun="registros"
            rows={(rows ?? [])
              .slice()
              .reverse()
              .map((r) => ({ key: r.id ?? r.date, date: fmtDateHuman(r.date), value: r.weightKg != null ? `${fromKg(r.weightKg, unit)} ${u}` : "—" }))}
          />
        </Card>
      ) : null}

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Anotar peso">
        <WeightForm unit={unit} onDone={() => setSheet(false)} />
      </Sheet>
    </div>
  );
}

function WeightForm({ unit, onDone }: { unit: Unit; onDone: () => void }) {
  const u = unitLabel(unit);
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [error, setError] = useState("");

  async function save() {
    const typed = parseFloat(weight.replace(",", "."));
    if (Number.isNaN(typed) || typed <= 0) {
      setError("Escribe tu peso, por ejemplo " + (unit === "lb" ? "158,7" : "72,5") + ".");
      return;
    }
    const kg = toKg(typed, unit);
    const existing = await db.weights.where("date").equals(date).first();
    if (existing) await db.weights.update(existing.id!, { weightKg: kg });
    else await db.weights.add({ date, weightKg: kg, pechoCm: null, brazoCm: null, note: "" });
    showToast("Peso guardado");
    onDone();
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Field label="Fecha">
        <DateField value={date} max={todayISO()} onChange={setDate} />
      </Field>
      <Field label={`Peso (${u})`}>
        <Input
          autoFocus
          inputMode="decimal"
          value={weight}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            setWeight(e.target.value);
            setError("");
          }}
          placeholder={unit === "lb" ? "158.7" : "72.5"}
        />
      </Field>
      {error ? <FieldError>{error}</FieldError> : null}
      <Button type="submit" variant="primary" className="w-full">
        Guardar
      </Button>
    </form>
  );
}
