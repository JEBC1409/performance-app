import { useEffect, useSyncExternalStore } from "react";
import { getMusicState, subscribeMusic } from "@/lib/focusMusic";
import { useCoverPalette } from "@/lib/coverColors";
import { setThemeTint } from "@/lib/uiPrefs";
import { CoverBackdrop } from "./CoverBackdrop";

/** `calm` quiets the grid/glow/grain further, for screens (like Login) that
 * want a sober backdrop rather than the app's usual bolder treatment.
 * While a song plays the backdrop is a tint of its cover instead (and the title bar follows). */
export function AmbientBackground({ calm = false }: { calm?: boolean } = {}) {
  const music = useSyncExternalStore(subscribeMusic, getMusicState, getMusicState);
  const cover = useCoverPalette(music.config && music.started ? music.videoId : "");
  const tint = cover?.[0];
  useEffect(() => {
    setThemeTint(tint ?? null);
    return () => setThemeTint(null);
  }, [tint]);

  return (
    <div className={`ambient-bg ${calm ? "ambient-bg-calm" : ""}`} aria-hidden="true">
      {cover ? (
        <CoverBackdrop colors={cover} ambient />
      ) : (
        <>
          <div className="ambient-glow" />
          <div className="ambient-grid" />
        </>
      )}
      <div className="ambient-grain" />
    </div>
  );
}
