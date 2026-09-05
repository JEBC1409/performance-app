import { useLiveQuery } from "dexie-react-hooks";
import { db, type HabitDefRecord } from "@/db/db";

export function useHabitDefs(): HabitDefRecord[] | undefined {
  return useLiveQuery(() => db.habitDefs.orderBy("order").toArray(), []);
}
