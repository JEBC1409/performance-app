import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import type { HabitDayRecord } from "@/db/db";
import { distinctDates, firstByIndex, lastByIndex } from "@/db/safeQuery";
import { addDays, todayISO } from "../date";
import { buildDailyScores, computeDailyScores, currentDailyStreak, totalActiveDays } from "../dailyScore";
import { computeInsights, WINDOW_DAYS } from "../insights";
import { combineActivity, loadFirstDates, loadHistory, loadToday } from "../recentActivity";

const TODAY = todayISO();
const d = (n: number) => addDays(TODAY, -n);

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const setRow = (date: string, day: "A" | "B" | "C" = "A", extra: object = {}) => ({ date, day, exercise: "Press", setIndex: 1, weight: 40, reps: 8, toFailure: null, rpe: null, note: "", createdAt: 1, ...extra });

async function clearAll() {
  await Promise.all([db.sets.clear(), db.habitDays.clear(), db.weights.clear(), db.sleep.clear(), db.focusSessions.clear()]);
}

/** A varied history: gaps, several workouts on one date, empty habit rows, old data. */
async function seedRandom(seed: number, span: number) {
  const r = rng(seed);
  const sets = [];
  const habits: HabitDayRecord[] = [];
  const weights = [];
  const sleep = [];
  const focus = [];
  for (let i = -3; i <= span; i++) {
    const date = d(i);
    if (r() < 0.45) {
      const days = r() < 0.15 ? (["A", "B"] as const) : ([(["A", "B", "C"] as const)[Math.floor(r() * 3)]] as const);
      for (const day of days) for (let s = 1; s <= 1 + Math.floor(r() * 4); s++) sets.push(setRow(date, day, { setIndex: s, exercise: r() < 0.5 ? "Press" : "Remo", createdAt: Math.floor(r() * 1e6) }));
    }
    if (r() < 0.6) habits.push({ date, done: r() < 0.3 ? [] : ["agua", "moure", "lectura"].slice(0, 1 + Math.floor(r() * 3)) });
    if (r() < 0.3) weights.push({ date, weightKg: 70 + r() * 10, pechoCm: null, brazoCm: null, note: "" });
    if (r() < 0.5) sleep.push({ date, hours: r() < 0.1 ? null : 4 + r() * 5, bedTime: "", wakeTime: "", note: "" });
    for (let k = 0; k < (r() < 0.25 ? 1 + Math.floor(r() * 6) : 0); k++) focus.push({ date, task: "t", minutes: 25, createdAt: k });
  }
  await db.sets.bulkAdd(sets as never);
  await db.habitDays.bulkAdd(habits);
  await db.weights.bulkAdd(weights);
  await db.sleep.bulkAdd(sleep);
  await db.focusSessions.bulkAdd(focus);
}

// ── The queries the screens used before the shared read, kept here as the reference ──
async function legacyScores(days = 28) {
  const since = addDays(todayISO(), -(days - 1));
  const [sets, habitDays, weights, sleeps, focus] = await Promise.all([
    db.sets.where("date").aboveOrEqual(since).toArray(),
    db.habitDays.where("date").aboveOrEqual(since).toArray(),
    db.weights.where("date").aboveOrEqual(since).toArray(),
    db.sleep.where("date").aboveOrEqual(since).toArray(),
    db.focusSessions.where("date").aboveOrEqual(since).toArray(),
  ]);
  const focusByDate = new Map<string, number>();
  focus.forEach((f) => focusByDate.set(f.date, (focusByDate.get(f.date) ?? 0) + 1));
  const trainedDates = new Set(sets.map((s) => s.date));
  const weightDates = new Set(weights.map((w) => w.date));
  const sleepDates = new Set(sleeps.map((s) => s.date));
  const habitByDate = new Map(habitDays.map((h) => [h.date, h]));
  const out = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(since, i);
    const habitsDone = habitByDate.get(date)?.done.length ?? 0;
    const trained = trainedDates.has(date);
    let points = habitsDone * 5;
    if (trained) points += 25;
    if (weightDates.has(date)) points += 5;
    if (sleepDates.has(date)) points += 5;
    points += Math.min(focusByDate.get(date) ?? 0, 4) * 5;
    out.push({ date, points, trained, habitsDone });
  }
  return out;
}

async function legacyInsightsInput() {
  const today = todayISO();
  const since = addDays(today, -WINDOW_DAYS);
  const [sleep, focus, sets, habitDays] = await Promise.all([
    db.sleep.where("date").aboveOrEqual(since).toArray(),
    db.focusSessions.where("date").aboveOrEqual(since).toArray(),
    db.sets.where("date").aboveOrEqual(since).toArray(),
    db.habitDays.where("date").aboveOrEqual(since).toArray(),
  ]);
  return {
    sleep: sleep.map((s) => ({ date: s.date, hours: s.hours })),
    focus: focus.map((f) => ({ date: f.date, minutes: f.minutes })),
    trained: [...new Set(sets.map((s) => s.date))],
    habitDays,
  };
}

async function legacySessions() {
  const rows = await db.sets.toArray();
  return new Set(rows.map((r) => `${r.date}__${r.day}`)).size;
}

async function recent() {
  const [h, t] = await Promise.all([loadHistory(TODAY), loadToday(TODAY)]);
  return { h, t, r: combineActivity(h, t) };
}

beforeEach(clearAll);

const SCENARIOS: [string, () => Promise<void>][] = [
  ["nothing logged", async () => {}],
  ["only today", async () => {
    await db.sets.add(setRow(TODAY) as never);
    await db.habitDays.add({ date: TODAY, done: ["agua"] });
    await db.weights.add({ date: TODAY, weightKg: 80, pechoCm: null, brazoCm: null, note: "" });
  }],
  ["only old data, none in the last 90 days", async () => {
    await db.sets.bulkAdd([setRow(d(300)), setRow(d(300), "B"), setRow(d(200))] as never);
    await db.weights.bulkAdd([{ date: d(250), weightKg: 90, pechoCm: null, brazoCm: null, note: "" }, { date: d(240), weightKg: 88, pechoCm: null, brazoCm: null, note: "" }]);
    await db.habitDays.add({ date: d(150), done: ["a"] });
  }],
  ["a year of random history", () => seedRandom(1, 365)],
  ["half a year of random history", () => seedRandom(7, 180)],
  ["a short history", () => seedRandom(42, 20)],
  ["rows dated in the future", async () => {
    await seedRandom(3, 60);
    await db.sets.bulkAdd([setRow(addDays(TODAY, 6)), setRow(addDays(TODAY, 6), "C")] as never);
    await db.habitDays.add({ date: addDays(TODAY, 7), done: ["x"] });
    await db.weights.add({ date: addDays(TODAY, 8), weightKg: 99, pechoCm: null, brazoCm: null, note: "" });
  }],
];

describe.each(SCENARIOS)("shared recent-activity read · %s", (_name, seed) => {
  beforeEach(seed);

  it("daily scores, streak and points equal the old five-table query", async () => {
    const { r } = await recent();
    const rows = { sets: r.sets, habitDays: r.habitDays, weights: r.weights, sleeps: r.sleep, focus: r.focus };
    const next = buildDailyScores(rows, 28, r.today);
    const old = await legacyScores();
    expect(next).toEqual(old);
    expect(await computeDailyScores()).toEqual(old);
    expect(currentDailyStreak(next)).toEqual(currentDailyStreak(old));
  });

  it("lifetime active days equal totalActiveDays()", async () => {
    const { r } = await recent();
    expect(r.activeDays).toBe(await totalActiveDays());
  });

  it("workout count (cycle) equals the old full count", async () => {
    const { r } = await recent();
    expect(r.sessions).toBe(await legacySessions());
  });

  it("trained dates (deload) equal the old distinct-dates read", async () => {
    const { r } = await recent();
    expect(r.setDates).toEqual(await distinctDates(db.sets.orderBy("date")));
  });

  it("insights equal those from the old per-hook queries", async () => {
    const { r } = await recent();
    const mood = [{ date: d(1), value: 4 }, { date: d(2), value: 2 }, { date: d(3), value: 5 }, { date: d(4), value: 1 }];
    const next = computeInsights(
      {
        sleep: r.sleep.map((s) => ({ date: s.date, hours: s.hours })),
        focus: r.focus.map((f) => ({ date: f.date, minutes: f.minutes })),
        trained: [...new Set(r.sets.map((s) => s.date))],
        habitDays: r.habitDays,
        mood,
      },
      r.today,
    );
    expect(next).toEqual(computeInsights({ ...(await legacyInsightsInput()), mood }, TODAY));
  });

  it("the newest weight equals lastByIndex", async () => {
    const { r } = await recent();
    expect(r.lastWeight).toEqual(await lastByIndex(db.weights, "date"));
  });

  it("the earliest rows equal firstByIndex, also when re-read from a previous answer", async () => {
    const first = await loadFirstDates(undefined);
    const [fs, fw, fh] = await Promise.all([firstByIndex(db.sets, "date"), firstByIndex(db.weights, "date"), firstByIndex(db.habitDays, "date")]);
    expect(first).toEqual({ sets: fs?.date, weights: fw, habitDays: fh?.date });
    expect(await loadFirstDates(first)).toEqual(first);
  });
});

describe("first dates, as the data changes", () => {
  it("follows a backfill, a deletion of the earliest row and the first ever row", async () => {
    let first = await loadFirstDates(undefined);
    expect(first).toEqual({ sets: undefined, weights: undefined, habitDays: undefined });

    await db.sets.add(setRow(d(10)) as never);
    first = await loadFirstDates(first);
    expect(first.sets).toBe(d(10));

    await db.sets.add(setRow(d(30)) as never); // backfilled earlier
    first = await loadFirstDates(first);
    expect(first.sets).toBe(d(30));

    await db.sets.add(setRow(d(2)) as never); // later: no change
    first = await loadFirstDates(first);
    expect(first.sets).toBe(d(30));

    await db.sets.where("date").equals(d(30)).delete(); // earliest removed → falls back to the next
    first = await loadFirstDates(first);
    expect(first.sets).toBe(d(10));

    await db.weights.add({ date: d(5), weightKg: 80, pechoCm: null, brazoCm: null, note: "" });
    await db.weights.add({ date: d(5), weightKg: 81, pechoCm: null, brazoCm: null, note: "" });
    first = await loadFirstDates(first);
    expect(first.weights?.weightKg).toBe(80); // first of two on the same date, as firstByIndex gives
    expect(first.weights).toEqual(await firstByIndex(db.weights, "date"));
  });
});

describe("split at today", () => {
  it("a write dated today leaves the history half alone", async () => {
    await seedRandom(5, 120);
    const h1 = await loadHistory(TODAY);
    await db.sets.add(setRow(TODAY) as never);
    await db.habitDays.put({ date: TODAY, done: ["agua", "moure"] });
    const h2 = await loadHistory(TODAY);
    expect(h2).toEqual(h1);
    const t = await loadToday(TODAY);
    expect(t.sets.map((s) => s.date)).toContain(TODAY);
    expect(t.habitDays.find((h) => h.date === TODAY)?.done).toEqual(["agua", "moure"]);
  });
});
