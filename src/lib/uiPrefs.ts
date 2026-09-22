/** Look-and-feel preferences: accent color, "sobrio" (low-glow) mode and the
 * order of the cards on Hoy. Stored per device in localStorage and applied to
 * <html> as data attributes, so the CSS does the rest. */

export type Accent = "red" | "gold" | "blue" | "violet";
export type Theme = "dark" | "light" | "auto";

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

/** Screens that can sit in the mobile bottom bar (the rest live under "Más"). */
export type NavKey = "hoy" | "entreno" | "habitos" | "datos" | "horario" | "focus" | "kairos" | "mouredev" | "perfil";

export const NAV_TABS: { key: NavKey; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "entreno", label: "Entreno" },
  { key: "habitos", label: "Hábitos" },
  { key: "datos", label: "Datos" },
  { key: "horario", label: "Horario" },
  { key: "focus", label: "Focus" },
  { key: "kairos", label: "Oración" },
  { key: "mouredev", label: "MoureDev" },
  { key: "perfil", label: "Perfil" },
];

export const NAV_SLOTS = 4;
export const DEFAULT_NAV: NavKey[] = ["hoy", "entreno", "habitos", "datos"];

/** Known screens only, each once, at most NAV_SLOTS, at least 2; else the default. */
export function normalizeNav(saved: unknown): NavKey[] {
  const known = new Set<string>(NAV_TABS.map((t) => t.key));
  const out: NavKey[] = [];
  if (Array.isArray(saved)) for (const k of saved) if (typeof k === "string" && known.has(k) && !out.includes(k as NavKey)) out.push(k as NavKey);
  const trimmed = out.slice(0, NAV_SLOTS);
  return trimmed.length >= 2 ? trimmed : DEFAULT_NAV;
}

export interface UiPrefs {
  accent: Accent;
  theme: Theme;
  calm: boolean;
  homeOrder: HomeCard[];
  navTabs: NavKey[];
}

const KEY = "performance_ui_prefs_v1";
const DEFAULT_ORDER = HOME_CARDS.map((c) => c.key);
export const DEFAULT_UI_PREFS: UiPrefs = { accent: "red", theme: "dark", calm: false, homeOrder: DEFAULT_ORDER, navTabs: DEFAULT_NAV };

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
      theme: r.theme === "light" || r.theme === "auto" ? r.theme : "dark",
      calm: r.calm === true,
      homeOrder: normalizeOrder(r.homeOrder),
      navTabs: normalizeNav(r.navTabs),
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

let autoListener = false;

/** "auto" follows the system's light/dark setting. */
export function resolveTheme(theme: Theme): "dark" | "light" {
  if (theme !== "auto") return theme;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** Puts the prefs on <html>; safe to call before React renders (no flash). */
export function applyUiPrefs(p: UiPrefs = prefs): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (p.accent === "red") delete root.dataset.accent;
  else root.dataset.accent = p.accent;
  if (p.calm) root.dataset.calm = "true";
  else delete root.dataset.calm;
  const theme = resolveTheme(p.theme);
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f4f4f7" : "#000000");
  if (!autoListener && typeof window !== "undefined" && window.matchMedia) {
    autoListener = true;
    window.matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", () => {
      if (prefs.theme === "auto") applyUiPrefs(prefs);
    });
  }
}

/** The live accent RGB triplets ("223 37 49") straight off <html> — for the
 * rare spot that can't lean on `var(--accent-rgb)` in CSS, like Focus's
 * Picture-in-Picture mini timer: its document-PiP window is a separate
 * `Document`, so a custom property set on the main page's :root doesn't
 * reach it, and its canvas fallback needs a literal color string anyway. */
export function readAccentRgb(): { base: string; light: string; dark: string } {
  const fallback = { base: "223 37 49", light: "255 95 105", dark: "140 15 25" };
  if (typeof document === "undefined") return fallback;
  const cs = getComputedStyle(document.documentElement);
  const pick = (name: string, dflt: string) => cs.getPropertyValue(name).trim() || dflt;
  return { base: pick("--accent-rgb", fallback.base), light: pick("--accent-light-rgb", fallback.light), dark: pick("--accent-dark-rgb", fallback.dark) };
}

export function setUiPrefs(patch: Partial<UiPrefs>): void {
  prefs = { ...prefs, ...patch, homeOrder: normalizeOrder(patch.homeOrder ?? prefs.homeOrder), navTabs: normalizeNav(patch.navTabs ?? prefs.navTabs) };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* it just won't persist */
  }
  applyUiPrefs(prefs);
  listeners.forEach((l) => l());
}
