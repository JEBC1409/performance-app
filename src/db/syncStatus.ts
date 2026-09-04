/** Tracks cloud-sync activity so the UI can show something better than
 * silence: pushes/pulls currently in flight, when the last one actually
 * succeeded, the last error (if any), and whether the browser is online.
 * cloudSync.ts calls syncStarted/syncFinished around each network call;
 * everything else just reads the snapshot. */
export type SyncState = "idle" | "syncing" | "offline" | "error";

export interface SyncStatusSnapshot {
  state: SyncState;
  lastSyncedAt: number | null;
  pending: number;
  lastError: string | null;
}

let pending = 0;
let lastSyncedAt: number | null = null;
let lastError: string | null = null;
const listeners = new Set<() => void>();

let snapshot: SyncStatusSnapshot = { state: "idle", lastSyncedAt: null, pending: 0, lastError: null };

function recompute() {
  const state: SyncState =
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : lastError ? "error" : pending > 0 ? "syncing" : "idle";
  snapshot = { state, lastSyncedAt, pending, lastError };
  listeners.forEach((l) => l());
}

export function getSyncSnapshot(): SyncStatusSnapshot {
  return snapshot;
}

export function subscribeSyncStatus(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function syncStarted(): void {
  pending++;
  recompute();
}

export function syncFinished(error?: string): void {
  pending = Math.max(0, pending - 1);
  if (error) {
    lastError = error;
  } else {
    lastError = null;
    lastSyncedAt = Date.now();
  }
  recompute();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", recompute);
  window.addEventListener("offline", recompute);
}
