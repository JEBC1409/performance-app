import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Card, Eyebrow, Stat, Button, BarChart, type BarPoint } from "@/ui";
import { num } from "@/lib/date";
import { MOUREDEV_TARGET_LABEL, MOUREDEV_GOAL_HOURS_PER_WEEK } from "@/data/mouredev";

const DEV_TOOLS = [
  { label: "Python Docs", url: "https://docs.python.org/es/3/" },
  { label: "Real Python", url: "https://realpython.com" },
  { label: "PyPI", url: "https://pypi.org" },
  { label: "GitHub", url: "https://github.com" },
  { label: "VS Code", url: "https://code.visualstudio.com" },
  { label: "freeCodeCamp", url: "https://www.freecodecamp.org" },
  { label: "Stack Overflow", url: "https://stackoverflow.com" },
  { label: "LeetCode", url: "https://leetcode.com" },
];

export function Mouredev() {
  const weeks = useLiveQuery(() => db.moureWeeks.orderBy("week").toArray(), []);

  const totalHours = (weeks ?? []).reduce((a, r) => a + (num(r.hours) ?? 0), 0);
  const doneWeeks = (weeks ?? []).filter((w) => w.done).length;

  const hourPoints: BarPoint[] = useMemo(
    () =>
      (weeks ?? [])
        .filter((w) => w.hours != null)
        .map((w) => ({ label: `S${w.week}`, value: w.hours!, highlight: w.done })),
    [weeks]
  );

  async function patch(week: number, fields: Partial<{ date: string; topic: string; hours: number | null; project: string }>) {
    await db.moureWeeks.update(week, fields);
  }

  async function toggleDone(week: number, done: boolean) {
    await db.moureWeeks.update(week, { done: !done });
  }

  async function addWeek() {
    const last = weeks?.[weeks.length - 1];
    const week = (last?.week ?? 0) + 1;
    await db.moureWeeks.add({ week, date: "", topic: "", hours: null, project: "", done: false });
  }

  return (
    <>
      {/* ── Decoración lateral (desktop) — fuera del contenedor "enter" para
         no quedar atrapada por su transform (ver nota en Kairos.tsx). */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-1/3 z-[-1] hidden -rotate-6 select-none font-mono text-[170px] font-bold leading-none text-[var(--color-red)] opacity-[0.07] sidebar:block"
      >
        {"</>"}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed right-2 bottom-16 z-[-1] hidden rotate-6 select-none font-mono text-[150px] font-bold leading-none text-[var(--color-red)] opacity-[0.07] sidebar:block"
      >
        {"{ }"}
      </div>

      <div className="flex flex-col gap-4 enter">
        <div>
          <Eyebrow>MoureDev</Eyebrow>
          <h1 className="font-[var(--font-display)] text-xl mt-1.5">Ruta Python</h1>
          <div className="text-[11.5px] text-[var(--color-muted)] mt-1">{MOUREDEV_TARGET_LABEL} · ~{MOUREDEV_GOAL_HOURS_PER_WEEK}h/semana</div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Stat label="Horas totales" value={totalHours} sub={`de ~${MOUREDEV_GOAL_HOURS_PER_WEEK}h/semana`} accent />
          <Stat label="Semanas completas" value={`${doneWeeks} / ${weeks?.length ?? 24}`} />
        </div>

        {hourPoints.length ? (
          <Card>
            <Eyebrow accent>Horas por semana</Eyebrow>
            <div className="mt-3">
              <BarChart points={hourPoints} height={100} goalLine={MOUREDEV_GOAL_HOURS_PER_WEEK} unit="horas registradas" />
            </div>
          </Card>
        ) : null}

        <Card>
          <Eyebrow accent>Herramientas para el desarrollador</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEV_TOOLS.map((t) => (
              <a
                key={t.label}
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-[var(--color-line-strong)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-muted)] transition-colors hover:border-[var(--color-red)] hover:text-[var(--color-red)]"
              >
                {t.label}
              </a>
            ))}
          </div>
        </Card>

        <Card padded={false} className="panel-surface-glow">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px] min-w-[560px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-[var(--color-muted)] border-b border-[var(--color-line)]">
                  <th className="text-left px-3 py-2.5">Sem</th>
                  <th className="text-left px-2 py-2.5">Fecha</th>
                  <th className="text-left px-2 py-2.5">Tema / módulo</th>
                  <th className="text-left px-2 py-2.5">Horas</th>
                  <th className="text-left px-2 py-2.5">Proyecto</th>
                  <th className="text-center px-2 py-2.5">✓</th>
                </tr>
              </thead>
              <tbody>
                {(weeks ?? []).map((w) => (
                  <tr key={w.week} className={`border-t border-[var(--color-line)] ${w.done ? "bg-[var(--color-good-soft)]" : ""}`}>
                    <td className="num px-3 py-1.5 text-[var(--color-muted)]">{w.week}</td>
                    <td className="px-1 py-1.5">
                      <input
                        type="date"
                        defaultValue={w.date}
                        onBlur={(e) => patch(w.week, { date: e.target.value })}
                        className="bg-transparent px-1.5 py-1 text-[11.5px] outline-none focus:bg-[var(--color-surface-2)] focus:rounded-lg w-[130px]"
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      <input
                        defaultValue={w.topic}
                        onBlur={(e) => patch(w.week, { topic: e.target.value })}
                        placeholder="Tema"
                        className="bg-transparent px-1.5 py-1 text-[11.5px] outline-none focus:bg-[var(--color-surface-2)] focus:rounded-lg w-full min-w-[160px]"
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      <input
                        defaultValue={w.hours ?? ""}
                        onBlur={(e) => patch(w.week, { hours: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="0"
                        inputMode="decimal"
                        className="num bg-transparent px-1.5 py-1 text-[11.5px] outline-none focus:bg-[var(--color-surface-2)] focus:rounded-lg w-14"
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      <input
                        defaultValue={w.project}
                        onBlur={(e) => patch(w.week, { project: e.target.value })}
                        placeholder="Proyecto"
                        className="bg-transparent px-1.5 py-1 text-[11.5px] outline-none focus:bg-[var(--color-surface-2)] focus:rounded-lg w-full min-w-[140px]"
                      />
                    </td>
                    <td className="text-center px-2 py-1.5">
                      <button
                        onClick={() => toggleDone(w.week, w.done)}
                        className={`h-5 w-5 rounded-full border transition-colors ${
                          w.done ? "bg-[var(--color-good)] border-[var(--color-good)] text-black" : "border-[var(--color-line-strong)]"
                        }`}
                      >
                        {w.done ? "✓" : ""}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3">
            <Button onClick={addWeek}>+ Agregar semana</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
