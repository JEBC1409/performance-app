import type { CSSProperties } from "react";
import { expandPalette } from "@/lib/coverColors";
import type { RGB } from "@/lib/coverColors";

const BLOBS = 6;

/** Apple Music's lyrics backdrop: a tint of the cover's colour with big soft blobs of its other
 * colours flowing slowly past one another. No blur filter (it is the gradients that are soft),
 * only transforms, so it stays cheap on a phone. The colours are custom properties, so a new
 * song eases across. `ambient` is the quieter version behind the whole app. */
export function CoverBackdrop({ colors, ambient = false }: { colors: RGB[]; ambient?: boolean }) {
  const all = expandPalette(colors, BLOBS);
  const style = Object.fromEntries(all.map((c, i) => [`--cv${i + 1}`, `rgb(${c.join(" ")})`])) as CSSProperties;
  return (
    <div className={`cover-backdrop ${ambient ? "cover-ambient" : ""}`} aria-hidden style={style}>
      {all.map((_, i) => (
        <span key={i} className={`cover-blob cover-blob-${i + 1}`} />
      ))}
    </div>
  );
}
