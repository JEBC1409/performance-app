import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { HABIT_LIST, type HabitDef } from "@/data/habits";
import { RUTINA_MATUTINA } from "@/data/gym";
import { Card, Eyebrow, HabitGlyph, FlameGlyph, BarChart } from "@/ui";
import { daysInMonth, pad2, todayISO, MESES } from "@/lib/date";
import { currentStreak } from "@/lib/streak";

export function Habitos() {
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

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
        const value = row ? HABIT_LIST.filter((h) => row[h.key]).length : 0;
        return { label: String(d), value, highlight: isCurrentMonth && d === new Date().getDate() };
      }),
    [nDays, year, month, byDate, isCurrentMonth]
  );

  async function toggle(date: string, key: HabitDef["key"]) {
    const existing = byDate.get(date) ?? { date, sleep: false, water: false, meals: false, nophone: false };
    await db.habitDays.put({ ...existing, [key]: !existing[key] });
  }

  return (
    <div className="flex flex-col gap-4 enter">
      <div>
        <Eyebrow>Hábitos</Eyebrow>
        <h1 className="font-[var(--font-display)] text-xl mt-1.5">Hoy</h1>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <Eyebrow accent>Consistencia del mes</Eyebrow>
          <span className="text-[10.5px] text-[var(--color-muted)] num">de {HABIT_LIST.length} hábitos/día</span>
        </div>
        <div className="mt-3">
          <BarChart
            points={monthlyTotals}
            goalLine={HABIT_LIST.length}
            unit={`${MESES[month]} · barra = hábitos marcados ese día`}
          />
        </div>
      </Card>

      <div className="grid grid-cols-2 sidebar:grid-cols-4 gap-2.5">
        {HABIT_LIST.map((h) => {
          const streak = currentStreak(allRows ?? [], h.key);
          const doneToday = !!todayRow?.[h.key];
          return (
            <div key={h.key} className={`panel-surface p-3.5 flex flex-col gap-2.5 ${streak > 0 ? "panel-surface-glow" : ""}`}>
              <div className="flex items-center gap-2">
                <HabitGlyph icon={h.icon} active={doneToday} size={11} />
                <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-muted)] leading-tight">{h.label}</span>
              </div>
              <div className="mt-auto flex items-end gap-1.5">
                <FlameGlyph size={20} className={streak > 0 ? "flame-glow" : "text-[var(--color-muted-2)]"} />
                <span className={`num text-xl font-bold leading-none ${streak > 0 ? "text-[var(--color-ink)]" : "text-[var(--color-muted-2)]"}`}>
                  {streak}
                </span>
                <span className="text-[9.5px] text-[var(--color-muted-2)] uppercase pb-0.5">{streak === 1 ? "día" : "días"}</span>
              </div>
            </div>
          );
        })}
      </div>

      <Card padded={false}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-line)]">
          <div className="text-[13px] font-semibold capitalize">
            {MESES[month]} {year}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setMonthDate(new Date(year, month - 1, 1))}
              className="w-7 h-7 rounded-full border border-[var(--color-line-strong)] flex items-center justify-center hover:border-[var(--color-red)]"
              aria-label="Mes anterior"
            >
              ‹
            </button>
            <button
              onClick={() => setMonthDate(new Date(year, month + 1, 1))}
              className="w-7 h-7 rounded-full border border-[var(--color-line-strong)] flex items-center justify-center hover:border-[var(--color-red)]"
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="sticky left-0 bg-[var(--color-surface)] text-left px-3 py-2 text-[var(--color-muted)] font-semibold">Hábito</th>
                {Array.from({ length: nDays }, (_, i) => i + 1).map((d) => (
                  <th
                    key={d}
                    className={`num px-0 py-2 text-center font-medium w-6 ${isCurrentMonth && d === new Date().getDate() ? "text-[var(--color-red)]" : "text-[var(--color-muted-2)]"}`}
                  >
                    {d}
                  </th>
                ))}
                <th className="num px-2 py-2 text-[var(--color-muted)]">Total</th>
              </tr>
            </thead>
            <tbody>
              {HABIT_LIST.map((h) => {
                let total = 0;
                return (
                  <tr key={h.key} className="border-t border-[var(--color-line)]">
                    <td className="sticky left-0 bg-[var(--color-surface)] px-3 py-1.5 font-semibold whitespace-nowrap flex items-center gap-1.5">
                      <HabitGlyph icon={h.icon} />
                      {h.label}
                    </td>
                    {Array.from({ length: nDays }, (_, i) => i + 1).map((d) => {
                      const date = `${year}-${pad2(month + 1)}-${pad2(d)}`;
                      const on = !!byDate.get(date)?.[h.key];
                      if (on) total++;
                      const isToday = isCurrentMonth && d === new Date().getDate();
                      return (
                        <td key={d} className={`p-0 text-center ${isToday ? "shadow-[inset_0_0_0_1px_#df2531]" : ""}`}>
                          <button
                            onClick={() => toggle(date, h.key)}
                            className={`w-6 h-6 ${on ? "bg-[var(--color-red-soft)]" : ""}`}
                            aria-label={`${h.label} ${date}`}
                          >
                            {on ? <span className="text-[var(--color-red)] text-[11px]">✓</span> : null}
                          </button>
                        </td>
                      );
                    })}
                    <td className="num text-center px-2 text-[var(--color-muted)]">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <Eyebrow>Rutina matutina · 7 min en ayunas</Eyebrow>
        <div className="mt-3 flex flex-col divide-y divide-[var(--color-line)]">
          {RUTINA_MATUTINA.map((r) => (
            <div key={r.ex} className="py-2.5 flex items-start justify-between gap-3">
              <div>
                <div className="text-[13px] font-medium">{r.ex}</div>
                <div className="text-[11px] text-[var(--color-muted)] mt-0.5">{r.nota}</div>
              </div>
              <div className="num text-[12px] text-[var(--color-red)] flex-none">
                {r.series}×{r.carga}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
