import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import type { MoureWeekRecord } from "@/db/db";
import { effectiveHours, focusHoursByWeek } from "@/lib/mouredevFocus";

export interface MoureWeekView extends MoureWeekRecord {
  /** Hours measured by Focus blocks named after MoureDev that fall in this week. */
  focusHours: number;
  /** What the week counts for: the larger of the hours written and the Focus ones. */
  effectiveHours: number;
}

/** The MoureDev route's weeks, with Focus time folded in. */
export function useMoureWeeks(): MoureWeekView[] | undefined {
  return useLiveQuery(async () => {
    const [weeks, sessions] = await Promise.all([db.moureWeeks.orderBy("week").toArray(), db.focusSessions.toArray()]);
    const focus = focusHoursByWeek(weeks, sessions);
    return weeks.map((w) => {
      const focusHours = focus.get(w.week) ?? 0;
      return { ...w, focusHours, effectiveHours: effectiveHours(typeof w.hours === "number" ? w.hours : null, focusHours) };
    });
  }, []);
}
