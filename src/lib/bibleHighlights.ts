/** Verse highlights: a colour per verse, kept in the synced app config. */
export const CONFIG_BIBLE_HIGHLIGHTS = "bible_highlights";

export const HIGHLIGHT_COLORS = [
  { key: "amarillo", label: "Amarillo", rgb: "234 179 8" },
  { key: "verde", label: "Verde", rgb: "47 174 102" },
  { key: "azul", label: "Azul", rgb: "59 130 246" },
  { key: "rosa", label: "Rosa", rgb: "236 72 153" },
] as const;

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]["key"];
export type Highlights = Record<string, HighlightColor>;

export const verseKey = (abbrev: string, chapter: number, verse: number) => `${abbrev}.${chapter}.${verse}`;

const VALID = new Set<string>(HIGHLIGHT_COLORS.map((c) => c.key));

/** Whatever was stored → a clean map (unknown colours and keys are dropped). */
export function sanitizeHighlights(raw: unknown): Highlights {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Highlights = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (/^[a-z0-9]+\.\d+\.\d+$/i.test(k) && typeof v === "string" && VALID.has(v)) out[k] = v as HighlightColor;
  }
  return out;
}

export function withHighlight(map: Highlights, key: string, color: HighlightColor | null): Highlights {
  const next = { ...map };
  if (color) next[key] = color;
  else delete next[key];
  return next;
}

export function colorRgb(color: HighlightColor): string {
  return HIGHLIGHT_COLORS.find((c) => c.key === color)?.rgb ?? "234 179 8";
}
