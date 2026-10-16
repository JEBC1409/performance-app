import { addDays, startOfWeek } from "./date";

/** After a stretch of hard weeks, a lighter one lets the body catch up — and
 * is often what lets the next block of progress happen. This counts how many
 * weeks in a row you've trained properly and says when a deload is due. */

export const DELOAD_AFTER_WEEKS = 6;
const MIN_SESSIONS_PER_WEEK = 2;

/** Consecutive training weeks (Monday-start, ≥2 session days each) ending now.
 * The current week is counted if it already qualifies and otherwise skipped
 * (it may simply not be finished), never breaking the run. Weeks on or before
 * `since` don't count — that's when you last took a deload. */
export function trainingWeeksInARow(trainedDates: string[], today: string, since?: string): number {
  const perWeek = new Map<string, Set<string>>();
  for (const d of trainedDates) {
    const wk = startOfWeek(d);
    const set = perWeek.get(wk);
    if (set) set.add(d);
    else perWeek.set(wk, new Set([d]));
  }
  const qualifies = (wk: string) => (perWeek.get(wk)?.size ?? 0) >= MIN_SESSIONS_PER_WEEK;
  const sinceWeek = since ? startOfWeek(since) : null;

  let wk = startOfWeek(today);
  if (!qualifies(wk)) wk = addDays(wk, -7);
  let count = 0;
  while (qualifies(wk) && (sinceWeek == null || wk > sinceWeek)) {
    count++;
    wk = addDays(wk, -7);
  }
  return count;
}

export interface DeloadState {
  /** When the last deload was taken (ISO). */
  doneAt?: string;
  /** Don't mention it again before this date. */
  snoozeUntil?: string;
}

export function deloadDue(trainedDates: string[], today: string, state: DeloadState): number | null {
  if (state.snoozeUntil && today < state.snoozeUntil) return null;
  const weeks = trainingWeeksInARow(trainedDates, today, state.doneAt);
  return weeks >= DELOAD_AFTER_WEEKS ? weeks : null;
}
