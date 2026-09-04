import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Card, Eyebrow, Field, Input, Button, DateField } from "@/ui";
import { todayISO, fmtDateHuman } from "@/lib/date";
import { showToast } from "@/ui/Toast";

function withDeltas(rows: { date: string; value: number | null }[]) {
  let prev: number | null = null;
  return rows
    .filter((r) => r.value != null)
    .map((r) => {
      const delta = prev != null ? (r.value as number) - prev : null;
      prev = r.value;
      return { ...r, delta };
    });
}

export function MedidasTab() {
  const rows = useLiveQuery(() => db.weights.orderBy("date").toArray(), []);
  const [date, setDate] = useState(todayISO());
  const [pecho, setPecho] = useState("");
  const [brazo, setBrazo] = useState("");

  const pechoRows = withDeltas((rows ?? []).map((r) => ({ date: r.date, value: r.pechoCm })));
  const brazoRows = withDeltas((rows ?? []).map((r) => ({ date: r.date, value: r.brazoCm })));

  async function save() {
    const p = pecho.trim() ? parseFloat(pecho.replace(",", ".")) : null;
    const b = brazo.trim() ? parseFloat(brazo.replace(",", ".")) : null;
    if (p == null && b == null) return;
    const existing = await db.weights.where("date").equals(date).first();
    if (existing) {
      await db.weights.update(existing.id!, { pechoCm: p ?? existing.pechoCm, brazoCm: b ?? existing.brazoCm });
    } else {
      await db.weights.add({ date, weightKg: null, pechoCm: p, brazoCm: b, note: "" });
    }
    setPecho("");
    setBrazo("");
    showToast("Medidas guardadas");
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Eyebrow>Registrar medidas</Eyebrow>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Field label="Fecha">
            <DateField value={date} max={todayISO()} onChange={setDate} size="sm" />
          </Field>
          <Field label="Pecho (cm)">
            <Input inputMode="decimal" value={pecho} onChange={(e) => setPecho(e.target.value)} />
          </Field>
          <Field label="Brazo (cm)">
            <Input inputMode="decimal" value={brazo} onChange={(e) => setBrazo(e.target.value)} />
          </Field>
        </div>
        <Button variant="primary" className="w-full mt-3" onClick={save}>
          Guardar
        </Button>
      </Card>

      <div className="grid sidebar:grid-cols-2 gap-4">
        <Card padded={false}>
          <div className="px-4 py-3 border-b border-[var(--color-line)] eyebrow eyebrow-accent">Pecho</div>
          <MeasureList rows={pechoRows} unit="cm" />
        </Card>
        <Card padded={false}>
          <div className="px-4 py-3 border-b border-[var(--color-line)] eyebrow">Brazo</div>
          <MeasureList rows={brazoRows} unit="cm" />
        </Card>
      </div>
    </div>
  );
}

function MeasureList({ rows, unit }: { rows: { date: string; value: number | null; delta: number | null }[]; unit: string }) {
  if (!rows.length) return <div className="px-4 py-6 text-center text-[12px] text-[var(--color-muted)]">Sin registros aún.</div>;
  return (
    <div className="divide-y divide-[var(--color-line)]">
      {rows
        .slice()
        .reverse()
        .map((r) => (
          <div key={r.date} className="flex items-center justify-between px-4 py-2.5 text-[12.5px]">
            <span className="text-[var(--color-muted)] num">{fmtDateHuman(r.date)}</span>
            <span className="num flex items-center gap-2">
              {r.value}
              {unit}
              {r.delta != null ? (
                <span className={r.delta > 0 ? "text-[var(--color-good)]" : r.delta < 0 ? "text-[var(--color-red)]" : "text-[var(--color-muted-2)]"}>
                  ({r.delta > 0 ? "+" : ""}
                  {r.delta.toFixed(1)})
                </span>
              ) : null}
            </span>
          </div>
        ))}
    </div>
  );
}
