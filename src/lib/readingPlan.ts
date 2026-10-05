import { BIBLE_BOOKS } from "@/data/bible/books";
import { CHAPTER_COUNTS } from "@/data/bible/chapterCounts";
import { parseISODate } from "./date";

/** A reading plan: a fixed run of chapters spread over a number of days. The
 * day's reading is whatever is still unread up to where you should be by now,
 * so a missed day never leaves a hole — it just rolls into the next. */

export const CONFIG_READING_PLAN = "reading_plan";

export interface PlanDef {
  id: string;
  name: string;
  blurb: string;
  /** Book abbreviations in reading order. */
  books: string[];
  /** Durations offered, in days; the first is the default. */
  options: number[];
}

const ALL = BIBLE_BOOKS.map((b) => b.abbrev);
const NT = BIBLE_BOOKS.filter((b) => b.testament === "NT").map((b) => b.abbrev);

export const PLANS: PlanDef[] = [
  { id: "marcos", name: "Marcos", blurb: "El evangelio más corto: directo y de acción.", books: ["mk"], options: [16, 8, 30] },
  { id: "juan", name: "Juan", blurb: "Quién es Jesús, contado con calma.", books: ["jo"], options: [21, 11, 30] },
  { id: "evangelios", name: "Los cuatro evangelios", blurb: "Mateo, Marcos, Lucas y Juan, de corrido.", books: ["mt", "mk", "lk", "jo"], options: [30, 60, 90] },
  { id: "proverbios", name: "Proverbios", blurb: "Un capítulo por día del mes.", books: ["prv"], options: [31] },
  { id: "salmos", name: "Salmos", blurb: "Oración y alabanza, 5 por día en un mes.", books: ["ps"], options: [30, 50, 75, 150] },
  { id: "nt", name: "Nuevo Testamento", blurb: "De Mateo a Apocalipsis.", books: NT, options: [90, 60, 180] },
  { id: "biblia", name: "La Biblia completa", blurb: "Génesis a Apocalipsis, a tu ritmo.", books: ALL, options: [365, 180, 730] },
];

export interface PlanChapter {
  abbrev: string;
  chapter: number;
  key: string;
}

export const chapterKey = (abbrev: string, chapter: number) => `${abbrev}:${chapter}`;

export function planDef(id: string): PlanDef | undefined {
  return PLANS.find((p) => p.id === id);
}

export function planChapters(id: string): PlanChapter[] {
  const def = planDef(id);
  if (!def) return [];
  const out: PlanChapter[] = [];
  for (const abbrev of def.books) {
    for (let chapter = 1; chapter <= (CHAPTER_COUNTS[abbrev] ?? 0); chapter++) out.push({ abbrev, chapter, key: chapterKey(abbrev, chapter) });
  }
  return out;
}

export interface PlanState {
  planId: string;
  days: number;
  /** ISO date day 1 falls on. */
  startDate: string;
  /** chapterKey()s marked as read. */
  done: string[];
}

/** Anything stored (or synced from another device) that isn't a valid plan is ignored. */
export function sanitizePlan(raw: unknown): PlanState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<PlanState>;
  if (typeof r.planId !== "string" || !planDef(r.planId)) return null;
  if (typeof r.startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.startDate)) return null;
  const days = Number(r.days);
  if (!Number.isInteger(days) || days < 1 || days > 1000) return null;
  const done = Array.isArray(r.done) ? [...new Set(r.done.filter((k): k is string => typeof k === "string"))] : [];
  return { planId: r.planId, days, startDate: r.startDate, done };
}

export function newPlan(planId: string, days: number, startDate: string): PlanState | null {
  return sanitizePlan({ planId, days, startDate, done: [] });
}

const dayMs = 24 * 60 * 60 * 1000;

/** 1-based day of the plan for `today`, clamped to the plan's length (before the start counts as day 1). */
export function planDayNumber(state: PlanState, today: string): number {
  const diff = Math.round((parseISODate(today).getTime() - parseISODate(state.startDate).getTime()) / dayMs) + 1;
  return Math.min(Math.max(diff, 1), state.days);
}

/** How many chapters should be read by the end of day `day` — spread as evenly as the numbers allow. */
export function chaptersDueBy(total: number, days: number, day: number): number {
  return Math.ceil((total * Math.min(Math.max(day, 0), days)) / days);
}

export interface PlanProgress {
  total: number;
  doneCount: number;
  dayNumber: number;
  finished: boolean;
  /** Unread chapters you owe by now, in order — today's reading, catch-up included. */
  today: PlanChapter[];
  /** Of those, how many are left over from earlier days. */
  behind: number;
  /** The next unread chapter, for reading ahead when you're caught up. */
  nextUnread: PlanChapter | null;
}

export function planProgress(state: PlanState, today: string): PlanProgress {
  const chapters = planChapters(state.planId);
  const doneSet = new Set(state.done);
  const unread = chapters.filter((c) => !doneSet.has(c.key));
  const total = chapters.length;
  const doneCount = total - unread.length;
  const dayNumber = planDayNumber(state, today);
  const owed = Math.max(0, chaptersDueBy(total, state.days, dayNumber) - doneCount);
  const todayShare = chaptersDueBy(total, state.days, dayNumber) - chaptersDueBy(total, state.days, dayNumber - 1);
  return {
    total,
    doneCount,
    dayNumber,
    finished: total > 0 && unread.length === 0,
    today: unread.slice(0, owed),
    behind: Math.max(0, owed - todayShare),
    nextUnread: unread[0] ?? null,
  };
}

/** Marks a chapter read, or takes the mark back. */
export function toggleRead(state: PlanState, key: string): PlanState {
  const done = state.done.includes(key) ? state.done.filter((k) => k !== key) : [...state.done, key];
  return { ...state, done };
}

export function planIncludes(state: PlanState, abbrev: string, chapter: number): boolean {
  return planDef(state.planId)?.books.includes(abbrev) === true && chapter >= 1 && chapter <= (CHAPTER_COUNTS[abbrev] ?? 0);
}
