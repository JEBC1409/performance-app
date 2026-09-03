import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Card, Eyebrow, Field, Input, Button } from "@/ui";
import { BarChart, type BarPoint } from "@/ui/BarChart";
import { SUENO, SLEEP_GOAL_HOURS } from "@/data/horario";
import { todayISO, fmtDateHuman } from "@/lib/date";
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
        <Eyebrow accent>Sueño vs meta</Eyebrow>
        <div className="mt-3">
          <BarChart points={points} goalLine={SLEEP_GOAL_HOURS} unit="horas por noche · meta 7h30" />
        </div>
      </Card>

      <Card>
        <Eyebrow>Registrar sueño</Eyebrow>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Field label="Fecha">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Horas dormidas">
            <Input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="7.5" />
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
