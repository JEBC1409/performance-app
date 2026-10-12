import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_HABIT_DEFS, db } from "@/db/db";
import { currentRoutineConfig } from "@/data/gym";
import { todayISO } from "@/lib/date";
import { getFocusState, stopFocus } from "@/lib/focusTimer";
import { handleJarvisOp } from "../jarvisLink";

const music = vi.hoisted(() => ({ source: null as unknown, playMusic: vi.fn(), pauseMusic: vi.fn(), nextMusic: vi.fn(), prevMusic: vi.fn() }));
vi.mock("@/lib/focusMusic", () => ({
  getMusicState: () => ({ source: music.source }),
  playMusic: music.playMusic,
  pauseMusic: music.pauseMusic,
  nextMusic: music.nextMusic,
  prevMusic: music.prevMusic,
}));

const navigate = vi.fn();
const ctx = { navigate };

function firstExercise() {
  const routine = currentRoutineConfig();
  const day = (Object.keys(routine) as ("A" | "B" | "C")[])[0];
  return { day, name: routine[day].ex[0].name };
}

describe("jarvisLink operations", () => {
  beforeEach(async () => {
    navigate.mockClear();
    stopFocus();
    await Promise.all([db.sets.clear(), db.habitDays.clear(), db.habitDefs.clear(), db.focusSessions.clear(), db.weights.clear()]);
    await db.habitDefs.bulkPut(DEFAULT_HABIT_DEFS);
  });

  it("answers ping", async () => {
    expect(await handleJarvisOp("ping", {}, ctx)).toMatchObject({ app: "performance" });
  });

  it("navigates only to known screens", async () => {
    await handleJarvisOp("nav", { tab: "focus" }, ctx);
    expect(navigate).toHaveBeenCalledWith("focus");
    await expect(handleJarvisOp("nav", { tab: "../etc" }, ctx)).rejects.toThrow(/desconocida/);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("starts, pauses, resumes and stops the focus timer", async () => {
    const started = (await handleJarvisOp("focus.start", { task: "Estadística", minutes: 60 }, ctx)) as { status: string; focusMin: number; remainingMin: number };
    expect(started).toMatchObject({ status: "running", focusMin: 60 });
    expect(started.remainingMin).toBeGreaterThanOrEqual(59);
    expect(navigate).toHaveBeenCalledWith("focus");
    expect(getFocusState().task).toBe("Estadística");

    expect(await handleJarvisOp("focus.pause", {}, ctx)).toMatchObject({ status: "paused" });
    expect(await handleJarvisOp("focus.resume", {}, ctx)).toMatchObject({ status: "running" });
    expect(await handleJarvisOp("focus.stop", {}, ctx)).toMatchObject({ status: "idle" });
  });

  it("rejects an out-of-range focus length", async () => {
    await expect(handleJarvisOp("focus.start", { minutes: 0 }, ctx)).rejects.toThrow(/entre 1 y 240/);
    await expect(handleJarvisOp("focus.start", { minutes: 9999 }, ctx)).rejects.toThrow(/entre 1 y 240/);
    expect(getFocusState().status).toBe("idle");
  });

  it("logs sets against the right gym day and counts them", async () => {
    const { name, day } = firstExercise();
    const spoken = name.toLowerCase();
    const res = await handleJarvisOp("set.log", { exercise: spoken, weight: 60, reps: 8, sets: 3 }, ctx);
    expect(res).toMatchObject({ exercise: name, day, sets: 3, weight: 60, reps: 8 });
    const rows = await db.sets.where("date").equals(todayISO()).toArray();
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.setIndex).sort()).toEqual([1, 2, 3]);
    // A later set continues the numbering rather than restarting it.
    await handleJarvisOp("set.log", { exercise: name, weight: 62.5, reps: 6 }, ctx);
    const again = await db.sets.where("date").equals(todayISO()).toArray();
    expect(again.map((r) => r.setIndex).sort()).toEqual([1, 2, 3, 4]);
  });

  it("refuses unknown exercises, missing reps and absurd weights", async () => {
    await expect(handleJarvisOp("set.log", { exercise: "zzz inexistente", reps: 8 }, ctx)).rejects.toThrow(/No encuentro/);
    const { name } = firstExercise();
    await expect(handleJarvisOp("set.log", { exercise: name, weight: 50 }, ctx)).rejects.toThrow(/repeticiones/);
    await expect(handleJarvisOp("set.log", { exercise: name, weight: 99999, reps: 5 }, ctx)).rejects.toThrow(/fuera de rango/);
    expect(await db.sets.count()).toBe(0);
  });

  it("reports exercise stats with the best estimated 1RM", async () => {
    const { name } = firstExercise();
    await handleJarvisOp("set.log", { exercise: name, weight: 50, reps: 10 }, ctx);
    await handleJarvisOp("set.log", { exercise: name, weight: 70, reps: 5 }, ctx);
    const s = (await handleJarvisOp("stats.exercise", { exercise: name }, ctx)) as { sets: number; best: { weight: number; est1RM: number } };
    expect(s.sets).toBe(2);
    expect(s.best.weight).toBeGreaterThan(0);
    expect(s.best.est1RM).toBeGreaterThan(s.best.weight);
  });

  it("marks habits done idempotently and lists them", async () => {
    const label = DEFAULT_HABIT_DEFS[0].label;
    await handleJarvisOp("habit.set", { habit: label.toLowerCase(), done: true }, ctx);
    await handleJarvisOp("habit.set", { habit: label, done: true }, ctx); // already done: no toggle back
    let list = (await handleJarvisOp("habit.list", {}, ctx)) as { habit: string; done: boolean }[];
    expect(list.find((h) => h.habit === label)?.done).toBe(true);
    await handleJarvisOp("habit.set", { habit: label, done: false }, ctx);
    list = (await handleJarvisOp("habit.list", {}, ctx)) as { habit: string; done: boolean }[];
    expect(list.find((h) => h.habit === label)?.done).toBe(false);
    await expect(handleJarvisOp("habit.set", { habit: "no existe" }, ctx)).rejects.toThrow(/No encuentro/);
  });

  it("summarises today", async () => {
    const s = (await handleJarvisOp("stats.today", {}, ctx)) as { focusMinutes: number; setsLogged: number; habitsPending: string[] };
    expect(s.focusMinutes).toBe(0);
    expect(s.setsLogged).toBe(0);
    expect(s.habitsPending.length).toBe(DEFAULT_HABIT_DEFS.length);
  });

  it("controls the Focus music only when a playlist is configured", async () => {
    music.source = null;
    await expect(handleJarvisOp("music.play", {}, ctx)).rejects.toThrow(/No hay música/);
    expect(music.playMusic).not.toHaveBeenCalled();
    music.source = { kind: "playlist" };
    expect(await handleJarvisOp("music.play", {}, ctx)).toEqual({ music: "play" });
    await handleJarvisOp("music.pause", {}, ctx);
    await handleJarvisOp("music.next", {}, ctx);
    expect(music.playMusic).toHaveBeenCalledTimes(1);
    expect(music.pauseMusic).toHaveBeenCalledTimes(1);
    expect(music.nextMusic).toHaveBeenCalledTimes(1);
  });

  it("rejects unknown operations", async () => {
    await expect(handleJarvisOp("db.drop", {}, ctx)).rejects.toThrow(/desconocida/);
  });
});
