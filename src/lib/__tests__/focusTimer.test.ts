import { beforeEach, describe, expect, it, vi } from "vitest";

const add = vi.fn().mockResolvedValue(1);
vi.mock("@/db/db", () => ({ db: { focusSessions: { add } } }));

const KEY = "performance_focus_timer_v1";

async function fresh(stored?: unknown) {
  vi.resetModules();
  localStorage.clear();
  if (stored !== undefined) localStorage.setItem(KEY, typeof stored === "string" ? stored : JSON.stringify(stored));
  return import("../focusTimer");
}

describe("focusTimer", () => {
  beforeEach(() => {
    add.mockClear();
    vi.useRealTimers();
  });

  it("survives corrupted or hostile persisted state", async () => {
    for (const bad of ["{not json", "null", '"x"', { status: "running", endsAt: "soon", totalSec: "a" }, { status: "running", endsAt: 5, totalSec: 0 }, { status: "paused", totalSec: -3 }]) {
      const t = await fresh(bad);
      expect(t.getFocusState().status).toBe("idle");
    }
    const t = await fresh({ status: "paused", phase: "break", totalSec: 300, remainingSec: 9999, cycle: 99, focusMin: 7, task: 5 });
    const s = t.getFocusState();
    expect(s.remainingSec).toBe(300);
    expect(s.cycle).toBe(t.BLOCKS_PER_SET);
    expect(s.focusMin).toBe(25);
    expect(s.task).toBe("");
  });

  it("logs a finished block once and starts a break", async () => {
    const t = await fresh();
    t.startFocus("  React  ", 25);
    const end = t.getFocusState().endsAt as number;
    expect(t.completeIfDue(end - 1000)).toBeNull();

    const res = t.completeIfDue(end + 500);
    expect(res).toMatchObject({ finished: "focus", task: "React", late: false });
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0][0]).toMatchObject({ task: "React", minutes: 25 });
    const s = t.getFocusState();
    expect(s.phase).toBe("break");
    expect(s.totalSec).toBe(300);
    expect(s.cycle).toBe(1);

    // Already handled: a second call (e.g. another tab) must not log again.
    expect(t.completeIfDue(end + 600)).toBeNull();
    expect(add).toHaveBeenCalledTimes(1);
  });

  it("takes the long break after four blocks and resets the set", async () => {
    const t = await fresh({ status: "running", phase: "focus", task: "x", focusMin: 25, totalSec: 1500, endsAt: 1000, remainingSec: 0, cycle: 3 });
    t.completeIfDue(1500);
    expect(t.getFocusState()).toMatchObject({ phase: "break", totalSec: 900, cycle: 4 });
    t.completeIfDue(1000 + 900_000 + 10);
    expect(t.getFocusState()).toMatchObject({ status: "idle", cycle: 0 });
  });

  it("marks long-overdue phases late and skips the stale break", async () => {
    const t = await fresh({ status: "running", phase: "focus", task: "x", focusMin: 25, totalSec: 1500, endsAt: 1000, remainingSec: 0, cycle: 0 });
    const res = t.completeIfDue(1000 + 3 * 3600_000);
    expect(res).toMatchObject({ finished: "focus", late: true });
    expect(add).toHaveBeenCalledTimes(1);
    expect(t.getFocusState()).toMatchObject({ status: "idle", cycle: 1 });
  });

  it("does not log an abandoned block", async () => {
    const t = await fresh();
    t.startFocus("x", 15);
    t.stopFocus();
    expect(add).not.toHaveBeenCalled();
    expect(t.getFocusState().status).toBe("idle");
  });

  it("pauses and resumes without losing time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const t = await fresh();
    t.startFocus("x", 25);
    vi.setSystemTime(10_000 + 60_000);
    t.pauseFocus();
    expect(t.getFocusState().remainingSec).toBe(1440);
    vi.setSystemTime(10_000 + 600_000);
    t.resumeFocus();
    expect(t.remainingSeconds(t.getFocusState(), Date.now())).toBe(1440);
  });

  it("picks up a change written by another tab", async () => {
    const t = await fresh();
    localStorage.setItem(KEY, JSON.stringify({ status: "running", phase: "focus", task: "otra pestaña", focusMin: 25, totalSec: 1500, endsAt: Date.now() + 60_000, remainingSec: 0, cycle: 0 }));
    t.refreshFromStorage();
    expect(t.getFocusState().task).toBe("otra pestaña");
  });
});
