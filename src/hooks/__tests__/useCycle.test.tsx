import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { addDays, todayISO } from "@/lib/date";
import { useCycleSlot } from "../useCycle";

const TODAY = todayISO();
const set = (date: string, day: "A" | "B" | "C") => ({ date, day, exercise: "X", setIndex: 1, weight: 10, reps: 5, toFailure: null, rpe: null, note: "", createdAt: Date.now() });

beforeEach(async () => {
  await Promise.all([db.sets.clear(), db.appConfig.clear()]);
});

describe("useCycleSlot", () => {
  it("starts on A with nothing logged", async () => {
    const { result } = renderHook(() => useCycleSlot());
    await waitFor(() => expect(result.current).toBe("A"));
  });

  it("counts earlier sessions and today's together, one per workout day (not per set)", async () => {
    // two earlier sessions (A then B), several sets each
    await db.sets.bulkAdd([set(addDays(TODAY, -4), "A"), set(addDays(TODAY, -4), "A"), set(addDays(TODAY, -2), "B"), set(addDays(TODAY, -2), "B")]);
    const { result } = renderHook(() => useCycleSlot());
    await waitFor(() => expect(result.current).toBe("C")); // A, B done → C is next

    // logging today's workout moves the cycle on without re-reading the past
    await act(async () => {
      await db.sets.add(set(TODAY, "C"));
    });
    await waitFor(() => expect(result.current).toBe("rest"));
  });

  it("follows the offset the user set", async () => {
    await db.appConfig.put({ key: "cycle_offset", value: 1, updatedAt: 1 });
    const { result } = renderHook(() => useCycleSlot());
    await waitFor(() => expect(result.current).toBe("B"));
  });
});
