import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useFocusTimer } from "@/hooks/useFocusTimer";
import { getMusicSlotEl, getMusicState, pauseMusic, playMusic, setMusicContainer, subscribeMusic } from "@/lib/focusMusic";

const PARKED: Partial<CSSStyleDeclaration> = { left: "-10000px", top: "0px", width: "200px", height: "200px", visibility: "visible" };

/** Lives at the app root so the music keeps playing across screens. It owns the
 * one YouTube iframe: parked off-screen normally, and laid exactly over the
 * full-screen timer's player slot while that is open (the player is meant to be
 * visible, so that's where you see the video itself). */
export function MusicHost() {
  const music = useSyncExternalStore(subscribeMusic, getMusicState, getMusicState);
  const timer = useFocusTimer();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMusicContainer(wrapRef.current);
    return () => setMusicContainer(null);
  }, []);

  // Follow the slot while the full-screen timer shows the player.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const apply = (style: Partial<CSSStyleDeclaration>) => Object.assign(wrap.style, style);
    if (music.slotMode !== "zen") {
      apply(PARKED);
      return;
    }
    let raf = 0;
    const follow = () => {
      const slot = getMusicSlotEl();
      if (slot) {
        const r = slot.getBoundingClientRect();
        apply({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
      }
      raf = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(raf);
  }, [music.slotMode]);

  // "Sincronizar con el bloque": music plays while a focus block runs and
  // pauses with the timer. Acts only when the timer's state changes, so pausing
  // the music by hand mid-block isn't undone a second later.
  const sync = music.config?.sync === true;
  const runKey = timer.status === "running" && timer.phase !== "break" ? "run" : "stop";
  const lastKey = useRef(runKey);
  useEffect(() => {
    if (lastKey.current === runKey) return;
    lastKey.current = runKey;
    if (!sync) return;
    if (runKey === "run") playMusic();
    else pauseMusic();
  }, [runKey, sync]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={wrapRef}
      aria-hidden={music.slotMode !== "zen"}
      className="pointer-events-auto fixed z-[69] overflow-hidden rounded-2xl bg-black"
      style={PARKED as React.CSSProperties}
    />,
    document.body,
  );
}
