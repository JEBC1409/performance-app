import { useSyncExternalStore } from "react";

/** Whether the lyrics show next to the song in the full-screen timer. Shared
 * (and remembered) because both the music card and the screen's layout depend on it. */
const KEY = "performance_focus_lyrics_v1";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}

let current = read();

export function setLyricsPref(on: boolean): void {
  current = on;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* it just won't be remembered */
  }
  listeners.forEach((l) => l());
}

export function useLyricsPref(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => current,
  );
}
