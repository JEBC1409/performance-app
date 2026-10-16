import { addDays } from "./date";

/** How you feel each day, 1 (bad) to 5 (great): one tap, kept in the synced
 * config as { "2026-10-14": 4 }. Used to see what actually moves it. */
export const CONFIG_MOOD = "mood";
export const KEEP_DAYS = 200;

export const MOODS = [
  { value: 1, emoji: "😞", label: "Mal" },
  { value: 2, emoji: "🙁", label: "Bajo" },
  { value: 3, emoji: "😐", label: "Normal" },
  { value: 4, emoji: "🙂", label: "Bien" },
  { value: 5, emoji: "😄", label: "Genial" },
] as const;

export type MoodMap = Record<string, number>;

export function sanitizeMood(raw: unknown): MoodMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: MoodMap = {};
  for (const [d, v] of Object.entries(raw as Record<string, unknown>)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5) out[d] = v;
  }
  return out;
}

/** Sets (or, with null, clears) a day, and forgets entries older than KEEP_DAYS. */
export function withMood(map: MoodMap, date: string, value: number | null, today: string): MoodMap {
  const cutoff = addDays(today, -KEEP_DAYS);
  const next: MoodMap = {};
  for (const [d, v] of Object.entries(map)) if (d >= cutoff) next[d] = v;
  if (value == null) delete next[date];
  else if (value >= 1 && value <= 5) next[date] = Math.round(value);
  return next;
}
