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

export const FOCUS_OPTIONS = [15, 25, 45, 50];
const SHORT_BREAK_MIN = 5;
const LONG_BREAK_MIN = 15;
export const BLOCKS_PER_SET = 4;
const STORAGE_KEY = "performance_focus_timer_v1";

const IDLE: FocusTimerState = { status: "idle", phase: "focus", task: "", focusMin: 25, totalSec: 0, endsAt: null, remainingSec: 0, cycle: 0 };

function load(): FocusTimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...IDLE, ...(JSON.parse(raw) as Partial<FocusTimerState>) };
  } catch {
    /* corrupted or unavailable storage — start clean */
  }
  return IDLE;
}

let state: FocusTimerState = load();
const listeners = new Set<() => void>();

function set(next: FocusTimerState) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode etc. — the timer still works for this session */
  }
  listeners.forEach((l) => l());
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
  const totalSec = focusMin * 60;
  set({ ...state, status: "running", phase: "focus", task: task.trim(), focusMin, totalSec, endsAt: Date.now() + totalSec * 1000, remainingSec: 0 });
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

function startBreak(cycle: number): void {
  const long = cycle >= BLOCKS_PER_SET;
  const totalSec = (long ? LONG_BREAK_MIN : SHORT_BREAK_MIN) * 60;
  set({ ...state, status: "running", phase: "break", totalSec, endsAt: Date.now() + totalSec * 1000, remainingSec: 0, cycle });
}

/** Called by the app-level watcher when the running phase's time is up. A
 * finished focus block is logged, then a break starts on its own; a
 * finished break returns to idle with the task kept for the next block. */
export function completePhase(): { finished: FocusPhase; task: string } {
  const finished = state.phase;
  const task = state.task;
  if (finished === "focus") {
    void db.focusSessions.add({ date: todayISO(), task, minutes: state.focusMin, createdAt: Date.now() });
    startBreak(state.cycle + 1);
  } else {
    set({ ...state, status: "idle", phase: "focus", totalSec: 0, endsAt: null, remainingSec: 0, cycle: state.cycle >= BLOCKS_PER_SET ? 0 : state.cycle });
  }
  return { finished, task };
}
