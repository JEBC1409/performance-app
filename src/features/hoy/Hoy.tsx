import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Card, Eyebrow, Stat, Ring, Button } from "@/ui";
import { HABIT_LIST } from "@/data/habits";
import { GYM_DIAS } from "@/data/gym";
import { todayISO, num, DIAS, jsDowToIndex } from "@/lib/date";
import { currentBlockInfo } from "@/lib/scheduleBlock";
import { HORARIO } from "@/data/horario";
import { useCycleSlot } from "@/hooks/useCycle";
import { useBible } from "@/hooks/useBible";
import { verseOfDay } from "@/data/bible/loader";
import type { Tab } from "@/App";
import type { GymDay } from "@/lib/cycle";

export function Hoy({ onStartEntreno, onNavigate }: { onStartEntreno: (day: GymDay) => void; onNavigate: (t: Tab) => void }) {
  const today = todayISO();
  const slot = useCycleSlot();
  const habitDay = useLiveQuery(() => db.habitDays.get(today), [today]);
  const lastWeight = useLiveQuery(() => db.weights.orderBy("date").last(), []);
  const firstWeight = useLiveQuery(() => db.weights.orderBy("date").first(), []);
  const moureHours = useLiveQuery(async () => {
    const rows = await db.moureWeeks.toArray();
    return rows.reduce((a, r) => a + (num(r.hours) ?? 0), 0);
  }, []);
  const { bible } = useBible();

  const info = currentBlockInfo();
  const row = info.rowIndex >= 0 ? HORARIO[info.rowIndex] : null;
  const nextRow = info.rowIndex >= 0 && info.rowIndex + 1 < HORARIO.length ? HORARIO[info.rowIndex + 1] : null;
  const nowCell = row ? row.cells[info.col] : null;
  const nextCell = nextRow ? nextRow.cells[info.col] : null;

  const verse = bible ? verseOfDay(bible) : null;
  const weightDelta = lastWeight?.weightKg != null && firstWeight?.weightKg != null ? lastWeight.weightKg - firstWeight.weightKg : 0;

  return (
    <div className="flex flex-col gap-4 enter">
      <div className="panel-surface p-5">
        <Eyebrow accent>{DIAS[jsDowToIndex(new Date().getDay())]}</Eyebrow>
        <h1 className="font-[var(--font-display)] text-xl mt-2 tracking-tight">Tu día ahora</h1>
        <div className="mt-3.5 flex items-center gap-3 border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3.5 py-3">
          <div className="w-2 h-2 bg-[var(--color-red)] glow-dot flex-none" />
          <div>
            <div className="eyebrow">Bloque actual</div>
            <div className="text-sm mt-0.5 whitespace-pre-line">{nowCell ? nowCell.text : "Bloque libre / fuera de horario"}</div>
          </div>
        </div>
        {nextCell ? (
          <div className="mt-2 text-[12px] text-[var(--color-muted)] pl-0.5">
            Siguiente ({nextRow?.time}): <span className="text-[var(--color-ink)] font-semibold">{nextCell.text}</span>
          </div>
        ) : null}
        <button onClick={() => onNavigate("horario")} className="mt-3 text-[11px] text-[var(--color-muted)] hover:text-[var(--color-red)] uppercase tracking-wide">
          Ver horario completo →
        </button>
      </div>

      <Card>
        <Eyebrow>Sesión del día</Eyebrow>
        {slot === "rest" ? (
          <div className="mt-2">
            <div className="text-lg font-[var(--font-display)]">Descanso</div>
            <div className="text-[12px] text-[var(--color-muted)] mt-1">Ciclo A → B → C → descanso → repetir. Hoy toca recuperar.</div>
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-lg font-[var(--font-display)]">
                Día {slot} · {GYM_DIAS[slot].nombre}
              </div>
              <div className="text-[12px] text-[var(--color-muted)] mt-1">{GYM_DIAS[slot].grupo}</div>
            </div>
            <Button variant="primary" onClick={() => onStartEntreno(slot)}>
              Iniciar entreno
            </Button>
          </div>
        )}
      </Card>

      <div>
        <Eyebrow>Hábitos hoy</Eyebrow>
        <div className="grid grid-cols-4 gap-2 mt-2.5 panel-surface p-4">
          {HABIT_LIST.map((h) => {
            const on = !!habitDay?.[h.key];
            return <Ring key={h.key} value={on ? 1 : 0} size={48} label={h.label} />;
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 sidebar:grid-cols-3 gap-2.5">
        <Stat label="Peso actual" value={lastWeight?.weightKg != null ? `${lastWeight.weightKg}` : "—"} sub={weightDelta ? `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg desde inicio` : "kg"} accent />
        <Stat label="Horas MoureDev" value={moureHours ?? 0} sub="acumuladas" />
        <Stat
          label="Hábitos"
          value={`${HABIT_LIST.filter((h) => habitDay?.[h.key]).length}/${HABIT_LIST.length}`}
          sub="marcados hoy"
        />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <Eyebrow accent>Versículo del día</Eyebrow>
          <button onClick={() => onNavigate("kairos")} className="text-[10.5px] text-[var(--color-muted)] hover:text-[var(--color-red)] uppercase tracking-wide">
            Kairos →
          </button>
        </div>
        {verse ? (
          <div className="mt-2.5">
            <p className="text-[13.5px] leading-relaxed">{verse.text}</p>
            <div className="text-[11px] text-[var(--color-muted)] mt-2 num">
              {verse.bookName} {verse.chapter}:{verse.verse}
            </div>
          </div>
        ) : (
          <div className="text-[12px] text-[var(--color-muted-2)] mt-2">Cargando…</div>
        )}
      </Card>
    </div>
  );
}
