import { db } from "@/db/db";
import { addDays } from "./date";
import type { WeekInput } from "./weeklySummary";

/** The rows a week's numbers (and the comparison with the week before) are made
 * from. Only that fortnight is read — the date indexes make it a few rows, where
 * reading every table whole grows with every month of history. */
export async function loadWeekInput(weekStart: string): Promise<WeekInput> {
  const from = addDays(weekStart, -7);
  const to = addDays(weekStart, 6);
  const [sets, focus, habitDays, habitDefs, weights, sleep, moure] = await Promise.all([
    db.sets.where("date").between(from, to, true, true).toArray(),
    db.focusSessions.where("date").between(from, to, true, true).toArray(),
    db.habitDays.where("date").between(from, to, true, true).toArray(),
    db.habitDefs.orderBy("order").toArray(),
    db.weights.where("date").between(from, to, true, true).toArray(),
    db.sleep.where("date").between(from, to, true, true).toArray(),
    db.moureWeeks.toArray(),
  ]);
  return { sets, focus, habitDays, habitDefs, weights, sleep, moure };
}
