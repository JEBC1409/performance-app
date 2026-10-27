import { describe, expect, it } from "vitest";
import { cardLayout, showStallBadges, showStallSummary } from "../layout";

describe("stall presentation", () => {
  it("badges only when a few are stalled; a summary line when many", () => {
    expect([0, 1, 3, 4, 9].map(showStallBadges)).toEqual([false, true, true, false, false]);
    expect([0, 1, 3, 4, 9].map(showStallSummary)).toEqual([false, false, false, true, true]);
  });
});

describe("cardLayout", () => {
  const spans = (total: number) => Array.from({ length: total }, (_, i) => cardLayout(i, total).span);

  it("an odd count makes the last card full width on a phone, and only the last", () => {
    for (const total of [7, 9]) {
      const s = spans(total);
      expect(s.filter((c) => c.startsWith("col-span-6"))).toHaveLength(1);
      expect(s[total - 1].startsWith("col-span-6")).toBe(true);
    }
  });

  it("an even count leaves every card half width on a phone", () => {
    expect(spans(8).every((c) => c.startsWith("col-span-3"))).toBe(true);
  });

  it("fills the last row on wide screens: remainder 1 → whole row, remainder 2 → halves", () => {
    expect(spans(9).every((c) => c.includes("sidebar:col-span-2"))).toBe(true);
    expect(spans(7)[6]).toContain("sidebar:col-span-6");
    const eight = spans(8);
    expect(eight[5]).toContain("sidebar:col-span-2");
    expect(eight[6]).toContain("sidebar:col-span-3");
    expect(eight[7]).toContain("sidebar:col-span-3");
  });

  it("a card that spans its row gets a wide photo", () => {
    expect(cardLayout(8, 9).photo).toContain("aspect-[16/7]");
    expect(cardLayout(0, 9).photo).toContain("aspect-[3/2]");
  });
});
