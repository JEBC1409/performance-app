import { EmptyState } from "@/ui/EmptyState";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Card, CardTitle, DeltaChip, Field, Headline, Input, Button, DateField } from "@/ui";
import { LineChart } from "@/ui/LineChart";
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
        <h2 className="card-title">Registrar medidas</h2>
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
        <MeasureCard title="Pecho" rows={pechoRows} unit="cm" />
        <MeasureCard title="Brazo" rows={brazoRows} unit="cm" />
      </div>
    </div>
  );
}

/** One measurement: the latest figure big, how it moved, the curve, then every entry. */
function MeasureCard({ title, rows, unit }: { title: string; rows: { date: string; value: number | null; delta: number | null }[]; unit: string }) {
  const last = rows[rows.length - 1];
  const first = rows[0];
  const sinceFirst = rows.length >= 3 && last?.value != null && first?.value != null ? Math.round((last.value - first.value) * 10) / 10 : null;
  return (
    <Card padded={false}>
      <div className="px-4 pt-4">
        <CardTitle>{title}</CardTitle>
        {last && last.value != null ? (
          <div className="mt-3">
            <Headline
              value={last.value}
              unit={unit}
              caption={"Último registro · " + fmtDateHuman(last.date)}
              deltas={
                <>
                  <DeltaChip diff={last.delta != null ? Math.round(last.delta * 10) / 10 : null} unit={unit} label="vs registro anterior" />
                  <DeltaChip diff={sinceFirst} unit={unit} label="desde el primero" />
                </>
              }
            />
          </div>
        ) : null}
        {rows.length >= 2 ? (
          <div className="mt-4">
            <LineChart points={rows.map((r) => ({ label: fmtDateHuman(r.date), value: r.value as number }))} height={100} unit={unit} showTrend={false} />
          </div>
        ) : null}
      </div>
      <div className="mt-3 border-t border-[var(--color-line)]">
        <MeasureList rows={rows} unit={unit} />
      </div>
    </Card>
  );
}

function MeasureList({ rows, unit }: { rows: { date: string; value: number | null; delta: number | null }[]; unit: string }) {
  if (!rows.length) return <EmptyState compact icon="target" title="Sin medidas todavía" hint="Registra pecho o brazo arriba para ver tu progreso." />;
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
