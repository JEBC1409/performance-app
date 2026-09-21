import { db } from "@/db/db";
import type { HabitDefRecord } from "@/db/db";
import type { HorarioCell } from "@/data/horario";

/** Marks/unmarks a habit for a day. Returns whether it is now done. */
export async function toggleHabitDay(date: string, key: string): Promise<boolean> {
  // One transaction, so two quick taps on different habits can't both read the
  // same "before" and have the second overwrite the first.
  return db.transaction("rw", db.habitDays, async () => {
    const existing = (await db.habitDays.get(date)) ?? { date, done: [] as string[] };
    const on = !existing.done.includes(key);
    const done = on ? [...existing.done, key] : existing.done.filter((k) => k !== key);
    await db.habitDays.put({ ...existing, done });
    return on;
  });
}

/** The habit a schedule block is about, if you have one for it: the morning
 * MoureDev block ↔ a "MoureDev" habit, Bible blocks ↔ a "Biblia" habit. Lets
 * Hoy offer a one-tap check right when the block is happening. */
export function habitForBlock(cell: HorarioCell | null | undefined, defs: HabitDefRecord[]): HabitDefRecord | null {
  if (!cell || cell.quiet || cell.soft) return null;
  const text = cell.text.toLowerCase();
  let pattern: RegExp | null = null;
  if (cell.type === "mouredev" && (cell.key || text.includes("mouredev"))) pattern = /moure/i;
  else if (cell.type === "dios" && text.includes("biblia")) pattern = /biblia/i;
  return pattern ? (defs.find((d) => pattern.test(d.label)) ?? null) : null;
}
