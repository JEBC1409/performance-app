import { db, type SetRecord } from "./db";

/** Adds a set with the next free `setIndex` for its exercise on that day, counting
 * the rows that are really in the database inside a transaction, not the screen's
 * (possibly stale) state. Two quick taps therefore can't both get the same index.
 * Uses max(count, highest index) + 1, so a set deleted from the middle doesn't make
 * the next one collide with an existing index. Resolves to the index it used. */
export async function addSetWithNextIndex(row: Omit<SetRecord, "id" | "setIndex">): Promise<number> {
  return db.transaction("rw", db.sets, async () => {
    // Plain index read + JS filter: no cursor, which some phones refuse to open.
    const same = (await db.sets.where("date").equals(row.date).toArray()).filter((s) => s.day === row.day && s.exercise === row.exercise);
    const setIndex = Math.max(same.length, ...same.map((s) => s.setIndex)) + 1;
    await db.sets.add({ ...row, setIndex });
    return setIndex;
  });
}
