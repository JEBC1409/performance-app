import { useEffect, useSyncExternalStore } from "react";
import { getMusicState, subscribeMusic } from "@/lib/focusMusic";
import { useCoverPalette } from "@/lib/coverColors";
import { setThemeTint } from "@/lib/uiPrefs";

/** While a song plays, the window's title bar (and the phone's status bar) takes a tint of its cover,
 * on whatever screen you are, instead of staying a black stripe. Only the bar: the page itself is untouched. */
export function useCoverTitleBar(): void {
  const music = useSyncExternalStore(subscribeMusic, getMusicState, getMusicState);
  const cover = useCoverPalette(music.config && music.started ? music.videoId : "");
  const tint = cover?.[0];
  useEffect(() => {
    setThemeTint(tint ?? null);
    return () => setThemeTint(null);
  }, [tint]);
}
