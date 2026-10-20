import type { Collection, Table } from "dexie";

/** Some phones' IndexedDB refuses the fancier cursor kinds ("UnknownError: Unable
 * to open cursor"): distinct keys, first/last by an index, newest-first with a limit.
 * Plain reads (getAll) work everywhere, so each helper tries the cheap cursor
 * first and, if the browser refuses, does the same job from a plain read. */

/** Distinct values of `field` over a date-indexed collection, sorted. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function distinctDates(c: Collection<any, any>, field = "date"): Promise<string[]> {
  try {
    return (await c.uniqueKeys()) as string[];
  } catch {
    const rows = (await c.toArray()) as Record<string, unknown>[];
    return [...new Set(rows.map((r) => r[field] as string))].sort();
  }
}

const byIndex = <T>(index: string) => (a: T, b: T) => {
  const x = (a as Record<string, unknown>)[index] as string | number;
  const y = (b as Record<string, unknown>)[index] as string | number;
  return x < y ? -1 : x > y ? 1 : 0;
};

/** The row with the smallest `index` value. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function firstByIndex<T>(table: Table<T, any>, index: string): Promise<T | undefined> {
  try {
    return await table.orderBy(index).first();
  } catch {
    return (await table.toArray()).sort(byIndex<T>(index))[0];
  }
}

/** The row with the largest `index` value. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function lastByIndex<T>(table: Table<T, any>, index: string): Promise<T | undefined> {
  try {
    return await table.orderBy(index).last();
  } catch {
    return (await table.toArray()).sort(byIndex<T>(index)).at(-1);
  }
}

/** Rows newest-first by `index`, optionally only the first `limit`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function newestFirst<T>(table: Table<T, any>, index: string, limit?: number): Promise<T[]> {
  try {
    const c = table.orderBy(index).reverse();
    return await (limit ? c.limit(limit) : c).toArray();
  } catch {
    const all = (await table.toArray()).sort(byIndex<T>(index)).reverse();
    return limit ? all.slice(0, limit) : all;
  }
}
