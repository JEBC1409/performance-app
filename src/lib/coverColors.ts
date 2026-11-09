import { useEffect, useState } from "react";

export type RGB = [number, number, number];

const SIZE_W = 48;
const SIZE_H = 27;
const MAX_COLORS = 4;
/** Two picked colours must be at least this far apart (RGB distance) to count as different. */
const MIN_DISTANCE = 70;

function toHsl([r, g, b]: RGB): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l];
}

function fromHsl(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Brings a picked colour into a range that is vivid but dark enough for white text on top. */
export function tune(rgb: RGB): RGB {
  const [h, s, l] = toHsl(rgb);
  const sat = Math.min(1, Math.max(s, 0.5) * 1.3);
  let light = Math.min(0.55, Math.max(0.32, l));
  let out = fromHsl(h, sat, light);
  // HSL lightness lies for yellows and greens (they look far brighter than blues at the same L),
  // so also cap the perceived brightness.
  while (perceived(out) > MAX_PERCEIVED && light > 0.14) {
    light -= 0.02;
    out = fromHsl(h, sat, light);
  }
  return out;
}

const MAX_PERCEIVED = 0.56;
const perceived = ([r, g, b]: RGB) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const dist = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** The cover's main colours from RGBA pixels: the most present, most colourful ones,
 * skipping the black/white bars and the grays that only add mud. Returns 0..MAX_COLORS colours,
 * already tuned for a dark backdrop. Pure so it can be tested without a canvas. */
export function pickPalette(data: ArrayLike<number>): RGB[] {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const [, s, l] = toHsl([r, g, b]);
    if (l < 0.1 || l > 0.93 || s < 0.12) continue;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const cur = buckets.get(key);
    if (cur) {
      cur.n++;
      cur.r += r;
      cur.g += g;
      cur.b += b;
    } else buckets.set(key, { n: 1, r, g, b });
  }
  const ranked = [...buckets.values()]
    .map((c) => {
      const avg: RGB = [Math.round(c.r / c.n), Math.round(c.g / c.n), Math.round(c.b / c.n)];
      return { avg, score: c.n * (0.4 + toHsl(avg)[1]) };
    })
    .sort((a, b) => b.score - a.score);
  const out: RGB[] = [];
  for (const c of ranked) {
    if (out.every((o) => dist(o, c.avg) >= MIN_DISTANCE)) out.push(c.avg);
    if (out.length === MAX_COLORS) break;
  }
  return out.map(tune);
}

const cache = new Map<string, RGB[]>();

/** Loads the image and reads its colours. Resolves [] when the image can't be read
 * (offline, or a host that doesn't allow reading its pixels). */
export function loadCoverPalette(url: string): Promise<RGB[]> {
  const hit = cache.get(url);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SIZE_W;
        canvas.height = SIZE_H;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve([]);
        ctx.drawImage(img, 0, 0, SIZE_W, SIZE_H);
        const palette = pickPalette(ctx.getImageData(0, 0, SIZE_W, SIZE_H).data);
        if (palette.length) cache.set(url, palette);
        resolve(palette);
      } catch {
        resolve([]); // tainted canvas
      }
    };
    img.onerror = () => resolve([]);
    img.src = url;
  });
}

export const coverUrl = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

/** The colours of the song's cover, or null until they're known / when they can't be read. */
export function useCoverPalette(videoId: string): RGB[] | null {
  const [state, setState] = useState<{ id: string; palette: RGB[] | null }>({ id: "", palette: null });
  useEffect(() => {
    if (!videoId) return;
    let alive = true;
    void loadCoverPalette(coverUrl(videoId)).then((p) => {
      if (alive) setState({ id: videoId, palette: p.length ? p : null });
    });
    return () => {
      alive = false;
    };
  }, [videoId]);
  // Keep the previous colours while the next song's load, so the backdrop eases across instead of blinking off.
  return videoId ? state.palette : null;
}
