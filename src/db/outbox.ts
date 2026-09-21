import Dexie from "dexie";
import { db } from "./db";
import type { OutboxRecord } from "./db";
import { setQueued } from "./syncStatus";

/** Offline-first write queue. Every local change is recorded here first and
 * then pushed to the cloud; anything that can't be delivered (no signal, a
 * flaky connection, a server error) simply stays queued and is retried when
 * the connection returns or the app next opens. Nothing here ever touches the
 * local data itself — the UI keeps reading IndexedDB directly. */

export type ExecResult = { error: { message: string } | null };
/** Performs one queued write against the cloud. */
export type Executor = (entry: OutboxRecord) => Promise<ExecResult>;

export interface FlushResult {
  sent: number;
  failed: number;
  /** Stopped early because the network is unreachable. */
  offline: boolean;
  lastError: string | null;
}

const NETWORK_ERROR = /failed to fetch|networkerror|network request failed|load failed|fetch failed|network error|timed? ?out|econn|enotfound/i;

export function isNetworkError(message: string): boolean {
  return NETWORK_ERROR.test(message);
}

const MISSING_TABLE = /does not exist|schema cache|PGRST20[45]|42P01|could not find the table/i;

/** The cloud table hasn't been created yet (its SQL migration wasn't applied):
 * not an error worth alarming about — the change simply waits in the queue. */
export function isMissingTable(message: string): boolean {
  return MISSING_TABLE.test(message);
}

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

export async function refreshQueued(): Promise<number> {
  const n = await db.outbox.count();
  setQueued(n);
  return n;
}

// Enqueues run one at a time, in call order, so two quick edits to the same
// row can never land out of order.
let chain: Promise<unknown> = Promise.resolve();

export function enqueue(entry: Omit<OutboxRecord, "id" | "createdAt" | "attempts" | "lastError">): Promise<void> {
  const run = () =>
    // Dexie write hooks call us from inside their own transaction; the outbox
    // write must run in a transaction of its own.
    Dexie.ignoreTransaction(() =>
      db.transaction("rw", db.outbox, async () => {
        await db.outbox.where("[table+key]").equals([entry.table, entry.key]).delete();
        await db.outbox.add({ ...entry, createdAt: Date.now(), attempts: 0 });
      }),
    ).then(refreshQueued);
  const next = chain.then(run, run).then(() => undefined);
  chain = next.catch(() => undefined);
  return next;
}

/** Keys with a queued write for this table, and what that write is. The pull
 * side uses it to avoid overwriting (or resurrecting) rows the user changed
 * offline that haven't been uploaded yet. */
export async function pendingKeys(table: string, userId: string): Promise<Map<string, "upsert" | "delete">> {
  const rows = await db.outbox.where("table").equals(table).filter((r) => r.userId === userId).toArray();
  return new Map(rows.map((r) => [r.key, r.op]));
}

let flushing: Promise<FlushResult> | null = null;

/** Delivers queued writes in order. Safe to call from anywhere, any time:
 * concurrent calls share one run. A network failure stops the run (the rest
 * stays queued); any other error is recorded on that entry and the run moves
 * on, so one bad row can't block everything behind it. */
export function flushOutbox(userId: string, exec: Executor): Promise<FlushResult> {
  if (flushing) return flushing;
  flushing = doFlush(userId, exec).finally(() => {
    flushing = null;
  });
  return flushing;
}

async function doFlush(userId: string, exec: Executor): Promise<FlushResult> {
  const result: FlushResult = { sent: 0, failed: 0, offline: false, lastError: null };
  let cursor = 0;
  for (;;) {
    // Re-read each round: writes queued while we were sending are picked up too.
    const entries = await db.outbox.where("userId").equals(userId).filter((e) => (e.id ?? 0) > cursor).sortBy("id");
    if (!entries.length) break;
    for (const e of entries) {
      cursor = e.id ?? cursor;
      if (!isOnline()) {
        result.offline = true;
        break;
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
        if (!isMissingTable(res.error.message)) result.lastError = res.error.message;
        await db.outbox.update(e.id!, { attempts: e.attempts + 1, lastError: res.error.message });
      }
    }
    if (result.offline) break;
  }
  await refreshQueued();
  return result;
}
