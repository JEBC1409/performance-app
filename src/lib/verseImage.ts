import { readAccentRgb } from "./uiPrefs";

/** A verse as a picture to share: portrait card in the app's colours. */

export const IMAGE_W = 1080;
export const IMAGE_H = 1350;

/** Greedy word wrap to `maxWidth` using `measure` for the width of a string. */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && measure(next) > maxWidth) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderVerseImage(reference: string, text: string): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_W;
  canvas.height = IMAGE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const accent = readAccentRgb();
  const display = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "Georgia, serif";

  ctx.fillStyle = "#08080b";
  ctx.fillRect(0, 0, IMAGE_W, IMAGE_H);
  const glow = ctx.createRadialGradient(IMAGE_W * 0.15, 0, 0, IMAGE_W * 0.15, 0, IMAGE_H * 0.85);
  glow.addColorStop(0, `rgb(${accent.base} / 0.42)`);
  glow.addColorStop(1, `rgb(${accent.base} / 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, IMAGE_W, IMAGE_H);
  ctx.strokeStyle = `rgb(${accent.base} / 0.5)`;
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, IMAGE_W - 96, IMAGE_H - 96);

  const pad = 120;
  const maxW = IMAGE_W - pad * 2;
  let size = 64;
  let lines: string[] = [];
  for (; size >= 30; size -= 2) {
    ctx.font = `600 ${size}px ${display}`;
    lines = wrapText(text, maxW, (s) => ctx.measureText(s).width);
    if (lines.length * size * 1.35 <= 760) break;
  }
  const lineH = size * 1.35;
  const top = (IMAGE_H - lines.length * lineH) / 2 - 40;
  ctx.fillStyle = "#f4f4f7";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, IMAGE_W / 2, top + i * lineH));

  ctx.fillStyle = "#e2b96f";
  ctx.font = `600 40px ${display}`;
  ctx.fillText(reference, IMAGE_W / 2, top + lines.length * lineH + 56);
  ctx.fillStyle = "rgb(244 244 247 / 0.4)";
  ctx.font = `600 24px ${display}`;
  ctx.fillText("P E R F O R M A N C E", IMAGE_W / 2, IMAGE_H - 120);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/** Opens the share sheet with the picture where the device has one (phones),
 * else saves it as a file. */
export async function shareVerse(reference: string, text: string): Promise<"shared" | "downloaded" | "failed"> {
  try {
    const blob = await renderVerseImage(reference, text);
    if (!blob) return "failed";
    const file = new File([blob], `${reference.replace(/[^\p{L}\p{N}]+/gu, "-")}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: reference });
        return "shared";
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return "shared"; // closed the sheet: not an error
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    return "downloaded";
  } catch {
    return "failed";
  }
}
