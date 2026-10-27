import Dexie from "dexie";
import { db } from "./db";
import type { OutboxRecord } from "./db";
import { setQueued } from "./syncStatus";

/** Offline-first write queue. Every local change is recorded here first and
 * then pushed to the cloud; anything that can't be delivered (no signal, a
 * flaky connection, a server error) simply stays queued and is retried when
 * the connection returns or the app next opens. Nothing here ever touches the
 * local data itself — the UI keeps reading IndexedDB directly.
 *
 * Reads here are plain `toArray()` calls (IndexedDB getAll) with the filtering
 * done in JS, and deletes go by primary key: some phones refuse to open cursors
 * ("Unable to open cursor"), and `filter()`, `sortBy()` and `Collection.delete()`
 * all use one. The outbox is small, so reading a whole index range is cheap. */

export type ExecResult = { error: { message: string } | null };
/** Performs one queued write against the cloud. */
export type Executor = (entry: OutboxRecord) => Promise<ExecResult>;

export interface FlushResult {
  sent: number;
  failed: number;
  /** Stopped early because the network is unreachable. */
  offline: boolean;
  /** Last error worth showing to the user, already in readable form. */
  lastError: string | null;
  /** Entries left alone this round because their retry delay hasn't passed. */
  deferred: number;
}

const NETWORK_ERROR = /failed to fetch|networkerror|network request failed|load failed|fetch failed|network error|timed? ?out|econn|enotfound/i;

export function isNetworkError(message: string): boolean {
  return NETWORK_ERROR.test(message);
}

/** The table exists but a column the app writes doesn't: its SQL migration
 * wasn't applied. PostgREST says PGRST204 / "Could not find the 'x' column of
 * 't' in the schema cache"; Postgres itself says 42703 / column "x" ... does not exist. */
const MISSING_COLUMN = /PGRST204|42703|could not find the '[^']+' column|column\s+"?[\w.]+"?\s+(?:of relation\s+"?[\w.]+"?\s+)?does not exist/i;

export function isMissingColumn(message: string): boolean {
  return MISSING_COLUMN.test(message);
}

const MISSING_TABLE = /does not exist|schema cache|PGRST20[1245]|42P01|could not find the table/i;

/** The cloud table hasn't been created yet (its SQL migration wasn't applied):
 * not an error worth alarming about — the change simply waits in the queue.
 * A missing *column* is different (see isMissingColumn) and is NOT a missing table. */
export function isMissingTable(message: string): boolean {
  return !isMissingColumn(message) && MISSING_TABLE.test(message);
}

/** Name of the missing column in a "column not found" message, if it can be told. */
function missingColumnName(message: string): string | null {
  const m = /could not find the '([^']+)' column(?: of '([^']+)')?/i.exec(message) ?? /column\s+"?([\w.]+)"?(?:\s+of relation\s+"?([\w.]+)"?)?\s+does not exist/i.exec(message);
  if (!m) return null;
  return m[2] ? `${m[2]}.${m[1]}` : m[1];
}

/** What to show the user for a sync error message: a missing column becomes an
 * actionable sentence in Spanish, anything else is passed through. */
export function readableSyncError(message: string): string {
  if (!isMissingColumn(message)) return message;
  return `Falta aplicar una migración en la base: ${missingColumnName(message) ?? "columna desconocida"}`;
}

// ---------- retry back-off ----------

const BASE_RETRY_MS = 30_000;
const MAX_RETRY_MS = 15 * 60_000;

/** How long to wait before trying an entry again after it failed `attempts`
 * times in a row for a reason other than the network: 30 s, 1 min, 2 min …
 * capped at 15 min. Nothing is ever discarded — it just stops hammering a row
 * the server keeps refusing. */
export function retryDelayMs(attempts: number): number {
  if (attempts <= 0) return 0;
  return Math.min(MAX_RETRY_MS, BASE_RETRY_MS * 2 ** Math.min(attempts - 1, 10));
}

function isDue(e: OutboxRecord, now: number): boolean {
  if (!e.attempts || !e.lastAttemptAt) return true;
  return now >= e.lastAttemptAt + retryDelayMs(e.attempts);
}

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

/** Updates the "changes waiting" counter. Returns the count, or -1 when it
 * couldn't be read (the counter is then left as it was). Never throws. */
export async function refreshQueued(): Promise<number> {
  try {
    const n = await db.outbox.count();
    setQueued(n);
    return n;
  } catch {
    return -1;
  }
}

// Enqueues run one at a time, in call order, so two quick edits to the same
// row can never land out of order.
let chain: Promise<unknown> = Promise.resolve();

export function enqueue(entry: Omit<OutboxRecord, "id" | "createdAt" | "attempts" | "lastError" | "lastAttemptAt">): Promise<void> {
  const run = async () => {
    // Dexie write hooks call us from inside their own transaction; the outbox
    // write must run in a transaction of its own.
    await Dexie.ignoreTransaction(() =>
      db.transaction("rw", db.outbox, async () => {
        // A newer write to the same row replaces the older queued one.
        const older = (await db.outbox.where("table").equals(entry.table).toArray()).filter((r) => r.key === entry.key && r.id != null).map((r) => r.id as number);
        if (older.length) await db.outbox.bulkDelete(older);
        await db.outbox.add({ ...entry, createdAt: Date.now(), attempts: 0 });
      }),
    );
    // The change is queued; a failure to update the counter must not look like a lost write.
    await refreshQueued();
  };
  const next = chain.then(run, run).then(() => undefined);
  chain = next.catch(() => undefined);
  return next;
}

/** How many writes are waiting to be uploaded, or null when the queue can't be
 * read (a broken database connection). Never throws. */
export async function pendingCount(): Promise<number | null> {
  try {
    return await db.outbox.count();
  } catch {
    return null;
  }
}

/** Keys with a queued write for this table, and what that write is. The pull
 * side uses it to avoid overwriting (or resurrecting) rows the user changed
 * offline that haven't been uploaded yet. */
export async function pendingKeys(table: string, userId: string): Promise<Map<string, "upsert" | "delete">> {
  const rows = (await db.outbox.where("table").equals(table).toArray()).filter((r) => r.userId === userId);
  return new Map(rows.map((r) => [r.key, r.op]));
}

let flushing: Promise<FlushResult> | null = null;

export interface FlushOptions {
  /** Ignore the retry back-off (the user pressed "reintentar"). */
  force?: boolean;
}

/** Delivers queued writes in order. Safe to call from anywhere, any time:
 * concurrent calls share one run. A network failure stops the run (the rest
 * stays queued); any other error is recorded on that entry and the run moves
 * on, so one bad row can't block everything behind it. An entry that keeps
 * failing is retried less and less often (see retryDelayMs), never dropped. */
export function flushOutbox(userId: string, exec: Executor, opts: FlushOptions = {}): Promise<FlushResult> {
  if (flushing) return flushing;
  flushing = doFlush(userId, exec, opts).finally(() => {
    flushing = null;
  });
  return flushing;
}

async function doFlush(userId: string, exec: Executor, opts: FlushOptions): Promise<FlushResult> {
  const result: FlushResult = { sent: 0, failed: 0, offline: false, lastError: null, deferred: 0 };
  const seen = new Set<number>();
  for (;;) {
    // Re-read each round: writes queued while we were sending are picked up too.
    const entries = (await db.outbox.where("userId").equals(userId).toArray())
      .filter((e) => e.id != null && !seen.has(e.id))
      .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    if (!entries.length) break;
    for (const e of entries) {
      seen.add(e.id!);
      if (!isOnline()) {
        result.offline = true;
        break;
      }
      if (!opts.force && !isDue(e, Date.now())) {
        // Still waiting out its back-off: leave it queued, but keep telling the user it is stuck.
        result.deferred++;
        if (e.lastError && !isMissingTable(e.lastError)) result.lastError = readableSyncError(e.lastError);
        continue;
      }
      let res: ExecResult;
      try {
        res = await exec(e);
      } catch (err) {
        res = { error: { message: err instanceof Error ? err.message : String(err) } };
      }
      if (!res.error) {
        await db.outbox.delete(e.id!);
        result.sent++;
      } else if (isNetworkError(res.error.message)) {
        result.offline = true;
        break;
      } else {
        result.failed++;
        if (!isMissingTable(res.error.message)) result.lastError = readableSyncError(res.error.message);
        await db.outbox.update(e.id!, { attempts: e.attempts + 1, lastError: res.error.message, lastAttemptAt: Date.now() });
      }
    }
    if (result.offline) break;
  }
  await refreshQueued();
  return result;
}
