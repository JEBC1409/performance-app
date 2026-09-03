import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Card, Eyebrow, Stat, Button } from "@/ui";
import { num } from "@/lib/date";
import { MOUREDEV_TARGET_LABEL, MOUREDEV_GOAL_HOURS_PER_WEEK } from "@/data/mouredev";

export function Mouredev() {
  const weeks = useLiveQuery(() => db.moureWeeks.orderBy("week").toArray(), []);

  const totalHours = (weeks ?? []).reduce((a, r) => a + (num(r.hours) ?? 0), 0);
  const doneWeeks = (weeks ?? []).filter((w) => w.done).length;

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

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px] min-w-[560px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                <th className="text-left px-3 py-2">Sem</th>
                <th className="text-left px-2 py-2">Fecha</th>
                <th className="text-left px-2 py-2">Tema / módulo</th>
                <th className="text-left px-2 py-2">Horas</th>
                <th className="text-left px-2 py-2">Proyecto</th>
                <th className="text-center px-2 py-2">✓</th>
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
                      className="bg-transparent px-1.5 py-1 text-[11.5px] outline-none focus:bg-[var(--color-surface-2)] w-[130px]"
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      defaultValue={w.topic}
                      onBlur={(e) => patch(w.week, { topic: e.target.value })}
                      placeholder="Tema"
                      className="bg-transparent px-1.5 py-1 text-[11.5px] outline-none focus:bg-[var(--color-surface-2)] w-full min-w-[160px]"
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      defaultValue={w.hours ?? ""}
                      onBlur={(e) => patch(w.week, { hours: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="0"
                      inputMode="decimal"
                      className="num bg-transparent px-1.5 py-1 text-[11.5px] outline-none focus:bg-[var(--color-surface-2)] w-14"
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      defaultValue={w.project}
                      onBlur={(e) => patch(w.week, { project: e.target.value })}
                      placeholder="Proyecto"
                      className="bg-transparent px-1.5 py-1 text-[11.5px] outline-none focus:bg-[var(--color-surface-2)] w-full min-w-[140px]"
                    />
                  </td>
                  <td className="text-center px-2 py-1.5">
                    <button
                      onClick={() => toggleDone(w.week, w.done)}
                      className={`w-5 h-5 border ${w.done ? "bg-[var(--color-good)] border-[var(--color-good)] text-black" : "border-[var(--color-line-strong)]"}`}
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
  );
}
