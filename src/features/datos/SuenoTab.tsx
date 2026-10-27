import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Button, Card, DateField, DeltaChip, Field, Headline, Input, Sheet } from "@/ui";
import { EmptyState } from "@/ui/EmptyState";
import { BarChart, type BarPoint } from "@/ui/BarChart";
import { SUENO, SLEEP_GOAL_HOURS } from "@/data/horario";
import { todayISO, fmtDateHuman, addDays } from "@/lib/date";
import { windowAverage, windowChange } from "@/lib/changes";
import { showToast } from "@/ui/Toast";
import { FieldError } from "./components";

/** Nights kept in memory: enough for the 14 bars and the two 7-day windows. */
const MAX_NIGHTS = 30;

export function SuenoTab() {
  const rowsDesc = useLiveQuery(() => db.sleep.orderBy("date").reverse().limit(MAX_NIGHTS).toArray(), []);
  const rows = useMemo(() => (rowsDesc ? rowsDesc.slice().reverse() : undefined), [rowsDesc]);
  const [sheet, setSheet] = useState(false);
  const [plan, setPlan] = useState(false);

  const today = todayISO();
  const series = useMemo(() => (rows ?? []).filter((r) => r.hours != null).map((r) => ({ date: r.date, value: r.hours as number })), [rows]);
  const points: BarPoint[] = series.slice(-14).map((p, i, arr) => ({
    label: fmtDateHuman(p.date),
    value: p.value,
    highlight: i === arr.length - 1,
  }));

  // Last 7 nights against the 7 before, and how many of the last 7 reached the goal.
  const avg7 = windowAverage(series, 7, today);
  const change = windowChange(series, 7, today);
  const weekAgo = addDays(today, -6);
  const lastWeek = series.filter((p) => p.date >= weekAgo && p.date <= today);
  const onGoal = lastWeek.filter((p) => p.value >= SLEEP_GOAL_HOURS).length;
  const goalText = String(SLEEP_GOAL_HOURS).replace(".", ",");

  return (
    <div className="flex flex-col gap-4">
      <Card className="panel-surface-glow">
        <div className="flex items-center justify-between gap-3">
          <h2 className="card-title">Sueño</h2>
          {series.length ? (
            <Button variant="secondary" onClick={() => setSheet(true)}>
              Anotar
            </Button>
          ) : null}
        </div>
        {series.length ? (
          <>
            <div className="mt-3">
              {avg7 != null ? (
                <Headline
                  value={String(avg7).replace(".", ",")}
                  unit="h por noche"
                  caption={"Promedio de los últimos 7 días · meta " + goalText + " h"}
                  deltas={
                    <>
                      <DeltaChip diff={change ? change.diff : null} unit="h" good="up" label="vs 7 días antes" />
                      <span className="num text-meta text-[var(--color-muted)]">
                        <span className="font-semibold text-[var(--color-ink)]">{onGoal}</span> de {lastWeek.length} noches con meta
                      </span>
                    </>
                  }
                />
              ) : (
                <Headline
                  value={String(series[series.length - 1].value).replace(".", ",")}
                  unit="h"
                  caption={"Última noche registrada · " + fmtDateHuman(series[series.length - 1].date) + " · meta " + goalText + " h"}
                />
              )}
            </div>
            <div className="datos-bars mt-4">
              <BarChart points={points} goalLine={SLEEP_GOAL_HOURS} unit="h" />
              <p className="mt-1 text-meta text-[var(--color-muted-2)]">Horas por noche, últimas {points.length} noches</p>
            </div>
          </>
        ) : (
          <EmptyState
            icon="moon"
            title="Aún no hay noches registradas"
            hint="Anota cuánto dormiste y aquí verás tu promedio, cuántas noches llegas a la meta y cómo cambia cada semana."
            action={{ label: "Anotar anoche", onClick: () => setSheet(true) }}
          />
        )}
      </Card>

      <Card padded={false}>
        <button
          type="button"
          aria-expanded={plan}
          onClick={() => setPlan((v) => !v)}
          className="tap-target flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="card-title">Horario planeado</span>
          <span className="text-sm text-[var(--color-muted)]">{plan ? "Ocultar" : "Ver"}</span>
        </button>
        {plan ? (
          <ul className="divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
            {SUENO.map((s) => (
              <li key={s.dias} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="text-[var(--color-muted)]">{s.dias}</span>
                <span className="num">
                  {s.acostar} → {s.despertar} · {s.horasLabel}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Anotar sueño">
        <SleepForm onDone={() => setSheet(false)} />
      </Sheet>
    </div>
  );
}

function SleepForm({ onDone }: { onDone: () => void }) {
  const [date, setDate] = useState(todayISO());
  const [hours, setHours] = useState("");
  const [error, setError] = useState("");

  async function save() {
    const h = parseFloat(hours.replace(",", "."));
    if (Number.isNaN(h) || h <= 0 || h > 24) {
      setError("Escribe las horas que dormiste, por ejemplo 7,5.");
      return;
    }
    const existing = await db.sleep.where("date").equals(date).first();
    if (existing) await db.sleep.update(existing.id!, { hours: h });
    else await db.sleep.add({ date, hours: h, bedTime: "", wakeTime: "", note: "" });
    showToast("Sueño guardado");
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
      <Field label="Horas dormidas">
        <Input
          autoFocus
          inputMode="decimal"
          value={hours}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            setHours(e.target.value);
            setError("");
          }}
          placeholder="7,5"
        />
      </Field>
      {error ? <FieldError>{error}</FieldError> : null}
      <Button type="submit" variant="primary" className="w-full">
        Guardar
      </Button>
    </form>
  );
}
