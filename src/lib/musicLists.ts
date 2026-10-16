import { useSyncExternalStore } from "react";
import { parseYouTubeSource } from "./youtube";

/** Named playlists for Focus ("Estudio", "Gimnasio"): one tap to switch between
 * them instead of pasting a link every time. Kept on this device. */
const KEY = "performance_focus_music_lists_v1";
export const MAX_LISTS = 8;

export interface SavedList {
  name: string;
  url: string;
}

export function sanitizeLists(raw: unknown): SavedList[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedList[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const { name, url } = r as Partial<SavedList>;
    if (typeof name !== "string" || typeof url !== "string" || !name.trim() || !parseYouTubeSource(url)) continue;
    if (out.some((l) => l.url === url.trim())) continue;
    out.push({ name: name.trim().slice(0, 24), url: url.trim() });
    if (out.length >= MAX_LISTS) break;
  }
  return out;
}

/** Adds a list (or renames it when the link is already saved). Null when the link isn't YouTube's or the name is empty. */
export function withList(lists: SavedList[], name: string, url: string): SavedList[] | null {
  const n = name.trim().slice(0, 24);
  const u = url.trim();
  if (!n || !parseYouTubeSource(u)) return null;
  const rest = lists.filter((l) => l.url !== u);
  return [...rest, { name: n, url: u }].slice(-MAX_LISTS);
}

function read(): SavedList[] {
  try {
    return sanitizeLists(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  } catch {
    return [];
  }
}

let lists = read();
const listeners = new Set<() => void>();

function set(next: SavedList[]): void {
  lists = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* it just won't be remembered */
  }
  listeners.forEach((l) => l());
}

export function saveList(name: string, url: string): boolean {
  const next = withList(lists, name, url);
  if (!next) return false;
  set(next);
  return true;
}

export function removeList(url: string): void {
  set(lists.filter((l) => l.url !== url));
}

export function useMusicLists(): SavedList[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => lists,
    () => lists,
  );
}
