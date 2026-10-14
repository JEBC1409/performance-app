/** The rest timer between sets, kept as a point in time ("ends at 10:42:17")
 * rather than a number that counts down. A page that's hidden, frozen by the
 * phone, or on another screen can't tick, but the end time is still right when
 * you come back. Lives outside any screen so it survives switching tabs and is
 * saved so it survives a reload. */

const KEY = "performance_rest_timer_v1";
/** A timer that ended longer ago than this is simply forgotten on load. */
const STALE_MS = 30 * 60 * 1000;

export interface RestState {
  /** When the rest ends (epoch ms), or null when there's none. */
  endAt: number | null;
  /** Length of the rest, including any "+30s", for the progress bar. */
  total: number;
}

const IDLE: RestState = { endAt: null, total: 0 };
const listeners = new Set<() => void>();

function read(): RestState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return IDLE;
    const s = JSON.parse(raw) as Partial<RestState>;
    if (typeof s.endAt !== "number" || !Number.isFinite(s.endAt) || typeof s.total !== "number" || s.total <= 0) return IDLE;
    if (s.endAt < Date.now() - STALE_MS) return IDLE;
    return { endAt: s.endAt, total: s.total };
  } catch {
    return IDLE;
  }
}

let state: RestState = read();

function set(next: RestState): void {
  state = next;
  try {
    if (next.endAt == null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* it just won't survive a reload */
  }
  listeners.forEach((l) => l());
}

export function getRestState(): RestState {
  return state;
}

export function subscribeRest(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Whole seconds left at `now` (rounded up, so it reads 0:01 until it's really over). */
export function restRemaining(s: RestState, now: number): number {
  return s.endAt == null ? 0 : Math.max(0, Math.ceil((s.endAt - now) / 1000));
}

export function startRest(seconds: number, now = Date.now()): void {
  if (!(seconds > 0)) return;
  set({ endAt: now + seconds * 1000, total: seconds });
}

export function addRest(seconds: number, now = Date.now()): void {
  if (state.endAt == null) return;
  const endAt = state.endAt + seconds * 1000;
  if (endAt <= now) set(IDLE);
  else set({ endAt, total: Math.max(1, state.total + seconds) });
}

export function skipRest(): void {
  if (state.endAt != null) set(IDLE);
}

/** If the rest is over, clears it and says by how many seconds it ran over
 * (large when the page was frozen meanwhile). Null while it's still running. */
export function completeRestIfDue(now = Date.now()): { lateBySec: number } | null {
  if (state.endAt == null || state.endAt > now) return null;
  const lateBySec = Math.round((now - state.endAt) / 1000);
  set(IDLE);
  return { lateBySec };
}
