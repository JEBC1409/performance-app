import { Icon } from "@/ui/Icon";
import { Skeleton } from "@/ui/Skeleton";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS } from "@/db/db";
import { useFirstDates, useLastWeight, useTodayActivity } from "@/hooks/useRecentActivity";
import { Card, Eyebrow, HabitGlyph, Button, Sheet, DateField } from "@/ui";
import { DailyStreakCard } from "./DailyStreakCard";
import { DayRings } from "./DayRings";
import { CloseDaySheet, PrioritiesCard } from "./PrioritiesCard";
import { InsightsCard } from "./InsightsCard";
import { DeloadCard } from "./DeloadCard";
import { MoodCard } from "./MoodCard";
import { WeekSummaryCard } from "./WeekSummaryCard";
import { pickHeroAction } from "./heroAction";
import { useUiPrefs } from "@/hooks/useUiPrefs";
import { useConfigVersion } from "@/hooks/useConfigVersion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePriorities } from "@/hooks/usePriorities";
import type { HomeCard } from "@/lib/uiPrefs";
import { planFor } from "@/lib/priorities";
import { useHabitDefs } from "@/hooks/useHabitDefs";
import { useMoureWeeks } from "@/hooks/useMoureWeeks";
import { GYM_DAY_ORDER, GYM_DIAS, targetSetsForDay } from "@/data/gym";
import { todayISO, DIAS, jsDowToIndex } from "@/lib/date";
import { currentBlockInfo } from "@/lib/scheduleBlock";
import { habitForBlock, toggleHabitDay } from "@/lib/habits";
import { celebrate, haptic } from "@/lib/feedback";
import { HORARIO } from "@/data/horario";
import { setCycleSlot, useCycleSlot } from "@/hooks/useCycle";
import { useVerseOfDay } from "@/hooks/useBible";
import { fromKg, unitLabel } from "@/lib/units";
import { buildDailySummary } from "@/lib/dailySummary";
import { showToast } from "@/ui/Toast";
import type { Tab } from "@/App";
import type { GymDay } from "@/lib/cycle";

/** Routine names are stored in capitals ("PUSH"); inside a sentence or a button they read as shouting. */
const sentence = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

/** The decorative side figures only fit in the empty margin of a wide window (the column is 1000px). */
const MASCOT_QUERY = "(min-width: 1180px)";
const MASCOT_CLASS =
  "pointer-events-none fixed bottom-0 z-[-1] h-[62vh] w-[calc((100vw-1000px)/2-16px)] max-w-[220px] object-contain object-bottom mix-blend-screen opacity-50";

export function Hoy({
  onStartEntreno,
  onNavigate,
}: {
  onStartEntreno: (day: GymDay, date: string) => void;
  onNavigate: (t: Tab) => void;
}) {
  const today = todayISO();
  const slot = useCycleSlot();
  const { homeOrder, calm } = useUiPrefs();
  const showMascots = useMediaQuery(MASCOT_QUERY) && !calm;
  useConfigVersion(); // routine / schedule edits re-render this screen
  const [startPrompt, setStartPrompt] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pickedDay, setPickedDay] = useState<GymDay>("A");
  const [pickedDate, setPickedDate] = useState(today);

  function openStartPrompt() {
    setPickedDay(slot === "rest" ? "A" : slot);
    setPickedDate(today);
    setStartPrompt(true);
  }
  // Today's habit row, the newest and the first weight: read once for the whole screen
  // (shared with the rings, streak, cycle and insights) instead of one query each.
  const todayData = useTodayActivity();
  const habitDay = todayData?.habitDays.find((h) => h.date === today);
  const setsToday = useMemo(() => todayData?.sets.filter((s) => s.date === today), [todayData, today]);
  const focusMin = useMemo(() => (todayData?.focus ?? []).filter((f) => f.date === today).reduce((a, f) => a + f.minutes, 0), [todayData, today]);
  const habitDefs = useHabitDefs();
  const priorities = usePriorities();
  const lastWeight = useLastWeight();
  const firstWeight = useFirstDates()?.weights;
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const unit = settings?.unit ?? DEFAULT_SETTINGS.unit;
  const moureWeeks = useMoureWeeks();
  const moureHours = moureWeeks ? Math.round(moureWeeks.reduce((a, r) => a + r.effectiveHours, 0) * 10) / 10 : undefined;
  const verse = useVerseOfDay();

  const info = currentBlockInfo();
  const row = info.rowIndex >= 0 ? HORARIO[info.rowIndex] : null;
  const nextRow =
    info.rowIndex >= 0 && info.rowIndex + 1 < HORARIO.length
      ? HORARIO[info.rowIndex + 1]
      : null;
  const nowCell = row ? row.cells[info.col] : null;
  const nextCell = nextRow ? nextRow.cells[info.col] : null;

  const weightDelta =
    lastWeight?.weightKg != null && firstWeight?.weightKg != null
      ? lastWeight.weightKg - firstWeight.weightKg
      : 0;

  const habitList = habitDefs ?? [];
  const habitsCompleted = habitList.filter((h) => habitDay?.done.includes(h.key)).length;
  const habitsTotal = habitList.length;
  const habitsLeft = habitsTotal - habitsCompleted;

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
      showToast("Resumen copiado — pégalo en tu chat de progreso");
    } catch {
      showToast("No se pudo copiar");
    }
  }

  function goToHabits() {
    const el = document.getElementById("hoy-habits");
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    el.querySelector<HTMLButtonElement>('button[aria-pressed="false"]')?.focus({ preventScroll: true });
  }

  const blockTitle = nowCell ? nowCell.text : "Bloque libre / fuera de horario";
  const blockTime = row ? row.time : null;

  // What counts as "training today": the day already being logged, else the cycle's day.
  const trainedDay: GymDay | null = setsToday?.[0]?.day ?? (slot === "rest" ? null : slot);
  // The session card names the day you are actually training: logging a set advances the cycle's own slot, which must not rename today's session.
  const shownDay: GymDay | "rest" = setsToday?.[0]?.day ?? slot;
  const setsDone = setsToday?.length ?? 0;
  const setsTarget = trainedDay ? targetSetsForDay(trainedDay) : 0;
  const restDay = slot === "rest" && setsDone === 0;
  const plan = planFor(priorities.state, today);
  const loaded = todayData !== undefined && habitDefs !== undefined;
  const trainName = sentence(GYM_DIAS[trainedDay ?? (slot === "rest" ? "A" : slot)].nombre);

  const heroKind = pickHeroAction({
    hasBlockHabit: !!blockHabit,
    blockType: nowCell?.type,
    blockQuiet: nowCell?.quiet,
    restDay,
    setsDone,
    setsTarget,
    habitsDone: habitsCompleted,
    habitsTotal,
    dayClosed: !!plan.close,
  });

  /** The one thing worth doing right now: a single primary button (never two on this screen). */
  let heroAction: ReactNode = null;
  if (!loaded) {
    heroAction = <Skeleton className="mt-4 h-11 w-full rounded-full" />;
  } else if (heroKind === "block-habit" && blockHabit) {
    heroAction = (
      <Button variant="primary" selected={blockHabitDone} onClick={() => checkHabit(blockHabit.key)} className="mt-4 w-full">
        {blockHabitDone ? (
          <>
            <Icon name="check" size={16} className="pop" /> {blockHabit.label} hecho
          </>
        ) : (
          <>Marcar {blockHabit.label}</>
        )}
      </Button>
    );
  } else if (heroKind === "train") {
    heroAction = (
      <Button variant="primary" className="mt-4 w-full" onClick={openStartPrompt}>
        {restDay ? "Elegir entreno" : setsDone > 0 ? `Continuar ${trainName}` : `Iniciar ${trainName}`}
      </Button>
    );
  } else if (heroKind === "focus") {
    heroAction = (
      <Button variant="primary" className="mt-4 w-full" onClick={() => onNavigate("focus")}>
        Empezar un bloque de Focus
      </Button>
    );
  } else if (heroKind === "habits") {
    heroAction = (
      <Button variant="primary" className="mt-4 w-full" onClick={goToHabits}>
        Marcar hábitos
      </Button>
    );
  } else if (heroKind === "close") {
    heroAction = (
      <Button variant="primary" className="mt-4 w-full" onClick={() => setClosing(true)}>
        Revisar y cerrar el día
      </Button>
    );
  } else {
    heroAction = (
      <p className="mt-4 flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <Icon name="check" size={16} className="text-[var(--color-good)]" /> Día cerrado. Buen trabajo.
      </p>
    );
  }

  const hero = (
    <div className="panel-surface panel-surface-glow enter">
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] glow-dot" />
            <span className="eyebrow eyebrow-accent">{DIAS[jsDowToIndex(new Date().getDay())]} · Ahora</span>
          </div>
          <button
            onClick={() => onNavigate("horario")}
            className="tap-target -my-2 -mr-2 inline-flex items-center gap-1 px-2 text-meta text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            Ver horario <Icon name="arrow-right" size={12} />
          </button>
        </div>
        <h1 className="mt-2 font-[var(--font-display)] text-screen font-semibold tracking-tight">{blockTitle}</h1>
        {blockTime ? <div className="num mt-1 text-sm text-[var(--color-muted)]">{blockTime}</div> : null}
        {heroAction}
      </div>
      <div className="mt-4 border-t border-[var(--color-line)] px-4 py-3 text-sm leading-tight text-[var(--color-muted)]">
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

  const sundayCard = <WeekSummaryCard onOpenDatos={() => onNavigate("datos")} />;

  const cards: Record<HomeCard, ReactNode> = {
    rings: <DayRings key="rings" habitsDone={habitsCompleted} habitsTotal={habitsTotal} slot={slot} />,

    session: (
      // Only the "Ahora" card above carries the accent glow and the primary button: two of either stop saying which one matters.
      <div key="session" className="panel-surface enter enter-delay-1 flex items-center gap-3 p-4">
        <div
          aria-hidden
          className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl font-[var(--font-display)] text-base font-semibold ${
            shownDay === "rest" ? "border border-[var(--color-line-strong)] text-[var(--color-muted)]" : "bg-[rgb(var(--accent-solid-rgb))] text-[color:var(--text-on-accent)]"
          }`}
        >
          {shownDay === "rest" ? "Z" : shownDay}
        </div>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">Sesión del día</div>
          {shownDay === "rest" ? (
            <>
              <div className="font-[var(--font-display)] text-base font-semibold leading-tight">Descanso</div>
              <div className="text-meta text-[var(--color-muted)]">Hoy toca recuperar. Ciclo A → B → C → descanso.</div>
            </>
          ) : (
            <>
              <div className="font-[var(--font-display)] text-base font-semibold leading-tight">{sentence(GYM_DIAS[shownDay].nombre)}</div>
              <div className="truncate text-meta text-[var(--color-muted)]">
                {setsDone > 0 ? `${setsDone}/${setsTarget} series hechas hoy` : GYM_DIAS[shownDay].grupo}
              </div>
            </>
          )}
        </div>
        <Button variant="secondary" onClick={openStartPrompt} className="flex-none">
          {shownDay === "rest" ? "Elegir ciclo" : setsDone > 0 ? "Continuar" : "Iniciar"}
        </Button>
      </div>
    ),

    priorities: <PrioritiesCard key="priorities" priorities={priorities} onCloseDay={() => setClosing(true)} />,

    insights: (
      <div key="insights" className="flex flex-col gap-4 empty:hidden">
        <MoodCard />
        <DeloadCard />
        <InsightsCard />
      </div>
    ),

    streak: <DailyStreakCard key="streak" />,

    habits: (
      <div key="habits" id="hoy-habits" className="panel-surface enter enter-delay-2 scroll-mt-4">
        <div className="px-4 pt-4 pb-3 border-b border-[var(--color-line)] flex items-center justify-between gap-3">
          <h2 className="card-title">Hábitos de hoy</h2>
          {/* The count itself is in the rings: here only what is still open. */}
          {habitsTotal > 0 ? (
            <span className={`num text-meta ${habitsLeft === 0 ? "font-semibold text-[var(--color-good)]" : "text-[var(--color-muted)]"}`}>
              {habitsLeft === 0 ? "Todos hechos" : habitsLeft === 1 ? "Falta 1" : `Faltan ${habitsLeft}`}
            </span>
          ) : null}
        </div>
        {habitDefs && !habitList.length ? (
          <p className="px-4 py-4 text-sm text-[var(--color-muted)]">Aún no tienes hábitos. Créalos en Perfil, en Hábitos y avisos, y aparecerán aquí para marcarlos con un toque.</p>
        ) : (
          <div className="px-4 py-3 grid grid-cols-2 gap-2">
            {habitList.map((h) => {
              const on = !!habitDay?.done.includes(h.key);
              return (
                <button
                  key={h.key}
                  onClick={() => checkHabit(h.key)}
                  aria-pressed={on}
                  className="glass tap-target flex items-center gap-2.5 rounded-2xl px-3 py-2 text-left"
                >
                  <span
                    aria-hidden
                    className={`flex h-7 w-7 flex-none items-center justify-center rounded-full ${
                      on ? "bg-[rgb(var(--accent-solid-rgb))] text-[color:var(--text-on-accent)] pop" : "bg-[rgb(var(--fg-rgb)/0.08)]"
                    }`}
                  >
                    {on ? <Icon name="check" size={14} /> : <HabitGlyph icon={h.icon} size={12} />}
                  </span>
                  <span className="text-sm font-medium leading-tight">{h.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    ),

    // Habits live in the rings and in their own card; weight and MoureDev hours are the two numbers that only show up here.
    stats: (
      <div key="stats" className="panel-surface enter enter-delay-3 grid grid-cols-2 divide-x divide-[var(--color-line)]">
        <div className="flex flex-col gap-1 p-4">
          <div className="eyebrow">Peso actual</div>
          <div className="num font-[var(--font-display)] text-title font-semibold leading-none text-[var(--color-accent-text)]">
            {lastWeight?.weightKg != null ? `${fromKg(lastWeight.weightKg, unit)} ${unitLabel(unit)}` : "—"}
          </div>
          <div className="text-meta leading-tight text-[var(--color-muted)]">
            {lastWeight?.weightKg == null
              ? "Sin registros todavía"
              : weightDelta
                ? `${weightDelta > 0 ? "+" : "−"}${Math.abs(fromKg(weightDelta, unit)).toFixed(1)} ${unitLabel(unit)} desde inicio`
                : "Igual que al inicio"}
          </div>
        </div>
        <div className="flex flex-col gap-1 p-4">
          <div className="eyebrow">Horas MoureDev</div>
          <div className="num font-[var(--font-display)] text-title font-semibold leading-none">{moureHours ?? 0} h</div>
          <div className="text-meta leading-tight text-[var(--color-muted)]">acumuladas</div>
        </div>
      </div>
    ),

    verse: (
      <Card key="verse" className="enter enter-delay-4">
        <div className="flex items-center justify-between mb-3">
          <Eyebrow gold>Versículo del día</Eyebrow>
          <button
            onClick={() => onNavigate("kairos")}
            className="tap-target -my-2 -mr-2 inline-flex items-center gap-1 px-2 text-meta text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            Ir a Oración <Icon name="arrow-right" size={12} />
          </button>
        </div>
        {verse ? (
          <div>
            <p className="text-base leading-relaxed text-[var(--color-ink)]">{verse.text}</p>
            <div className="text-meta text-[var(--color-muted)] mt-2.5 num">
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
      {/* Side figures: only where there is a real empty margin (wide window, not in calm mode), so a phone never downloads them. */}
      {showMascots ? (
        <>
          <img src="/images/berserk.jpg" alt="" aria-hidden="true" loading="lazy" decoding="async" className={`${MASCOT_CLASS} left-2`} />
          <img src="/images/mentzer.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" className={`${MASCOT_CLASS} right-2`} />
        </>
      ) : null}

      {hero}
      {sundayCard}
      {/* One column on a phone; on a wide screen the cards flow into two, in order, instead of leaving half the window empty. */}
      <div className="flex flex-col gap-4 lg:block lg:columns-2 lg:gap-4 lg:[&>*]:mb-4 lg:[&>*]:break-inside-avoid lg:[&>*]:inline-block lg:[&>*]:w-full">
        {homeOrder.map((k) => cards[k])}
      </div>

      <Button variant="ghost" onClick={copyDailySummary} className="w-full">
        Copiar resumen del día
      </Button>

      <CloseDaySheet
        open={closing}
        onClose={() => setClosing(false)}
        priorities={priorities}
        habitsDone={habitsCompleted}
        habitsTotal={habitsTotal}
        focusMin={focusMin}
      />

      <Sheet open={startPrompt} onClose={() => setStartPrompt(false)} title="Empezar entreno">
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 text-sm text-[var(--color-muted)]">¿Qué día vas a entrenar?</div>
            <div className="flex gap-2">
              {GYM_DAY_ORDER.map((d) => (
                <button
                  key={d}
                  onClick={() => setPickedDay(d)}
                  aria-pressed={pickedDay === d}
                  className="glass tap-target flex-1 rounded-xl px-3 py-3 text-center"
                >
                  <div className="font-[var(--font-display)] text-sm font-semibold">Día {d}</div>
                  <div className="mt-0.5 text-meta">{sentence(GYM_DIAS[d].nombre)}</div>
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-[var(--color-muted)]">Fecha</span>
            <DateField value={pickedDate} max={today} onChange={setPickedDate} />
          </label>
          <Button
            variant="primary"
            className="w-full"
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
