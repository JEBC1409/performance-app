import { useEffect, useState } from "react";
import { cleanTrack, fetchLyrics } from "@/lib/lyrics";
import type { LyricLine } from "@/lib/lyrics";
import { getMusicTime } from "@/lib/focusMusic";

export type LyricsStatus = "idle" | "loading" | "found" | "none" | "error";

/** Synced lyrics for the current song. Looks them up once per video, and not at
 * all while `enabled` is false (so a hidden panel costs no requests). */
export function useLyrics(videoId: string, title: string, author: string, enabled: boolean): { status: LyricsStatus; lines: LyricLine[] } {
  const [result, setResult] = useState<{ key: string; status: LyricsStatus; lines: LyricLine[] }>({ key: "", status: "idle", lines: [] });
  const key = videoId && title ? videoId : "";

  useEffect(() => {
    if (!enabled || !key) return;
    const ctl = new AbortController();
    const { track, artist } = cleanTrack(title, author);
    // The song's length helps tell the studio cut from a live or sped-up one,
    // but the player can take a moment to report it.
    const timer = window.setTimeout(() => {
      setResult({ key, status: "loading", lines: [] });
      fetchLyrics(key, track, artist, getMusicTime().duration, ctl.signal)
        .then((lines) => setResult({ key, status: lines ? "found" : "none", lines: lines ?? [] }))
        .catch((err: unknown) => {
          if (ctl.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
          setResult({ key, status: "error", lines: [] });
        });
    }, 600);
    return () => {
      window.clearTimeout(timer);
      ctl.abort();
    };
  }, [enabled, key, title, author]);

  if (!enabled || !key) return { status: "idle", lines: [] };
  // Until this song's lookup has started, don't show the previous song's lyrics.
  if (result.key !== key) return { status: "loading", lines: [] };
  return { status: result.status, lines: result.lines };
}
