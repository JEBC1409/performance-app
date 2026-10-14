import { useEffect, useRef, useState } from "react";
import { getMusicTime, seekMusic } from "@/lib/focusMusic";
import { activeLineIndex } from "@/lib/lyrics";
import type { LyricLine } from "@/lib/lyrics";
import type { LyricsStatus } from "@/hooks/useLyrics";

const MASK = "linear-gradient(to bottom, transparent 0%, black 12%, black 78%, transparent 100%)";

// Where the lyrics sit on the timer screen: beside the song on a wide screen,
// on a row of their own below it on a tablet, under it on a phone.
const PLACE = "w-full max-w-[640px] flex-none max-md:h-[29vh] max-md:min-h-[200px] md:order-last md:basis-full lg:order-none lg:min-w-0 lg:flex-1 lg:basis-0";
// After you scroll by hand, the lyrics stay where you put them for a moment.
const MANUAL_HOLD_MS = 3500;

const MESSAGES: Record<Exclude<LyricsStatus, "found">, string> = {
  idle: "",
  loading: "Buscando la letra…",
  none: "No encontré la letra de esta canción.",
  error: "No pude cargar la letra. Revisa tu conexión.",
};

/** Time-synced lyrics, Apple Music style: the line being sung is big and bright,
 * the rest fade away, and the list glides to keep the current line centred.
 * Tap a line to jump the song there. Remount (key) per song to start at the top. */
export function Lyrics({ lines, status, playing }: { lines: LyricLine[]; status: LyricsStatus; playing: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const heldUntil = useRef(0);
  const [active, setActive] = useState(-1);

  // Follow the song's clock. Cheap: state only changes when the line does.
  useEffect(() => {
    if (status !== "found") return;
    const tick = () => {
      if (document.hidden) return;
      // A small lead so the line lights up as it's about to be sung, not after.
      const next = activeLineIndex(lines, getMusicTime().t + 0.25);
      setActive((cur) => (cur === next ? cur : next));
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [lines, status]);

  // Keep the current line centred.
  useEffect(() => {
    const box = boxRef.current;
    const el = active >= 0 ? lineRefs.current[active] : null;
    if (!box || !el || Date.now() < heldUntil.current) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2, behavior: reduce ? "auto" : "smooth" });
  }, [active]);

  if (status !== "found") {
    const text = MESSAGES[status];
    return text ? (
      <p role="status" className={`${PLACE} px-3 py-6 text-left text-[18px] font-semibold text-[var(--color-muted)] lg:text-[22px]`}>
        {text}
      </p>
    ) : null;
  }

  const hold = () => {
    heldUntil.current = Date.now() + MANUAL_HOLD_MS;
  };

  return (
    <div
      ref={boxRef}
      onWheel={hold}
      onTouchMove={hold}
      aria-label="Letra"
      className={`${PLACE} no-scrollbar relative overflow-y-auto overscroll-contain md:h-[360px] lg:h-[min(74vh,700px)]`}
      style={{ maskImage: MASK, WebkitMaskImage: MASK }}
    >
      <div aria-hidden className="h-[16%]" />
      <ul className="flex flex-col gap-1.5 px-3 text-left">
        {lines.map((l, i) => {
          const dist = Math.abs(i - active);
          const on = i === active;
          return (
            <li key={`${l.t}-${i}`}>
              <button
                ref={(el) => {
                  lineRefs.current[i] = el;
                }}
                onClick={() => {
                  seekMusic(l.t);
                  heldUntil.current = 0;
                  setActive(i);
                }}
                aria-current={on ? "true" : undefined}
                className="block w-full origin-left rounded-xl py-1.5 text-left text-[25px] font-bold leading-[1.18] tracking-tight text-[var(--color-ink)] lg:text-[34px]"
                style={{
                  opacity: on ? 1 : dist === 1 ? 0.5 : 0.26,
                  transform: `scale(${on ? 1 : 0.86})`,
                  // Lines further from the one being sung go soft, as in Apple Music.
                  filter: !on && dist >= 2 && dist <= 8 ? `blur(${Math.min(dist - 1, 3) * 0.6}px)` : undefined,
                  transition: "opacity 350ms ease-out, transform 350ms ease-out, filter 350ms ease-out",
                  textShadow: on && playing ? "0 0 28px rgb(var(--accent-rgb) / 0.4)" : undefined,
                }}
              >
                {l.text || <span aria-label="Instrumental">♪</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <div aria-hidden className="h-[42%]" />
    </div>
  );
}
