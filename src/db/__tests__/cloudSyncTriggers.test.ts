import "fake-indexeddb/auto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/** Stand-in for the Supabase client: signed in, empty cloud, and a log of every table read. */
const reads: string[] = [];
const persist = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock("@/lib/storage", () => ({ requestPersistentStorage: persist }));
vi.mock("@/lib/supabase", () => {
  const from = (table: string) => ({
    select: () => {
      reads.push(table);
      const q = Promise.resolve({ data: [], error: null }) as Promise<unknown> & { maybeSingle: () => Promise<unknown>; order: () => { range: () => Promise<unknown> } };
      q.maybeSingle = () => Promise.resolve({ data: null, error: null });
      q.order = () => ({ range: () => Promise.resolve({ data: [], error: null }) });
      return q;
    },
    upsert: () => Promise.resolve({ error: null }),
    delete: () => ({ match: () => Promise.resolve({ error: null }) }),
  });
  const auth = {
    getSession: async () => ({ data: { session: { user: { id: "user-1" } } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  };
  return { supabase: { from, auth }, supabaseConfigured: true };
});

const { db } = await import("../db");
const { initCloudSync, retrySync, PULL_MIN_INTERVAL_MS } = await import("../cloudSync");
const { getSyncSnapshot } = await import("../syncStatus");

const pulls = () => reads.filter((t) => t === "sets").length;
const tick = () => new Promise((r) => setTimeout(r, 5));
async function until(pred: () => boolean) {
  for (let i = 0; i < 400 && !pred(); i++) await tick();
  expect(pred()).toBe(true);
}
/** Lets any triggered sync run to completion. */
async function settle() {
  for (let i = 0; i < 20; i++) await tick();
}

const T0 = new Date("2026-10-01T10:00:00Z").getTime();
const at = (ms: number) => vi.setSystemTime(T0 + ms);

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
});
afterAll(() => vi.useRealTimers());

describe("when the cloud sync runs", () => {
  it("pulls at start-up, asks for persistent storage once, and then throttles", async () => {
    initCloudSync();
    await until(() => pulls() === 1);
    await settle();
    expect(persist).toHaveBeenCalledTimes(1);

    // Back online / back to the app soon after: nothing is pulled again.
    window.dispatchEvent(new Event("online"));
    document.dispatchEvent(new Event("visibilitychange"));
    at(9 * 60_000);
    window.dispatchEvent(new Event("online"));
    document.dispatchEvent(new Event("visibilitychange"));
    await settle();
    expect(pulls()).toBe(1);

    // Ten minutes after the last pull, the next trigger does pull — once.
    at(PULL_MIN_INTERVAL_MS + 1000);
    window.dispatchEvent(new Event("online"));
    await until(() => pulls() === 2);
    await settle();
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("online"));
    await settle();
    expect(pulls()).toBe(2);
  });

  it("the retry button always pulls, even inside the 10 minutes", async () => {
    const before = pulls();
    retrySync();
    await until(() => pulls() === before + 1);
  });

  it("a change that can't be queued is reported to the user, not swallowed", async () => {
    vi.spyOn(db.outbox, "add").mockRejectedValue(new Error("quota exceeded"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await db.habitDays.put({ date: "2026-10-01", done: ["sleep"] }); // local save still works
    await until(() => getSyncSnapshot().lastError === "No se pudo preparar un cambio para subirlo");
    expect(getSyncSnapshot().state).toBe("error");
    expect((await db.habitDays.get("2026-10-01"))?.done).toEqual(["sleep"]);
    log.mockRestore();
  });
});
