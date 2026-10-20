import { db } from "./db";

/** Errors where the browser's IndexedDB connection itself is the problem (a
 * connection phones drop when the app has been in the background, a store the
 * browser failed to open) rather than a bug in a query. Closing and reopening
 * the database usually clears them. */
export function isDbConnectionError(error: unknown): boolean {
  const e = error as { name?: string; message?: string; inner?: { name?: string; message?: string } } | null;
  const text = [e?.name, e?.message, e?.inner?.name, e?.inner?.message].filter(Boolean).join(" ");
  return /UnknownError|InvalidStateError|DatabaseClosed|OpenFailed|Unable to open|backing store|connection is closing|database connection/i.test(text);
}

let pending: Promise<void> | null = null;

/** Closes and reopens the local database (one attempt at a time). Rejects if it still can't open. */
export function reopenDb(): Promise<void> {
  pending ??= (async () => {
    try {
      db.close();
      await db.open();
    } finally {
      pending = null;
    }
  })();
  return pending;
}
