import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { addDays, todayISO } from "@/lib/date";
import { computeDailyScores, currentDailyStreak, totalActiveDays, totalPoints } from "@/lib/dailyScore";
import { computeInsights } from "@/lib/insights";
import { useDailyStreak } from "../useDailyStreak";
import { useInsights } from "../useInsights";
import { useJourneyStart } from "../useJourneyStart";
import { useCycleSlot, useDefaultGymDay } from "../useCycle";
import { useLastWeight, useRecentActivity } from "../useRecentActivity";
import { useLastSession } from "@/features/entreno/useEntrenoData";

const TODAY = todayISO();
const d = (n: number) => addDays(TODAY, -n);
const setRow = (date: string, day: "A" | "B" | "C" = "A", extra: object = {}) => ({ date, day, exercise: "Press", setIndex: 1, weight: 40, reps: 8, toFailure: null, rpe: null, note: "", createdAt: 1, ...extra });

let txCount = 0;
const realTransaction = IDBDatabase.prototype.transaction;
beforeAll(() => {
  IDBDatabase.prototype.transaction = function (this: IDBDatabase, ...args: Parameters<typeof realTransaction>) {
    if ((args[1] ?? "readonly") === "readonly") txCount++;
    return realTransaction.apply(this, args);
  } as typeof realTransaction;
});
afterAll(() => {
  IDBDatabase.prototype.transaction = realTransaction;
});

beforeEach(async () => {
  await Promise.all([db.sets.clear(), db.habitDays.clear(), db.weights.clear(), db.sleep.clear(), db.focusSessions.clear(), db.appConfig.clear()]);
});

async function seed() {
  const sets = [];
  const habits = [];
  const sleep = [];
  const focus = [];
  for (let i = 0; i < 200; i++) {
    if (i % 2 === 1) sets.push(setRow(d(i), (["A", "B", "C"] as const)[i % 3], { exercise: i % 4 === 1 ? "Press" : "Remo" }));
    if (i % 3 !== 2) habits.push({ date: d(i), done: ["agua", "moure"].slice(0, 1 + (i % 2)) });
    if (i % 2 === 0) sleep.push({ date: d(i), hours: 5 + (i % 5), bedTime: "", wakeTime: "", note: "" });
    if (i % 4 === 0) focus.push({ date: d(i), task: "t", minutes: 20 + i, createdAt: i });
  }
  await db.sets.bulkAdd(sets as never);
  await db.habitDays.bulkAdd(habits);
  await db.sleep.bulkAdd(sleep);
  await db.focusSessions.bulkAdd(focus);
  await db.weights.bulkAdd([{ date: d(40), weightKg: 82, pechoCm: null, brazoCm: null, note: "" }, { date: d(3), weightKg: 80, pechoCm: null, brazoCm: null, note: "" }]);
  await db.appConfig.put({ key: "mood", value: { [d(1)]: 4, [d(2)]: 2, [d(3)]: 5 }, updatedAt: 1 });
}

describe("useDailyStreak", () => {
  it("matches the rows' own scores, streak, points and lifetime active days, and follows a write today", async () => {
    await seed();
    const { result } = renderHook(() => useDailyStreak());
    await waitFor(() => expect(result.current).toBeDefined());

    const check = async () => {
      const scores = await computeDailyScores();
      await waitFor(() => {
        expect(result.current!.scores).toEqual(scores);
        expect(result.current!.points).toBe(totalPoints(scores));
      });
      expect(result.current!.streak).toBe(currentDailyStreak(scores).days);
      expect(result.current!.activeDays).toBe(await totalActiveDays());
    };
    await check();

    await act(async () => {
      await db.habitDays.put({ date: TODAY, done: ["agua"] });
    });
    await check();
    await act(async () => {
      await db.sets.add(setRow(TODAY, "B") as never);
      await db.sleep.add({ date: d(1), hours: 8, bedTime: "", wakeTime: "", note: "" });
    });
    await check();
  });
});

describe("useInsights", () => {
  it("equals computeInsights over the same 90 days and follows the mood log", async () => {
    await seed();
    const { result } = renderHook(() => useInsights());
    await waitFor(() => expect(result.current).toBeDefined());

    const expected = async () => {
      const since = addDays(TODAY, -90);
      const [sleep, focus, sets, habitDays, mood] = await Promise.all([
        db.sleep.where("date").aboveOrEqual(since).toArray(),
        db.focusSessions.where("date").aboveOrEqual(since).toArray(),
        db.sets.where("date").aboveOrEqual(since).toArray(),
        db.habitDays.where("date").aboveOrEqual(since).toArray(),
        db.appConfig.get("mood"),
      ]);
      return computeInsights(
        {
          sleep: sleep.map((s) => ({ date: s.date, hours: s.hours })),
          focus: focus.map((f) => ({ date: f.date, minutes: f.minutes })),
          trained: [...new Set(sets.map((s) => s.date))],
          habitDays,
          mood: Object.entries((mood?.value ?? {}) as Record<string, number>).map(([date, value]) => ({ date, value })),
        },
        TODAY,
      );
    };
    expect(result.current).toEqual(await expected());

    await act(async () => {
      await db.appConfig.put({ key: "mood", value: { [d(1)]: 1, [d(2)]: 1, [d(3)]: 1, [d(4)]: 5, [d(5)]: 5, [d(6)]: 5, [d(7)]: 1, [d(8)]: 5 }, updatedAt: 2 });
      await db.sleep.bulkAdd([d(201), d(202)].map((date) => ({ date, hours: 9, bedTime: "", wakeTime: "", note: "" })));
    });
    const after = await expected();
    await waitFor(() => expect(result.current).toEqual(after));
  });
});

describe("useJourneyStart", () => {
  it("is today with nothing, then the earliest of sets / weights / habits, following backfills and deletions", async () => {
    const { result } = renderHook(() => useJourneyStart());
    await waitFor(() => expect(result.current).toBe(TODAY));

    await act(async () => {
      await db.sets.add(setRow(d(20)) as never);
    });
    await waitFor(() => expect(result.current).toBe(d(20)));

    await act(async () => {
      await db.weights.add({ date: d(50), weightKg: 80, pechoCm: null, brazoCm: null, note: "" });
    });
    await waitFor(() => expect(result.current).toBe(d(50)));

    await act(async () => {
      await db.habitDays.add({ date: d(70), done: [] });
    });
    await waitFor(() => expect(result.current).toBe(d(70)));

    await act(async () => {
      await db.habitDays.delete(d(70));
    });
    await waitFor(() => expect(result.current).toBe(d(50)));

    await act(async () => {
      await db.weights.clear();
      await db.sets.clear();
    });
    await waitFor(() => expect(result.current).toBe(TODAY));
  });

  it("does not re-read anything when a set is logged today", async () => {
    await db.sets.add(setRow(d(20)) as never);
    await db.weights.add({ date: d(15), weightKg: 80, pechoCm: null, brazoCm: null, note: "" });
    await db.habitDays.add({ date: d(18), done: [] });
    const { result } = renderHook(() => useJourneyStart());
    await waitFor(() => expect(result.current).toBe(d(20)));
    // the first write re-runs the full-range read once and narrows it...
    await act(async () => {
      await db.sets.add(setRow(TODAY) as never);
    });
    await new Promise((r) => setTimeout(r, 100));
    txCount = 0;
    await act(async () => {
      await db.sets.add(setRow(TODAY, "B") as never);
      await db.weights.add({ date: TODAY, weightKg: 80, pechoCm: null, brazoCm: null, note: "" });
      await db.habitDays.put({ date: TODAY, done: ["a"] });
    });
    await new Promise((r) => setTimeout(r, 100));
    // ...so later writes dated after the earliest date cost it nothing.
    expect(txCount).toBe(0);
    expect(result.current).toBe(d(20));
  });
});

describe("shared reads", () => {
  it("serve several consumers from one read, and logging today re-reads only today's rows", async () => {
    await seed();
    const { result } = renderHook(() => ({ streak: useDailyStreak(), insights: useInsights(), slot: useCycleSlot(), gymDay: useDefaultGymDay(), recent: useRecentActivity(), weight: useLastWeight() }));
    await waitFor(() => expect(result.current.streak && result.current.insights && result.current.recent && result.current.gymDay).toBeTruthy());
    expect(result.current.weight?.weightKg).toBe(80);

    await new Promise((r) => setTimeout(r, 100));
    txCount = 0;
    await act(async () => {
      await db.sets.add(setRow(TODAY, "C") as never);
    });
    await waitFor(() => expect(result.current.gymDay).toBe("C"));
    await new Promise((r) => setTimeout(r, 100));
    expect(txCount).toBeLessThanOrEqual(2); // today's rows (one transaction) — not the past, not once per consumer
  });

  it("the cycle counts sessions as before: one per workout day, past and today together", async () => {
    await db.sets.bulkAdd([setRow(d(4), "A"), setRow(d(4), "A"), setRow(d(2), "B"), setRow(d(2), "B")] as never);
    const { result } = renderHook(() => useCycleSlot());
    await waitFor(() => expect(result.current).toBe("C"));
    await act(async () => {
      await db.sets.add(setRow(TODAY, "C") as never);
    });
    await waitFor(() => expect(result.current).toBe("rest"));
    await act(async () => {
      await db.appConfig.put({ key: "cycle_offset", value: 2, updatedAt: 1 });
    });
    await waitFor(() => expect(result.current).toBe("B")); // 3 sessions + 2 = 5 → index 1
  });
});

describe("useLastSession", () => {
  async function dbAnswer(exercise: string, excludeDate: string) {
    const { result } = renderHook(() => useLastSession(exercise, excludeDate));
    await waitFor(() => expect(db.sets.count()).resolves.toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 60));
    return result.current;
  }

  it("worked out from the sets Entreno already holds equals re-reading the exercise, for today and for a backfilled date", async () => {
    await db.sets.bulkAdd([
      setRow(d(9), "A", { setIndex: 1, weight: 30 }),
      setRow(d(9), "A", { setIndex: 2, weight: 32 }),
      setRow(d(5), "B", { setIndex: 1, weight: 35 }),
      setRow(d(5), "B", { setIndex: 2, weight: 36 }),
      setRow(d(5), "B", { exercise: "Remo", setIndex: 1, weight: 99 }),
      setRow(TODAY, "A", { setIndex: 1, weight: 50 }),
      setRow(addDays(TODAY, 3), "A", { setIndex: 1, weight: 60 }), // dated ahead: the old read counted it too
    ] as never);

    for (const [exercise, excludeDate] of [["Press", TODAY], ["Press", d(5)], ["Press", d(9)], ["Remo", TODAY], ["Dips", TODAY], ["Press", addDays(TODAY, 3)]] as const) {
      const prior = await db.sets.where("date").below(excludeDate).toArray();
      const expected = await dbAnswer(exercise, excludeDate);
      const { result } = renderHook(() => useLastSession(exercise, excludeDate, { priorSets: prior }));
      await waitFor(() => expect(result.current).toEqual(expected));
    }
  });

  it("waits (null) while Entreno's list is still loading, without reading the database", async () => {
    await db.sets.add(setRow(d(3)) as never);
    await new Promise((r) => setTimeout(r, 60));
    txCount = 0;
    const { result } = renderHook(() => useLastSession("Press", TODAY, { priorSets: undefined }));
    await new Promise((r) => setTimeout(r, 100));
    expect(result.current).toBeNull();
    expect(txCount).toBeLessThanOrEqual(1); // only today's shared read, never the exercise's whole history
  });
});
