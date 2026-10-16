import { addDays } from "./date";

/** Memorising verses by spaced repetition: each time you recall one, it comes
 * back after a longer gap (1, 3, 7, 14, 30, 60, 120 days); forget it and it
 * starts over. Keyed by passage ("jo.3.16"), not by saved row, so it follows
 * the verse however many times it was saved. */
export const CONFIG_VERSE_REVIEW = "verse_review";
export const INTERVALS = [1, 3, 7, 14, 30, 60, 120];

export interface ReviewItem {
  /** Times in a row you've recalled it. */
  step: number;
  /** First day it should be reviewed (ISO). */
  due: string;
}
export type ReviewState = Record<string, ReviewItem>;

export function sanitizeReview(raw: unknown): ReviewState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: ReviewState = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[a-z0-9]+\.\d+\.\d+$/i.test(k) || !v || typeof v !== "object") continue;
    const { step, due } = v as Partial<ReviewItem>;
    if (typeof step === "number" && Number.isInteger(step) && step >= 0 && typeof due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(due)) out[k] = { step, due };
  }
  return out;
}

export function startReview(state: ReviewState, key: string, today: string): ReviewState {
  return state[key] ? state : { ...state, [key]: { step: 0, due: today } };
}

export function stopReview(state: ReviewState, key: string): ReviewState {
  if (!state[key]) return state;
  const next = { ...state };
  delete next[key];
  return next;
}

/** Records how a review went: knowing it pushes it further out, missing it brings it back tomorrow. */
export function gradeReview(state: ReviewState, key: string, knew: boolean, today: string): ReviewState {
  const item = state[key];
  if (!item) return state;
  if (!knew) return { ...state, [key]: { step: 0, due: addDays(today, 1) } };
  const step = item.step + 1;
  return { ...state, [key]: { step, due: addDays(today, INTERVALS[Math.min(step, INTERVALS.length) - 1]) } };
}

/** Keys to review today, most overdue first. */
export function dueKeys(state: ReviewState, today: string): string[] {
  return Object.entries(state)
    .filter(([, v]) => v.due <= today)
    .sort((a, b) => a[1].due.localeCompare(b[1].due) || a[0].localeCompare(b[0]))
    .map(([k]) => k);
}
