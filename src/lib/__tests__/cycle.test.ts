import { describe, expect, it } from "vitest";
import { nextCycleSlot } from "../cycle";

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
