import { beforeEach, describe, expect, it, vi } from "vitest";
import { HORARIO } from "@/data/horario";
import { checkScheduleReminders, eventsForDay, plannedReminders, wantsReminder } from "../scheduleNotify";
import type { NotifyPrefs } from "../scheduleNotify";

const show = vi.fn().mockResolvedValue(undefined);
const monday = (h: number, m: number) => new Date(2026, 8, 21, h, m); // Mon 21 Sep 2026
const prefs = (over: Partial<NotifyPrefs> = {}): NotifyPrefs => ({ enabled: true, lead: 0, scope: "all", ...over });

beforeEach(() => {
  localStorage.clear();
  show.mockClear();
  vi.stubGlobal("Notification", Object.assign(vi.fn(), { permission: "granted" }));
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistration: () => Promise.resolve({ showNotification: show }) } });
});

describe("schedule reminders", () => {
  it("skips free time, sleep and empty slots", () => {
    const names = plannedReminders(monday(6, 0), prefs()).map((p) => p.event.cell.text);
    expect(names).toContain("MoureDev · obligatorio");
    expect(names).toContain("Gym");
    expect(names).not.toContain("Dormir 22:00");
    expect(names).not.toContain("—");
    // Wednesday 6:00 class slot is "Libre / U": nothing to remind
    const wed = eventsForDay(2).find((e) => e.timeLabel === "6:00")!;
    expect(wantsReminder(wed, "all")).toBe(false);
  });

  it("'main' scope keeps only uni, gym, MoureDev and English", () => {
    const names = plannedReminders(monday(6, 0), prefs({ scope: "main" })).map((p) => p.event.cell.text);
    expect(names).not.toContain("Desayuno");
    expect(names).not.toContain("Arreglar la casa");
    expect(names).toContain("INGLÉS Blendex");
  });

  it("fires a block once, at its start, marked important when it's the key one", async () => {
    expect(await checkScheduleReminders(monday(8, 49), prefs())).toEqual([]);
    const sent = await checkScheduleReminders(monday(8, 50), prefs());
    expect(sent).toEqual(["Toca: MoureDev · obligatorio"]);
    expect(show).toHaveBeenCalledWith("Toca: MoureDev · obligatorio", expect.objectContaining({ body: expect.stringContaining("Hazlo"), requireInteraction: true }));
    expect(await checkScheduleReminders(monday(8, 51), prefs())).toEqual([]); // no repeat
    expect(show).toHaveBeenCalledTimes(1);
  });

  it("honours the lead time and doesn't fire stale reminders", async () => {
    expect(await checkScheduleReminders(monday(8, 40), prefs({ lead: 10 }))).toEqual(["En 10 min: MoureDev · obligatorio"]);
    show.mockClear();
    localStorage.clear();
    expect(await checkScheduleReminders(monday(9, 30), prefs())).toEqual([]); // 40 min late
    expect(show).not.toHaveBeenCalled();
  });

  it("does nothing when disabled or without permission", async () => {
    expect(await checkScheduleReminders(monday(8, 50), prefs({ enabled: false }))).toEqual([]);
    vi.stubGlobal("Notification", Object.assign(vi.fn(), { permission: "denied" }));
    expect(await checkScheduleReminders(monday(8, 50), prefs())).toEqual([]);
    expect(show).not.toHaveBeenCalled();
  });

  it("has an event per non-continuation block for every day", () => {
    for (let col = 0; col < 7; col++) {
      const ev = eventsForDay(col);
      expect(ev.length).toBeGreaterThan(0);
      const covered = ev.reduce((n, e) => n + (e.cell.span ?? 1), 0);
      expect(covered).toBe(HORARIO.length);
    }
  });
});
