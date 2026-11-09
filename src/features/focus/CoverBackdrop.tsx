import type { CSSProperties } from "react";
import type { RGB } from "@/lib/coverColors";

/** Apple Music's lyrics backdrop: big soft blobs of the cover's own colours drifting
 * slowly. No blur filter (it is the gradients that are soft), only transforms, so it
 * stays cheap on a phone. The colours are custom properties, so a new song eases across. */
export function CoverBackdrop({ colors }: { colors: RGB[] }) {
  const at = (i: number) => colors[i % colors.length].join(" ");
  const style = { "--cv1": `rgb(${at(0)})`, "--cv2": `rgb(${at(1)})`, "--cv3": `rgb(${at(2)})`, "--cv4": `rgb(${at(3)})` } as CSSProperties;
  return (
    <div className="cover-backdrop" aria-hidden style={style}>
      <span className="cover-blob cover-blob-1" />
      <span className="cover-blob cover-blob-2" />
      <span className="cover-blob cover-blob-3" />
      <span className="cover-blob cover-blob-4" />
    </div>
  );
}
