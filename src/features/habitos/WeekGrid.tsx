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
      <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
        <div>
          <div className="text-[13px] font-semibold">
            {shortDate(days[0])} – {shortDate(days[6])}
          </div>
          <div className="text-[12px] text-[var(--color-muted)]">{thisWeek ? "Esta semana" : "Semana"}</div>
        </div>
        <div className="flex gap-2">
          {thisWeek ? null : (
            <button onClick={() => setStart(startOfWeek(today))} className="glass hit rounded-full px-3 text-[12px] font-semibold">
              Hoy
            </button>
          )}
          <button onClick={() => setStart(addDays(start, -7))} className="glass hit flex h-9 w-9 items-center justify-center rounded-full" aria-label="Semana anterior">
            <Icon name="chevron-left" size={14} />
          </button>
          <button onClick={() => setStart(addDays(start, 7))} className="glass hit flex h-9 w-9 items-center justify-center rounded-full" aria-label="Semana siguiente">
            <Icon name="chevron-right" size={14} />
          </button>
        </div>
      </div>

      <div className="px-3 pb-3 pt-2">
        <div className="grid grid-cols-7 gap-1.5 px-0.5 pb-1 text-center">
          {days.map((d, i) => (
            <div key={d} className={`num text-[12px] leading-tight ${d === today ? "font-semibold text-[var(--color-red-ink)]" : "text-[var(--color-muted)]"}`}>
              {LETTERS[i]}
              <div className="text-[12px] opacity-80">{parseISODate(d).getDate()}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {habits.map((h) => {
            const total = days.filter((d) => byDate.get(d)?.done.includes(h.key)).length;
            return (
              <div key={h.key}>
                <div className="mb-1.5 flex items-center justify-between px-0.5 text-[13px] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <HabitGlyph icon={h.icon} />
                    {h.label}
                  </span>
                  <span className="num text-[12px] font-medium text-[var(--color-muted)]">{total}/7</span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {days.map((d) => {
                    const on = !!byDate.get(d)?.done.includes(h.key);
                    return (
                      <button
                        key={d}
                        onClick={() => onToggle(d, h.key)}
                        aria-pressed={on}
                        aria-label={`${h.label} ${d}`}
                        className={`flex h-11 items-center justify-center rounded-xl border transition-colors ${
                          on
                            ? "border-transparent bg-[var(--color-red)]"
                            : d === today
                              ? "border-[var(--color-red)]/50 bg-[var(--color-red-soft)]/10"
                              : "border-[var(--color-line)] bg-[rgb(var(--fg-rgb)/0.02)]"
                        }`}
                      >
                        {on ? <Icon name="check" size={16} className="text-white" /> : null}
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
