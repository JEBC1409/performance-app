import { useMemo } from "react";
import { db } from "@/db/db";
import { saveConfig } from "@/lib/appConfig";
import { nextCycleSlot, offsetForSlot, type CycleSlot, type GymDay } from "@/lib/cycle";
import { sessionKey } from "@/lib/recentActivity";
import { CONFIG_CYCLE_OFFSET, useHistoryActivity, useSharedConfig, useTodayActivity } from "./useRecentActivity";

async function countSessions(): Promise<number> {
  const rows = await db.sets.toArray();
  return new Set(rows.map((r) => `${r.date}__${r.day}`)).size;
}

export function useCycleSlot(): CycleSlot {
  // Past sessions are counted once (the shared "history" read) and left alone: logging
  // a set today touches only today's small read, so it never re-reads the training history.
  const history = useHistoryActivity();
  const today = useTodayActivity();
  const config = useSharedConfig();
  const ready = history !== undefined && today !== undefined && config !== undefined;
  const sessions = ready ? history.sessions + new Set(today.sets.map(sessionKey)).size : 0;
  return nextCycleSlot(sessions, config?.cycleOffset ?? 0);
}

/** Says "the cycle is on this day now" (e.g. "today is B"), and it stays that way. */
export async function setCycleSlot(slot: CycleSlot): Promise<void> {
  await saveConfig(CONFIG_CYCLE_OFFSET, offsetForSlot(slot, await countSessions()));
}

/** The day Entreno should open on: the one already being trained today (so it stays
 * put while you log sets), otherwise the cycle's turn. On a rest turn it falls back to A.
 * `undefined` while the first read from IndexedDB is still in flight — callers should
 * seed their own state from this once and then stop reading it, so a set logged mid-session
 * (which reshuffles `useCycleSlot`'s count) can never retroactively change the open day
 * out from under an in-progress workout. */
export function useDefaultGymDay(): GymDay | undefined {
  const slot = useCycleSlot();
  const todays = useTodayActivity();
  // The day of the last set logged today, or null if none; undefined until the read lands.
  const started = useMemo(() => {
    if (!todays) return undefined;
    const rows = todays.sets.filter((r) => r.date === todays.today).sort((a, b) => a.createdAt - b.createdAt);
    return rows.length ? rows[rows.length - 1].day : null;
  }, [todays]);
  if (started) return started as GymDay;
  if (started === undefined) return undefined; // still loading — don't guess yet
  return slot === "rest" ? "A" : slot;
}
