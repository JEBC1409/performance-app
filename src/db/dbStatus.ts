import { db } from "./db";

/** Whether opening the local database is stuck because another copy of the app
 * (an old tab, the installed app left open in the background) still holds a
 * connection to the previous schema version and hasn't let go — a new version's
 * upgrade can't run until it does, and the app would otherwise sit on its
 * loading screen forever with no hint why. */
let blocked = false;
const listeners = new Set<() => void>();

function set(next: boolean) {
  if (blocked === next) return;
  blocked = next;
  listeners.forEach((l) => l());
}

db.on("blocked", () => set(true));
db.on("ready", () => set(false));

export function isDbBlocked(): boolean {
  return blocked;
}

export function subscribeDbBlocked(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
