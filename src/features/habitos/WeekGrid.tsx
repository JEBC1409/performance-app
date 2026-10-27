import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type HabitDefRecord } from "@/db/db";
import { HabitGlyph } from "@/ui";
import { Icon } from "@/ui/Icon";
import { addDays, parseISODate, startOfWeek, todayISO } from "@/lib/date";

const LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

const shortDate = (iso: string) => parseISODate(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" }).replace(".", "");

/** The habits grid for phones: one week at a time, so seven big cells fit the
 * screen instead of a month you have to slide sideways through. */
export function WeekGrid({ habits, onToggle }: { habits: HabitDefRecord[]; onToggle: (date: string, key: string) => void }) {
  const today = todayISO();
  const [start, setStart] = useState(() => startOfWeek(today));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const rows = useLiveQuery(() => db.habitDays.where("date").between(days[0], days[6], true, true).toArray(), [days]);
  const byDate = useMemo(() => new Map((rows ?? []).map((r) => [r.date, r])), [rows]);
  const thisWeek = start === startOfWeek(today);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-line)] px-4 py-3">
        <div className="min-w-0">
          <div className="card-title">
            {shortDate(days[0])} – {shortDate(days[6])}
          </div>
          <div className="text-meta text-[var(--color-muted)]">{thisWeek ? "Esta semana" : "Otra semana"}</div>
        </div>
        <div className="flex flex-none items-center gap-2">
          {thisWeek ? null : (
            <button onClick={() => setStart(startOfWeek(today))} className="glass tap-target rounded-full px-4 text-sm font-semibold">
              Hoy
            </button>
          )}
          <button onClick={() => setStart(addDays(start, -7))} className="glass flex h-11 w-11 items-center justify-center rounded-full" aria-label="Semana anterior">
            <Icon name="chevron-left" size={16} />
          </button>
          <button onClick={() => setStart(addDays(start, 7))} className="glass flex h-11 w-11 items-center justify-center rounded-full" aria-label="Semana siguiente">
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      </div>

      <div className="px-2 pb-3 pt-3">
        {/* Seven columns of ≥44px: the day letters sit over the same grid as the cells, so a column reads top to bottom. */}
        <div className="grid grid-cols-7 gap-1 pb-1 text-center">
          {days.map((d, i) => (
            <div key={d} aria-current={d === today ? "date" : undefined} className={`num text-meta leading-tight ${d === today ? "font-semibold text-[var(--color-accent-text)]" : "text-[var(--color-muted)]"}`}>
              {LETTERS[i]}
              <div className="text-sm">{parseISODate(d).getDate()}</div>
              <span aria-hidden className={`mx-auto mt-0.5 block h-0.5 w-4 rounded-full ${d === today ? "bg-[var(--color-accent-text)]" : "bg-transparent"}`} />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {habits.map((h) => {
            const total = days.filter((d) => byDate.get(d)?.done.includes(h.key)).length;
            return (
              <div key={h.key}>
                <div className="mb-1.5 flex items-center justify-between px-1 text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <HabitGlyph icon={h.icon} size={11} />
                    {h.label}
                  </span>
                  <span className="num text-meta font-medium text-[var(--color-muted)]">{total}/7</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {days.map((d) => {
                    const on = !!byDate.get(d)?.done.includes(h.key);
                    return (
                      <button
                        key={d}
                        onClick={() => onToggle(d, h.key)}
                        aria-pressed={on}
                        aria-label={`${h.label}, ${shortDate(d)}`}
                        className={`hit flex h-11 items-center justify-center rounded-xl border transition-colors ${
                          on
                            ? "border-transparent bg-[rgb(var(--accent-solid-rgb))] text-[color:var(--text-on-accent)]"
                            : d === today
                              ? "border-[var(--color-accent-text)] bg-[rgb(var(--accent-rgb)/0.1)]"
                              : "border-[var(--color-line-strong)] bg-[rgb(var(--fg-rgb)/0.03)]"
                        }`}
                      >
                        {on ? <Icon name="check" size={16} /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
