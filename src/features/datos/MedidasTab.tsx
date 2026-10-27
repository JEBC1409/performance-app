import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Button, Card, DateField, DeltaChip, Field, Headline, Input, LineChart, Sheet } from "@/ui";
import { EmptyState } from "@/ui/EmptyState";
import { todayISO, fmtDateHuman } from "@/lib/date";
import { showToast } from "@/ui/Toast";
import { EntryList, FieldError, Segmented } from "./components";
import { withDeltas } from "./series";

type MeasureKey = "pecho" | "brazo";
const MEASURES: { key: MeasureKey; label: string }[] = [
  { key: "pecho", label: "Pecho" },
  { key: "brazo", label: "Brazo" },
];

/** How many of the latest entries the chart draws. */
const CHART_ENTRIES = 24;

export function MedidasTab() {
  const rows = useLiveQuery(() => db.weights.orderBy("date").toArray(), []);
  const [sheet, setSheet] = useState(false);
  const [picked, setPicked] = useState<MeasureKey | null>(null);

  const byKey = useMemo(
    () => ({
      pecho: withDeltas((rows ?? []).map((r) => ({ date: r.date, value: r.pechoCm }))),
      brazo: withDeltas((rows ?? []).map((r) => ({ date: r.date, value: r.brazoCm }))),
    }),
    [rows],
  );

  const withData = MEASURES.filter((m) => byKey[m.key].length > 0);
  // Open on whichever was measured last.
  const latest = withData.reduce<MeasureKey | null>((best, m) => {
    const d = byKey[m.key][byKey[m.key].length - 1].date;
    return best == null || d > byKey[best][byKey[best].length - 1].date ? m.key : best;
  }, null);
  const active = picked && byKey[picked].length ? picked : latest;

  return (
    <div className="flex flex-col gap-4">
      <Card className="panel-surface-glow">
        <div className="flex items-center justify-between gap-3">
          <h2 className="card-title">{withData.length === 1 ? MEASURES.find((m) => m.key === active)!.label : "Medidas"}</h2>
          {active ? (
            <Button variant="secondary" onClick={() => setSheet(true)}>
              Anotar
            </Button>
          ) : null}
        </div>
        {active ? (
          <>
            {withData.length > 1 ? <Segmented className="mt-3" label="Medida" items={withData} value={active} onChange={setPicked} /> : null}
            <MeasureSummary rows={byKey[active]} />
          </>
        ) : (
          <EmptyState
            icon="target"
            title="Aún no hay medidas"
            hint="Anota el contorno de tu pecho y de tu brazo y aquí verás cómo cambian con el tiempo."
            action={{ label: "Anotar medidas", onClick: () => setSheet(true) }}
          />
        )}
      </Card>

      {active ? (
        <Card padded={false}>
          <div className="border-b border-[var(--color-line)] px-4 py-3">
            <h2 className="card-title">Registro</h2>
          </div>
          <EntryList
            noun="registros"
            rows={byKey[active]
              .slice()
              .reverse()
              .map((r) => ({
                key: r.date,
                date: fmtDateHuman(r.date),
                value: `${r.value} cm`,
                extra: <DeltaChip diff={r.delta} unit="cm" good="neutral" />,
              }))}
          />
        </Card>
      ) : null}

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Anotar medidas">
        <MeasureForm onDone={() => setSheet(false)} />
      </Sheet>
    </div>
  );
}

/** One measurement: the latest figure big, how it moved, then the curve. */
function MeasureSummary({ rows }: { rows: { date: string; value: number; delta: number | null }[] }) {
  const last = rows[rows.length - 1];
  const first = rows[0];
  const sinceFirst = rows.length >= 3 ? Math.round((last.value - first.value) * 10) / 10 : null;
  const chart = rows.slice(-CHART_ENTRIES);
  return (
    <>
      <div className="mt-4">
        <Headline
          value={last.value}
          unit="cm"
          caption={"Último registro · " + fmtDateHuman(last.date)}
          deltas={
            <>
              <DeltaChip diff={last.delta} unit="cm" label="vs registro anterior" />
              <DeltaChip diff={sinceFirst} unit="cm" label="desde el primero" />
            </>
          }
        />
      </div>
      {rows.length >= 2 ? (
        <div className="mt-4">
          <LineChart points={chart.map((r) => ({ label: fmtDateHuman(r.date), value: r.value }))} height={130} unit="cm" showTrend={false} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--color-muted)]">Con un segundo registro verás la curva.</p>
      )}
    </>
  );
}

function parseCm(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = parseFloat(t.replace(",", "."));
  return Number.isNaN(n) ? NaN : n;
}

function MeasureForm({ onDone }: { onDone: () => void }) {
  const [date, setDate] = useState(todayISO());
  const [pecho, setPecho] = useState("");
  const [brazo, setBrazo] = useState("");
  const [error, setError] = useState("");

  async function save() {
    const p = parseCm(pecho);
    const b = parseCm(brazo);
    if ((p == null && b == null) || Number.isNaN(p) || Number.isNaN(b) || (p != null && p <= 0) || (b != null && b <= 0)) {
      setError("Escribe al menos una medida en centímetros, por ejemplo 98,5.");
      return;
    }
    const existing = await db.weights.where("date").equals(date).first();
    if (existing) {
      await db.weights.update(existing.id!, { pechoCm: p ?? existing.pechoCm, brazoCm: b ?? existing.brazoCm });
    } else {
      await db.weights.add({ date, weightKg: null, pechoCm: p, brazoCm: b, note: "" });
    }
    showToast("Medidas guardadas");
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pecho (cm)">
          <Input
            autoFocus
            inputMode="decimal"
            value={pecho}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              setPecho(e.target.value);
              setError("");
            }}
          />
        </Field>
        <Field label="Brazo (cm)">
          <Input
            inputMode="decimal"
            value={brazo}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              setBrazo(e.target.value);
              setError("");
            }}
          />
        </Field>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
      <Button type="submit" variant="primary" className="w-full">
        Guardar
      </Button>
    </form>
  );
}
