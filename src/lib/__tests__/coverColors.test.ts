import { describe, expect, it } from "vitest";
import { pickPalette } from "../coverColors";

const px = (rgb: [number, number, number], n: number) => Array.from({ length: n }, () => [...rgb, 255]).flat();

describe("pickPalette", () => {
  it("finds the dominant colours and ignores black bars and grays", () => {
    const data = [...px([0, 0, 0], 400), ...px([128, 128, 128], 300), ...px([200, 30, 40], 200), ...px([30, 60, 200], 120)];
    const palette = pickPalette(data);
    expect(palette).toHaveLength(2);
    // red first (most present), then blue
    expect(palette[0][0]).toBeGreaterThan(palette[0][2]);
    expect(palette[1][2]).toBeGreaterThan(palette[1][0]);
  });

  it("merges near-identical shades into one colour", () => {
    const palette = pickPalette([...px([200, 30, 40], 100), ...px([205, 35, 44], 100), ...px([198, 28, 38], 100)]);
    expect(palette).toHaveLength(1);
  });

  it("keeps the colours dark enough for white text", () => {
    const palette = pickPalette(px([250, 240, 120], 200));
    const lum = (c: number[]) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
    expect(palette).toHaveLength(1);
    expect(lum(palette[0])).toBeLessThan(0.62);
  });

  it("returns nothing for a gray or empty image", () => {
    expect(pickPalette(px([120, 120, 120], 100))).toEqual([]);
    expect(pickPalette([])).toEqual([]);
  });
});
