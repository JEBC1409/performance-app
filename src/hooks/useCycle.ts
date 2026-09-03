import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { nextCycleSlot, type CycleSlot } from "@/lib/cycle";

export function useCycleSlot(): CycleSlot {
  const sessionsLogged = useLiveQuery(async () => {
    const rows = await db.sets.toArray();
    const distinct = new Set(rows.map((r) => `${r.date}__${r.day}`));
    return distinct.size;
  }, []);
  return nextCycleSlot(sessionsLogged ?? 0);
}
