import { useEffect, useState, useSyncExternalStore } from "react";
import { useLyrics } from "@/hooks/useLyrics";
import { getMusicState, getMusicTime, subscribeMusic } from "@/lib/focusMusic";
import { activeLineIndex } from "@/lib/lyrics";
import { getLyricsOffset } from "@/lib/lyricsOffset";
import { useLyricsPref } from "@/lib/lyricsPref";
import { subscribeTick } from "@/lib/ticker";

/** The line being sung right now (or "♪" in an instrumental gap), for places too
 * small for the whole lyrics — like the floating timer. Null when there's no
 * music playing, lyrics are off, or none were found. */
export function useCurrentLyric(): string | null {
  const m = useSyncExternalStore(subscribeMusic, getMusicState, getMusicState);
  const wanted = useLyricsPref();
  const enabled = wanted && m.started && m.playing && !!m.videoId;
  const { status, lines } = useLyrics(m.videoId, m.title, m.author, enabled);
  const [index, setIndex] = useState(-1);

  const offset = getLyricsOffset(m.videoId);
  useEffect(() => {
    if (!enabled || status !== "found") return;
    const tick = () => setIndex((cur) => {
      const next = activeLineIndex(lines, getMusicTime().t + 0.25 + offset);
      return cur === next ? cur : next;
    });
    tick();
    return subscribeTick(tick);
  }, [enabled, status, lines, offset]);

  if (!enabled || status !== "found" || index < 0 || index >= lines.length) return null;
  return lines[index].text || "♪";
}
