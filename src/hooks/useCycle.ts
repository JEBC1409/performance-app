import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { saveConfig } from "@/lib/appConfig";
import { nextCycleSlot, offsetForSlot, type CycleSlot, type GymDay } from "@/lib/cycle";
import { todayISO } from "@/lib/date";

/** Synced setting: how far the user has moved the cycle from the logged-session count. */
const CONFIG_CYCLE_OFFSET = "cycle_offset";

async function countSessions(): Promise<number> {
  const rows = await db.sets.toArray();
  return new Set(rows.map((r) => `${r.date}__${r.day}`)).size;
}

async function readOffset(): Promise<number> {
  const row = await db.appConfig.get(CONFIG_CYCLE_OFFSET);
  return typeof row?.value === "number" ? row.value : 0;
}

export function useCycleSlot(): CycleSlot {
  const state = useLiveQuery(async () => ({ sessions: await countSessions(), offset: await readOffset() }), []);
  return nextCycleSlot(state?.sessions ?? 0, state?.offset ?? 0);
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
  const started = useLiveQuery(async () => {
    const today = await db.sets.where("date").equals(todayISO()).sortBy("createdAt");
    return today.length ? today[today.length - 1].day : null;
  }, []);
  if (started) return started as GymDay;
  if (started === undefined) return undefined; // still loading — don't guess yet
  return slot === "rest" ? "A" : slot;
}
