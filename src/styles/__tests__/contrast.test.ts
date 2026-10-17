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
    if (m[1].trim() !== selector) continue;
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
  light: [[217, 219, 225], [230, 232, 236], hex("#cdd0d7")],
};
const ACCENTS = ["red", "gold", "blue", "violet"] as const;

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
