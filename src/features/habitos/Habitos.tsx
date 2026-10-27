import { Icon } from "@/ui/Icon";
import { toggleHabitDay } from "@/lib/habits";
import { haptic } from "@/lib/feedback";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type HabitDefRecord } from "@/db/db";
import { useHabitDefs } from "@/hooks/useHabitDefs";
import { RUTINA_MATUTINA } from "@/data/gym";
import { Button, Card, PageHeader, HabitGlyph, FlameGlyph, BarChart } from "@/ui";
import { showToast } from "@/ui/Toast";
import { daysInMonth, pad2, parseISODate, todayISO, MESES } from "@/lib/date";
import { currentStreak } from "@/lib/streak";
import { useMorningRoutine } from "@/hooks/useMorningRoutine";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { GuidedRoutine } from "./GuidedRoutine";
import { WeekGrid } from "./WeekGrid";

const EMPTY_HABITS: HabitDefRecord[] = [];
/** Same width as the `sidebar:` breakpoint: from here on the whole month fits as a table. */
const WIDE_QUERY = "(min-width: 900px)";
/** With fewer days marked than this the monthly chart has nothing to compare yet. */
const MIN_CHART_DAYS = 7;

const shortLabel = (date: string) => parseISODate(date).toLocaleDateString("es-CO", { day: "numeric", month: "short" }).replace(".", "");

export function Habitos() {
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const habitDefs = useHabitDefs();
  const routine = useMorningRoutine();
  const [guided, setGuided] = useState(false);
  const wide = useMediaQuery(WIDE_QUERY);
  const [chartOpen, setChartOpen] = useState<boolean | null>(null);
  const habitList = habitDefs ?? EMPTY_HABITS;

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const nDays = daysInMonth(year, month);
  const today = todayISO();
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();

  const monthRows = useLiveQuery(async () => {
    const start = `${year}-${pad2(month + 1)}-01`;
    const end = `${year}-${pad2(month + 1)}-${pad2(nDays)}`;
    return db.habitDays.where("date").between(start, end, true, true).toArray();
  }, [year, month]);

  const allRows = useLiveQuery(() => db.habitDays.toArray(), []);
  const byDate = useMemo(() => new Map((monthRows ?? []).map((r) => [r.date, r])), [monthRows]);
  const todayRow = useMemo(() => allRows?.find((r) => r.date === today), [allRows, today]);

  const monthlyTotals = useMemo(
    () =>
      Array.from({ length: nDays }, (_, i) => {
        const d = i + 1;
        const date = `${year}-${pad2(month + 1)}-${pad2(d)}`;
        const row = byDate.get(date);
        const value = row ? habitList.filter((h) => row.done.includes(h.key)).length : 0;
        return { label: String(d), value, highlight: isCurrentMonth && d === new Date().getDate() };
      }),
    [nDays, year, month, byDate, isCurrentMonth, habitList]
  );

  async function toggle(date: string, key: string) {
    if (await toggleHabitDay(date, key)) haptic();
  }

  const doneToday = habitList.filter((h) => todayRow?.done.includes(h.key)).length;
  const streaks = habitList.map((h) => ({ h, streak: currentStreak(allRows ?? [], h.key), done: !!todayRow?.done.includes(h.key) }));
  const anyStreak = streaks.some((x) => x.streak > 0);
  const daysWithData = (monthRows ?? []).filter((r) => r.done.length > 0).length;
  const chartShown = chartOpen ?? daysWithData >= MIN_CHART_DAYS;
  const rawDate = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
  const dateLabel = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
  const monthDays = Array.from({ length: nDays }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-4 enter">
      <PageHeader
        eyebrow={dateLabel}
        title="Hábitos"
        subtitle={
          habitList.length ? (
            <>
              Hoy: <span className="num font-semibold text-[var(--color-ink)]">{doneToday}</span> de {habitList.length} marcados
            </>
          ) : habitDefs ? (
            "Aún no tienes hábitos. Créalos en Perfil, en Hábitos y avisos."
          ) : undefined
        }
      />

      {/* What you come here to do first: tick today's habits, in the week (phone) or in the whole month (wide screen). */}
      <Card padded={false}>
        {!wide ? (
          <WeekGrid habits={habitList} onToggle={toggle} />
        ) : (
          <div>
            <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
              <div className="card-title capitalize">
                {MESES[month]} {year}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setMonthDate(new Date(year, month - 1, 1))} className="glass flex h-11 w-11 items-center justify-center rounded-full" aria-label="Mes anterior">
                  <Icon name="chevron-left" size={16} />
                </button>
                <button onClick={() => setMonthDate(new Date(year, month + 1, 1))} className="glass flex h-11 w-11 items-center justify-center rounded-full" aria-label="Mes siguiente">
                  <Icon name="chevron-right" size={16} />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto px-1 pb-1">
              <table className="w-full text-meta" style={{ borderCollapse: "separate", borderSpacing: "3px 4px" }}>
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-[var(--color-surface)] px-3 py-2 text-left font-semibold text-[var(--color-muted)]">Hábito</th>
                    {monthDays.map((d) => (
                      <th
                        key={d}
                        className={`num w-8 px-0 pb-1 text-center font-medium ${isCurrentMonth && d === new Date().getDate() ? "font-semibold text-[var(--color-accent-text)]" : "text-[var(--color-muted)]"}`}
                      >
                        {d}
                      </th>
                    ))}
                    <th className="num px-2 py-2 text-[var(--color-muted)]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {habitList.map((h) => {
                    let total = 0;
                    return (
                      <tr key={h.key}>
                        <td className="sticky left-0 whitespace-nowrap bg-[var(--color-surface)] px-3 py-1 text-sm font-semibold">
                          <span className="flex items-center gap-2">
                            <HabitGlyph icon={h.icon} size={11} />
                            {h.label}
                          </span>
                        </td>
                        {monthDays.map((d) => {
                          const date = `${year}-${pad2(month + 1)}-${pad2(d)}`;
                          const on = !!byDate.get(date)?.done.includes(h.key);
                          if (on) total++;
                          const isToday = isCurrentMonth && d === new Date().getDate();
                          return (
                            <td key={d} className="p-0 text-center">
                              <button
                                onClick={() => toggle(date, h.key)}
                                className={`group flex h-8 w-8 items-center justify-center rounded-[7px] border transition-colors ${
                                  on
                                    ? "border-transparent bg-[rgb(var(--accent-solid-rgb))] text-[color:var(--text-on-accent)]"
                                    : isToday
                                      ? "border-[var(--color-accent-text)] bg-[rgb(var(--accent-rgb)/0.1)] hover:bg-[rgb(var(--accent-rgb)/0.2)]"
                                      : "border-[var(--color-line)] bg-[rgb(var(--fg-rgb)/0.02)] hover:border-[var(--color-accent-text)] hover:bg-[rgb(var(--accent-rgb)/0.1)]"
                                }`}
                                aria-pressed={on}
                                aria-label={`${h.label}, ${shortLabel(date)}`}
                              >
                                {on ? <Icon name="check" size={13} /> : <span className="h-1 w-1 rounded-full bg-[var(--color-muted-2)] opacity-0 transition-opacity group-hover:opacity-70" />}
                              </button>
                            </td>
                          );
                        })}
                        <td className="num px-2 text-center text-[var(--color-muted)]">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Streaks: four zeros say nothing, so with none running it is one line on how to start one. */}
      {habitList.length ? (
        anyStreak ? (
          <section aria-label="Rachas" className="grid grid-cols-2 gap-2.5 sidebar:grid-cols-4">
            {streaks.map(({ h, streak, done }) => (
              <div key={h.key} className={`panel-surface flex flex-col gap-2.5 p-3.5 ${streak > 0 ? "panel-surface-glow" : ""}`}>
                <div className="flex items-center gap-2">
                  <HabitGlyph icon={h.icon} active={done} size={11} activeColor="var(--color-accent-text)" />
                  <span className="text-sm font-medium leading-tight">{h.label}</span>
                </div>
                <div className="mt-auto flex items-end gap-1.5">
                  <FlameGlyph size={20} className={streak > 0 ? "flame-glow" : "text-[var(--color-muted-2)]"} />
                  <span className={`num text-title font-bold leading-none ${streak > 0 ? "text-[var(--color-ink)]" : "text-[var(--color-muted)]"}`}>{streak}</span>
                  <span className="pb-0.5 text-meta text-[var(--color-muted)]">{streak === 1 ? "día" : "días"}</span>
                </div>
              </div>
            ))}
          </section>
        ) : (
          <div className="panel-surface flex items-center gap-3 p-4">
            <FlameGlyph size={24} className="flex-none text-[var(--color-muted-2)]" />
            <div className="min-w-0">
              <h2 className="card-title">Rachas</h2>
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">Ninguna activa todavía. Marca un hábito hoy y mañana otra vez: así empieza una.</p>
            </div>
          </div>
        )
      ) : null}

      {/* The month at a glance; folded while there are fewer than a week of marked days to compare. */}
      <Card>
        <button onClick={() => setChartOpen(!chartShown)} aria-expanded={chartShown} className="tap-target -my-2 flex w-full items-center justify-between gap-3 text-left">
          <span>
            <span className="card-title block">Consistencia del mes</span>
            <span className="text-meta text-[var(--color-muted)]">
              {chartShown
                ? `de ${habitList.length} hábitos/día`
                : daysWithData === 0
                  ? "Aún sin días marcados este mes"
                  : `${daysWithData} ${daysWithData === 1 ? "día marcado" : "días marcados"}: se ve mejor con ${MIN_CHART_DAYS}`}
            </span>
          </span>
          <Icon name="chevron-right" size={16} className={`flex-none text-[var(--color-muted)] transition-transform duration-200 ${chartShown ? "rotate-90" : ""}`} />
        </button>
        {chartShown ? (
          <div className="mt-3">
            <BarChart points={monthlyTotals} goalLine={habitList.length} unit={`${MESES[month]} · barra = hábitos marcados ese día`} />
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="card-title">Rutina matutina · 7 min en ayunas</h2>
          {routine.doneToday ? (
            <span className="inline-flex flex-none items-center gap-1 text-meta font-semibold text-[var(--color-good)]">
              <Icon name="check" size={13} /> Hecha hoy
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-col divide-y divide-[var(--color-line)]">
          {RUTINA_MATUTINA.map((r) => (
            <div key={r.ex} className="flex items-start justify-between gap-3 py-2.5">
              <div>
                <div className="text-sm font-medium">{r.ex}</div>
                <div className="mt-0.5 text-meta text-[var(--color-muted)]">{r.nota}</div>
              </div>
              <div className="num flex-none text-meta text-[var(--color-accent-text)]">
                {r.series}×{r.carga}
              </div>
            </div>
          ))}
        </div>
        <Button variant="primary" className="mt-3 w-full" onClick={() => setGuided(true)}>
          {routine.doneToday ? "Hacerla otra vez, guiada" : "Empezar guiada"}
        </Button>
      </Card>

      <GuidedRoutine
        open={guided}
        onClose={() => setGuided(false)}
        onFinish={async () => {
          await routine.markDone();
          setGuided(false);
          showToast("Rutina matutina registrada");
        }}
      />
    </div>
  );
}
