import { useSyncExternalStore } from "react";

/** Per-song correction for the lyrics' timing, in seconds. Positive = the lyrics
 * run earlier. YouTube's cut of a song rarely matches the studio one the lyrics
 * were timed against, so each song can be nudged and remembers it. */
const KEY = "performance_lyrics_offset_v1";
export const OFFSET_STEP = 0.5;
export const OFFSET_LIMIT = 10;

let offsets: Record<string, number> = read();
const listeners = new Set<() => void>();

function read(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [id, v] of Object.entries(raw)) if (typeof v === "number" && Number.isFinite(v) && v !== 0) out[id] = Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, v));
    return out;
  } catch {
    return {};
  }
}

function write(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(offsets));
  } catch {
    /* it just won't be remembered */
  }
}

export function getLyricsOffset(videoId: string): number {
  return offsets[videoId] ?? 0;
}

/** Sets a song's offset (rounded to the step; 0 forgets it). */
export function setLyricsOffset(videoId: string, seconds: number): void {
  if (!videoId) return;
  const v = Math.round(Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, seconds)) / OFFSET_STEP) * OFFSET_STEP;
  const next = { ...offsets };
  if (v === 0) delete next[videoId];
  else next[videoId] = v;
  offsets = next;
  write();
  listeners.forEach((l) => l());
}

export function useLyricsOffset(videoId: string): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => getLyricsOffset(videoId),
    () => 0,
  );
}

export function formatOffset(seconds: number): string {
  if (seconds === 0) return "0 s";
  return `${seconds > 0 ? "+" : "−"}${Math.abs(seconds).toFixed(1)} s`;
}
