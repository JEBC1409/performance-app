import { describe, expect, it } from "vitest";
import { parseRepRange, suggestNext, weightIncrement } from "../progression";

const sets = (...pairs: [number | null, number][]) => pairs.map(([weight, reps]) => ({ weight, reps }));

describe("parseRepRange", () => {
  it("reads ranges, single numbers and per-side labels", () => {
    expect(parseRepRange("8-10")).toEqual({ min: 8, max: 10 });
    expect(parseRepRange("12")).toEqual({ min: 12, max: 12 });
    expect(parseRepRange("10-12 c/lado")).toEqual({ min: 10, max: 12 });
    expect(parseRepRange("15-20")).toEqual({ min: 15, max: 20 });
  });
  it("marks to-failure work and ignores what has no load", () => {
    expect(parseRepRange("al fallo")).toBe("fail");
    expect(parseRepRange("rondas")).toBeNull();
  });
});

describe("suggestNext", () => {
  const range = { min: 8, max: 10 };

  it("has nothing to say without history or a range", () => {
    expect(suggestNext(range, [])).toBeNull();
    expect(suggestNext(null, sets([50, 8]))).toBeNull();
  });

  it("adds weight and restarts at the bottom once every set hits the top", () => {
    const s = suggestNext(range, sets([50, 10], [50, 10], [50, 10]))!;
    expect(s).toMatchObject({ kind: "increase", weight: 52.5, reps: 8, delta: 2.5 });
  });

  it("keeps the weight and asks for one more rep while the top isn't reached", () => {
    const s = suggestNext(range, sets([50, 10], [50, 9], [50, 8]))!;
    expect(s).toMatchObject({ kind: "repeat", weight: 50, reps: 10 });
    expect(suggestNext(range, sets([50, 8], [50, 8]))).toMatchObject({ kind: "repeat", weight: 50, reps: 9 });
  });

  it("never asks for more than the top of the range", () => {
    expect(suggestNext(range, sets([50, 10], [50, 9]))).toMatchObject({ kind: "repeat", reps: 10 });
  });

  it("backs off when the weight was too heavy for the range", () => {
    const s = suggestNext(range, sets([60, 5], [60, 4]))!;
    expect(s).toMatchObject({ kind: "reduce", weight: 54, reps: 8 });
  });

  it("judges only the heaviest sets: a lighter drop set doesn't hold you back", () => {
    const s = suggestNext(range, sets([50, 10], [50, 10], [25, 15]))!;
    expect(s).toMatchObject({ kind: "increase", weight: 52.5 });
  });

  it("works for to-failure exercises: beat last time by a rep", () => {
    expect(suggestNext("fail", sets([null, 12], [null, 10]))).toMatchObject({ kind: "repeat", weight: null, reps: 13 });
    expect(suggestNext("fail", sets([20, 8]))).toMatchObject({ weight: 20, reps: 9 });
  });

  it("handles bodyweight work with a rep range", () => {
    expect(suggestNext(range, sets([null, 10], [null, 10]))).toMatchObject({ kind: "increase", weight: null, reps: 11 });
    expect(suggestNext(range, sets([null, 8]))).toMatchObject({ kind: "repeat", weight: null, reps: 9 });
  });
});

describe("weightIncrement", () => {
  it("scales with the load but stays between 1 and 5 kg", () => {
    expect(weightIncrement(10)).toBe(1);
    expect(weightIncrement(50)).toBe(2.5);
    expect(weightIncrement(80)).toBe(4);
    expect(weightIncrement(200)).toBe(5);
  });
});
