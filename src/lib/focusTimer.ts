import { db } from "@/db/db";
import { todayISO } from "./date";

/** The Focus (pomodoro) timer as a small persisted store rather than component
 * state: the app only mounts the active tab, so a timer living inside the
 * Focus screen would die the moment you switched tabs. State holds absolute
 * timestamps (endsAt), never a ticking counter, so it survives tab switches,
 * throttled background timers and reloads — the screen just derives
 * "remaining" from the clock. */

export type FocusPhase = "focus" | "break";

export interface FocusTimerState {
  status: "idle" | "running" | "paused";
  phase: FocusPhase;
  task: string;
  /** Length of the focus block being run/planned, in minutes. */
  focusMin: number;
  /** Full length of the current phase, in seconds. */
  totalSec: number;
  /** Running only: epoch ms the phase ends at. */
  endsAt: number | null;
  /** Paused only: seconds left when paused. */
  remainingSec: number;
  /** Focus blocks finished in the current set of four (drives the long break). */
  cycle: number;
}

/** Quick picks; any whole number of minutes between MIN and MAX also works. */
export const FOCUS_OPTIONS = [15, 25, 45, 50];
export const MIN_FOCUS_MIN = 1;
export const MAX_FOCUS_MIN = 240;

/** A usable block length: a whole number of minutes inside the allowed range, else null. */
export function validFocusMin(n: number): number | null {
  return Number.isInteger(n) && n >= MIN_FOCUS_MIN && n <= MAX_FOCUS_MIN ? n : null;
}
const SHORT_BREAK_MIN = 5;
const LONG_BREAK_MIN = 15;
export const BLOCKS_PER_SET = 4;
const STORAGE_KEY = "performance_focus_timer_v1";
const MAX_TASK = 80;

const IDLE: FocusTimerState = { status: "idle", phase: "focus", task: "", focusMin: 25, totalSec: 0, endsAt: null, remainingSec: 0, cycle: 0 };

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Persisted state is untrusted (older builds, hand edits, another tab):
 * coerce every field so a bad value can never crash or wedge the timer. */
function sanitize(raw: unknown): FocusTimerState {
  if (!raw || typeof raw !== "object") return IDLE;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  const status = r.status === "running" || r.status === "paused" ? r.status : "idle";
  const focusMin = validFocusMin(num(r.focusMin, 25)) ?? 25;
  const totalSec = Math.max(0, Math.round(num(r.totalSec, 0)));
  const cycle = clamp(Math.floor(num(r.cycle, 0)), 0, BLOCKS_PER_SET);
  const task = typeof r.task === "string" ? r.task.slice(0, MAX_TASK) : "";
  const phase: FocusPhase = r.phase === "break" ? "break" : "focus";
  const endsAt = typeof r.endsAt === "number" && Number.isFinite(r.endsAt) ? r.endsAt : null;
  const base = { ...IDLE, focusMin, task, cycle };
  if (status === "running") {
    if (endsAt === null || totalSec <= 0) return base;
    return { ...base, status, phase, totalSec, endsAt };
  }
  if (status === "paused") {
    if (totalSec <= 0) return base;
    return { ...base, status, phase, totalSec, remainingSec: clamp(Math.round(num(r.remainingSec, 0)), 0, totalSec) };
  }
  return base;
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): FocusTimerState {
  if (!raw) return IDLE;
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return IDLE;
  }
}

let lastRaw: string | null = readStored();
let state: FocusTimerState = parse(lastRaw);
const listeners = new Set<() => void>();

function set(next: FocusTimerState) {
  state = next;
  try {
    lastRaw = JSON.stringify(next);
    localStorage.setItem(STORAGE_KEY, lastRaw);
  } catch {
    /* private mode etc. — the timer still works for this session */
  }
  listeners.forEach((l) => l());
}

/** Pick up a change made by another tab of the app (same localStorage). */
export function refreshFromStorage(): void {
  const raw = readStored();
  if (raw === lastRaw) return;
  lastRaw = raw;
  state = parse(raw);
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY || e.key === null) refreshFromStorage();
  });
}

export function getFocusState(): FocusTimerState {
  return state;
}

export function subscribeFocus(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function remainingSeconds(s: FocusTimerState, now: number): number {
  if (s.status === "running" && s.endsAt) return Math.max(0, Math.ceil((s.endsAt - now) / 1000));
  if (s.status === "paused") return s.remainingSec;
  return 0;
}

export function startFocus(task: string, focusMin: number): void {
  const min = validFocusMin(Math.round(focusMin)) ?? 25;
  const totalSec = min * 60;
  const name = task.trim().slice(0, MAX_TASK) || "Sin nombre";
  set({ ...state, status: "running", phase: "focus", task: name, focusMin: min, totalSec, endsAt: Date.now() + totalSec * 1000, remainingSec: 0 });
}

export function pauseFocus(): void {
  if (state.status !== "running") return;
  set({ ...state, status: "paused", remainingSec: remainingSeconds(state, Date.now()), endsAt: null });
}

export function resumeFocus(): void {
  if (state.status !== "paused") return;
  set({ ...state, status: "running", endsAt: Date.now() + state.remainingSec * 1000, remainingSec: 0 });
}

/** Cancel the current phase. An abandoned focus block isn't logged — only
 * fully completed blocks count. */
export function stopFocus(): void {
  set({ ...state, status: "idle", phase: "focus", totalSec: 0, endsAt: null, remainingSec: 0 });
}

function breakSeconds(cycle: number): number {
  return (cycle >= BLOCKS_PER_SET ? LONG_BREAK_MIN : SHORT_BREAK_MIN) * 60;
}

export interface PhaseResult {
  finished: FocusPhase;
  task: string;
  /** Ended long ago (app was closed): report it quietly, no alarm. */
  late: boolean;
}

const LATE_MS = 60_000;

/** Called by the app-level watcher. If the running phase is due, finishes
 * it: a completed focus block is logged and a break starts on its own; a
 * finished break returns to idle with the task kept for the next block.
 * Returns null when nothing was due (including when another tab already
 * handled it, so a block is never logged twice). */
export function completeIfDue(now: number = Date.now()): PhaseResult | null {
  refreshFromStorage();
  if (state.status !== "running" || state.endsAt === null || state.endsAt > now) return null;

  const finished = state.phase;
  const task = state.task;
  const endedAt = state.endsAt;
  const late = now - endedAt > LATE_MS;

  if (finished === "focus") {
    db.focusSessions.add({ date: todayISO(), task, minutes: state.focusMin, createdAt: endedAt }).catch((err) => console.error("focus session not saved", err));
    const cycle = state.cycle + 1;
    const breakSec = breakSeconds(cycle);
    if (now - endedAt >= breakSec * 1000) {
      // The break would already be over too — don't start a stale one.
      set({ ...state, status: "idle", phase: "focus", totalSec: 0, endsAt: null, remainingSec: 0, cycle: cycle >= BLOCKS_PER_SET ? 0 : cycle });
    } else {
      set({ ...state, status: "running", phase: "break", totalSec: breakSec, endsAt: endedAt + breakSec * 1000, remainingSec: 0, cycle });
    }
  } else {
    set({ ...state, status: "idle", phase: "focus", totalSec: 0, endsAt: null, remainingSec: 0, cycle: state.cycle >= BLOCKS_PER_SET ? 0 : state.cycle });
  }
  return { finished, task, late };
}
