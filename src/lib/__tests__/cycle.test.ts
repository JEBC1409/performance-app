import { describe, expect, it } from "vitest";
import { nextCycleSlot, offsetForSlot } from "../cycle";

describe("cycle offset", () => {
  it("lets the user say which day it is now, whatever was logged", () => {
    for (const logged of [0, 1, 2, 3, 7, 30]) {
      for (const slot of ["A", "B", "C", "rest"] as const) {
        expect(nextCycleSlot(logged, offsetForSlot(slot, logged))).toBe(slot);
      }
    }
  });

  it("keeps advancing from the chosen day after a session is logged", () => {
    const offset = offsetForSlot("B", 5);
    expect(nextCycleSlot(6, offset)).toBe("C");
    expect(nextCycleSlot(7, offset)).toBe("rest");
  });
});

describe("nextCycleSlot", () => {
  it("starts the cycle at A with no sessions logged", () => {
    expect(nextCycleSlot(0)).toBe("A");
  });

  it("advances through A -> B -> C -> rest -> A", () => {
    expect(nextCycleSlot(1)).toBe("B");
    expect(nextCycleSlot(2)).toBe("C");
    expect(nextCycleSlot(3)).toBe("rest");
    expect(nextCycleSlot(4)).toBe("A");
  });

  it("wraps around indefinitely", () => {
    expect(nextCycleSlot(9)).toBe(nextCycleSlot(5));
    expect(nextCycleSlot(100)).toBe("A");
  });
});
