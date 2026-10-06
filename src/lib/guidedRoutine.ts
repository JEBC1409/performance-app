import type { RutinaItem } from "@/data/gym";

/** The morning routine as a flat run of sets, one screen each. */

export const REST_SEC = 15;
export const CONFIG_MORNING_ROUTINE = "morning_routine";

export interface GuidedStep {
  exercise: string;
  note: string;
  /** "20-30 seg", "10/lado"… as written in the routine. */
  load: string;
  setNo: number;
  setsTotal: number;
  /** Seconds to hold, for timed sets; null when it's counted in reps. */
  holdSec: number | null;
}

/** The longer end of a "20-30 seg" style range; null for rep-based loads ("10/lado"). */
export function holdSeconds(load: string): number | null {
  if (!/seg/i.test(load)) return null;
  const nums = (load.match(/\d+/g) ?? []).map(Number);
  return nums.length ? Math.max(...nums) : null;
}

export function buildSteps(items: RutinaItem[]): GuidedStep[] {
  const steps: GuidedStep[] = [];
  for (const it of items) {
    for (let setNo = 1; setNo <= it.series; setNo++) {
      steps.push({ exercise: it.ex, note: it.nota, load: it.carga, setNo, setsTotal: it.series, holdSec: holdSeconds(it.carga) });
    }
  }
  return steps;
}

/** Days the routine was completed, kept sorted, unique and short. */
export function sanitizeDays(value: unknown): string[] {
  const raw = (value as { days?: unknown } | null)?.days;
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort().slice(-120);
}

export function withDay(days: string[], date: string): string[] {
  return sanitizeDays({ days: [...days, date] });
}

/** Finds the habit a finished routine should tick, if you track one for it. */
export function routineHabit<T extends { label: string }>(defs: T[]): T | undefined {
  return defs.find((d) => /rutina|ayuno|abdom|core|matutin/i.test(d.label));
}
