import type { MoureWeekView } from "@/hooks/useMoureWeeks";

type WeekLike = Pick<MoureWeekView, "week" | "done" | "date" | "topic" | "project" | "hours" | "focusHours">;

/** A week that has anything in it, even if it isn't marked done yet. */
const hasContent = (w: WeekLike) => !!(w.date || w.topic || w.project || w.hours != null || w.focusHours > 0);

/** The weeks worth showing by default: the finished ones, the next one to do, and any
 * week you already started filling in. The rest wait behind "Ver todas". */
export function visibleWeekNumbers(weeks: WeekLike[]): Set<number> {
  const next = weeks.find((w) => !w.done)?.week;
  return new Set(weeks.filter((w) => w.done || w.week === next || hasContent(w)).map((w) => w.week));
}
