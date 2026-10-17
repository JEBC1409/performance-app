import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Card, CardTitle, DeltaChip, Field, Headline, Input, Button, DateField } from "@/ui";
import { EmptyState } from "@/ui/EmptyState";
import { BarChart, type BarPoint } from "@/ui/BarChart";
import { SUENO, SLEEP_GOAL_HOURS } from "@/data/horario";
import { todayISO, fmtDateHuman, addDays } from "@/lib/date";
import { windowAverage, windowChange } from "@/lib/changes";
import { showToast } from "@/ui/Toast";

export function SuenoTab() {
  const rows = useLiveQuery(() => db.sleep.orderBy("date").toArray(), []);
  const [date, setDate] = useState(todayISO());
  const [hours, setHours] = useState("");

  const points: BarPoint[] = (rows ?? []).slice(-14).map((r, i, arr) => ({
    label: fmtDateHuman(r.date),
    value: r.hours ?? 0,
    highlight: i === arr.length - 1,
  }));

  // Last 7 nights against the 7 before, and how many of the last 7 reached the goal.
  const today = todayISO();
  const series = (rows ?? []).filter((r) => r.hours != null).map((r) => ({ date: r.date, value: r.hours as number }));
  const avg7 = windowAverage(series, 7, today);
  const change = windowChange(series, 7, today);
  const weekAgo = addDays(today, -6);
  const lastWeek = series.filter((p) => p.date >= weekAgo && p.date <= today);
  const onGoal = lastWeek.filter((p) => p.value >= SLEEP_GOAL_HOURS).length;
  const goalText = String(SLEEP_GOAL_HOURS).replace(".", ",");

  async function addEntry() {
    const h = parseFloat(hours.replace(",", "."));
    if (Number.isNaN(h)) return;
    const existing = await db.sleep.where("date").equals(date).first();
    if (existing) await db.sleep.update(existing.id!, { hours: h });
    else await db.sleep.add({ date, hours: h, bedTime: "", wakeTime: "", note: "" });
    setHours("");
    showToast("Sueño guardado");
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>Sueño vs meta</CardTitle>
        {avg7 != null ? (
          <>
            <div className="mt-3">
              <Headline
                value={String(avg7).replace(".", ",")}
                unit="h por noche"
                caption={"Promedio de los últimos 7 días · meta " + goalText + " h"}
                deltas={
                  <>
                    <DeltaChip diff={change ? change.diff : null} unit="h" good="up" label="vs 7 días antes" />
                    <span className="num text-[12px] text-[var(--color-muted)]">
                      <span className="font-semibold text-[var(--color-ink)]">{onGoal}</span> de {lastWeek.length} noches con meta
                    </span>
                  </>
                }
              />
            </div>
            <div className="mt-4">
              <BarChart points={points} goalLine={SLEEP_GOAL_HOURS} unit={"horas por noche · meta " + goalText + " h"} />
            </div>
          </>
        ) : (
          <EmptyState
            icon="moon"
            title="Aún no hay noches registradas"
            hint="Anota cuánto dormiste y aquí verás tu promedio, cuántas noches llegas a la meta y cómo cambia cada semana."
            action={{
              label: "Anotar anoche",
              onClick: () => {
                const el = document.getElementById("sueno-input");
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
                (el as HTMLInputElement | null)?.focus();
              },
            }}
          />
        )}
      </Card>

      <Card>
        <h2 className="card-title">Registrar sueño</h2>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Field label="Fecha">
            <DateField value={date} max={todayISO()} onChange={setDate} size="sm" />
          </Field>
          <Field label="Horas dormidas">
            <Input id="sueno-input" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="7.5" />
          </Field>
        </div>
        <Button variant="primary" className="w-full mt-3" onClick={addEntry}>
          Guardar
        </Button>
      </Card>

      <Card padded={false}>
        <div className="px-4 py-3 border-b border-[var(--color-line)] eyebrow">Horario planeado</div>
        <div className="divide-y divide-[var(--color-line)]">
          {SUENO.map((s) => (
            <div key={s.dias} className="flex items-center justify-between px-4 py-2.5 text-[12px]">
              <span className="text-[var(--color-muted)]">{s.dias}</span>
              <span className="num">
                {s.acostar} → {s.despertar} · {s.horasLabel}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
