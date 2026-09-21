import { Icon } from "@/ui/Icon";
import { Skeleton } from "@/ui/Skeleton";
import { useState } from "react";
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS } from "@/db/db";
import { Card, Eyebrow, Stat, HabitGlyph, Button, Sheet, DateField } from "@/ui";
import { DailyStreakCard } from "./DailyStreakCard";
import { DayRings } from "./DayRings";
import { useUiPrefs } from "@/hooks/useUiPrefs";
import { useConfigVersion } from "@/hooks/useConfigVersion";
import type { HomeCard } from "@/lib/uiPrefs";
import { useHabitDefs } from "@/hooks/useHabitDefs";
import { GYM_DAY_ORDER, GYM_DIAS } from "@/data/gym";
import { todayISO, num, DIAS, jsDowToIndex } from "@/lib/date";
import { currentBlockInfo } from "@/lib/scheduleBlock";
import { hintDatosTab } from "@/features/datos/tabHint";
import { habitForBlock, toggleHabitDay } from "@/lib/habits";
import { celebrate, haptic } from "@/lib/feedback";
import { HORARIO } from "@/data/horario";
import { setCycleSlot, useCycleSlot } from "@/hooks/useCycle";
import { useBible } from "@/hooks/useBible";
import { verseOfDay } from "@/data/bible/loader";
import { fromKg, unitLabel } from "@/lib/units";
import { buildDailySummary } from "@/lib/dailySummary";
import { showToast } from "@/ui/Toast";
import type { Tab } from "@/App";
import type { GymDay } from "@/lib/cycle";

export function Hoy({
  onStartEntreno,
  onNavigate,
}: {
  onStartEntreno: (day: GymDay, date: string) => void;
  onNavigate: (t: Tab) => void;
}) {
  const today = todayISO();
  const slot = useCycleSlot();
  const { homeOrder } = useUiPrefs();
  useConfigVersion(); // routine / schedule edits re-render this screen
  const [startPrompt, setStartPrompt] = useState(false);
  const [pickedDay, setPickedDay] = useState<GymDay>("A");
  const [pickedDate, setPickedDate] = useState(today);

  function openStartPrompt() {
    setPickedDay(slot === "rest" ? "A" : slot);
    setPickedDate(today);
    setStartPrompt(true);
  }
  const habitDay = useLiveQuery(() => db.habitDays.get(today), [today]);
  const habitDefs = useHabitDefs();
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

  const habitList = habitDefs ?? [];
  const habitsCompleted = habitList.filter((h) => habitDay?.done.includes(h.key)).length;
  const habitsTotal = habitList.length;

  async function checkHabit(key: string) {
    const on = await toggleHabitDay(today, key);
    if (!on) return;
    haptic();
    // Marking the last one of the day is worth a little fanfare.
    const doneNow = new Set([...(habitDay?.done ?? []), key]);
    if (habitList.length > 0 && habitList.every((h) => doneNow.has(h.key))) {
      haptic([20, 60, 20]);
      celebrate();
    }
  }

  const blockHabit = habitForBlock(nowCell, habitList);
  const blockHabitDone = !!blockHabit && !!habitDay?.done.includes(blockHabit.key);

  async function copyDailySummary() {
    const summary = await buildDailySummary(today);
    try {
      await navigator.clipboard.writeText(summary);
      showToast("Resumen copiado — pegalo en tu chat de progreso");
    } catch {
      showToast("No se pudo copiar");
    }
  }

  const blockTitle = nowCell ? nowCell.text : "Bloque libre / fuera de horario";
  const blockTime = row ? row.time : null;

  /** The one thing worth doing right now, as a button. */
  let heroAction: ReactNode = null;
  if (blockHabit) {
    heroAction = (
      <button
        onClick={() => checkHabit(blockHabit.key)}
        aria-pressed={blockHabitDone}
        className={`tap-target mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] ${
          blockHabitDone ? "glass text-[var(--color-good)]" : "glass-on"
        }`}
      >
        {blockHabitDone ? (
          <>
            <span className="pop">✓</span> {blockHabit.label} hecho
          </>
        ) : (
          <>Marcar {blockHabit.label}</>
        )}
      </button>
    );
  } else if (nowCell?.type === "gym") {
    heroAction = (
      <Button variant="primary" className="mt-4 w-full py-3.5 text-[13px]" onClick={openStartPrompt}>
        {slot === "rest" ? "Elegir entreno" : `Iniciar ${GYM_DIAS[slot].nombre}`}
      </Button>
    );
  } else if (nowCell && !nowCell.quiet && (nowCell.type === "mouredev" || nowCell.type === "clase" || nowCell.type === "ingles")) {
    heroAction = (
      <button onClick={() => onNavigate("focus")} className="glass tap-target mt-4 w-full rounded-full py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em]">
        Empezar un bloque de Focus
      </button>
    );
  }

  const hero = (
    <div className="panel-surface panel-surface-glow enter">
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] glow-dot" />
            <span className="eyebrow eyebrow-accent">{DIAS[jsDowToIndex(new Date().getDay())]} · Ahora</span>
          </div>
          <button
            onClick={() => onNavigate("horario")}
            className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-red)] uppercase tracking-[0.12em] transition-colors"
          >
            Ver horario <Icon name="arrow-right" size={12} className="ml-1 inline" />
          </button>
        </div>
        <h1 className="mt-3 font-[var(--font-display)] text-[24px] leading-tight tracking-tight">{blockTitle}</h1>
        {blockTime ? <div className="num mt-1 text-[12px] text-[var(--color-muted)]">{blockTime}</div> : null}
        {heroAction}
      </div>
      <div className="mt-4 border-t border-[var(--color-line)] px-4 py-3 text-[11.5px] leading-tight text-[var(--color-muted)]">
        {nextCell ? (
          <>
            Siguiente{nextRow?.time ? ` (${nextRow.time})` : ""}: <span className="font-semibold text-[var(--color-ink)]">{nextCell.text}</span>
          </>
        ) : (
          "Nada más por hoy en el horario."
        )}
      </div>
    </div>
  );

  const sundayCard =
    new Date().getDay() === 0 ? (
      <button
        onClick={() => {
          hintDatosTab("semana");
          onNavigate("datos");
        }}
        className="panel-surface panel-surface-glow enter flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div>
          <div className="eyebrow eyebrow-accent">Domingo</div>
          <div className="mt-1 font-[var(--font-display)] text-[14px] tracking-[0.04em]">Tu resumen de la semana</div>
          <div className="mt-0.5 text-[11px] text-[var(--color-muted)]">Entrenos, Focus, hábitos, sueño y peso contra la semana anterior.</div>
        </div>
        <Icon name="arrow-right" size={18} className="flex-none text-[var(--color-red)]" />
      </button>
    ) : null;

  const cards: Record<HomeCard, ReactNode> = {
    rings: <DayRings key="rings" habitsDone={habitsCompleted} habitsTotal={habitsTotal} slot={slot} />,

    session: (
      <div key="session" className={`panel-surface enter enter-delay-1 ${slot !== "rest" ? "panel-surface-glow" : ""}`}>
        <div className="px-4 pt-4 pb-3 border-b border-[var(--color-line)]">
          <div className="card-title">Sesión del día</div>
        </div>
        <div className="px-4 py-3">
          {slot === "rest" ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-[var(--color-line-strong)] flex items-center justify-center flex-none">
                  <span className="eyebrow text-[11px]">Z</span>
                </div>
                <div>
                  <div className="font-[var(--font-display)] text-[13px] tracking-[0.06em]">Descanso</div>
                  <div className="text-[11px] text-[var(--color-muted)] mt-0.5">Ciclo A → B → C → descanso. Hoy toca recuperar.</div>
                </div>
              </div>
              <Button variant="outline" onClick={openStartPrompt}>
                Elegir ciclo
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[var(--color-red)] flex items-center justify-center flex-none">
                  <span className="font-[var(--font-display)] text-[11px] text-white tracking-wide">{slot}</span>
                </div>
                <div>
                  <div className="font-[var(--font-display)] text-[13px] tracking-[0.06em]">{GYM_DIAS[slot].nombre}</div>
                  <div className="text-[11px] text-[var(--color-muted)] mt-0.5">{GYM_DIAS[slot].grupo}</div>
                </div>
              </div>
              <Button variant="primary" onClick={openStartPrompt}>
                Iniciar
              </Button>
            </div>
          )}
        </div>
      </div>
    ),

    streak: <DailyStreakCard key="streak" />,

    habits: (
      <div key="habits" className="panel-surface enter enter-delay-2">
        <div className="px-4 pt-4 pb-3 border-b border-[var(--color-line)] flex items-center justify-between">
          <div className="card-title">Hábitos de hoy</div>
          <span className="eyebrow">
            <span className="text-[var(--color-red)] not-italic">{habitsCompleted}</span>/{habitsTotal}
          </span>
        </div>
        <div className="px-4 py-3 grid grid-cols-2 gap-2">
          {habitList.map((h) => {
            const on = !!habitDay?.done.includes(h.key);
            return (
              <button
                key={h.key}
                onClick={() => checkHabit(h.key)}
                aria-pressed={on}
                className={`tap-target flex items-center gap-2.5 rounded-full px-3 py-2 text-left ${on ? "glass-on" : "glass"}`}
              >
                <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-full ${on ? "bg-[rgb(var(--fg-rgb)/0.22)] pop" : "bg-[rgb(var(--fg-rgb)/0.06)]"}`}>
                  <HabitGlyph icon={h.icon} active={on} activeColor="#fff" size={12} />
                </span>
                <span className={`text-[11px] font-semibold uppercase tracking-wide leading-tight ${on ? "text-white" : "text-[var(--color-muted)]"}`}>{h.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    ),

    stats: (
      <div key="stats" className="grid grid-cols-3 gap-2.5 enter enter-delay-3">
        <Stat
          label="Peso actual"
          value={lastWeight?.weightKg != null ? `${fromKg(lastWeight.weightKg, unit)}` : "—"}
          sub={weightDelta ? `${weightDelta > 0 ? "+" : ""}${fromKg(weightDelta, unit).toFixed(1)} ${unitLabel(unit)} desde inicio` : unitLabel(unit)}
          accent
        />
        <Stat label="Horas MoureDev" value={moureHours ?? 0} sub="acumuladas" />
        <Stat label="Hábitos" value={`${habitsCompleted}/${habitsTotal}`} sub="marcados hoy" />
      </div>
    ),

    verse: (
      <Card key="verse" className="enter enter-delay-4">
        <div className="flex items-center justify-between mb-3">
          <Eyebrow gold>Versículo del día</Eyebrow>
          <button
            onClick={() => onNavigate("kairos")}
            className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-gold)] uppercase tracking-[0.12em] transition-colors"
          >
            Oración <Icon name="arrow-right" size={12} className="ml-1 inline" />
          </button>
        </div>
        {verse ? (
          <div>
            <p className="text-[13px] leading-relaxed text-[var(--color-ink)]">{verse.text}</p>
            <div className="text-[10.5px] text-[var(--color-muted)] mt-2.5 num">
              {verse.bookName} {verse.chapter}:{verse.verse}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2" role="status" aria-label="Cargando versículo">
            <Skeleton className="h-3.5" />
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        )}
      </Card>
    ),
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Mascotas laterales (desktop, en el margen vacío junto al contenido) ── */}
      <img
        src="/images/berserk.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 left-2 z-[-1] hidden h-[62vh] max-w-[220px] object-contain object-bottom mix-blend-screen opacity-90 sidebar:block"
      />
      <img
        src="/images/mentzer.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 right-2 z-[-1] hidden h-[62vh] max-w-[220px] object-contain object-bottom mix-blend-screen opacity-90 sidebar:block"
      />

      {hero}
      {sundayCard}
      {homeOrder.map((k) => cards[k])}

      <button onClick={copyDailySummary} className="glass tap-target w-full rounded-full py-2.5 text-[11.5px] font-semibold uppercase tracking-wide">
        Copiar resumen del día
      </button>

      <Sheet open={startPrompt} onClose={() => setStartPrompt(false)} title="Empezar entreno">
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-[11px] text-[var(--color-muted)] mb-2 uppercase tracking-wide">¿Qué día vas a entrenar?</div>
            <div className="flex gap-2">
              {GYM_DAY_ORDER.map((d) => (
                <button
                  key={d}
                  onClick={() => setPickedDay(d)}
                  className={`flex-1 rounded-xl px-3 py-3 text-center ${
                    pickedDay === d ? "glass-on" : "glass text-[var(--color-muted)]"
                  }`}
                >
                  <div className="font-[var(--font-display)] text-[13px]">Día {d}</div>
                  <div className="text-[11px] mt-0.5">{GYM_DIAS[d].nombre}</div>
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] text-[var(--color-muted)] uppercase tracking-wide">Fecha</span>
            <DateField value={pickedDate} max={today} onChange={setPickedDate} />
          </label>
          <Button
            variant="primary"
            className="w-full py-3"
            onClick={() => {
              setStartPrompt(false);
              // Choosing today's day means "this is where I am in the cycle": remember it,
              // so leaving and coming back still says B (backfilled past dates don't move it).
              if (pickedDate === today && pickedDay !== slot) void setCycleSlot(pickedDay);
              onStartEntreno(pickedDay, pickedDate);
            }}
          >
            Comenzar
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
