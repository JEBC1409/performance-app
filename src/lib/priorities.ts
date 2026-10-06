import { addDays } from "./date";

/** The day's three priorities, and the short closing review at night.
 * Everything lives in one synced config value, keyed by date, trimmed to the
 * last couple of weeks. */

export const CONFIG_PRIORITIES = "priorities";
export const MAX_ITEMS = 3;
export const MAX_TEXT = 120;
const KEEP_DAYS = 14;

export interface PriorityItem {
  id: string;
  text: string;
  done: boolean;
}

export interface DayPlan {
  items: PriorityItem[];
  /** Set when the day was closed from the nightly review. */
  close?: { note: string; at: number };
}

export type PrioritiesState = Record<string, DayPlan>;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizePriorities(value: unknown): PrioritiesState {
  const out: PrioritiesState = {};
  if (!value || typeof value !== "object") return out;
  for (const [date, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!ISO.test(date) || !raw || typeof raw !== "object") continue;
    const r = raw as { items?: unknown; close?: unknown };
    const items: PriorityItem[] = [];
    if (Array.isArray(r.items)) {
      for (const it of r.items) {
        const o = it as Partial<PriorityItem> | null;
        if (o && typeof o.id === "string" && typeof o.text === "string" && o.text.trim()) items.push({ id: o.id, text: o.text.slice(0, MAX_TEXT), done: o.done === true });
        if (items.length === MAX_ITEMS) break;
      }
    }
    const c = r.close as { note?: unknown; at?: unknown } | undefined;
    const close = c && typeof c.at === "number" ? { note: typeof c.note === "string" ? c.note.slice(0, 400) : "", at: c.at } : undefined;
    out[date] = close ? { items, close } : { items };
  }
  return out;
}

export const emptyPlan = (): DayPlan => ({ items: [] });
export const planFor = (state: PrioritiesState, date: string): DayPlan => state[date] ?? emptyPlan();

function put(state: PrioritiesState, date: string, plan: DayPlan): PrioritiesState {
  return { ...state, [date]: plan };
}

let counter = 0;
const newId = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Adds a priority (trimmed); ignored when empty, a duplicate, or the day already has three. */
export function addItem(state: PrioritiesState, date: string, text: string): PrioritiesState {
  const clean = text.trim().slice(0, MAX_TEXT);
  const plan = planFor(state, date);
  if (!clean || plan.items.length >= MAX_ITEMS || plan.items.some((i) => i.text.toLowerCase() === clean.toLowerCase())) return state;
  return put(state, date, { ...plan, items: [...plan.items, { id: newId(), text: clean, done: false }] });
}

export function toggleItem(state: PrioritiesState, date: string, id: string): PrioritiesState {
  const plan = planFor(state, date);
  return put(state, date, { ...plan, items: plan.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) });
}

export function removeItem(state: PrioritiesState, date: string, id: string): PrioritiesState {
  const plan = planFor(state, date);
  return put(state, date, { ...plan, items: plan.items.filter((i) => i.id !== id) });
}

export function progress(plan: DayPlan): { done: number; total: number } {
  return { done: plan.items.filter((i) => i.done).length, total: plan.items.length };
}

/** Closes the day with an optional note, optionally handing what's left to tomorrow. */
export function closeDay(state: PrioritiesState, date: string, note: string, carryToTomorrow: boolean, now: number = Date.now()): PrioritiesState {
  const plan = planFor(state, date);
  let next = put(state, date, { ...plan, close: { note: note.trim().slice(0, 400), at: now } });
  if (carryToTomorrow) {
    const tomorrow = addDays(date, 1);
    for (const it of plan.items.filter((i) => !i.done)) next = addItem(next, tomorrow, it.text);
  }
  return next;
}

/** Drops days older than the last couple of weeks so the value stays small. */
export function prune(state: PrioritiesState, today: string): PrioritiesState {
  const oldest = addDays(today, -KEEP_DAYS);
  return Object.fromEntries(Object.entries(state).filter(([d]) => d >= oldest));
}
