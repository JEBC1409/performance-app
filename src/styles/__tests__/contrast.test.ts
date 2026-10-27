/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// (Vitest stubs CSS imports, so the stylesheet is read as plain text; tests run from the project root.)
const css = readFileSync("src/styles/index.css", "utf8");

/** Guards the colour tokens: small text in every theme and accent must keep at
 * least 4.5:1 against the surfaces it sits on (WCAG AA). If a token in
 * index.css is changed to something too faint, this fails. */

type Rgb = [number, number, number];
const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const over = (fg: Rgb, alpha: number, bg: Rgb): Rgb => fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha))) as Rgb;
const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;

const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
/** Declarations of every rule whose selector is exactly `selector`, merged in file order. */
function decls(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (const m of clean.matchAll(re)) {
    if (m[1].trim().replace(/\s+/g, " ") !== selector) continue;
    for (const d of m[2].split(";")) {
      const i = d.indexOf(":");
      if (i > 0) out[d.slice(0, i).trim()] = d.slice(i + 1).trim();
    }
  }
  return out;
}
const rgbOf = (v: string | undefined): Rgb => {
  const m = v?.match(/^(\d+)\s+(\d+)\s+(\d+)$/);
  if (!m) throw new Error("not an rgb triplet: " + v);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

const SURFACES: Record<"dark" | "light", Rgb[]> = {
  dark: [[0, 0, 0], [11, 11, 13], [17, 17, 20], [23, 23, 27]],
  light: [[196, 199, 207], [211, 214, 220], hex("#b6bac3")],
};
const ACCENTS = ["red", "gold", "blue", "violet", "green", "cyan", "orange", "pink"] as const;

function inkFor(theme: "dark" | "light", accent: (typeof ACCENTS)[number]): Rgb {
  const sel = (theme === "light" ? ':root[data-theme="light"]' : ":root") + (accent === "red" ? "" : `[data-accent="${accent}"]`);
  const own = decls(sel)["--accent-ink-rgb"];
  if (own) return rgbOf(own);
  // red has no accent attribute: its ink lives on the theme's base rule
  return rgbOf(decls(theme === "light" ? ':root[data-theme="light"]' : ":root")["--accent-ink-rgb"]);
}

describe("accent text colour (--accent-ink-rgb)", () => {
  for (const theme of ["dark", "light"] as const) {
    for (const accent of ACCENTS) {
      it(`${theme} · ${accent}: at least 4.5:1 on every surface`, () => {
        const ink = inkFor(theme, accent);
        for (const s of SURFACES[theme]) expect(ratio(ink, s), `on ${s.join(",")}`).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe("semantic text colours", () => {
  const light = decls(':root[data-theme="light"]');
  const dark = { ...decls("@theme"), ...decls(":root") };
  for (const name of ["--color-gold", "--color-warn", "--color-good"]) {
    it(`light ${name} is readable`, () => {
      for (const s of SURFACES.light) expect(ratio(hex(light[name]), s)).toBeGreaterThanOrEqual(4.5);
    });
    it(`dark ${name} is readable`, () => {
      for (const s of SURFACES.dark) expect(ratio(hex(dark[name]), s)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("the secondary grey (muted-2) is readable on the light surfaces", () => {
    const m = light["--color-muted-2"].match(/\/\s*([\d.]+)\)/);
    const alpha = Number(m?.[1]);
    expect(alpha).toBeGreaterThan(0);
    for (const s of SURFACES.light) expect(ratio(over([22, 22, 28], alpha, s), s)).toBeGreaterThanOrEqual(4.5);
  });

  it("the main grey (muted) is stronger than muted-2 and readable on the light surfaces", () => {
    const alphaOf = (v: string) => Number(v.match(/\/\s*([\d.]+)\)/)?.[1]);
    expect(alphaOf(light["--color-muted"])).toBeGreaterThan(alphaOf(light["--color-muted-2"]));
    for (const s of SURFACES.light) expect(ratio(over([22, 22, 28], alphaOf(light["--color-muted"]), s), s)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("text on solid status fills", () => {
  it("is legible on the good and warn colours in both themes", () => {
    const dark = { ...decls("@theme"), ...decls(":root") };
    const light = decls(':root[data-theme="light"]');
    const on = (v: string) => hex(v);
    for (const f of ["--color-good", "--color-warn"]) {
      expect(ratio(on(dark["--color-on-solid"]), hex(dark[f]))).toBeGreaterThanOrEqual(4.5);
      expect(ratio(on(light["--color-on-solid"]), hex(light[f]))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

/* ── Accent fills and the text on them ───────────────────────────────────────
 * Solid accent fills (.btn-primary, .glass-on) carry --text-on-accent; accent used as
 * text (--color-accent-text, i.e. --accent-ink-rgb) sits on the page, on cards and on
 * tinted blocks of the accent at up to ~18%. All of it has to hold 4.5:1, for every
 * accent in both themes, computed from the colours the stylesheet resolves. */

/** The value of a custom property for a theme + accent, following the cascade:
 * light + accent, light base, dark accent, dark base (later rules of equal weight win). */
function token(theme: "dark" | "light", accent: (typeof ACCENTS)[number], name: string): string {
  const acc = accent === "red" ? [] : [`[data-accent="${accent}"]`];
  const chain: string[] = [];
  if (theme === "light") {
    if (acc.length) chain.push(`:root[data-theme="light"]${acc[0]}`);
    chain.push(':root[data-theme="light"]');
  }
  if (acc.length) chain.push(`:root${acc[0]}`);
  chain.push(":root");
  for (const sel of chain) {
    const v = decls(sel)[name];
    if (v) return v;
  }
  throw new Error(`${name} not defined for ${theme}/${accent}`);
}
const colorOf = (v: string): Rgb => (v.startsWith("#") ? hex(v) : rgbOf(v));

describe("solid accent fill (--accent-solid-rgb) and its text (--text-on-accent)", () => {
  for (const theme of ["dark", "light"] as const) {
    for (const accent of ACCENTS) {
      it(`${theme} · ${accent}: text on the fill is at least 4.5:1`, () => {
        const fill = rgbOf(token(theme, accent, "--accent-solid-rgb"));
        const text = colorOf(token(theme, accent, "--text-on-accent"));
        expect(ratio(text, fill)).toBeGreaterThanOrEqual(4.5);
      });
      it(`${theme} · ${accent}: the fill is visible against the page (≥1.5:1 on surfaces)`, () => {
        const fill = rgbOf(token(theme, accent, "--accent-solid-rgb"));
        for (const s of SURFACES[theme]) expect(ratio(fill, s), `on ${s.join(",")}`).toBeGreaterThanOrEqual(1.5);
      });
    }
  }

  it("every non-red accent defines its own fill and text in both themes (none silently inherits red)", () => {
    for (const accent of ACCENTS.filter((a) => a !== "red")) {
      for (const sel of [`:root[data-accent="${accent}"]`, `:root[data-theme="light"][data-accent="${accent}"]`]) {
        expect(decls(sel)["--accent-solid-rgb"], sel).toBeTruthy();
        expect(decls(sel)["--text-on-accent"], sel).toBeTruthy();
      }
    }
  });

  it(".btn-primary and .glass-on paint the solid fill with --text-on-accent", () => {
    for (const sel of [".btn-primary, .glass-on"]) {
      const d = decls(sel);
      expect(d.color, sel).toBe("var(--text-on-accent)");
      expect(d.background, sel).toBe("rgb(var(--accent-solid-rgb))");
    }
  });
});

describe("accent used as text (--color-accent-text)", () => {
  it("is the same colour as --accent-ink-rgb", () => {
    expect(decls(":root")["--color-accent-text"]).toBe("rgb(var(--accent-ink-rgb))");
  });
  for (const theme of ["dark", "light"] as const) {
    for (const accent of ACCENTS) {
      it(`${theme} · ${accent}: readable on a tinted block of the accent (18% over each surface)`, () => {
        const ink = rgbOf(token(theme, accent, "--accent-ink-rgb"));
        const tint = rgbOf(token(theme, accent, "--accent-rgb"));
        for (const s of SURFACES[theme]) expect(ratio(ink, over(tint, 0.18, s)), `on ${s.join(",")}`).toBeGreaterThanOrEqual(4.5);
      });
      it(`${theme} · ${accent}: normal ink is readable on the selected state (accent 16% over each surface)`, () => {
        const inkText = theme === "light" ? hex("#14141a") : hex("#ffffff");
        const tint = rgbOf(token(theme, accent, "--accent-rgb"));
        for (const s of SURFACES[theme]) expect(ratio(inkText, over(tint, 0.16, s))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe("secondary greys on the dark surfaces", () => {
  it("muted and muted-2 are readable on every dark surface", () => {
    const alphaOf = (v: string) => Number(v.match(/\/\s*([\d.]+)\)/)?.[1]);
    const base = decls("@theme");
    for (const name of ["--color-muted", "--color-muted-2"]) {
      for (const s of SURFACES.dark) expect(ratio(over([255, 255, 255], alphaOf(base[name]), s), s), name).toBeGreaterThanOrEqual(4.5);
    }
  });
});
