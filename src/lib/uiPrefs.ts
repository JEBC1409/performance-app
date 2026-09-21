/** Look-and-feel preferences: accent color, "sobrio" (low-glow) mode and the
 * order of the cards on Hoy. Stored per device in localStorage and applied to
 * <html> as data attributes, so the CSS does the rest. */

export type Accent = "red" | "gold" | "blue" | "violet";

export const ACCENTS: { key: Accent; label: string; swatch: string }[] = [
  { key: "red", label: "Rojo", swatch: "#df2531" },
  { key: "gold", label: "Dorado", swatch: "#e2b96f" },
  { key: "blue", label: "Azul", swatch: "#3b82f6" },
  { key: "violet", label: "Violeta", swatch: "#8b5cf6" },
];

export type HomeCard = "rings" | "session" | "streak" | "habits" | "stats" | "verse";

export const HOME_CARDS: { key: HomeCard; label: string }[] = [
  { key: "rings", label: "Anillos del día" },
  { key: "session", label: "Sesión del día" },
  { key: "streak", label: "Racha" },
  { key: "habits", label: "Hábitos de hoy" },
  { key: "stats", label: "Estadísticas" },
  { key: "verse", label: "Versículo" },
];

export interface UiPrefs {
  accent: Accent;
  calm: boolean;
  homeOrder: HomeCard[];
}

const KEY = "performance_ui_prefs_v1";
const DEFAULT_ORDER = HOME_CARDS.map((c) => c.key);
export const DEFAULT_UI_PREFS: UiPrefs = { accent: "red", calm: false, homeOrder: DEFAULT_ORDER };

/** Known cards only, each once, in the saved order; anything new is appended. */
export function normalizeOrder(saved: unknown): HomeCard[] {
  const known = new Set<string>(DEFAULT_ORDER);
  const out: HomeCard[] = [];
  if (Array.isArray(saved)) {
    for (const k of saved) if (typeof k === "string" && known.has(k) && !out.includes(k as HomeCard)) out.push(k as HomeCard);
  }
  for (const k of DEFAULT_ORDER) if (!out.includes(k)) out.push(k);
  return out;
}

export function parseUiPrefs(raw: string | null): UiPrefs {
  if (!raw) return DEFAULT_UI_PREFS;
  try {
    const r = JSON.parse(raw) as Partial<UiPrefs>;
    return {
      accent: ACCENTS.some((a) => a.key === r.accent) ? (r.accent as Accent) : "red",
      calm: r.calm === true,
      homeOrder: normalizeOrder(r.homeOrder),
    };
  } catch {
    return DEFAULT_UI_PREFS;
  }
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

let prefs: UiPrefs = parseUiPrefs(readRaw());
const listeners = new Set<() => void>();

export function getUiPrefs(): UiPrefs {
  return prefs;
}

export function subscribeUiPrefs(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Puts the prefs on <html>; safe to call before React renders (no flash). */
export function applyUiPrefs(p: UiPrefs = prefs): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (p.accent === "red") delete root.dataset.accent;
  else root.dataset.accent = p.accent;
  if (p.calm) root.dataset.calm = "true";
  else delete root.dataset.calm;
}

export function setUiPrefs(patch: Partial<UiPrefs>): void {
  prefs = { ...prefs, ...patch, homeOrder: normalizeOrder(patch.homeOrder ?? prefs.homeOrder) };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* it just won't persist */
  }
  applyUiPrefs(prefs);
  listeners.forEach((l) => l());
}
