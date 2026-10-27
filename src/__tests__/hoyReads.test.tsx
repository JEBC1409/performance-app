import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useBible", () => ({ useBible: () => ({ bible: null, loading: true }), useVerseOfDay: () => null }));

const { db } = await import("@/db/db");
const { addDays, todayISO } = await import("@/lib/date");
const { Hoy } = await import("@/features/hoy/Hoy");
const { applyRoutine, defaultRoutine } = await import("@/data/gym");

/** Counts every IndexedDB transaction the app opens, by mode. Each Dexie query
 * (and each liveQuery re-run) opens one, so this is a faithful read-cost meter. */
const tally = { readonly: 0, readwrite: 0, byStore: new Map<string, number>(), log: [] as string[] };
const realTransaction = IDBDatabase.prototype.transaction;
function resetTally() {
  tally.readonly = 0;
  tally.readwrite = 0;
  tally.byStore.clear();
  tally.log.length = 0;
}
beforeAll(() => {
  IDBDatabase.prototype.transaction = function (this: IDBDatabase, stores: string | string[], mode?: IDBTransactionMode, options?: IDBTransactionOptions) {
    tally.log.push(`${mode ?? "readonly"}:${(Array.isArray(stores) ? stores : [stores]).join("+")}`);
    if ((mode ?? "readonly") === "readonly") {
      tally.readonly++;
      for (const s of Array.isArray(stores) ? stores : [stores]) tally.byStore.set(s, (tally.byStore.get(s) ?? 0) + 1);
    } else tally.readwrite++;
    return realTransaction.call(this, stores, mode, options);
  } as typeof realTransaction;
});
afterAll(() => {
  IDBDatabase.prototype.transaction = realTransaction;
  vi.useRealTimers();
});
afterEach(() => {
  cleanup();
  applyRoutine(defaultRoutine());
});

const EXERCISES = ["Press banca", "Remo", "Sentadilla", "Peso muerto", "Dominadas", "Curl", "Press militar", "Fondos", "Zancadas", "Elevaciones"];

/** A year of plausible history: ~5.9k sets, a habit row per day, weights, sleep, focus, mood. */
async function seedYear(today: string) {
  const sets = [];
  const habitDays = [];
  const weights = [];
  const sleep = [];
  const focus = [];
  let n = 0;
  for (let i = 1; i <= 365; i++) {
    const date = addDays(today, -i);
    habitDays.push({ date, done: ["agua", "moure"].slice(0, i % 3) });
    if (i % 2 === 0) weights.push({ date, weightKg: 80 - i / 100, pechoCm: null, brazoCm: null, note: "" });
    if (i % 3 !== 0) sleep.push({ date, hours: 5 + (i % 5), bedTime: "", wakeTime: "", note: "" });
    if (i % 4 === 0) focus.push({ date, task: "t", minutes: 25, createdAt: i });
    if (i % 2 === 1) {
      const day = (["A", "B", "C"] as const)[(i >> 1) % 3];
      for (let e = 0; e < EXERCISES.length; e++) for (let s = 1; s <= 4; s++) sets.push({ date, day, exercise: EXERCISES[e], setIndex: s, weight: 40 + e, reps: 8, toFailure: null, rpe: null, note: "", createdAt: ++n });
    }
  }
  await db.sets.bulkAdd(sets);
  await db.habitDays.bulkAdd(habitDays);
  await db.weights.bulkAdd(weights);
  await db.sleep.bulkAdd(sleep);
  await db.focusSessions.bulkAdd(focus);
  await db.appConfig.put({ key: "mood", value: { [addDays(today, -1)]: 4, [addDays(today, -2)]: 3 }, updatedAt: 1 });
  await db.habitDefs.bulkAdd([
    { key: "agua", label: "Agua 2L+", icon: "bars", order: 0 },
    { key: "moure", label: "MoureDev", icon: "square", order: 1 },
    { key: "lectura", label: "Lectura", icon: "circle", order: 2 },
  ]);
  return sets.length;
}

/** Waits until no new transaction has opened for a while (the screen has settled). */
async function settle(quietMs = 400) {
  let last = -1;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, quietMs));
    const now = tally.readonly + tally.readwrite;
    if (now === last) return;
    last = now;
  }
}

describe("Hoy · read cost", () => {
  it("opens and toggles a habit with few IndexedDB transactions", async () => {
    // A Wednesday: the Sunday/Monday weekly card (which reads a fortnight) stays out of the count.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 28, 12, 0, 0));
    const today = todayISO();
    expect(new Date().getDay()).toBe(3);
    const nSets = await seedYear(today);
    expect(nSets).toBeGreaterThan(5000);

    resetTally();
    render(<Hoy onStartEntreno={() => {}} onNavigate={() => {}} />);
    await screen.findByRole("button", { name: /^Agua 2L\+/i });
    await settle();
    const mount = { total: tally.readonly, log: [...tally.log] };

    resetTally();
    fireEvent.click(screen.getByRole("button", { name: /^Agua 2L\+/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Agua 2L\+/i })).toHaveAttribute("aria-pressed", "true"));
    await settle();
    const toggle = { total: tally.readonly, log: [...tally.log] };

    // Logging a set today (as Entreno does) while Hoy is open.
    resetTally();
    await db.sets.add({ date: today, day: "A", exercise: EXERCISES[0], setIndex: 1, weight: 50, reps: 8, toFailure: null, rpe: null, note: "", createdAt: 1e9 });
    await settle();
    const logSet = { total: tally.readonly, log: [...tally.log] };

    const NL = String.fromCharCode(10);
    for (const [name, r] of [["mount", mount], ["toggle", toggle], ["logSet", logSet]] as const) process.stderr.write(`[hoy-reads] ${name}=${r.total}${NL}  ${r.log.join(NL + "  ")}${NL}`);

    expect(mount.total).toBeLessThanOrEqual(15);
    expect(toggle.total).toBeLessThanOrEqual(8);
    expect(logSet.total).toBeLessThanOrEqual(8);
  }, 60000);
});
