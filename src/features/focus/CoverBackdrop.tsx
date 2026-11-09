import type { CSSProperties } from "react";
import { expandPalette } from "@/lib/coverColors";
import type { RGB } from "@/lib/coverColors";

const BLOBS = 6;

/** Apple Music's lyrics backdrop: big soft blobs of the cover's own colours flowing slowly
 * past one another. No blur filter (it is the gradients that are soft), only transforms, so it
 * stays cheap on a phone. The colours are custom properties, so a new song eases across. */
export function CoverBackdrop({ colors }: { colors: RGB[] }) {
  const all = expandPalette(colors, BLOBS);
  const style = Object.fromEntries(all.map((c, i) => [`--cv${i + 1}`, `rgb(${c.join(" ")})`])) as CSSProperties;
  return (
    <div className="cover-backdrop" aria-hidden style={style}>
      {all.map((_, i) => (
        <span key={i} className={`cover-blob cover-blob-${i + 1}`} />
      ))}
    </div>
  );
}
