import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS } from "@/db/db";
import { Card, Eyebrow, Stat, Ring, Button } from "@/ui";
import { HABIT_LIST } from "@/data/habits";
import { GYM_DIAS } from "@/data/gym";
import { todayISO, num, DIAS, jsDowToIndex } from "@/lib/date";
import { currentBlockInfo } from "@/lib/scheduleBlock";
import { HORARIO } from "@/data/horario";
import { useCycleSlot } from "@/hooks/useCycle";
import { useBible } from "@/hooks/useBible";
import { verseOfDay } from "@/data/bible/loader";
import { fromKg, unitLabel } from "@/lib/units";
import type { Tab } from "@/App";
import type { GymDay } from "@/lib/cycle";

export function Hoy({
  onStartEntreno,
  onNavigate,
}: {
  onStartEntreno: (day: GymDay) => void;
  onNavigate: (t: Tab) => void;
}) {
  const today = todayISO();
  const slot = useCycleSlot();
  const habitDay = useLiveQuery(() => db.habitDays.get(today), [today]);
  const lastWeight = useLiveQuery(() => db.weights.orderBy("date").last(), []);
  const firstWeight = useLiveQuery(
    () => db.weights.orderBy("date").first(),
    []
  );
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const unit = settings?.unit ?? DEFAULT_SETTINGS.unit;
  const moureHours = useLiveQuery(async () => {
    const rows = await db.moureWeeks.toArray();
    return rows.reduce((a, r) => a + (num(r.hours) ?? 0), 0);
  }, []);
  const { bible } = useBible();

  const info = currentBlockInfo();
  const row = info.rowIndex >= 0 ? HORARIO[info.rowIndex] : null;
  const nextRow =
    info.rowIndex >= 0 && info.rowIndex + 1 < HORARIO.length
      ? HORARIO[info.rowIndex + 1]
      : null;
  const nowCell = row ? row.cells[info.col] : null;
  const nextCell = nextRow ? nextRow.cells[info.col] : null;

  const verse = bible ? verseOfDay(bible) : null;
  const weightDelta =
    lastWeight?.weightKg != null && firstWeight?.weightKg != null
      ? lastWeight.weightKg - firstWeight.weightKg
      : 0;

  const habitsCompleted = HABIT_LIST.filter((h) => habitDay?.[h.key]).length;
  const habitsTotal = HABIT_LIST.length;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Bloque actual ──────────────────────────────────── */}
      <div className="panel-surface enter">
        {/* Header row */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[var(--color-line)]">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] glow-dot" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Dr. Discipline
              </span>
            </div>
            <div className="eyebrow eyebrow-accent">
              {DIAS[jsDowToIndex(new Date().getDay())]}
            </div>
            <h1 className="font-[var(--font-display)] text-[15px] tracking-[0.06em] mt-1">
              Tu día ahora
            </h1>
          </div>
          <button
            onClick={() => onNavigate("horario")}
            className="text-[10px] text-[var(--color-muted)] hover:text-[var(--color-red)] uppercase tracking-[0.12em] transition-colors"
          >
            Ver horario →
          </button>
        </div>

        {/* Current block */}
        <div className="px-4 py-3 flex items-start gap-3">
          <div className="mt-1 w-1.5 h-1.5 bg-[var(--color-red)] glow-dot flex-none" />
          <div className="flex-1 min-w-0">
            <div className="eyebrow mb-1">Bloque actual</div>
            <div className="text-[13.5px] leading-snug text-[var(--color-ink)] whitespace-pre-line">
              {nowCell ? nowCell.text : "Bloque libre / fuera de horario"}
            </div>
            {nextCell && (
              <div className="mt-2 text-[11px] text-[var(--color-muted)] leading-tight">
                Siguiente{nextRow?.time ? ` (${nextRow.time})` : ""}:{" "}
                <span className="text-[var(--color-ink)] font-semibold">
                  {nextCell.text}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sesión del día ─────────────────────────────────── */}
      <div className={`panel-surface enter enter-delay-1 ${slot !== "rest" ? "panel-surface-glow" : ""}`}>
        <div className="px-4 pt-4 pb-3 border-b border-[var(--color-line)]">
          <Eyebrow>Sesión del día</Eyebrow>
        </div>
        <div className="px-4 py-3">
          {slot === "rest" ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-[var(--color-line-strong)] flex items-center justify-center flex-none">
                <span className="eyebrow text-[9px]">Z</span>
              </div>
              <div>
                <div className="font-[var(--font-display)] text-[13px] tracking-[0.06em]">
                  Descanso
                </div>
                <div className="text-[11px] text-[var(--color-muted)] mt-0.5">
                  Ciclo A → B → C → descanso. Hoy toca recuperar.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[var(--color-red)] flex items-center justify-center flex-none">
                  <span className="font-[var(--font-display)] text-[10px] text-white tracking-wide">
                    {slot}
                  </span>
                </div>
                <div>
                  <div className="font-[var(--font-display)] text-[13px] tracking-[0.06em]">
                    {GYM_DIAS[slot].nombre}
                  </div>
                  <div className="text-[11px] text-[var(--color-muted)] mt-0.5">
                    {GYM_DIAS[slot].grupo}
                  </div>
                </div>
              </div>
              <Button variant="primary" onClick={() => onStartEntreno(slot)}>
                Iniciar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Hábitos hoy ─────────────────────────────────────── */}
      <div className="panel-surface enter enter-delay-2">
        <div className="px-4 pt-4 pb-3 border-b border-[var(--color-line)] flex items-center justify-between">
          <Eyebrow>Hábitos hoy</Eyebrow>
          <span className="eyebrow">
            <span className="text-[var(--color-red)] not-italic">
              {habitsCompleted}
            </span>
            /{habitsTotal}
          </span>
        </div>
        <div className="px-4 py-3 grid grid-cols-4 gap-3">
          {HABIT_LIST.map((h) => {
            const on = !!habitDay?.[h.key];
            return <Ring key={h.key} value={on ? 1 : 0} size={48} label={h.label} />;
          })}
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2.5 enter enter-delay-3">
        <Stat
          label="Peso actual"
          value={lastWeight?.weightKg != null ? `${fromKg(lastWeight.weightKg, unit)}` : "—"}
          sub={
            weightDelta
              ? `${weightDelta > 0 ? "+" : ""}${fromKg(weightDelta, unit).toFixed(1)} ${unitLabel(unit)} desde inicio`
              : unitLabel(unit)
          }
          accent
        />
        <Stat label="Horas MoureDev" value={moureHours ?? 0} sub="acumuladas" />
        <Stat
          label="Hábitos"
          value={`${habitsCompleted}/${habitsTotal}`}
          sub="marcados hoy"
        />
      </div>

      {/* ── Versículo del día ───────────────────────────────── */}
      <Card className="enter enter-delay-4">
        <div className="flex items-center justify-between mb-3">
          <Eyebrow accent>Versículo del día</Eyebrow>
          <button
            onClick={() => onNavigate("kairos")}
            className="text-[10px] text-[var(--color-muted)] hover:text-[var(--color-red)] uppercase tracking-[0.12em] transition-colors"
          >
            Kairos →
          </button>
        </div>
        {verse ? (
          <div>
            <p className="text-[13px] leading-relaxed text-[var(--color-ink)]">
              {verse.text}
            </p>
            <div className="text-[10.5px] text-[var(--color-muted)] mt-2.5 num">
              {verse.bookName} {verse.chapter}:{verse.verse}
            </div>
          </div>
        ) : (
          <div className="text-[12px] text-[var(--color-muted-2)]">
            Cargando…
          </div>
        )}
      </Card>
    </div>
  );
}
