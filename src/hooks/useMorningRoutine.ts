import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { saveConfig } from "@/lib/appConfig";
import { CONFIG_MORNING_ROUTINE, routineHabit, sanitizeDays, withDay } from "@/lib/guidedRoutine";
import { toggleHabitDay } from "@/lib/habits";
import { todayISO } from "@/lib/date";

/** Days the guided morning routine was completed (synced with the rest of the config). */
export function useMorningRoutine(): { days: string[]; doneToday: boolean; markDone: () => Promise<void> } {
  const row = useLiveQuery(async () => ({ value: (await db.appConfig.get(CONFIG_MORNING_ROUTINE))?.value }), []);
  const days = useMemo(() => sanitizeDays(row?.value), [row]);
  const today = todayISO();
  return {
    days,
    doneToday: days.includes(today),
    markDone: async () => {
      await saveConfig(CONFIG_MORNING_ROUTINE, { days: withDay(days, today) });
      // If you track a habit for it, finishing the routine ticks it too.
      const habit = routineHabit(await db.habitDefs.toArray());
      if (habit && !(await db.habitDays.get(today))?.done.includes(habit.key)) await toggleHabitDay(today, habit.key);
    },
  };
}
